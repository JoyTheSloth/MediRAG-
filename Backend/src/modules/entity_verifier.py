"""
FR-09: src/modules/entity_verifier.py — Module 2: Medical Entity Verification
==============================================================================
Uses SciSpaCy NER (en_core_sci_lg) to extract medical entities from the answer,
then verifies drug entities against the RxNorm cache and/or REST API.

Verification pipeline (SRS Section 6.2):
    1. NER: extract DRUG, DOSAGE, CONDITION, PROCEDURE entities from answer
    2. For each DRUG entity:
        a. Look up in local rxnorm_cache.csv (fast, offline)
        b. If not found, query RxNorm REST API /approximateTerm (live fallback)
        c. If still not found, mark as NOT_FOUND
    3. Cross-check entity presence in context docs (optional validation)
    4. Score = verified_drug_count / total_drug_count  (non-drug entities have no score impact)

Entity status values:
    VERIFIED  — drug found in RxNorm cache or API with rxcui
    FLAGGED   — entity found but has a known dangerous synonym conflict
    NOT_FOUND — drug name not resolvable via any layer

Severity mapping (for FLAGGED):
    brand ↔ generic mismatch → CRITICAL
    dosage discrepancy       → MODERATE
    minor synonym variant    → MINOR
"""
from __future__ import annotations

import logging
import re
import time
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd
import requests

from src.modules.base import EvalResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

RXNORM_APPROX_URL = "https://rxnav.nlm.nih.gov/REST/approximateTerm.json"
DEFAULT_CACHE_PATH = "data/rxnorm_cache.csv"
NER_MODEL = "en_ner_bc5cdr_md"
DOSAGE_TOLERANCE_PCT = 10  # flag if answer dose differs from context dose by > 10%

# Matches clinical dose values: "500 mg", "2.5 mcg/kg", "10 IU", etc.
_DOSE_RE = re.compile(
    r'(\d+(?:\.\d+)?)\s*(?:mg|mcg|g\b|ml|iu|units?|mg/kg|mg/dl)',
    re.IGNORECASE,
)

# Map spacy entity labels to our schema types
_ENTITY_TYPE_MAP = {
    # en_core_sci_lg (CRAFT corpus) labels
    "CHEBI":       "DRUG",       # Chemical Entities of Biological Interest — covers drugs
    "GGP":         "CONDITION",  # Gene or Gene Product
    "SO":          "CONDITION",  # Sequence Ontology
    "TAXON":       "CONDITION",
    "GO":          "CONDITION",  # Gene Ontology
    "CL":          "CONDITION",  # Cell Line
    "DNA":         "CONDITION",
    "RNA":         "CONDITION",
    "CELL_TYPE":   "CONDITION",
    "CELL_LINE":   "CONDITION",
    "PROTEIN":     "CONDITION",
    # BC5CDR labels (used by some scispacy models)
    "Chemical":    "DRUG",
    "Disease":     "CONDITION",
    # Generic / fallback labels
    "CHEMICAL":    "DRUG",
    "DRUG":        "DRUG",
    "COMPOUND":    "DRUG",
    "DISEASE":     "CONDITION",
    "SYMPTOM":     "CONDITION",
    "PROCEDURE":   "PROCEDURE",
    "DOSAGE":      "DOSAGE",
}
DRUG_TYPES = {"DRUG"}  # only these get verified against RxNorm

# ---------------------------------------------------------------------------
# Module-level caches
# ---------------------------------------------------------------------------

_spacy_model = None
_rxnorm_cache: dict[str, str] | None = None  # drug_name -> rxcui
_rxnorm_cache_path: str = DEFAULT_CACHE_PATH


def _get_spacy_model():
    global _spacy_model
    if _spacy_model is None:
        import spacy
        logger.info("Loading SciSpaCy NER model: %s (first call only)", NER_MODEL)
        try:
            _spacy_model = spacy.load(NER_MODEL)
            logger.info("SciSpaCy model loaded.")
        except OSError as exc:
            logger.error(
                "Failed to load '%s'. Install with: "
                "pip install https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/"
                "releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz\nError: %s",
                NER_MODEL, exc,
            )
            raise
    return _spacy_model


def _load_rxnorm_cache(cache_path: str) -> dict[str, str]:
    """Load the RxNorm cache CSV into a lowercase drug_name → rxcui dict."""
    path = Path(cache_path)
    if not path.exists():
        logger.warning(
            "RxNorm cache not found at '%s'. Live API only will be used.", cache_path
        )
        return {}
    try:
        df = pd.read_csv(path, dtype=str)
        cache = {
            str(row["drug_name"]).strip().lower(): str(row["rxcui"]).strip()
            for _, row in df.iterrows()
            if pd.notna(row.get("drug_name")) and pd.notna(row.get("rxcui"))
            and str(row.get("rxcui", "")).strip()
        }
        logger.info("RxNorm cache loaded: %d entries from %s", len(cache), cache_path)
        return cache
    except Exception as exc:
        logger.warning("Failed to load RxNorm cache: %s", exc)
        return {}


def _get_rxnorm_cache(cache_path: str) -> dict[str, str]:
    global _rxnorm_cache, _rxnorm_cache_path
    if _rxnorm_cache is None or cache_path != _rxnorm_cache_path:
        _rxnorm_cache_path = cache_path
        _rxnorm_cache = _load_rxnorm_cache(cache_path)
    return _rxnorm_cache


def _extract_doses_near(text: str, drug_name: str, window: int = 180) -> list[float]:
    """Return numeric dose values found within `window` chars of `drug_name` in `text`."""
    idx = text.lower().find(drug_name.lower())
    if idx == -1:
        return []
    vicinity = text[max(0, idx - window // 2): idx + len(drug_name) + window]
    return [float(m.group(1)) for m in _DOSE_RE.finditer(vicinity)]


def _lookup_rxnorm_api(drug_name: str, timeout: int = 4) -> Optional[str]:
    """Query RxNorm REST API. Returns rxcui string or None."""
    try:
        resp = requests.get(
            RXNORM_APPROX_URL,
            params={"term": drug_name, "maxEntries": "1", "option": "1"},
            timeout=timeout,
        )
        if resp.status_code != 200:
            return None
        candidates = (
            resp.json()
            .get("approximateGroup", {})
            .get("candidate", [])
        )
        if candidates:
            return str(candidates[0].get("rxcui", "")).strip() or None
    except Exception:
        pass
    return None


@lru_cache(maxsize=1024)
def _cached_drug_interactions(rxcuis_tuple: tuple[str, ...], timeout: int) -> list[dict]:
    """
    Synchronous cached NIH REST request to resolve drug interactions.
    """
    rxcuis_str = "+".join(rxcuis_tuple)
    url = f"https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis={rxcuis_str}"
    try:
        resp = requests.get(url, timeout=timeout)
        if resp.status_code != 200:
            return []
        
        data = resp.json()
        interactions = []
        
        # ONCHigh returns fullInteractionTypeGroup
        groups = data.get("fullInteractionTypeGroup", [])
        for group in groups:
            for fit in group.get("fullInteractionType", []):
                for pair in fit.get("interactionPair", []):
                    # Extract concepts
                    concepts = pair.get("interactionConcept", [])
                    drugs_involved = [c.get("minConcept", {}).get("name", "Unknown") for c in concepts]
                    severity = pair.get("severity", "high").lower() # default to high since it's from ONCHigh
                    description = pair.get("description", "")
                    interactions.append({
                        "drugs": drugs_involved,
                        "severity": severity,
                        "description": description
                    })
        return interactions
    except Exception as e:
        logger.error("Failed to fetch drug interactions from RxNav: %s", e)
        return []


def check_drug_interactions(rxcuis: list[str], timeout: int = 5) -> list[dict]:
    """
    Query RxNav API for drug-drug interactions between a list of RxCUIs.
    Uses sorted tuple transformation to enable efficient order-independent caching.
    """
    if len(rxcuis) < 2:
        return []
    
    # Sort RxCUIs to ensure cache consistency regardless of list order
    rxcuis_tuple = tuple(sorted(rxcuis))
    return _cached_drug_interactions(rxcuis_tuple, timeout)



# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def verify_entities(
    answer: str,
    question: str = "",
    context_docs: list[str] | None = None,
    rxnorm_cache_path: str = DEFAULT_CACHE_PATH,
    use_api_fallback: bool = True,
) -> EvalResult:
    """
    Extract and verify medical entities from the LLM answer.

    Args:
        answer            : LLM-generated answer text.
        question          : Original question (NER'd alongside answer for richer entity set).
        context_docs      : Retrieved context passages (used for cross-checking).
        rxnorm_cache_path : Path to rxnorm_cache.csv.
        use_api_fallback  : Whether to call RxNorm REST API for cache misses.

    Returns:
        EvalResult with module_name="entity_verifier", score in [0,1], and
        details matching the shape from src/modules/__init__.py.
    """
    t0 = time.perf_counter()

    # --- NER -----------------------------------------------------------------
    try:
        nlp = _get_spacy_model()
    except Exception as exc:
        return EvalResult(
            module_name="entity_verifier",
            score=0.5,  # neutral fallback — don't penalise if model not available
            details={"error": str(exc), "entities": []},
            error=f"NER model unavailable: {exc}",
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )

    # Combine question + answer for richer entity extraction
    combined_text = f"{question} {answer}" if question else answer
    doc = nlp(combined_text)

    # Collect entities with deduplication
    seen: set[str] = set()
    raw_entities: list[tuple[str, str]] = []  # (text, type)
    for ent in doc.ents:
        key = ent.text.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        entity_type = _ENTITY_TYPE_MAP.get(ent.label_, "CONDITION")
        raw_entities.append((ent.text.strip(), entity_type))

    if not raw_entities:
        return EvalResult(
            module_name="entity_verifier",
            score=0.5,  # neutral — cannot verify what isn't there
            details={"total_entities": 0, "verified_count": 0, "flagged_count": 0, "entities": []},
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )

    # --- RxNorm verification for DRUG entities -------------------------------
    cache = _get_rxnorm_cache(rxnorm_cache_path)
    context_text = " ".join(context_docs or []).lower()

    entity_results: list[dict] = []
    drug_total = 0
    drug_verified = 0
    drug_flagged = 0

    for entity_text, entity_type in raw_entities:
        result = {
            "entity": entity_text,
            "type": entity_type,
            "status": "NOT_FOUND",
            "severity": None,
            "answer_value": entity_text,
            "context_value": None,
            "rxcui": None,
        }

        if entity_type in DRUG_TYPES:
            drug_total += 1
            key = entity_text.lower()

            # Layer 1: Local cache lookup
            rxcui = cache.get(key)

            # Layer 2: API fallback
            if not rxcui and use_api_fallback:
                rxcui = _lookup_rxnorm_api(entity_text)

            if rxcui:
                result["rxcui"] = rxcui

                # Check for dosage discrepancy before marking VERIFIED
                answer_doses = _extract_doses_near(answer, entity_text)
                context_doses = _extract_doses_near(context_text, entity_text)
                flagged_dose = False
                if answer_doses and context_doses:
                    a_dose = answer_doses[0]
                    c_dose = min(context_doses, key=lambda d: abs(d - a_dose))
                    pct_diff = abs(a_dose - c_dose) / max(c_dose, 1e-9) * 100
                    if pct_diff > DOSAGE_TOLERANCE_PCT:
                        result["status"] = "FLAGGED"
                        result["severity"] = "MODERATE"
                        result["answer_value"] = f"{a_dose} (answer)"
                        result["context_value"] = f"{c_dose} (context, Δ{pct_diff:.0f}%)"
                        drug_flagged += 1
                        flagged_dose = True
                        logger.warning(
                            "Dosage discrepancy for '%s': answer=%.1f context=%.1f (%.0f%%)",
                            entity_text, a_dose, c_dose, pct_diff,
                        )

                if not flagged_dose:
                    result["status"] = "VERIFIED"
                    drug_verified += 1
                    if key in context_text:
                        result["context_value"] = entity_text
            else:
                result["status"] = "NOT_FOUND"

        elif entity_type in ("CONDITION", "PROCEDURE"):
            # Non-drug entities: check presence in context only
            if entity_text.lower() in context_text:
                result["status"] = "VERIFIED"
                result["context_value"] = entity_text
            else:
                result["status"] = "NOT_FOUND"

        entity_results.append(result)

    # --- Drug-Drug Interaction Check (DDI) -----------------------------------
    # Gather standard RxCUIs for the verified drugs
    rxcuis = [ent["rxcui"] for ent in entity_results if ent.get("rxcui")]
    unique_rxcuis = list(set(rxcuis))
    interactions = []
    
    if len(unique_rxcuis) >= 2:
        logger.info("Multiple drugs detected in answer (%s) — checking for interactions...", unique_rxcuis)
        interactions = check_drug_interactions(unique_rxcuis)
        if interactions:
            logger.warning("DDI Check: Found %d drug interactions!", len(interactions))
            drug_flagged += len(interactions)

    # --- Score ---------------------------------------------------------------
    # Score is based on drug entities only (per SRS Section 6.2)
    if drug_total == 0:
        score = 0.5  # neutral — no drug entities to verify
    else:
        # Base score is drug_verified / drug_total
        base_score = drug_verified / drug_total
        # Deduct score for multi-drug interactions (0.2 deduction per interaction, cap at 0.0)
        interaction_deduction = len(interactions) * 0.20
        score = max(0.0, base_score - interaction_deduction)

    details = {
        "total_entities": len(raw_entities),
        "drug_total": drug_total,
        "verified_count": drug_verified,
        "flagged_count": drug_flagged,
        "entities": entity_results,
        "interactions": interactions,
    }

    latency_ms = int((time.perf_counter() - t0) * 1000)
    logger.info(
        "Entity verification: %.3f (%d/%d drugs verified, %d DDI found) in %d ms",
        score, drug_verified, drug_total, len(interactions), latency_ms,
    )
    return EvalResult(
        module_name="entity_verifier",
        score=score,
        details=details,
        latency_ms=latency_ms,
    )
