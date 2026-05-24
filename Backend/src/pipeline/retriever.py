"""
FR-04: Vector Retrieval
=======================
FAISS IndexFlatIP with L2-normalised vectors (inner product = cosine similarity).
Returns top-k chunks as (chunk_text, metadata_dict, similarity_score) tuples.

Usage (as a module):
    from src.pipeline.retriever import Retriever
    r = Retriever(config)
    results = r.search("What is the treatment for Type 2 Diabetes?")
    for text, meta, score in results:
        print(score, meta["pub_type"], text[:80])

Usage (smoke test):
    python src/pipeline/retriever.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import logging
import pickle
from typing import Any

try:
    import faiss
except ImportError:
    faiss = None

import numpy as np
import yaml

logger = logging.getLogger(__name__)


class Retriever:
    """
    Hybrid FAISS + BM25 document retriever.

    On first search, lazily builds a BM25 index over all chunk texts.
    Each search runs both FAISS (semantic) and BM25 (keyword) then merges
    results using Reciprocal Rank Fusion (RRF) for best-of-both precision
    and recall.
    """

    RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    RERANK_CANDIDATES = 60   # retrieve this many via RRF, then re-rank to top_k

    def __init__(self, config: dict) -> None:
        self.config        = config
        self.top_k: int    = config["retrieval"]["top_k"]
        self.model_name: str = config["retrieval"]["embedding_model"]
        self.index_path: str = config["retrieval"]["index_path"]
        self.meta_path: str  = config["retrieval"]["metadata_path"]

        self._model     = None
        self._reranker  = None   # cross-encoder re-ranker, loaded lazily
        self._index     = None
        self._metadata: dict[int, dict] | None = None
        self._bm25      = None          # built lazily on first search
        self._bm25_ids: list[int] = []  # maps bm25 row → faiss_idx

    # ------------------------------------------------------------------
    # Private loaders (lazy)
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading BioBERT: %s", self.model_name)
                self._model = SentenceTransformer(self.model_name)
                logger.info("BioBERT model loaded successfully.")
            except ImportError as e:
                logger.error("sentence_transformers not installed: %s", e)
                self._model = None
            except Exception as e:
                logger.error("Failed to load embedding model '%s': %s — FAISS search will be skipped, falling back to BM25.", self.model_name, e)
                self._model = None

    def _load_reranker(self) -> None:
        if self._reranker is None:
            try:
                from sentence_transformers import CrossEncoder
                logger.info("Loading re-ranker: %s", self.RERANKER_MODEL)
                self._reranker = CrossEncoder(self.RERANKER_MODEL)
                logger.info("Re-ranker loaded.")
            except Exception as e:
                logger.warning("Re-ranker unavailable (%s) — falling back to RRF ranking.", e)
                self._reranker = "unavailable"

    def _load_index(self) -> None:
        if self._index is not None:
            return

        idx_path  = Path(self.index_path)
        meta_path = Path(self.meta_path)

        if not idx_path.exists():
            raise FileNotFoundError(
                f"FAISS index not found at '{idx_path}'. "
                "Run python src/pipeline/ingest.py && python src/pipeline/embedder.py first."
            )

        try:
            logger.info("Loading FAISS index from %s", idx_path)
            if faiss is not None:
                self._index = faiss.read_index(str(idx_path))
            else:
                self._index = None
                logger.warning("FAISS not installed — FAISS search disabled.")

            logger.info("Loading metadata store from %s", meta_path)
            with open(meta_path, "rb") as f:
                self._metadata = pickle.load(f)

            logger.info(
                "Retriever ready: %d vectors, %d metadata entries",
                self._index.ntotal if self._index is not None else 0, len(self._metadata),
            )
            # Build drug→FDA chunks lookup (O(1) at query time)
            self._fda_index: dict[str, list[int]] = {}
            for idx, meta in self._metadata.items():
                if meta.get("source") == "FDA DailyMed":
                    doc_id = meta.get("doc_id", "")
                    # doc_id format: fda_{drug_name}_{set_id}
                    parts = doc_id.split("_")
                    drug_key = parts[1].lower() if len(parts) >= 2 else ""
                    if drug_key:
                        self._fda_index.setdefault(drug_key, []).append(idx)
            logger.info("FDA drug index built: %d unique drugs", len(self._fda_index))

            # Build keyword→guideline chunks lookup for clinical guidelines
            self._guideline_index: dict[str, list[int]] = {}
            for idx, meta in self._metadata.items():
                if meta.get("pub_type") == "clinical_guideline":
                    text = (meta.get("chunk_text", "") + " " + meta.get("title", "")).lower()
                    for keyword in [
                        # Diabetes / ADA
                        "diagnosis", "diagnostic", "treatment", "pharmacologic",
                        "glycemic", "insulin", "obesity", "hypoglycemia",
                        "screening", "complication", "pregnancy",
                        "children", "adolescent", "older adult", "hospital",
                        # Cardiovascular / ACC-AHA
                        "hypertension", "blood pressure", "antihypertensive",
                        "statin", "cholesterol", "ldl", "lipid", "triglyceride",
                        "cardiovascular", "coronary", "heart disease", "stroke",
                        "aspirin", "antiplatelet", "anticoagulant",
                        "prevention", "risk reduction", "atherosclerosis",
                        "heart failure", "ejection fraction",
                        "smoking", "exercise", "diet", "lifestyle",
                    ]:
                        if keyword in text:
                            self._guideline_index.setdefault(keyword, []).append(idx)
            logger.info("Guideline index built: %d keyword entries", len(self._guideline_index))
        except Exception as e:
            logger.error("Failed to load FAISS index or metadata: %s", e)
            self._index = None
            if self._metadata is None:
                self._metadata = {}

    def _build_bm25(self) -> None:
        """Build BM25 index from the loaded metadata store (called once)."""
        if self._bm25 is not None:
            return
        self.rebuild_bm25()

    def rebuild_bm25(self) -> None:
        """Build BM25 index — loads from cache if available, otherwise builds and saves."""
        try:
            from rank_bm25 import BM25Okapi
        except ImportError:
            logger.warning("rank-bm25 not installed — falling back to FAISS-only.")
            return

        if self._metadata is None:
            self._load_index()

        # Cache path: alongside the metadata store
        bm25_cache = Path(self.meta_path).parent / "bm25_cache.pkl"
        meta_mtime = Path(self.meta_path).stat().st_mtime if Path(self.meta_path).exists() else 0

        # Load from cache if it exists and is newer than the metadata store
        if bm25_cache.exists() and bm25_cache.stat().st_mtime >= meta_mtime:
            try:
                logger.info("Loading BM25 index from cache %s …", bm25_cache)
                with open(bm25_cache, "rb") as f:
                    cached = pickle.load(f)
                self._bm25 = cached["bm25"]
                self._bm25_ids = cached["ids"]
                logger.info("BM25 cache loaded (%d docs).", len(self._bm25_ids))
                return
            except Exception as e:
                logger.warning("BM25 cache load failed (%s) — rebuilding.", e)

        logger.info("Rebuilding BM25 index over %d chunks…", len(self._metadata))
        corpus_ids: list[int] = []
        corpus_tokens: list[list[str]] = []
        for faiss_idx, meta in self._metadata.items():
            text = meta.get("chunk_text", "")
            if text:
                corpus_ids.append(faiss_idx)
                corpus_tokens.append(text.lower().split())

        self._bm25 = BM25Okapi(corpus_tokens)
        self._bm25_ids = corpus_ids
        logger.info("BM25 index built (%d docs). Saving cache…", len(corpus_ids))

        try:
            with open(bm25_cache, "wb") as f:
                pickle.dump({"bm25": self._bm25, "ids": self._bm25_ids}, f,
                            protocol=pickle.HIGHEST_PROTOCOL)
            logger.info("BM25 cache saved to %s", bm25_cache)
        except Exception as e:
            logger.warning("BM25 cache save failed: %s", e)

    def get_fda_chunks(self, drug_name: str, section_priority: list[str] | None = None) -> list[dict]:
        """
        Directly return FDA DailyMed chunks for a specific drug by name.
        Bypasses FAISS/BM25 ranking — O(1) lookup, always finds the drug's label.
        Used during intervention re-retrieval when entity_verifier identifies a drug.
        """
        self._load_index()
        key = drug_name.lower().strip()
        indices = getattr(self, "_fda_index", {}).get(key, [])
        if not indices:
            # Try partial match (e.g. "warfarin sodium" → "warfarin")
            indices = next(
                (v for k, v in getattr(self, "_fda_index", {}).items() if key in k or k in key),
                []
            )
        chunks = []
        priority = section_priority or ["CONTRAINDICATIONS", "ADVERSE REACTIONS",
                                        "DOSAGE AND ADMINISTRATION", "WARNINGS AND PRECAUTIONS",
                                        "DRUG INTERACTIONS", "INDICATIONS AND USAGE",
                                        "USE IN SPECIFIC POPULATIONS"]
        for idx in indices:
            meta = self._metadata.get(idx, {})
            chunk_text = meta.get("chunk_text", "")
            section = next((s for s in priority if s in chunk_text.upper()), "OTHER")
            chunks.append({
                "text": chunk_text, "chunk_id": meta.get("chunk_id"),
                "source": meta.get("source", ""), "pub_type": meta.get("pub_type", ""),
                "pub_year": meta.get("pub_year"), "title": meta.get("title", ""),
                "_section": section, "_priority": priority.index(section) if section in priority else 99,
            })
        chunks.sort(key=lambda c: c["_priority"])
        return chunks[:5]

    def get_guideline_chunks(self, query: str, top_n: int = 5) -> list[dict]:
        """
        Return clinical guideline chunks relevant to the query via keyword matching.
        Bypasses FAISS/BM25 ranking — used during intervention when retrieval fails.
        """
        self._load_index()
        query_lower = query.lower()
        guideline_idx = getattr(self, "_guideline_index", {})
        if not guideline_idx:
            return []

        # Find matching indices — union of all matching keyword lists
        matched: dict[int, int] = {}  # idx → match count
        for keyword, indices in guideline_idx.items():
            if keyword in query_lower:
                for idx in indices:
                    matched[idx] = matched.get(idx, 0) + 1

        if not matched:
            return []

        # Sort by match count (most keyword hits first), take top_n
        top_indices = sorted(matched, key=lambda i: matched[i], reverse=True)[:top_n]

        chunks = []
        for idx in top_indices:
            meta = self._metadata.get(idx, {})
            chunks.append({
                "text": meta.get("chunk_text", ""),
                "chunk_id": meta.get("chunk_id"),
                "source": meta.get("source", ""),
                "pub_type": meta.get("pub_type", "clinical_guideline"),
                "pub_year": meta.get("pub_year"),
                "title": meta.get("title", ""),
            })
        return chunks

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def search(
        self,
        query: str,
        top_k: int | None = None,
    ) -> list[tuple[str, dict[str, Any], float]]:
        """
        Hybrid semantic + keyword search using Reciprocal Rank Fusion.

        Args:
            query : Natural language query
            top_k : Override config top_k if provided

        Returns:
            List of (chunk_text, metadata_dict, rrf_score),
            sorted by descending combined score.
        """
        if not query or not query.strip():
            logger.warning("Retriever.search called with empty query — returning []")
            return []

        k = top_k or self.top_k
        # Fetch RERANK_CANDIDATES via RRF, then re-rank to top-k
        fetch_k = max(self.RERANK_CANDIDATES, k * 3)
        RRF_K = 60  # standard RRF constant (higher = smoother rank blending)

        self._load_model()
        self._load_reranker()
        self._load_index()
        self._build_bm25()

        # ── 1. FAISS semantic search ──────────────────────────────────
        faiss_ranks: dict[int, int] = {}
        if self._model is not None and self._index is not None and faiss is not None:
            try:
                q_vec: np.ndarray = self._model.encode(
                    [query.strip()],
                    normalize_embeddings=True,
                    convert_to_numpy=True,
                ).astype(np.float32)

                scores_arr, idx_arr = self._index.search(q_vec, fetch_k)
                faiss_scores = scores_arr[0]
                faiss_indices = idx_arr[0]

                # Map faiss_idx → rank (1-indexed)
                for rank, (faiss_idx, score) in enumerate(zip(faiss_indices, faiss_scores), 1):
                    if faiss_idx != -1:
                        faiss_ranks[int(faiss_idx)] = rank

                # Raw top-1 cosine similarity (IndexFlatIP + L2-norm = cosine).
                # Used by main.py for coverage-gap detection — a poor match here
                # means the topic is genuinely absent from the database.
                _top_faiss_cosine = float(faiss_scores[0]) if len(faiss_scores) > 0 else 0.0
            except Exception as e:
                logger.error("FAISS search failed: %s", e)
        
        # If FAISS failed but BM25 is available, continue with BM25-only (no stub)
        if not faiss_ranks and self._bm25 is not None:
            _top_faiss_cosine = 0.0  # no FAISS score available
            logger.warning("FAISS model unavailable — using BM25-only search for this query.")

        # Only return empty if BOTH are completely unavailable
        if not faiss_ranks and self._bm25 is None:
            logger.error("Both FAISS and BM25 are unavailable. Cannot retrieve. Check that the index exists and dependencies are installed.")
            return []

        # ── 2. BM25 keyword search ────────────────────────────────────
        bm25_ranks: dict[int, int] = {}
        if self._bm25 is not None:
            query_tokens = query.lower().split()
            bm25_scores_arr = self._bm25.get_scores(query_tokens)
            # Get top fetch_k indices by BM25 score
            top_bm25 = np.argsort(bm25_scores_arr)[::-1][:fetch_k]
            for rank, corpus_pos in enumerate(top_bm25, 1):
                if bm25_scores_arr[corpus_pos] > 0:
                    faiss_idx = self._bm25_ids[corpus_pos]
                    bm25_ranks[faiss_idx] = rank

        # ── 3. Reciprocal Rank Fusion ─────────────────────────────────
        # Score = 1/(k+rank_faiss) + 1/(k+rank_bm25)
        # A chunk only in FAISS gets 1/(60+rank); only in BM25 gets 1/(60+rank)
        # A chunk in BOTH gets the sum — it floats to the top
        all_ids = set(faiss_ranks.keys()) | set(bm25_ranks.keys())
        rrf_scores: dict[int, float] = {}
        for faiss_idx in all_ids:
            score = 0.0
            if faiss_idx in faiss_ranks:
                score += 1.0 / (RRF_K + faiss_ranks[faiss_idx])
            if faiss_idx in bm25_ranks:
                score += 1.0 / (RRF_K + bm25_ranks[faiss_idx])
            rrf_scores[faiss_idx] = score

        # Capture absolute quality BEFORE normalising (used for retrieval confidence gate)
        max_rrf_absolute = max(rrf_scores.values()) if rrf_scores else 0.0

        # Normalise RRF scores to [0, 1] for display
        if rrf_scores and max_rrf_absolute > 0:
            rrf_scores = {k: v / max_rrf_absolute for k, v in rrf_scores.items()}

        # Sort by RRF score descending — take RERANK_CANDIDATES (not just top-k)
        candidate_ids = sorted(rrf_scores.keys(), key=lambda i: rrf_scores[i], reverse=True)[:self.RERANK_CANDIDATES]

        candidates: list[tuple[str, dict, float]] = []
        for faiss_idx in candidate_ids:
            meta = self._metadata.get(faiss_idx, {})
            text = meta.get("chunk_text", "")
            meta["_retrieval_confidence"] = round(max_rrf_absolute, 6)
            meta["_top_faiss_cosine"] = round(_top_faiss_cosine, 4)
            candidates.append((text, meta, rrf_scores[faiss_idx]))

        # ── Re-ranking ────────────────────────────────────────────────────
        # Cross-encoder scores every (query, chunk) pair directly.
        # No volume bias — the right chunk wins on relevance regardless of source.
        if self._reranker and self._reranker != "unavailable" and len(candidates) > k:
            pairs = [(query, text) for text, _, _ in candidates]
            rerank_scores = self._reranker.predict(pairs)
            ranked = sorted(
                zip(rerank_scores, candidates),
                key=lambda x: x[0],
                reverse=True,
            )
            results = [item for _, item in ranked[:k]]
            logger.debug("Re-ranked %d candidates → top-%d", len(candidates), k)
        else:
            results = candidates[:k]

        logger.debug(
            "Hybrid query '%s...' → %d results (top RRF=%.4f) "
            "[FAISS candidates: %d, BM25 candidates: %d]",
            query[:40], len(results),
            results[0][2] if results else 0.0,
            len(faiss_ranks), len(bm25_ranks),
        )
        return results



# ---------------------------------------------------------------------------
# CLI smoke test
# ---------------------------------------------------------------------------

def _load_config() -> dict:
    import os
    config_path = os.environ.get("MEDIRAG_CONFIG", "config_local.yaml" if os.path.exists("config_local.yaml") else "config.yaml")
    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


if __name__ == "__main__":
    import src  # noqa: F401 — logging
    config = _load_config()
    retriever = Retriever(config)

    test_queries = [
        "What is the recommended dosage of Metformin for Type 2 Diabetes in elderly patients?",
        "Contraindications of ibuprofen for patients with chronic kidney disease",
        "First-line treatment for hypertension according to clinical guidelines",
    ]

    for query in test_queries:
        print(f"\n{'='*70}")
        print(f"QUERY: {query}")
        print("=" * 70)
        results = retriever.search(query, top_k=3)
        if not results:
            print("  No results — is the FAISS index built?")
            continue
        for rank, (text, meta, score) in enumerate(results, 1):
            print(f"\n  Rank {rank} | score={score:.4f} | source={meta.get('source')} | "
                  f"tier_type={meta.get('pub_type')}")
            print(f"  Title: {meta.get('title', '')[:80]}")
            print(f"  Text : {text[:200]}...")
