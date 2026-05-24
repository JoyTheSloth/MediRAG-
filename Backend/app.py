"""
MediRAG Backend - FastAPI only (No Gradio)
React frontend on Vercel, this is just the API backend
"""

import os
import sys
import subprocess
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set cache directories for Hugging Face
os.environ["TRANSFORMERS_CACHE"] = "/tmp/transformers_cache"
os.environ["HF_HOME"] = "/tmp/hf_home"
os.environ["TORCH_HOME"] = "/tmp/torch_cache"

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

# Install spaCy model if not present (optional — server starts without it)
try:
    import spacy
    try:
        spacy.load("en_core_sci_lg")
        logger.info("spaCy model en_core_sci_lg loaded.")
    except OSError:
        # Try installing the model at runtime
        try:
            logger.info("Attempting to install scispacy model en_core_sci_lg...")
            subprocess.run([
                sys.executable, "-m", "pip", "install", "--quiet",
                "https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_core_sci_lg-0.5.4.tar.gz"
            ], check=True, timeout=300)
            spacy.load("en_core_sci_lg")
            logger.info("spaCy model installed and loaded.")
        except Exception as model_err:
            logger.warning(f"Could not install spaCy model: {model_err}. NER features will be limited.")
except ImportError:
    logger.warning("spacy/scispacy not installed. NER features will be limited but server will still start.")

# Download datasets using huggingface_hub
from huggingface_hub import hf_hub_download
import yaml
from pathlib import Path

# Check if config_local.yaml exists or USE_LOCAL_DATASET is set to skip HF downloads
config_path = os.environ.get("MEDIRAG_CONFIG", "config_local.yaml" if Path("config_local.yaml").exists() else "config.yaml")
try:
    with open(config_path, "r", encoding="utf-8") as f:
        config_data = yaml.safe_load(f)
except Exception:
    config_data = {}

use_local_dataset = config_data.get("retrieval", {}).get("use_local_dataset", False) or os.environ.get("USE_LOCAL_DATASET", "false").lower() == "true"

# Check and download index and data files
data_dir = os.path.join(os.path.dirname(__file__), "data")
index_dir = os.path.join(data_dir, "index")
os.makedirs(index_dir, exist_ok=True)

faiss_path = os.path.join(index_dir, "faiss.index")
metadata_path = os.path.join(index_dir, "metadata_store.pkl")
bm25_path = os.path.join(index_dir, "bm25_cache.pkl")
vocab_path = os.path.join(data_dir, "drugbank vocabulary.csv")
rxnorm_path = os.path.join(data_dir, "rxnorm_cache.csv")

def download_dataset_files():
    """Download FAISS index and other core data from Hugging Face Dataset"""
    if use_local_dataset:
        logger.info("[LOCAL MODE] Bypassing Hugging Face repository download. Relying on local datasets in data/index/.")
        return

    repo_id = "joytheslothh/MediRAG-Index-Data"
    token = os.environ.get("HF_TOKEN")
    if not token:
        logger.warning("HF_TOKEN environment variable is not set. Dataset download might fail if repo is private.")

    try:
        if not os.path.exists(faiss_path):
            logger.info("Downloading faiss.index from HF dataset...")
            hf_hub_download(repo_id=repo_id, filename="index/faiss.index", local_dir=data_dir, repo_type="dataset", token=token)
        if not os.path.exists(metadata_path):
            logger.info("Downloading metadata_store.pkl from HF dataset...")
            hf_hub_download(repo_id=repo_id, filename="index/metadata_store.pkl", local_dir=data_dir, repo_type="dataset", token=token)
        if not os.path.exists(bm25_path):
            logger.info("Downloading bm25_cache.pkl from HF dataset...")
            hf_hub_download(repo_id=repo_id, filename="index/bm25_cache.pkl", local_dir=data_dir, repo_type="dataset", token=token)
        if not os.path.exists(vocab_path):
            logger.info("Downloading drugbank vocabulary.csv from HF dataset...")
            hf_hub_download(repo_id=repo_id, filename="drugbank vocabulary.csv", local_dir=data_dir, repo_type="dataset", token=token)
        if not os.path.exists(rxnorm_path):
            logger.info("Downloading rxnorm_cache.csv from HF dataset...")
            hf_hub_download(repo_id=repo_id, filename="rxnorm_cache.csv", local_dir=data_dir, repo_type="dataset", token=token)
    except Exception as e:
        logger.error(f"Failed to download dataset files: {e}")
        logger.warning("Backend may not start correctly or queries may fail.")

# Trigger download at startup
download_dataset_files()

# Import FastAPI app - this is the main backend for React frontend
from src.api.main import app

if __name__ == "__main__":
    import uvicorn
    # Get port from environment (Hugging Face uses 7860)
    port = int(os.environ.get("PORT", 7860))
    
    logger.info("Starting FastAPI backend on port {}".format(port))
    uvicorn.run(app, host="0.0.0.0", port=port)
