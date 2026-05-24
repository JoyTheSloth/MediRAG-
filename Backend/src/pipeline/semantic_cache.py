import sqlite3
import json
import hashlib
import numpy as np
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class SafeSemanticCache:
    def __init__(self, db_path="data/cache.db", threshold=0.97):
        self.db_path = db_path
        self.threshold = threshold
        self._init_db()

    def _init_db(self):
        # Ensure containing directory exists
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS semantic_cache (
                id INTEGER PRIMARY KEY,
                query_text TEXT,
                embedding BLOB,
                cache_hash TEXT UNIQUE,
                response_json TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()

    def _generate_hash(self, query_emb: np.ndarray, patient_allergies: list[str], department: str, overrides: dict) -> str:
        # Create a deterministic representation of the safety environment
        allergies_str = ",".join(sorted([a.lower().strip() for a in patient_allergies]))
        dept_str = department.lower().strip()
        overrides_str = json.dumps(overrides, sort_keys=True)
        
        # Round embedding to 4 decimals to ensure stability against float discrepancies
        emb_str = np.round(query_emb, 4).tobytes()
        
        hasher = hashlib.sha256()
        hasher.update(emb_str)
        hasher.update(allergies_str.encode('utf-8'))
        hasher.update(dept_str.encode('utf-8'))
        hasher.update(overrides_str.encode('utf-8'))
        return hasher.hexdigest()

    def get(self, query_emb: np.ndarray, patient_allergies: list[str], department: str, overrides: dict) -> dict | None:
        target_hash = self._generate_hash(query_emb, patient_allergies, department, overrides)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # Direct hash lookup first (O(1) fast path)
        cursor.execute("SELECT response_json FROM semantic_cache WHERE cache_hash = ?", (target_hash,))
        row = cursor.fetchone()
        
        if row:
            conn.close()
            logger.info("Semantic Cache: Direct hash hit! Returning safe response.")
            try:
                return json.loads(row[0])
            except Exception as e:
                logger.error(f"Failed to parse cached JSON: {e}")
                return None

        # Fuzzy lookup (Cosine similarity fallback under identical safety settings)
        cursor.execute("SELECT query_text, embedding, response_json, cache_hash FROM semantic_cache")
        rows = cursor.fetchall()
        conn.close()

        for query, emb_bytes, response_json, cached_hash in rows:
            saved_emb = np.frombuffer(emb_bytes, dtype=np.float32)
            # Compute cosine similarity
            norm_product = np.linalg.norm(query_emb) * np.linalg.norm(saved_emb)
            if norm_product == 0:
                continue
            cosine = np.dot(query_emb, saved_emb) / norm_product
            
            if cosine >= self.threshold:
                # Re-verify that the safety hash matches (no allergy difference)
                # To prevent cross-contamination, fuzzy match requires identical allergies/department config
                candidate_hash = self._generate_hash(saved_emb, patient_allergies, department, overrides)
                if candidate_hash == cached_hash:
                    logger.info(f"Semantic Cache: Fuzzy similarity hit! ({cosine:.4f})")
                    try:
                        return json.loads(response_json)
                    except Exception as e:
                        logger.error(f"Failed to parse cached JSON in fuzzy match: {e}")
                        continue
                    
        return None

    def store(self, query_text: str, query_emb: np.ndarray, response: dict, patient_allergies: list[str], department: str, overrides: dict):
        target_hash = self._generate_hash(query_emb, patient_allergies, department, overrides)
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("""
                INSERT OR REPLACE INTO semantic_cache (query_text, embedding, cache_hash, response_json)
                VALUES (?, ?, ?, ?)
            """, (
                query_text,
                query_emb.tobytes(),
                target_hash,
                json.dumps(response)
            ))
            conn.commit()
            logger.info("Saved successful evaluation to Semantic Cache.")
        except Exception as e:
            logger.error(f"Failed to store in cache: {e}")
        finally:
            conn.close()
