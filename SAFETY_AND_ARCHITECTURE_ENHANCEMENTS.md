# SAFETY & ARCHITECTURE ENHANCEMENT ROADMAP
## MediRAG 2.0 Safety Middleware & Post-Generation Audit Layer

This document outlines high-impact architectural, visual, and clinical safety improvements to elevate **MediRAG 2.0** into a production-grade, highly resilient, and visually stunning clinical safety system. 

---

## 1. Clinical Safety Enhancements

### 1.1 Drug-Drug Interaction (DDI) Verification Pipeline
Currently, the `entity_verifier.py` module extracts drugs and validates their dosage. However, in medical environments, polypharmacy is highly common and lethal. If a patient discharge summary contains multiple drugs (e.g., Warfarin and Aspirin), the system should audit potential adverse interactions.

#### Technical Design:
1. Extract all `DRUG` entities from the generated answer and patient clinical context.
2. Resolve each drug to its standard **RxCUI** using the existing RxNorm cache and REST API.
3. Query the **NIH RxNav Interaction API** using a joint multi-drug endpoint:
   `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=2246+1191` (e.g., Aspirin + Acetaminophen).
4. Parse the severity (e.g., `high`, `medium`, `low`) and interaction description.
5. Deduct points from the global **Health Risk Score (HRS)** if dangerous interactions are flagged.

```python
# Suggested extension for src/modules/entity_verifier.py
def check_drug_interactions(rxcuis: list[str]) -> list[dict]:
    """
    Queries RxNav API for interactions between a list of RxCUIs.
    Returns: List of interaction dictionaries containing severity and descriptions.
    """
    if len(rxcuis) < 2:
        return []
        
    rxcuis_query = "+".join(rxcuis)
    url = f"https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis={rxcuis_query}"
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code != 200:
            return []
            
        data = response.json()
        interactions = []
        
        # Parse interaction details
        for group in data.get("fullInteractionTypeGroup", []):
            for interaction_type in group.get("fullInteractionType", []):
                for pair in interaction_type.get("interactionPair", []):
                    severity = pair.get("severity", "N/A")
                    desc = pair.get("description", "")
                    interactions.append({
                        "drugs": [d.get("minConcept", {}).get("name") for d in pair.get("interactionConcept", [])],
                        "severity": severity,
                        "description": desc
                    })
        return interactions
    except Exception as e:
        logger.error(f"Failed to fetch drug interactions: {e}")
        return []
```

---

### 1.2 Robust JSON Judge Parsing with Regex Retry Buffers
In `consensus.py`, the **Multi-Model Consensus Engine** uses a prompt that instructs the LLM to output pure JSON. However, smaller or quantized local models (such as `Mistral-7B` via Ollama) frequently output conversational text before or after the JSON blocks (e.g. *"Here is the evaluation:"*), causing json parsing exceptions.

#### Technical Design:
Implement a regex parser that extracts valid JSON blocks and matches keys using fuzzy matching or fallback structures:

```python
# Replace src/pipeline/consensus.py JSON parsing blocks with a safe helper
def parse_judge_json(raw_text: str) -> dict:
    import re
    import json
    
    # Try direct parse first
    try:
        return json.loads(raw_text.strip())
    except json.JSONDecodeError:
        pass
        
    # Extract block enclosed by curly braces
    match = re.search(r"({.*})", raw_text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
            
    # Fuzzy regex extraction fallback
    result = {
        "agreement_score": 0.5,
        "conflicts": [],
        "summary": "Fuzzy parsing applied.",
        "recommended_consensus": ""
    }
    
    score_match = re.search(r'"agreement_score":\s*(0?\.\d+|1\.0|1|0)', raw_text)
    if score_match:
        result["agreement_score"] = float(score_match.group(1))
        
    conflicts_match = re.search(r'"conflicts":\s*\[(.*?)\]', raw_text, re.DOTALL)
    if conflicts_match:
        items = re.findall(r'"([^"]*)"', conflicts_match.group(1))
        result["conflicts"] = items
        
    summary_match = re.search(r'"summary":\s*"([^"]*)"', raw_text)
    if summary_match:
        result["summary"] = summary_match.group(1)
        
    return result
```

---

### 1.3 Evidence-Tiered Dosage Audits
In the current design, dosage tolerance is set to a constant `10%` variance. A more rigorous, clinical-grade model should link dosage tolerance with the **evidence tier** of the retrieved document. 
* **Tier 1 (Clinical Guidelines)**: Extremely strict tolerance (`5%` maximum variance) because dosage guidelines are absolute.
* **Tier 5 (Clinical Case Report)**: Higher tolerance (`15%` variance) because single patient cases allow experimental dosage variances.

---

## 2. Backend Performance & Pipeline Optimizations

### 2.1 Embedding-Based Semantic Cache Layer
Evaluating generated text using SentenceTransformers (BioBERT) and DeBERTa (Faithfulness) takes a toll on backend CPU/GPU. Many clinical queries are repetitive (e.g. standard diagnosis questions). Adding a **Semantic Cache** will reduce average latency to `< 50ms` for cached terms.

```
                  ┌───────────────────────────────┐
                  │   Incoming Patient Query      │
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────▼───────────────┐
                  │ Generate bioBERT Embedding    │
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────▼───────────────┐      YES      ┌─────────────────────────┐
                  │ Semantic Match in SQLite Cache├──────────────►│ Return Cached Response  │
                  └───────────────┬───────────────┘ (Cosine >0.96)└─────────────────────────┘
                                  │
                                  │ NO
                  ┌───────────────▼───────────────┐
                  │ Run RAG + DeBERTa Evaluation  │
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────▼───────────────┐
                  │ Store Embedding + Result in DB│
                  └───────────────────────────────┘
```

#### SQLite Caching Implementation:
Store embeddings, query strings, generated answers, and the aggregate HRS in a local SQLite file:

```python
# src/pipeline/semantic_cache.py
import sqlite3
import json
import numpy as np

class SemanticCache:
    def __init__(self, db_path="data/cache.db", threshold=0.96):
        self.db_path = db_path
        self.threshold = threshold
        self._init_db()
        
    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cache (
                id INTEGER PRIMARY KEY,
                query TEXT,
                embedding BLOB,
                response_json TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        conn.close()

    def get(self, query_emb: np.ndarray) -> dict | None:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT query, embedding, response_json FROM cache")
        rows = cursor.fetchall()
        conn.close()
        
        for query, emb_bytes, response_json in rows:
            saved_emb = np.frombuffer(emb_bytes, dtype=np.float32)
            cosine = np.dot(query_emb, saved_emb) / (np.linalg.norm(query_emb) * np.linalg.norm(saved_emb))
            if cosine >= self.threshold:
                logger.info(f"Semantic Cache Hit! Similarity: {cosine:.4f}")
                return json.loads(response_json)
        return None
```

---

## 3. Frontend Premium Visual Enhancements

### 3.1 Interactive Drug-Drug Interaction Panel
In `PatientExperience.jsx`, when drug interactions are identified, render a stunning custom **polypharmacy risk ring** featuring floating glassmorphic drug capsules and cross-linked lines showing conflicts.

```css
/* Styling for premium glassmorphic drug warnings */
.px-ddi-container {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 12px;
    padding: 16px;
    margin-top: 15px;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px 0 rgba(239, 68, 68, 0.15);
}

.px-ddi-header {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #F87171;
    font-weight: 700;
}

.px-ddi-pill-badge {
    background: #EF4444;
    color: white;
    font-size: 11px;
    font-weight: 800;
    padding: 2px 8px;
    border-radius: 20px;
    text-transform: uppercase;
}
```

---

### 3.2 Persistent Config & API Base Cache
To improve clinical evaluator convenience, store API keys and settings in `localStorage` across page reloads in `App.jsx` or `PatientExperience.jsx`:

```javascript
// Add inside PatientExperience initialization
useEffect(() => {
    const savedConfig = localStorage.getItem('medirag_engine_config');
    if (savedConfig) {
        setEngineConfig(JSON.parse(savedConfig));
    }
}, []);

// Update when saving config
const saveConfig = (newConfig) => {
    localStorage.setItem('medirag_engine_config', JSON.stringify(newConfig));
    setEngineConfig(newConfig);
};
```

---

### 3.3 Interactive Simulated Live Telemetry Logs
Enhance the **Raw Audit Trace Log** into an interactive dashboard terminal. Include:
* **Interactive filter chips**: `[ALL]`, `[ERROR]`, `[WARN]`, `[INFO]`
* **Simulated typing speed** for trace logs during generation to emphasize RAG performance.
* **Copy-to-Clipboard JSON button** for quick exports.

---

## 4. Prioritized Implementation Blueprint

| Phase | Feature Description | Module Impacted | Complexity | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **DDI NIH API Verification** | `entity_verifier.py` & UI | Medium | **P0** (Lethal interactions) |
| **Phase 2** | **Regex Retry Judge Parser** | `consensus.py` | Low | **P0** (Consensus stability) |
| **Phase 3** | **Persistent Config Cache** | React Frontend | Low | **P1** (Evaluator UX) |
| **Phase 4** | **Embedding Semantic Cache** | `main.py` & Database | Medium | **P1** (Infrastructure latency) |
| **Phase 5** | **Batch CSV Audits** | FastAPI Endpoint | Medium | **P2** (Research capability) |

---

> [!NOTE]
> All NIH RxNav APIs are public, free, and do not require registration keys, making this standard integration extremely easy to spin up in development and staging environments.
