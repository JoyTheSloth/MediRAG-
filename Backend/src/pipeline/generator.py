"""
src/pipeline/generator.py — LLM Answer Generation
===================================================
Supports multiple providers based on config.yaml → llm.provider:
  - "gemini"  : Google Gemini API (recommended)
  - "mistral" : Mistral AI API (api.mistral.ai)
  - "groq"    : Groq Cloud API (fast inference)
  - "ollama"  : Local Ollama/Mistral (requires Ollama running locally)

API Key setup:
  Set env variables in Backend/.env:
    GEMINI_API_KEY=your_key
    MISTRAL_API_KEY=your_key
    GROQ_API_KEY=your_key
"""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

import yaml

logger = logging.getLogger(__name__)

# Load .env file at module import time
def _load_env():
    env_path = Path(".env")
    if not env_path.exists():
        # Try one level up
        env_path = Path("../Backend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and val and key not in os.environ:
                    os.environ[key] = val

_load_env()

# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------

def _load_config() -> dict:
    try:
        config_path = os.environ.get("MEDIRAG_CONFIG", "config_local.yaml" if Path("config_local.yaml").exists() else "config.yaml")
        return yaml.safe_load(Path(config_path).read_text())
    except Exception:
        return {}


# ---------------------------------------------------------------------------
# Prompt builder (shared by both providers)
# ---------------------------------------------------------------------------

_PHYSICIAN_PROMPT = (
    "You are MediRAG, a medical AI assistant tailored for clinicians and researchers. "
    "You MUST answer ONLY using information explicitly stated in the CONTEXT provided below. "
    "Use professional medical terminology, be concise, and cite specific details. "
    "After each claim, cite it inline as [Source: <document title>]. "
    "If the context does NOT contain sufficient information to answer safely, you MUST respond EXACTLY with: "
    "'⚠️ The retrieved context does not contain enough information to answer this safely. "
    "Please consult authoritative clinical guidelines or a specialist.' "
    "NEVER use general knowledge, training data, or information outside the provided context."
)

_PATIENT_PROMPT = (
    "You are MediRAG, a medical AI assistant tailored for patients and non-experts. "
    "You MUST answer ONLY using information explicitly stated in the CONTEXT provided below. "
    "Explain medical information in a clear, accessible, and empathetic way. "
    "After each claim, cite it inline as [Source: <document title>]. "
    "If the context does NOT contain sufficient information to answer safely, you MUST respond EXACTLY with: "
    "'⚠️ The retrieved context does not contain enough information to answer this safely. "
    "Please consult your doctor or a medical specialist.' "
    "NEVER use general knowledge, training data, or information outside the provided context."
)

_SYSTEM_PROMPT = _PHYSICIAN_PROMPT # Default fallback


def _build_prompt(question: str, context_chunks: list[dict], system_prompt: Optional[str] = None, persona: str = "physician") -> str:
    """Build the RAG prompt from the question + retrieved chunks.
    
    Explicitly surfaces title and source for each chunk in the header so the LLM
    can cite [Source: <title>] inline in its answer.
    """
    context_parts = []
    for i, chunk in enumerate(context_chunks, 1):
        text = chunk.get("text") or chunk.get("chunk_text", "")
        title = chunk.get("title", "")
        source = chunk.get("source", "")
        pub_type = chunk.get("pub_type", "")
        # Include title as the primary citation label
        header_parts = [f"Source {i}"]
        if title:
            header_parts.append(f"Title: {title}")
        if pub_type:
            header_parts.append(pub_type)
        if source and source != title:
            header_parts.append(source)
        header = "[" + " | ".join(header_parts) + "]"
        context_parts.append(f"{header}\n{text.strip()}")

    context_block = "\n\n".join(context_parts)
    
    # Determine effective system prompt based on persona if no manual override
    if system_prompt:
        effective_system = system_prompt
    else:
        effective_system = _PATIENT_PROMPT if persona == "patient" else _PHYSICIAN_PROMPT

    return (
        f"{effective_system}\n\n"
        f"CONTEXT:\n{context_block}\n\n"
        f"QUESTION: {question}\n\n"
        f"ANSWER (cite sources inline as [Source: document title]):"
    )


# Strict prompt — used when first answer fails evaluation (HRS ≥ 60)
_STRICT_SYSTEM_PROMPT = (
    "You are MediRAG, a clinical safety assistant under strict mode. "
    "A previous response was flagged as potentially unsafe or inaccurate. "
    "You MUST answer ONLY using the information explicitly stated in the CONTEXT below. "
    "Do NOT use any general medical knowledge, training data, or outside information. "
    "If the context is insufficient, you MUST say EXACTLY: "
    "'⚠️ Insufficient evidence in retrieved context to answer safely. Please consult a clinical specialist.' "
    "NEVER hallucinate drug names, dosages, or clinical recommendations."
)


def _build_strict_prompt(question: str, context_chunks: list[dict]) -> str:
    """Strict prompt: context-only, used on regeneration after failed evaluation."""
    context_parts = []
    for i, chunk in enumerate(context_chunks, 1):
        text = chunk.get("text") or chunk.get("chunk_text", "")
        title = chunk.get("title", "")
        source = chunk.get("source", "")
        pub_type = chunk.get("pub_type", "")
        header_parts = [f"Source {i}"]
        if title:
            header_parts.append(f"Title: {title}")
        if pub_type:
            header_parts.append(pub_type)
        if source and source != title:
            header_parts.append(source)
        header = "[" + " | ".join(header_parts) + "]"
        context_parts.append(f"{header}\n{text.strip()}")

    context_block = "\n\n".join(context_parts)
    return (
        f"{_STRICT_SYSTEM_PROMPT}\n\n"
        f"CONTEXT:\n{context_block}\n\n"
        f"QUESTION: {question}\n\n"
        f"SAFE ANSWER (context-only, cite [Source: title] for every claim):"
    )


# ---------------------------------------------------------------------------
# OpenAI provider
# ---------------------------------------------------------------------------

def _generate_openai(prompt: str, config: dict) -> str:
    llm_cfg = config.get("llm", {})

    # Override from frontend/config takes priority over system ENV
    api_key = llm_cfg.get("openai_api_key") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        env_file = Path(".env")
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("OPENAI_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

    if not api_key:
        raise RuntimeError("OpenAI API key not found. Set OPENAI_API_KEY env var or in .env.")

    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai not installed. Run: pip install openai")

    model_name = llm_cfg.get("openai_model") or llm_cfg.get("model") or "gpt-4o"
    client = OpenAI(api_key=api_key)

    logger.info("Calling OpenAI API (model=%s)...", model_name)
    t0 = time.perf_counter()

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=float(llm_cfg.get("generation_temperature", 0.7)),
            max_tokens=1024,
        )
    except Exception as exc:
        raise RuntimeError(f"OpenAI API error: {exc}") from exc

    elapsed = int((time.perf_counter() - t0) * 1000)
    answer = response.choices[0].message.content.strip()

    if not answer:
        raise RuntimeError("OpenAI returned an empty response.")

    logger.info("OpenAI generated answer in %d ms (%d chars)", elapsed, len(answer))
    return answer

def _generate_gemini(prompt: str, config: dict) -> str:
    llm_cfg = config.get("llm", {})

    # Override from frontend/config takes priority over system ENV
    api_key = llm_cfg.get("gemini_api_key") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Try loading from .env file if present
        env_file = Path(".env")
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

    if not api_key:
        raise RuntimeError(
            "Gemini API key not found. "
            "Either: (1) set GEMINI_API_KEY=your_key in the same terminal as uvicorn, "
            "or (2) create a .env file with GEMINI_API_KEY=your_key in the project root."
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise RuntimeError(
            "google-genai not installed. Run: pip install google-genai"
        )

    model_name = llm_cfg.get("gemini_model", "gemini-2.0-flash")
    client = genai.Client(api_key=api_key)

    logger.info("Calling Gemini API (model=%s)...", model_name)
    t0 = time.perf_counter()

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=float(llm_cfg.get("generation_temperature", 0.7)),
                max_output_tokens=1024,
            ),
        )
    except Exception as exc:
        raise RuntimeError(f"Gemini API error: {exc}") from exc

    elapsed = int((time.perf_counter() - t0) * 1000)
    answer = response.text.strip() if response.text else ""

    if not answer:
        raise RuntimeError("Gemini returned an empty response.")

    logger.info("Gemini generated answer in %d ms (%d chars)", elapsed, len(answer))
    return answer


# ---------------------------------------------------------------------------
# Ollama provider (kept as fallback)
# ---------------------------------------------------------------------------

def _generate_ollama(prompt: str, config: dict) -> str:
    import requests as _requests

    llm_cfg = config.get("llm", {})
    base_url = llm_cfg.get("base_url", "http://localhost:11434")
    model = llm_cfg.get("model", "mistral")
    timeout = llm_cfg.get("timeout_seconds", 120)
    temperature = llm_cfg.get("generation_temperature", 0.7)

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature, "num_predict": 512},
    }

    url = f"{base_url}/api/generate"
    logger.info("Calling Ollama (%s @ %s)...", model, base_url)
    t0 = time.perf_counter()

    try:
        resp = _requests.post(url, json=payload, timeout=timeout)
    except _requests.exceptions.ConnectionError as exc:
        raise RuntimeError(
            f"Ollama is not running at {base_url}. Start with: ollama serve"
        ) from exc
    except _requests.exceptions.Timeout as exc:
        raise RuntimeError(
            f"Ollama timed out after {timeout}s. Increase llm.timeout_seconds in config.yaml."
        ) from exc

    if resp.status_code != 200:
        raise RuntimeError(f"Ollama HTTP {resp.status_code}: {resp.text[:300]}")

    try:
        data = resp.json()
        answer = data.get("response", "").strip()
    except (json.JSONDecodeError, KeyError) as exc:
        raise RuntimeError(f"Unexpected Ollama response: {exc}") from exc

    if not answer:
        raise RuntimeError("Ollama returned an empty response.")

    elapsed = int((time.perf_counter() - t0) * 1000)
    logger.info("Ollama generated answer in %d ms (%d chars)", elapsed, len(answer))
    return answer


# ---------------------------------------------------------------------------
# Mistral provider
# ---------------------------------------------------------------------------

def _generate_mistral(prompt: str, config: dict) -> str:
    import requests as _requests
    
    llm_cfg = config.get("llm", {})
    # Resolve placeholder or direct value
    _raw_key = llm_cfg.get("mistral_api_key", "")
    api_key = os.environ.get("MISTRAL_API_KEY") if (not _raw_key or _raw_key.startswith("${")) else _raw_key
    if not api_key:
        raise RuntimeError(
            "Mistral API key not found. Set MISTRAL_API_KEY in Backend/.env"
        )
        
    model = llm_cfg.get("model", "mistral-large-latest")
    timeout = llm_cfg.get("timeout_seconds", 120)
    temperature = llm_cfg.get("generation_temperature", 0.7)

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": 1024,
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    url = "https://api.mistral.ai/v1/chat/completions"
    logger.info("Calling Mistral API (model=%s, key=...***)", model)
    t0 = time.perf_counter()

    try:
        resp = _requests.post(url, json=payload, headers=headers, timeout=timeout)
    except Exception as exc:
        raise RuntimeError(f"Mistral API network error: {exc}") from exc

    if resp.status_code != 200:
        raise RuntimeError(f"Mistral HTTP {resp.status_code}: {resp.text[:300]}")

    try:
        data = resp.json()
        answer = data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        raise RuntimeError(f"Unexpected Mistral response: {exc}") from exc

    if not answer:
        raise RuntimeError("Mistral returned an empty response.")

    elapsed = int((time.perf_counter() - t0) * 1000)
    logger.info("Mistral generated answer in %d ms (%d chars)", elapsed, len(answer))
    return answer


# ---------------------------------------------------------------------------
# Groq provider
# ---------------------------------------------------------------------------

def _generate_groq(prompt: str, config: dict) -> str:
    import requests as _requests

    llm_cfg = config.get("llm", {})
    _raw_key = llm_cfg.get("groq_api_key", "")
    api_key = os.environ.get("GROQ_API_KEY") if (not _raw_key or _raw_key.startswith("${")) else _raw_key
    if not api_key:
        raise RuntimeError(
            "Groq API key not found. Set GROQ_API_KEY in Backend/.env"
        )

    model = llm_cfg.get("groq_model") or llm_cfg.get("model", "llama-3.3-70b-versatile")
    timeout = llm_cfg.get("timeout_seconds", 120)
    temperature = llm_cfg.get("generation_temperature", 0.7)

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": 1024,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    url = "https://api.groq.com/openai/v1/chat/completions"
    logger.info("Calling Groq API (model=%s, key=...***)", model)
    t0 = time.perf_counter()

    try:
        resp = _requests.post(url, json=payload, headers=headers, timeout=timeout)
    except Exception as exc:
        raise RuntimeError(f"Groq API network error: {exc}") from exc

    if resp.status_code != 200:
        raise RuntimeError(f"Groq HTTP {resp.status_code}: {resp.text[:300]}")

    try:
        data = resp.json()
        answer = data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        raise RuntimeError(f"Unexpected Groq response: {exc}") from exc

    if not answer:
        raise RuntimeError("Groq returned an empty response.")

    elapsed = int((time.perf_counter() - t0) * 1000)
    logger.info("Groq generated answer in %d ms (%d chars)", elapsed, len(answer))
    return answer


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_answer(
    question: str,
    context_chunks: list[dict],
    config: Optional[dict] = None,
    overrides: Optional[dict] = None,
) -> str:
    """
    Generate a grounded medical answer.

    Provider is selected from config.yaml → llm.provider, but can be
    overridden per-request via the `overrides` dict. This makes the eval
    engine portable — callers bring their own API key and model.

    Args:
        question       : User's medical question.
        context_chunks : Retrieved context chunks (dicts with 'text' key).
        config         : Config dict (loaded from config.yaml if None).
        overrides      : Per-request overrides. Supported keys:
                           provider   → "gemini" or "ollama"
                           api_key    → Gemini API key
                           model      → model name (e.g. "gemini-2.5-flash-lite")
                           ollama_url → Ollama base URL

    Returns:
        Generated answer string.

    Raises:
        RuntimeError   : If the provider is unreachable or returns an error.
    """
    if config is None:
        config = _load_config()

    # Build effective config: server config as base, overrides win
    effective_llm = dict(config.get("llm", {}))
    if overrides:
        if overrides.get("provider"):
            effective_llm["provider"] = overrides["provider"]
        if overrides.get("api_key"):
            pk = (overrides.get("provider") or "gemini").lower()
            key_map = {
                "gemini": "gemini_api_key",
                "openai": "openai_api_key",
                "mistral": "mistral_api_key",
                "groq": "groq_api_key",
            }
            effective_llm[key_map.get(pk, "gemini_api_key")] = overrides["api_key"]
        if overrides.get("model"):
            pk = (overrides.get("provider") or "gemini").lower()
            model_map = {
                "gemini": "gemini_model",
                "openai": "openai_model",
                "mistral": "model",
                "groq": "groq_model",
            }
            effective_llm[model_map.get(pk, "gemini_model")] = overrides["model"]
        if overrides.get("ollama_url"):
            effective_llm["base_url"] = overrides["ollama_url"]

    effective_config = {**config, "llm": effective_llm}
    provider = effective_llm.get("provider", "gemini").lower()
    system_prompt_override = overrides.get("system_prompt") if overrides else None
    persona = overrides.get("persona", "physician") if overrides else "physician"
    
    prompt = _build_prompt(
        question, 
        context_chunks, 
        system_prompt=system_prompt_override,
        persona=persona
    )

    if provider == "gemini":
        return _generate_gemini(prompt, effective_config)
    elif provider == "openai":
        return _generate_openai(prompt, effective_config)
    elif provider == "ollama":
        return _generate_ollama(prompt, effective_config)
    elif provider == "mistral":
        return _generate_mistral(prompt, effective_config)
    elif provider == "groq":
        return _generate_groq(prompt, effective_config)
    else:
        raise RuntimeError(
            f"Unknown LLM provider '{provider}'. "
            "Set llm.provider to 'gemini', 'mistral', 'groq', or 'ollama'."
        )


def generate_strict_answer(
    question: str,
    context_chunks: list[dict],
    config: Optional[dict] = None,
    overrides: Optional[dict] = None,
) -> str:
    """
    Generate a STRICT context-only answer.
    Called when initial answer fails evaluation (HRS >= 60).
    The LLM is forbidden from using any training knowledge.
    """
    if config is None:
        config = _load_config()

    effective_llm = dict(config.get("llm", {}))
    if overrides:
        if overrides.get("provider"):
            effective_llm["provider"] = overrides["provider"]
        if overrides.get("api_key"):
            pk = (overrides.get("provider") or "gemini").lower()
            key_map = {
                "gemini": "gemini_api_key",
                "openai": "openai_api_key",
                "mistral": "mistral_api_key",
                "groq": "groq_api_key",
            }
            effective_llm[key_map.get(pk, "gemini_api_key")] = overrides["api_key"]
        if overrides.get("model"):
            pk = (overrides.get("provider") or "gemini").lower()
            model_map = {
                "gemini": "gemini_model",
                "openai": "openai_model",
                "mistral": "model",
                "groq": "groq_model",
            }
            effective_llm[model_map.get(pk, "gemini_model")] = overrides["model"]
        if overrides.get("ollama_url"):
            effective_llm["base_url"] = overrides["ollama_url"]

    effective_config = {**config, "llm": effective_llm}
    provider = effective_llm.get("provider", "gemini").lower()
    prompt = _build_strict_prompt(question, context_chunks)

    if provider == "gemini":
        return _generate_gemini(prompt, effective_config)
    elif provider == "openai":
        return _generate_openai(prompt, effective_config)
    elif provider == "ollama":
        return _generate_ollama(prompt, effective_config)
    elif provider == "mistral":
        return _generate_mistral(prompt, effective_config)
    elif provider == "groq":
        return _generate_groq(prompt, effective_config)
    else:
        raise RuntimeError(f"Unknown LLM provider '{provider}'.")


def generate_simple_prompt(
    prompt: str,
    config: Optional[dict] = None,
    overrides: Optional[dict] = None,
) -> str:
    """Execute a simple prompt on the active LLM provider without context formatting."""
    if config is None:
        config = _load_config()

    effective_llm = dict(config.get("llm", {}))
    if overrides:
        if overrides.get("provider"):
            effective_llm["provider"] = overrides["provider"]
        if overrides.get("api_key"):
            pk = (overrides.get("provider") or "gemini").lower()
            key_map = {
                "gemini": "gemini_api_key",
                "openai": "openai_api_key",
                "mistral": "mistral_api_key",
                "groq": "groq_api_key",
            }
            effective_llm[key_map.get(pk, "gemini_api_key")] = overrides["api_key"]
        if overrides.get("model"):
            pk = (overrides.get("provider") or "gemini").lower()
            model_map = {
                "gemini": "gemini_model",
                "openai": "openai_model",
                "mistral": "model",
                "groq": "groq_model",
            }
            effective_llm[model_map.get(pk, "gemini_model")] = overrides["model"]
        if overrides.get("ollama_url"):
            effective_llm["base_url"] = overrides["ollama_url"]

    effective_config = {**config, "llm": effective_llm}
    provider = effective_llm.get("provider", "gemini").lower()

    if provider == "gemini":
        return _generate_gemini(prompt, effective_config)
    elif provider == "openai":
        return _generate_openai(prompt, effective_config)
    elif provider == "ollama":
        return _generate_ollama(prompt, effective_config)
    elif provider == "mistral":
        return _generate_mistral(prompt, effective_config)
    elif provider == "groq":
        return _generate_groq(prompt, effective_config)
    else:
        raise RuntimeError(f"Unknown LLM provider '{provider}'.")


def translate_hinglish_to_english(
    question: str,
    config: Optional[dict] = None,
    overrides: Optional[dict] = None,
) -> str:
    """Translate clinical query from Hinglish or standard Hindi to professional English."""
    prompt = (
        "You are an expert bilingual clinical query translator. You will receive a medical question "
        "written in Hinglish (a mixture of Hindi and English written in the Latin alphabet) or standard Hindi. "
        "Convert the Hinglish/Hindi question into a clear, professional, grammatically correct English clinical query. "
        "If the input query is already completely in English, return it exactly as it is with no edits. "
        "Do NOT add any conversational preamble, greetings, explanation, or formatting. Only return the translated English query.\n\n"
        f"Query: {question}\n"
        "English Translation:"
    )
    try:
        translated = generate_simple_prompt(prompt, config=config, overrides=overrides)
        return translated.strip().strip('"').strip("'")
    except Exception as exc:
        logger.warning("Hinglish translation failed: %s. Using original query.", exc)
        return question

