"""
src/pipeline/consensus.py — Multi-Model Consensus Engine
=========================================================
Implements the "Ensemble Judge" middleware feature.
Calls multiple LLMs and compares their answers for medical contradictions.
"""
from __future__ import annotations
import logging
import concurrent.futures
from typing import List, Dict, Any, Optional
from src.pipeline.generator import generate_answer

logger = logging.getLogger(__name__)

def run_consensus_check(
    question: str, 
    context_chunks: List[Dict[str, Any]], 
    config: Dict[str, Any],
    providers: List[str] = ["gemini", "groq"]
) -> Dict[str, Any]:
    """
    Calls multiple providers in parallel and compares outcomes.
    Returns: {
        "answers": { provider: answer },
        "agreement_score": float [0-1],
        "conflicts": List[str],
        "consensus_answer": str
    }
    """
    logger.info("Starting Consensus Check with providers: %s", providers)
    
    # 1. Generate answers in parallel
    answers = {}
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_provider = {
            executor.submit(generate_answer, question, context_chunks, config, {"provider": p}): p 
            for p in providers
        }
        for future in concurrent.futures.as_completed(future_to_provider):
            provider = future_to_provider[future]
            try:
                answers[provider] = future.result()
            except Exception as exc:
                logger.error("Provider %s failed during consensus: %s", provider, exc)
                answers[provider] = f"ERROR: {exc}"

    if len(answers) < 2:
        return {
            "answers": answers,
            "agreement_score": 1.0,
            "conflicts": ["Insufficient providers responded for a full consensus check."],
            "consensus_answer": list(answers.values())[0] if answers else "Safety failure: No providers responded."
        }

    # Compile context text to feed the Judge
    context_text = "\n\n".join([f"Source {i+1}:\n{c.get('text', '')}" for i, c in enumerate(context_chunks)])

    # 2. Compare answers using a "Judge" Agent
    # We use Gemini (or the primary provider) as the judge
    comparison_prompt = f"""
You are a Medical Consensus Judge. Compare the following two medical answers provided by different AI models to the same question.
CRITICAL INSTRUCTION: Your primary duty is to ensure the final answer is explicitly grounded in the provided MEDICAL CONTEXT. 
 Identify any CLINICAL CONTRADICTIONS or significant discrepancies in drug names, dosages, or recommendations.
If one model hallucinates outside the context, you must side with the model that stuck to the context.

QUESTION: {question}

MEDICAL CONTEXT FROM DATASET:
{context_text}

ANSWER A:
{list(answers.values())[0]}

ANSWER B:
{list(answers.values())[1] if len(answers) > 1 else "N/A"}

OUTPUT FORMAT (JSON ONLY):
{{
  "agreement_score": 0.0 to 1.0 (1.0 means perfect alignment, 0.0 means complete contradiction),
  "conflicts": ["list of specific medical discrepancies found"],
  "summary": "brief summary of how they differ and which one aligns better with the Medical Context",
  "recommended_consensus": "the most conservative and safe unified answer that strictly adheres to the Medical Context"
}}
"""
    try:
        # Use the generator's default to run the judge
        judge_raw = generate_answer("Medical Consensus Judge Task", [{"text": comparison_prompt}], config)
        # Attempt to parse JSON from the judge's response
        # (A real implementation would use structured output, but we use a robust parse for now)
        import json
        import re
        
        # Clean potential markdown
        clean_json = re.sub(r'```json\n?|\n?```', '', judge_raw).strip()
        judge_data = json.loads(clean_json)
        
        agreement = judge_data.get("agreement_score", 0.5)
        return {
            "answers": answers,
            "agreement_score": agreement,
            "conflicts": judge_data.get("conflicts", []),
            "summary": judge_data.get("summary", ""),
            "consensus_answer": judge_data.get("recommended_consensus", list(answers.values())[0]),
            "high_uncertainty_flag": agreement < 0.70
        }
    except Exception as e:
        logger.error("Consensus Judge failed: %s", e)
        return {
            "answers": answers,
            "agreement_score": 0.5,
            "conflicts": [f"Judge failed: {e}"],
            "consensus_answer": list(answers.values())[0]
        }
