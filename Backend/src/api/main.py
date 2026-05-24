"""
src/api/main.py — MediRAG FastAPI Application
=============================================
FR-18: Two endpoints:
  GET  /health   → liveness check + Ollama status
  POST /evaluate → calls run_evaluation(), returns FR-17 JSON

Design decisions:
  - DeBERTa model is loaded once at app startup (not per-request)
  - If any module raises an exception, partial results are returned (no HTTP 500)
  - HTTP 422 Pydantic validation errors are automatic
  - RAGAS is disabled by default (run_ragas=False) — set to True only if
    Ollama/OpenAI is available; the RAGAS module already fails gracefully.

To run:
    uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import os
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import requests
import json
import sqlite3
import yaml
from datetime import datetime
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

import threading
from src.api.schemas import (
    HealthResponse,
    EvaluateRequest,
    EvaluateResponse,
    QueryRequest,
    QueryResponse,
    RetrievedChunk,
    IngestRequest,
    ChatRequest,
    ModuleScore,
    ModuleResults,
)
from src.evaluate import run_evaluation
from src.pipeline.generator import generate_answer
from src.pipeline.retriever import Retriever

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
try:
    _config_path = os.environ.get("MEDIRAG_CONFIG", "config_local.yaml" if Path("config_local.yaml").exists() else "config.yaml")
    _cfg = yaml.safe_load(Path(_config_path).read_text())
    _log_level = _cfg.get("logging", {}).get("level", "INFO")
    _ollama_base = _cfg.get("llm", {}).get("base_url", "http://localhost:11434")
    _api_cfg = _cfg.get("api", {})
except Exception:
    _log_level = "INFO"
    _ollama_base = "http://localhost:11434"
    _api_cfg = {}

logging.basicConfig(
    level=getattr(logging, _log_level, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Database settings 
# ---------------------------------------------------------------------------

def init_db():
    Path("data").mkdir(exist_ok=True)
    conn = sqlite3.connect("data/logs.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            endpoint TEXT,
            question TEXT,
            answer TEXT,
            hrs INTEGER,
            risk_band TEXT,
            composite_score REAL,
            latency_ms INTEGER,
            intervention_applied BOOLEAN,
            details TEXT
        )
    """)
    conn.commit()
    conn.close()

def log_audit(endpoint: str, question: str, answer: str, hrs: int, risk_band: str, composite: float, latency: int, intervention: bool, details: dict):
    try:
        conn = sqlite3.connect("data/logs.db")
        c = conn.cursor()
        c.execute("""
            INSERT INTO audit_logs (timestamp, endpoint, question, answer, hrs, risk_band, composite_score, latency_ms, intervention_applied, details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            endpoint,
            question,
            answer,
            hrs,
            risk_band,
            composite,
            latency,
            intervention,
            json.dumps(details)
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to save audit log to DB: {e}")


# ---------------------------------------------------------------------------
# Lifespan: warm DeBERTa once at startup so the first request isn't slow
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm DeBERTa and Retriever at startup."""
    init_db()
    logger.info("MediRAG API starting — pre-warming models...")
    try:
        from src.modules.faithfulness import _get_model
        _get_model()
        logger.info("DeBERTa pre-warm complete.")
    except Exception as exc:
        logger.warning("DeBERTa pre-warm skipped: %s", exc)

    # Pre-load the retriever (BioBERT + FAISS index) into app state
    try:
        app.state.retriever = Retriever(_cfg)
        # Trigger lazy load now so first /query request isn't slow
        app.state.retriever._load_model()
        app.state.retriever._load_index()
        logger.info("Retriever pre-warm complete.")
    except Exception as exc:
        logger.warning("Retriever pre-warm skipped: %s", exc)
        app.state.retriever = None

    yield
    logger.info("MediRAG API shutting down.")



# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="MediRAG Evaluation API",
    description=(
        "Evaluate LLM-generated medical answers against retrieved evidence. "
        "Returns faithfulness, entity accuracy, source credibility, "
        "contradiction risk, and a composite Health Risk Score (HRS)."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Allow all origins for local dev / React frontend on same machine
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper: check Ollama
# ---------------------------------------------------------------------------
def _check_ollama() -> bool:
    """Return True if Ollama API is reachable."""
    try:
        resp = requests.get(f"{_ollama_base}/api/tags", timeout=2)
        return resp.status_code == 200
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Helper: convert EvalResult details → ModuleScore
# ---------------------------------------------------------------------------
def _module_score(module_results: dict, key: str) -> Optional[ModuleScore]:
    data = module_results.get(key)
    if data is None:
        return None
    return ModuleScore(
        score=data.get("score", 0.0),
        details=data.get("details", {}),
        error=data.get("error"),
        latency_ms=data.get("latency_ms"),
    )


# ---------------------------------------------------------------------------
# GET / → redirect to /docs
# ---------------------------------------------------------------------------
@app.post("/project-guide")
def project_guide(req: ChatRequest):
    """
    Proxy endpoint for the Project Guide chatbot.
    Routes requests to Groq API using the local GROQ_API_KEY.
    """
    groq_url = "https://api.groq.com/openai/v1/chat/completions"
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not found in server environment")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Format messages for Groq
    messages = []
    if req.system_prompt:
        messages.append({"role": "system", "content": req.system_prompt})
    
    for m in req.messages:
        messages.append({"role": m.role, "content": m.content})

    payload = {
        "model": "mixtral-8x7b-32768",
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 1024
    }

    try:
        resp = requests.post(groq_url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"Groq Proxy Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """
    Liveness check.

    Returns {"status": "ok", "ollama_available": true/false}.
    Always returns 200 — the caller decides what to do with `ollama_available`.
    """
    return HealthResponse(
        status="ok",
        ollama_available=_check_ollama(),
    )


# ---------------------------------------------------------------------------
# POST /evaluate
# ---------------------------------------------------------------------------
@app.post("/evaluate", response_model=EvaluateResponse, tags=["evaluation"])
def evaluate(req: EvaluateRequest) -> EvaluateResponse:
    """
    Run the full MediRAG evaluation pipeline on a question + answer + context.

    - Validates inputs (FR-18: length limits, chunk count)
    - Runs Faithfulness, Entity Verification, Source Credibility, Contradiction
    - Optionally runs RAGAS (set `run_ragas=true` if Ollama/OpenAI is available)
    - Returns composite Health Risk Score (HRS) + per-module breakdown

    **Note on `run_ragas`**: RAGAS requires a running LLM backend (Ollama or
    OpenAI). If unavailable, RAGAS will gracefully return score=0.5 as a
    neutral fallback — it will NOT crash the request.
    """
    logger.info(
        "POST /evaluate — question=%r, chunks=%d, run_ragas=%s",
        req.question[:80],
        len(req.context_chunks),
        req.run_ragas,
    )

    # Convert Pydantic ContextChunk → plain dicts for the pipeline
    context_dicts: list[dict] = [chunk.model_dump(exclude_none=True) for chunk in req.context_chunks]

    t0 = time.perf_counter()
    try:
        result = run_evaluation(
            question=req.question,
            answer=req.answer,
            context_chunks=context_dicts,
            rxnorm_cache_path=req.rxnorm_cache_path,
            run_ragas=req.run_ragas,
            config=_cfg,
        )
    except Exception as exc:
        logger.exception("run_evaluation raised an unhandled exception: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Evaluation pipeline error: {type(exc).__name__}: {exc}",
        ) from exc

    total_ms = int((time.perf_counter() - t0) * 1000)

    # Extract composite score + details
    composite = float(result.score)
    details = result.details or {}
    hrs = details.get("hrs", int(round(100 * (1.0 - composite))))
    hrs = max(0, min(100, hrs))

    confidence_level = details.get("confidence_level", "UNKNOWN")
    risk_band = details.get("risk_band", "UNKNOWN")
    pipeline_ms = details.get("total_pipeline_ms", total_ms)

    # Build per-module scores
    mod_results: dict = details.get("module_results", {})
    module_scores = ModuleResults(
        faithfulness=_module_score(mod_results, "faithfulness"),
        entity_verifier=_module_score(mod_results, "entity_verifier"),
        source_credibility=_module_score(mod_results, "source_credibility"),
        contradiction=_module_score(mod_results, "contradiction"),
        ragas=_module_score(mod_results, "ragas"),
    )

    logger.info(
        "POST /evaluate → HRS=%d (%s) in %d ms",
        hrs, risk_band, pipeline_ms,
    )

    log_audit("evaluate", req.question, req.answer, hrs, risk_band, composite, pipeline_ms, False, {
        "module_results": mod_results,
        "confidence_level": confidence_level
    })

    return EvaluateResponse(
        composite_score=composite,
        hrs=hrs,
        confidence_level=confidence_level,
        risk_band=risk_band,
        module_results=module_scores,
        total_pipeline_ms=pipeline_ms,
    )


# ---------------------------------------------------------------------------
# POST /translate  — lightweight Hinglish to English translation route
# ---------------------------------------------------------------------------
class TranslateRequest(BaseModel):
    text: str
    llm_provider: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    ollama_url: Optional[str] = None

class TranslateResponse(BaseModel):
    translated_text: str

@app.post("/translate", response_model=TranslateResponse, tags=["translation"])
def translate(req: TranslateRequest) -> TranslateResponse:
    llm_overrides = {}
    if req.llm_provider:
        llm_overrides["provider"] = req.llm_provider
    if req.llm_api_key:
        llm_overrides["api_key"] = req.llm_api_key
    if req.llm_model:
        llm_overrides["model"] = req.llm_model
    if req.ollama_url:
        llm_overrides["ollama_url"] = req.ollama_url

    try:
        from src.pipeline.generator import translate_hinglish_to_english
        translated = translate_hinglish_to_english(req.text, _cfg, overrides=llm_overrides)
        return TranslateResponse(translated_text=translated)
    except Exception as exc:
        logger.exception("Translation endpoint failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# POST /query  — end-to-end: question → retrieve → generate → evaluate
# ---------------------------------------------------------------------------
@app.post("/query", response_model=QueryResponse, tags=["query"])
def query(req: QueryRequest) -> QueryResponse:
    """
    Full end-to-end MediRAG pipeline.

    1. Retrieves top-k context chunks from FAISS (BioBERT)
    2. Generates a grounded answer using Mistral (Ollama)
    3. Evaluates the answer with all 4 modules + aggregator
    4. Returns the answer, retrieved chunks, HRS score, and full breakdown

    **Requires Ollama running locally with Mistral pulled.**
    No fallback — returns 503 if Ollama is unavailable.
    """
    import time as _time
    t_total = _time.perf_counter()

    # Extract request overrides into a dict for translator + generator
    llm_overrides = {}
    if req.llm_provider:
        llm_overrides["provider"] = req.llm_provider
    if req.llm_api_key:
        llm_overrides["api_key"] = req.llm_api_key
    if req.llm_model:
        llm_overrides["model"] = req.llm_model
    if req.ollama_url:
        llm_overrides["ollama_url"] = req.ollama_url
    if req.system_prompt:
        llm_overrides["system_prompt"] = req.system_prompt
    if req.persona:
        llm_overrides["persona"] = req.persona

    original_hinglish = None
    question_to_use = req.question

    if req.translate_hinglish:
        if req.original_hinglish_query:
            original_hinglish = req.original_hinglish_query
            question_to_use = req.question
            logger.info("PRE-TRANSLATED AUDIT SUBMISSION: %r -> %r", original_hinglish, question_to_use)
        else:
            try:
                from src.pipeline.generator import translate_hinglish_to_english
                translated_q = translate_hinglish_to_english(req.question, _cfg, overrides=llm_overrides)
                if translated_q.strip().lower() != req.question.strip().lower():
                    original_hinglish = req.question
                    question_to_use = translated_q
                    logger.info("AUTO-TRANSLATED HINGLISH QUERY: %r -> %r", original_hinglish, question_to_use)
            except Exception as exc:
                logger.error("Hinglish translation module failed: %s", exc)

    logger.info("POST /query — question=%r, processed_question=%r, top_k=%d", 
                req.question[:50], question_to_use[:50], req.top_k)

    # Safe Semantic Cache lookup
    q_vec = None
    from src.pipeline.semantic_cache import SafeSemanticCache
    semantic_cache = SafeSemanticCache()
    
    # Check if retriever can encode
    retriever: Optional[Retriever] = getattr(app.state, "retriever", None)
    if retriever is None:
        try:
            retriever = Retriever(_cfg)
            app.state.retriever = retriever
        except Exception as exc:
            raise HTTPException(status_code=503,
                detail=f"Retriever unavailable: {exc}") from exc

    try:
        retriever._load_model()
        if retriever._model:
            q_vec = retriever._model.encode(
                [question_to_use.strip()],
                normalize_embeddings=True,
                convert_to_numpy=True,
            )[0].astype(np.float32)
            
            cache_hit = semantic_cache.get(
                query_emb=q_vec,
                patient_allergies=req.patient_allergies or [],
                department=req.department or "default",
                overrides=llm_overrides
            )
            if cache_hit:
                logger.info("SEMANTIC CACHE HIT: Returning safe cached response instantly.")
                retrieved_chunks = [
                    RetrievedChunk(
                        chunk_id=c.get("chunk_id"),
                        text=c.get("text"),
                        source=c.get("source", ""),
                        pub_type=c.get("pub_type", ""),
                        pub_year=c.get("pub_year"),
                        title=c.get("title", ""),
                        similarity_score=c.get("similarity_score", 0.0)
                    ) for c in cache_hit.get("retrieved_chunks", [])
                ]
                mr_dict = cache_hit.get("module_results", {})
                return QueryResponse(
                    question=cache_hit.get("question", question_to_use),
                    generated_answer=cache_hit.get("generated_answer"),
                    retrieved_chunks=retrieved_chunks,
                    composite_score=cache_hit.get("composite_score", 1.0),
                    hrs=cache_hit.get("hrs", 0),
                    confidence_level=cache_hit.get("confidence_level", "UNKNOWN"),
                    risk_band=cache_hit.get("risk_band", "UNKNOWN"),
                    module_results=ModuleResults(
                        faithfulness=_module_score(mr_dict, "faithfulness"),
                        entity_verifier=_module_score(mr_dict, "entity_verifier"),
                        source_credibility=_module_score(mr_dict, "source_credibility"),
                        contradiction=_module_score(mr_dict, "contradiction"),
                        ragas=_module_score(mr_dict, "ragas"),
                    ),
                    total_pipeline_ms=0,
                    intervention_applied=cache_hit.get("intervention_applied", False),
                    intervention_reason=cache_hit.get("intervention_reason"),
                    original_answer=cache_hit.get("original_answer"),
                    intervention_details=cache_hit.get("intervention_details"),
                    consensus_results=cache_hit.get("consensus_results"),
                    privacy_applied=cache_hit.get("privacy_applied", False),
                    privacy_details=cache_hit.get("privacy_details"),
                    original_hinglish_query=cache_hit.get("original_hinglish_query"),
                    coverage_gap=cache_hit.get("coverage_gap", False),
                    coverage_gap_details=cache_hit.get("coverage_gap_details"),
                )
    except Exception as exc:
        logger.error("Failed semantic cache retrieval lookup: %s", exc)

    # Step 1: Retrieve
    try:
        raw_results = retriever.search(question_to_use, top_k=req.top_k)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503,
            detail=f"FAISS index not found: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500,
            detail=f"Retrieval error: {exc}") from exc

    if not raw_results:
        raise HTTPException(status_code=404,
            detail="No relevant documents found for this question.")

    # Convert retriever output → chunk dicts for generator + evaluate
    context_chunks: list[dict] = []
    retrieved_chunks_out: list[RetrievedChunk] = []
    for chunk_text, meta, score in raw_results:
        d = {
            "text":       chunk_text,
            "chunk_id":   meta.get("chunk_id"),
            "source":     meta.get("source", ""),
            "pub_type":   meta.get("pub_type", ""),
            "pub_year":   meta.get("pub_year"),
            "title":      meta.get("title", ""),
        }
        context_chunks.append(d)
        retrieved_chunks_out.append(RetrievedChunk(
            chunk_id=meta.get("chunk_id"),
            text=chunk_text[:500],   # truncate for response readability
            source=meta.get("source", ""),
            pub_type=meta.get("pub_type", ""),
            pub_year=meta.get("pub_year"),
            title=meta.get("title", ""),
            similarity_score=round(score, 4),
        ))

    logger.info("Retrieved %d chunks (top score=%.4f)", len(context_chunks),
                raw_results[0][2] if raw_results else 0.0)

    # Raw FAISS cosine similarity for coverage gap gate.
    # IndexFlatIP + L2-norm = cosine in [-1, 1]. < 0.60 means no close semantic match in DB.
    top_faiss_cosine = (
        raw_results[0][1].get("_top_faiss_cosine", 0.0) if raw_results else 0.0
    )
    # =========================================================================
    # Step 2a: PRIVACY SHIELD — MediRAG redacts PHI (Option 1)
    # =========================================================================
    p_mapping = {}
    privacy_applied = False
    question_to_gen = question_to_use
    
    if req.use_privacy_shield:
        from src.pipeline.privacy import shield
        question_to_gen, p_mapping = shield.redact(question_to_use)
        if p_mapping:
            privacy_applied = True
            logger.info("PRIVACY INTERVENTION: Redacted %d items from question.", len(p_mapping))

    # Step 2: Generate answer via LLM (Gemini or Ollama)
    try:
        # Use the potentially redacted question for generation
        answer = generate_answer(question_to_gen, context_chunks, _cfg, overrides=llm_overrides)
    except RuntimeError as exc:
        raise HTTPException(status_code=503,
            detail=f"LLM generation failed: {exc}") from exc

    # Restore the PHI for the final display so the user sees the actual names
    if privacy_applied:
        from src.pipeline.privacy import shield
        answer = shield.restore(answer, p_mapping)
    # =========================================================================

    # =========================================================================
    # Step 2b: CONSENSUS CHECK — MediRAG compares multiple models (Option 2)
    # =========================================================================
    consensus_results = None
    if req.use_consensus:
        from src.pipeline.consensus import run_consensus_check
        # Determine which providers to use based on available config/overrides
        providers = ["gemini"]
        if os.environ.get("GROQ_API_KEY"):
            providers.append("groq")
        elif os.environ.get("MISTRAL_API_KEY"):
            providers.append("mistral")
        else:
            providers.append("ollama") # fallback to local if no second key

        logger.info("Running Consensus Layer with %s", providers)
        consensus_results = run_consensus_check(question_to_use, context_chunks, _cfg, providers=providers)
        
        # If consensus finds a safer merged answer, we promote it
        # and update the primary answer for the evaluation loop
        answer = consensus_results.get("consensus_answer", answer)
    # =========================================================================

    # [DEMO MODE] Inject a false claim to demonstrate the intervention system
    if req.inject_hallucination:
        logger.warning("DEMO MODE: Injecting hallucinated claim into answer: '%s'",
                       req.inject_hallucination)
        answer = answer + " " + req.inject_hallucination.strip()

    # Step 3: Evaluate
    try:
        eval_result = run_evaluation(
            question=question_to_use,
            answer=answer,
            context_chunks=context_chunks,
            run_ragas=req.run_ragas,
            config=_cfg,
        )
    except Exception as exc:
        logger.exception("Evaluation failed: %s", exc)
        try:
            log_audit("query", question_to_use, answer, 100, "EVAL_ERROR", 0.0,
                      int((_time.perf_counter() - t_total) * 1000),
                      False, {"error": str(exc), "error_type": "evaluation_failure"})
        except Exception:
            pass
        raise HTTPException(status_code=500,
            detail=f"Evaluation error: {exc}") from exc

    # =========================================================================
    # Step 3b: INTERVENTION LOOP — MediRAG acts on evaluation results
    # =========================================================================
    from src.pipeline.generator import generate_strict_answer

    details = eval_result.details or {}
    composite = float(eval_result.score)
    hrs = int(round(100 * (1.0 - composite)))
    hrs = max(0, min(100, hrs))
    mod_results: dict = details.get("module_results", {})

    intervention_applied = False
    intervention_reason = None
    original_answer = None
    intervention_details = None

    # Dynamic Department-specific Safety Policies & Patient Allergy Gates
    hrs_block_threshold = 86
    hrs_retry_threshold = 61
    
    if req.department:
        dept_lower = req.department.lower()
        if "pediatric" in dept_lower:
            hrs_block_threshold = 50
            hrs_retry_threshold = 20
            logger.info("DEPARTMENT SAFETY TUNING (Pediatrics): Block >= 50, Regenerate >= 20")
        elif "oncology" in dept_lower:
            hrs_block_threshold = 55
            hrs_retry_threshold = 25
            logger.info("DEPARTMENT SAFETY TUNING (Oncology): Block >= 55, Regenerate >= 25")
        elif "cardiology" in dept_lower:
            hrs_block_threshold = 60
            hrs_retry_threshold = 30
            logger.info("DEPARTMENT SAFETY TUNING (Cardiology): Block >= 60, Regenerate >= 30")
        elif "emergency" in dept_lower or "er" in dept_lower:
            hrs_block_threshold = 70
            hrs_retry_threshold = 50
            logger.info("DEPARTMENT SAFETY TUNING (ER): Block >= 70, Regenerate >= 50")
        elif "opd" in dept_lower:
            hrs_block_threshold = 80
            hrs_retry_threshold = 60
            logger.info("DEPARTMENT SAFETY TUNING (OPD): Block >= 80, Regenerate >= 60")

    # Custom Admin Console Override
    if req.custom_hrs_limit is not None:
        hrs_retry_threshold = req.custom_hrs_limit
        hrs_block_threshold = min(95, req.custom_hrs_limit + (30 if req.custom_hrs_limit <= 30 else 20))
        logger.info(f"HOSPITAL CONSOLE OVERRIDE: Block >= {hrs_block_threshold}, Regenerate >= {hrs_retry_threshold}")

    # Patient Allergy Safety Interception
    allergy_intercepted = False
    allergen_matched = None
    if req.patient_allergies:
        text_to_scan = (question_to_use + " " + answer).lower()
        for allergen in req.patient_allergies:
            if allergen.strip().lower() in text_to_scan:
                allergy_intercepted = True
                allergen_matched = allergen.strip().capitalize()
                break

    faith_score = (mod_results.get("faithfulness") or {}).get("score", 1.0)

    # Source-credibility-aware faith threshold: high-credibility sources get more tolerance
    source_cred = float(details.get("component_scores", {}).get("source_credibility", 0.5))
    faith_threshold = max(0.3, 0.7 - (source_cred * 0.4))  # 0.30 for cred=1.0, 0.66 for cred=0.3

    # ── Coverage Gap Gate ────────────────────────────────────────────────────
    # Two signals combined:
    #   1. Refusal answer — LLM says "not in context / insufficient evidence"
    #      → LLM itself confirms the DB doesn't cover this topic.
    #   2. FAISS cosine — genuinely poor semantic match vs. the query.
    #      BioBERT clusters medical dosing texts, so threshold must be high (0.75).
    _REFUSAL_PATTERNS = (
        "not mentioned in the provided context",
        "not provided in the retrieved context",
        "insufficient evidence in retrieved context",
        "no information about",
        "not in the provided context",
        "cannot find information",
        "the retrieved context does not contain",
        "the context does not contain",
        "not mentioned in the context",
        "is not provided in the context",
    )
    _answer_lower = answer.lower()
    is_refusal_answer = any(p in _answer_lower for p in _REFUSAL_PATTERNS)
    is_low_faiss = top_faiss_cosine < 0.75

    # If a verified drug with rxcui appears in the question, the intervention's
    # FDA direct lookup can still retrieve the right data even when initial FAISS
    # retrieval missed it. Don't label those as coverage gaps — let intervention run.
    _ev_entities = (mod_results.get("entity_verifier") or {}).get("details", {}).get("entities", [])
    _q_lower_cg = question_to_use.lower()
    _drug_in_question = any(
        e.get("rxcui") and e.get("entity", "").lower() in _q_lower_cg
        for e in _ev_entities
    )

    # Refusal is a standalone COVERAGE_GAP signal — faith_score is unreliable here
    # because NLI scores refusal sentences as NEUTRAL (0.5), not low.
    # Exception: if a drug is named in the question, FDA lookup can still help.
    # HALLUCINATION: specific claims made but not grounded in available context.
    if is_refusal_answer and not _drug_in_question:
        gap_type = "COVERAGE_GAP"
    elif faith_score < faith_threshold and is_low_faiss and not _drug_in_question:
        gap_type = "COVERAGE_GAP"  # poor retrieval + low faith = DB lacks this topic
    elif faith_score < faith_threshold:
        gap_type = "HALLUCINATION"  # relevant context exists but answer ignores it
    else:
        gap_type = None

    coverage_gap = gap_type == "COVERAGE_GAP"
    coverage_gap_details: dict | None = {
        "gap_type": gap_type,
        "top_faiss_cosine": round(top_faiss_cosine, 4),
        "is_refusal_answer": is_refusal_answer,
        "note": (
            "Database coverage may be insufficient for this topic. "
            "The answer could not be verified against retrieved evidence. "
            "Consult primary medical literature or a specialist."
        ) if coverage_gap else None,
    } if gap_type else None
    if coverage_gap:
        logger.warning(
            "COVERAGE_GAP detected — refusal=%s, faiss=%.4f, faith=%.2f",
            is_refusal_answer, top_faiss_cosine, faith_score,
        )

    # Tier 1: CRITICAL BLOCK (HRS ≥ hrs_block_threshold) — response is too dangerous to show
    # Coverage gap: skip both tiers — regenerating from an empty DB won't help
    if allergy_intercepted:
        original_answer = answer
        answer = (
            "⛔ PATIENT SAFETY SHIELD — ALLERGY CONTRADICTION BLOCKED\n\n"
            f"Prescribing or recommending {allergen_matched} is STRICTLY CONTRAINDICATED "
            f"because this patient is flagged as severely ALLERGIC to: {allergen_matched}.\n\n"
            "Immediate Action: Cancel drug order and consult guidelines for safe alternative therapies (e.g. Paracetamol instead of NSAIDs)."
        )
        hrs = 100
        intervention_applied = True
        intervention_reason = "CRITICAL_ALLERGY_BLOCKED"
        intervention_details = {
            "hrs_original": 100,
            "message": f"Response blocked: Patient has an active chart allergy to {allergen_matched}.",
        }
        logger.warning("INTERVENTION: CRITICAL_ALLERGY_BLOCKED — allergen=%s", allergen_matched)
    elif coverage_gap:
        logger.info("COVERAGE_GAP — skipping intervention (regeneration cannot add missing data).")
    elif hrs >= hrs_block_threshold:
        original_answer = answer
        answer = (
            "⛔ UNSAFE RESPONSE BLOCKED by MediRAG Safety Gate.\n\n"
            "The generated answer was flagged as CRITICAL risk "
            f"(Health Risk Score: {hrs}/100, Ward Limit: {hrs_block_threshold}%).\n\n"
            "It showed signs of clinical hallucination or contradiction with the retrieved evidence. "
            "Please consult a qualified medical professional or rephrase your question."
        )
        intervention_applied = True
        intervention_reason = "CRITICAL_BLOCKED"
        intervention_details = {
            "hrs_original": hrs,
            "faithfulness": faith_score,
            "message": f"Response blocked: HRS >= {hrs_block_threshold} (Ward limit exceeded).",
        }
        logger.warning("INTERVENTION: CRITICAL_BLOCKED — HRS=%d (limit=%d)", hrs, hrs_block_threshold)

    # Tier 2: HIGH RISK REGENERATION
    elif hrs >= hrs_retry_threshold or faith_score < faith_threshold:
        original_answer = answer
        original_hrs = hrs
        logger.warning(
            "INTERVENTION: HIGH_RISK_REGENERATED — HRS=%d, faith=%.2f. Regenerating with strict prompt.",
            hrs, faith_score
        )
        try:
            # Re-retrieve from shared index — find better chunks than the ones that failed
            try:
                # Direct FDA lookup — only for drugs named in the question itself.
                # Drugs found in the answer but NOT in the question (e.g. metformin
                # mentioned incidentally in a general "first-line treatment" answer)
                # should not trigger FDA lookup; that would replace relevant context
                # with the wrong label sections (contraindications instead of treatment).
                fda_direct: list[dict] = []
                try:
                    ev_details = eval_result.details.get("module_results", {}).get("entity_verifier", {}).get("details", {})
                    verified_drugs = [
                        e["entity"] for e in ev_details.get("entities", [])
                        if e.get("status") == "VERIFIED" and e.get("rxcui")
                    ]
                    q_lower = question_to_use.lower()
                    for drug in verified_drugs:
                        if drug.lower() in q_lower:
                            fda_direct += app.state.retriever.get_fda_chunks(drug)
                    if fda_direct:
                        logger.info("Direct FDA lookup found %d chunks for drugs: %s",
                                    len(fda_direct), [d for d in verified_drugs if d.lower() in q_lower])
                except Exception as fda_exc:
                    logger.debug("Direct FDA lookup skipped: %s", fda_exc)

                # Direct guideline lookup — only when original retrieval was poor.
                # If FAISS cosine ≥ 0.85 the original chunks were already relevant;
                # adding guideline sections here can pull in wrong topic areas
                # (e.g., ADA Section 2 Diagnosis instead of Section 9 Treatment).
                guideline_direct: list[dict] = []
                if top_faiss_cosine < 0.85:
                    try:
                        guideline_direct = app.state.retriever.get_guideline_chunks(question_to_use)
                        if guideline_direct:
                            logger.info("Direct guideline lookup found %d chunks", len(guideline_direct))
                    except Exception as gl_exc:
                        logger.debug("Direct guideline lookup skipped: %s", gl_exc)
                else:
                    logger.debug("Skipping guideline direct lookup (FAISS cosine=%.4f ≥ 0.85, original retrieval was high-quality)", top_faiss_cosine)

                # Merge: guideline chunks + FDA chunks + fresh retrieval
                fda_direct = guideline_direct + fda_direct

                # For drug/clinical questions, expand query toward authoritative sources
                _drug_terms = ("contraindication", "dosage", "dose", "interaction",
                               "warning", "adverse", "side effect", "mechanism")
                _q_lower = question_to_use.lower()
                retry_query = (
                    f"FDA drug label clinical guideline {question_to_use}"
                    if any(t in _q_lower for t in _drug_terms)
                    else question_to_use
                )
                fresh_results = app.state.retriever.search(retry_query, top_k=req.top_k)
                fresh_chunks: list[dict] = []
                for chunk_text, meta, score in fresh_results:
                    fresh_chunks.append({
                        "text": chunk_text, "chunk_id": meta.get("chunk_id"),
                        "source": meta.get("source", ""), "pub_type": meta.get("pub_type", ""),
                        "pub_year": meta.get("pub_year"), "title": meta.get("title", ""),
                    })
                # Merge: direct lookups first (FDA/guidelines), then fresh retrieval
                base_chunks = fresh_chunks if fresh_chunks else context_chunks
                retry_chunks = (fda_direct + base_chunks)[:req.top_k] if fda_direct else base_chunks
                logger.info("Re-retrieval for intervention: %d fresh chunks (top source: %s)",
                            len(retry_chunks),
                            retry_chunks[0].get("pub_type", "?") if retry_chunks else "none")
            except Exception:
                retry_chunks = context_chunks

            answer = generate_strict_answer(question_to_use, retry_chunks, _cfg, overrides=llm_overrides)
            # Re-evaluate the corrected answer
            eval_result = run_evaluation(
                question=question_to_use,
                answer=answer,
                context_chunks=retry_chunks,
                run_ragas=False,  # skip RAGAS on retry to reduce latency
                config=_cfg,
            )
            details = eval_result.details or {}
            composite = float(eval_result.score)
            hrs = int(round(100 * (1.0 - composite)))
            hrs = max(0, min(100, hrs))
            mod_results = details.get("module_results", {})
        except Exception as exc:
            logger.error("Strict regeneration failed: %s — keeping original answer", exc)
            answer = original_answer  # fall back gracefully
            original_answer = None

        intervention_applied = True
        intervention_reason = "HIGH_RISK_REGENERATED"
        intervention_details = {
            "hrs_original": original_hrs,
            "hrs_corrected": hrs,
            "faithfulness_original": faith_score,
            "faithfulness_corrected": (mod_results.get("faithfulness") or {}).get("score", 0),
            "message": "Response regenerated with strict context-only prompt due to high risk score.",
        }
    # =========================================================================

    # Step 4: Build response
    total_ms = int((_time.perf_counter() - t_total) * 1000)
    logger.info("POST /query → HRS=%d (%s) intervention=%s in %d ms total",
                hrs, details.get("risk_band", "?"), intervention_reason or "none", total_ms)

    log_audit("query", question_to_use, answer, hrs, details.get("risk_band", "UNKNOWN"), composite, total_ms, intervention_applied, {
        "module_results": mod_results,
        "confidence_level": details.get("confidence_level", "UNKNOWN"),
        "intervention_reason": intervention_reason,
        "original_answer": original_answer,
    })

    # Save successful evaluation to Safe Semantic Cache
    if q_vec is not None and not coverage_gap:
        try:
            response_dict = {
                "question": question_to_use,
                "generated_answer": answer,
                "retrieved_chunks": [
                    {
                        "chunk_id": c.chunk_id,
                        "text": c.text,
                        "source": c.source,
                        "pub_type": c.pub_type,
                        "pub_year": c.pub_year,
                        "title": c.title,
                        "similarity_score": c.similarity_score
                    } for c in retrieved_chunks_out
                ],
                "composite_score": composite,
                "hrs": hrs,
                "confidence_level": details.get("confidence_level", "UNKNOWN"),
                "risk_band": details.get("risk_band", "UNKNOWN"),
                "module_results": mod_results,
                "intervention_applied": intervention_applied,
                "intervention_reason": intervention_reason,
                "original_answer": original_answer,
                "intervention_details": intervention_details,
                "consensus_results": consensus_results,
                "privacy_applied": privacy_applied,
                "privacy_details": {"redacted_count": len(p_mapping)} if privacy_applied else None,
                "original_hinglish_query": original_hinglish,
                "coverage_gap": coverage_gap,
                "coverage_gap_details": coverage_gap_details,
            }
            semantic_cache.store(
                query_text=question_to_use,
                query_emb=q_vec,
                response=response_dict,
                patient_allergies=req.patient_allergies or [],
                department=req.department or "default",
                overrides=llm_overrides
            )
        except Exception as exc:
            logger.error("Failed to store in semantic cache: %s", exc)

    return QueryResponse(
        question=question_to_use,
        generated_answer=answer,
        retrieved_chunks=retrieved_chunks_out,
        composite_score=composite,
        hrs=hrs,
        confidence_level=details.get("confidence_level", "UNKNOWN"),
        risk_band=details.get("risk_band", "UNKNOWN"),
        module_results=ModuleResults(
            faithfulness=_module_score(mod_results, "faithfulness"),
            entity_verifier=_module_score(mod_results, "entity_verifier"),
            source_credibility=_module_score(mod_results, "source_credibility"),
            contradiction=_module_score(mod_results, "contradiction"),
            ragas=_module_score(mod_results, "ragas"),
        ),
        total_pipeline_ms=total_ms,
        intervention_applied=intervention_applied,
        intervention_reason=intervention_reason,
        original_answer=original_answer,
        intervention_details=intervention_details,
        consensus_results=consensus_results,
        privacy_applied=privacy_applied,
        privacy_details={"redacted_count": len(p_mapping)} if privacy_applied else None,
        original_hinglish_query=original_hinglish,
        coverage_gap=coverage_gap,
        coverage_gap_details=coverage_gap_details,
    )

# ---------------------------------------------------------------------------
# POST /ingest — dynamically append new documents to the FAISS index
# ---------------------------------------------------------------------------
_faiss_lock = threading.Lock()

@app.post("/ingest", tags=["ingestion"])
def ingest_document(req: IngestRequest):
    """
    Dynamically ingest a new document into the running FAISS index.
    Thread-safe implementation uses a lock to prevent concurrent write corruption.
    """
    import pickle
    import faiss
    from src.pipeline.chunker import chunk_documents


    retriever = getattr(app.state, "retriever", None)
    if retriever is None or retriever._index is None:
        raise HTTPException(status_code=503, detail="Retriever not pre-warmed. Cannot ingest.")

    logger.info("POST /ingest — title='%s', size=%d chars", req.title, len(req.text))
    
    # 1. Chunk the document
    doc = {
        "text": req.text,
        "doc_id": "custom_" + req.title[:10],
        "title": req.title,
        "source": req.source,
        "pub_type": req.pub_type,
        "pub_year": 2026,
    }
    chunks = chunk_documents([doc], _cfg)
    
    if not chunks:
        raise HTTPException(status_code=400, detail="Document produced 0 chunks.")

    # 2. Embed the chunks using the same BioBERT model as the retriever
    from src.pipeline.embedder import encode_texts
    import numpy as np

    # Reuse already-loaded SentenceTransformer from the retriever to avoid double RAM load
    if retriever._model is None:
        retriever._load_model()
    st_model = retriever._model
    
    texts = [c["chunk_text"] for c in chunks]
    embeddings = np.array(st_model.encode(texts, show_progress_bar=False), dtype=np.float32)
    faiss.normalize_L2(embeddings)  # Required: index is IndexFlatIP = cosine sim

    # 3. Thread-safe Index Update with atomic disk writes
    with _faiss_lock:
        import os
        idx_path = Path(_cfg["retrieval"]["index_path"])
        meta_path = Path(_cfg["retrieval"]["metadata_path"])
        
        index = retriever._index
        metadata_store = retriever._metadata

        start_id = len(metadata_store)
        
        # Add to in-memory structures
        for i, chunk in enumerate(chunks):
            metadata_store[start_id + i] = chunk
            
        # Add to FAISS in memory
        index.add(embeddings)
        
        # Atomic FAISS write: write to temp → rename (never leaves a half-written file)
        idx_tmp = str(idx_path) + ".tmp"
        faiss.write_index(index, idx_tmp)
        os.replace(idx_tmp, str(idx_path))
        
        # Atomic metadata write
        meta_tmp = str(meta_path) + ".tmp"
        with open(meta_tmp, "wb") as f:
            pickle.dump(metadata_store, f)
        os.replace(meta_tmp, str(meta_path))

        # 4. Rebuild BM25 for the running instance
        retriever.rebuild_bm25()
            
    logger.info("Successfully injected %d chunks for '%s' into FAISS and BM25.", len(chunks), req.title)
    return {"status": "success", "chunks_added": len(chunks), "title": req.title}

# ---------------------------------------------------------------------------
# GET /logs and /stats — fetch history for dashboard
# ---------------------------------------------------------------------------
@app.get("/logs", tags=["dashboard"])
def get_logs(limit: int = 50):
    try:
        conn = sqlite3.connect("data/logs.db")
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", (limit,))
        rows = c.fetchall()
        conn.close()
        return [dict(ix) for ix in rows]
    except Exception as e:
        return []

@app.get("/stats", tags=["dashboard"])
def get_stats():
    try:
        conn = sqlite3.connect("data/logs.db")
        c = conn.cursor()
        c.execute("SELECT COUNT(*), AVG(hrs), SUM(CASE WHEN risk_band='CRITICAL' THEN 1 ELSE 0 END) FROM audit_logs")
        total_evals, avg_hrs, crit_alerts = c.fetchone()
        
        c.execute("SELECT SUM(CASE WHEN intervention_applied=1 THEN 1 ELSE 0 END) FROM audit_logs")
        interventions = c.fetchone()[0]

        # Monthly data example
        monthly_query = "SELECT SUBSTR(timestamp, 1, 7) as month, AVG(hrs) FROM audit_logs GROUP BY month ORDER BY month LIMIT 12"
        c.execute(monthly_query)
        monthly_data = [{"month": row[0], "avg_hrs": row[1]} for row in c.fetchall()]

        conn.close()
        return {
            "totalEvals": total_evals or 0,
            "avgHrs": round(avg_hrs or 0, 1),
            "critAlerts": crit_alerts or 0,
            "interventions": interventions or 0,
            "monthly": monthly_data
        }
    except Exception as e:
        return {
            "totalEvals": 0, "avgHrs": 0, "critAlerts": 0, "interventions": 0, "monthly": []
        }

# ---------------------------------------------------------------------------
# POST /parse_file — helper for frontend to extract PDF/DOCX text
# ---------------------------------------------------------------------------
@app.post("/parse_file", tags=["ingestion"])
async def parse_file(file: UploadFile = File(...)):
    """Extract text from uploaded txt, md, pdf, or docx files."""
    content = await file.read()
    filename = file.filename.lower()
    text = ""
    try:
        if filename.endswith(".pdf"):
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            msgs = []
            for page in doc:
                msgs.append(page.get_text())
            text = "\n".join(msgs)
        elif filename.endswith(".docx"):
            import docx
            from io import BytesIO
            doc = docx.Document(BytesIO(content))
            text = "\n".join([p.text for p in doc.paragraphs])
        else:
            text = content.decode("utf-8", errors="replace")
        return {"status": "success", "text": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

