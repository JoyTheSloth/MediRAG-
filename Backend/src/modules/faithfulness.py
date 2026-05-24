"""
FR-05: src/modules/faithfulness.py — Module 1: Faithfulness Scoring
=====================================================================
Uses cross-encoder/nli-deberta-v3-small to score how well the LLM answer
is entailed by the retrieved context chunks.

Architecture:
    1. Split answer into individual claims (sentences via pysbd)
    2. For each claim: compute NLI score against every context chunk
    3. Assign claim status: ENTAILED / NEUTRAL / CONTRADICTED
    4. score = entailed_count / total_claims

Thresholds (SRS Section 6.1):
    entailment  ≥ 0.50  → ENTAILED
    contradiction ≥ 0.30 → CONTRADICTED
    otherwise           → NEUTRAL

Model loaded lazily and cached at module level (avoids double-loading
when called multiple times in same process).
"""
from __future__ import annotations

import logging
import time
from functools import lru_cache
from typing import TYPE_CHECKING

from src.modules.base import EvalResult

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# BioLinkBERT fine-tuned on MedNLI (clinical notes, MIMIC-III)
# Paper 15 (Chen et al. SemEval-2023): best single model for biomedical NLI (F1=0.765)
# Faster on CPU than DeBERTa-large (BERT-base architecture)
MODEL_NAME = "cnut1648/biolinkbert-mednli"

# MedNLI label order (verified): {0: entailment, 1: neutral, 2: contradiction}
LABEL_ENTAILMENT = 0
LABEL_NEUTRAL = 1
LABEL_CONTRADICTION = 2

ENTAILMENT_THRESHOLD = 0.50
CONTRADICTION_THRESHOLD = 0.30

# ---------------------------------------------------------------------------
# Lazy model loader
# ---------------------------------------------------------------------------

_model = None
_segmenter = None


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import CrossEncoder
            logger.info("Loading NLI model: %s (first call only)", MODEL_NAME)
            _model = CrossEncoder(MODEL_NAME)
            logger.info("NLI model loaded.")
        except ImportError:
            logger.error("sentence_transformers not installed. Faithfulness will be stubbed.")
            _model = "stub"
    return _model

def _get_segmenter():
    global _segmenter
    if _segmenter is None:
        try:
            import pysbd
            _segmenter = pysbd.Segmenter(language="en", clean=False)
        except ImportError:
            _segmenter = "stub"
    return _segmenter


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def score_faithfulness(
    answer: str,
    context_docs: list[str],
    chunk_ids: list[str] | None = None,
    max_chunks: int = 3,
    config: dict | None = None,
) -> EvalResult:
    """
    Score the faithfulness of an answer against retrieved context documents.

    Args:
        answer       : The LLM-generated answer text.
        context_docs : List of context passage strings (top-k retrieved chunks).
        chunk_ids    : Optional IDs matching context_docs for traceability.
        max_chunks   : Maximum context chunks to consider (to limit API calls).

    Returns:
        EvalResult with module_name="faithfulness", score in [0,1], and details
        dict matching the shape defined in src/modules/__init__.py.
    """
    t0 = time.perf_counter()

    _faith_cfg = (config or {}).get("modules", {}).get("faithfulness", {})
    entailment_threshold = _faith_cfg.get("entailment_threshold", ENTAILMENT_THRESHOLD)
    contradiction_threshold = CONTRADICTION_THRESHOLD

    if not answer or not context_docs:
        return EvalResult(
            module_name="faithfulness",
            score=0.0,
            details={"error": "Empty answer or no context provided"},
            error="Empty answer or no context",
            latency_ms=0,
        )

    # Limit context size
    docs = context_docs[:max_chunks]
    ids = (chunk_ids or [f"chunk_{i}" for i in range(len(docs))])[:max_chunks]

    # Strip markdown formatting from guideline/structured chunks before NLI
    # DeBERTa NLI was trained on clean prose — markdown confuses it
    import re as _re
    _MD_CLEAN = _re.compile(r'\[([^\]]+)\]\n|#{1,6}\s+|•\s+|\*\*([^*]+)\*\*|\*([^*]+)\*|`[^`]+`')
    docs = [_MD_CLEAN.sub(lambda m: m.group(2) or m.group(3) or '', d) for d in docs]

    # Strip inline citations and markdown from the answer before claim splitting.
    # LLM answers often include [Source: *title*] citations and **bold** text that
    # confuse BioLinkBERT NLI — the model was trained on clean prose.
    _CITE_RE = _re.compile(
        r'\[Source:[^\]]*\]'           # [Source: title] or [Source: *italic title*]
        r'|\[[^\]]{0,120}\]'           # other short bracket constructs
        r'|\*\*([^*]+)\*\*'            # **bold** → keep inner text
        r'|\*([^*]+)\*'                # *italic* → keep inner text
        r'|`[^`]+`'                    # `code`
        r'|^\s*[*•]\s+'               # bullet points at line start
    )
    answer_clean = _CITE_RE.sub(lambda m: (m.group(1) or m.group(2) or ''), answer).strip()

    # Split answer into claims
    seg = _get_segmenter()
    try:
        if seg == "stub":
            claims = [s.strip() for s in answer_clean.split(".") if s.strip()]
        else:
            claims = [s.strip() for s in seg.segment(answer_clean) if s.strip()]
    except Exception:
        claims = [s.strip() for s in answer_clean.split(".") if s.strip()]

    if not claims:
        return EvalResult(
            module_name="faithfulness",
            score=0.5,
            details={"error": "Could not extract claims from answer"},
            error="No claims extracted",
            latency_ms=0,
        )

    model = _get_model()

    # Limit claims to avoid O(claims×chunks) explosion with the large model
    claims = claims[:12]

    # ---------------------------------------------------------------------------
    # Numerical Bypass (Paper 14: non-optional for clinical NLI)
    # NLI models structurally cannot verify numerical comparisons (≥6.5%, 126 mg/dL).
    # Use direct string/lexical matching for claims containing clinical measurements.
    # ---------------------------------------------------------------------------
    import re as _re2
    _NUM_PATTERN = _re2.compile(
        r'[\d]+[\s]*(mg|mcg|%|mL|mmol|IU|units?|g|kg|≥|≤|>|<|±|mg/dL|mmol/L|mg/kg)',
        _re2.IGNORECASE,
    )

    def _numerical_match(claim: str, context_chunks: list[str]) -> str:
        """
        For claims with numerical clinical values, check if the key numbers
        appear in any context chunk. Returns ENTAILED or NEUTRAL.
        """
        nums = _re2.findall(r'[\d]+\.?[\d]*', claim)
        if not nums:
            return "NEUTRAL"
        combined = " ".join(context_chunks).lower()
        matched = sum(1 for n in nums if n in combined)
        return "ENTAILED" if matched >= len(nums) * 0.6 else "NEUTRAL"

    # Separate numerical claims (bypass NLI) from textual claims (use NLI)
    numerical_results: dict[int, str] = {}  # claim_idx → status
    nli_claim_indices: list[int] = []

    for ci, claim in enumerate(claims):
        if _NUM_PATTERN.search(claim):
            numerical_results[ci] = _numerical_match(claim, docs)
        else:
            nli_claim_indices.append(ci)

    # Build NLI pairs only for non-numerical claims
    nli_claims = [claims[ci] for ci in nli_claim_indices]
    all_pairs = []
    pair_map: list[tuple[int, int]] = []  # (nli_claim_idx, doc_idx)
    for nci, claim in enumerate(nli_claims):
        for di, doc in enumerate(docs):
            all_pairs.append((doc, claim))
            pair_map.append((nci, di))

    # Batch NLI inference
    try:
        if model == "stub":
            # Provide dummy scores if model is unavailable
            scores_raw = [[0.1, 0.1, 0.8] for _ in all_pairs]
        else:
            scores_raw = model.predict(all_pairs, apply_softmax=True)
    except Exception as exc:
        logger.error("NLI model inference failed: %s", exc)
        return EvalResult(
            module_name="faithfulness",
            score=0.0,
            details={},
            error=f"Model inference error: {exc}",
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )

    # Aggregate: for each claim find the context with the highest entailment
    claim_results: list[dict] = []
    entailed = 0
    neutral = 0
    contradicted = 0

    # Build per-NLI-claim best scores from batch results
    nli_best: dict[int, tuple[float, float, int]] = {}  # nci → (best_ent, best_con, best_doc)
    for idx, (nci, d_i) in enumerate(pair_map):
        score_vec = scores_raw[idx]
        ent_score = float(score_vec[LABEL_ENTAILMENT])
        con_score = float(score_vec[LABEL_CONTRADICTION])
        if nci not in nli_best or ent_score > nli_best[nci][0]:
            nli_best[nci] = (ent_score, con_score, d_i)

    for ci, claim in enumerate(claims):
        if ci in numerical_results:
            # Numerical bypass — lexical match result
            status = numerical_results[ci]
            nli_score = 1.0 if status == "ENTAILED" else 0.0
            best_doc_idx = 0
            method = "numerical_bypass"
        else:
            # NLI result
            nci = nli_claim_indices.index(ci) if ci in nli_claim_indices else -1
            best_entailment, best_contradiction, best_doc_idx = nli_best.get(nci, (0.0, 0.0, 0))
            if best_entailment >= entailment_threshold:
                status = "ENTAILED"
                nli_score = best_entailment
            elif best_contradiction >= contradiction_threshold:
                status = "CONTRADICTED"
                nli_score = best_contradiction
            else:
                status = "NEUTRAL"
                nli_score = best_entailment
            method = "nli"

        if status == "ENTAILED":
            entailed += 1
        elif status == "CONTRADICTED":
            contradicted += 1
        else:
            neutral += 1

        claim_results.append({
            "claim": claim,
            "status": status,
            "best_chunk_id": ids[best_doc_idx],
            "nli_score": round(nli_score, 4),
            "method": method,
        })

    total = len(claims)
    score = max(0.0, (entailed - contradicted) / total) if total > 0 else 0.0
    usr_val = round((neutral + contradicted) / total, 4) if total > 0 else 0.0

    details = {
        "total_claims": total,
        "entailed_count": entailed,
        "neutral_count": neutral,
        "contradicted_count": contradicted,
        "unsupported_sentence_ratio": usr_val,
        "claims": claim_results,
    }

    latency_ms = int((time.perf_counter() - t0) * 1000)
    logger.info(
        "Faithfulness: %.3f (%d/%d entailed) in %d ms",
        score, entailed, total, latency_ms,
    )
    return EvalResult(
        module_name="faithfulness",
        score=score,
        details=details,
        latency_ms=latency_ms,
    )
