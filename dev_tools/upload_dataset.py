import os
import sys

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
from huggingface_hub import HfApi

# Credentials
token = os.environ.get("HF_TOKEN")
if not token:
    raise ValueError("HF_TOKEN environment variable not set.")
api = HfApi(token=token)

repo_id = "joytheslothh/MediRAG-Index-Data"

print(f"Ensuring dataset repo exists: {repo_id}")
api.create_repo(repo_id=repo_id, repo_type="dataset", exist_ok=True, private=True)

# Point to the actual active Backend data files
base_path = r"d:\MediRag 2.0\Backend\data"

print("\nUploading updated data files to HF Dataset repo...")

files_to_upload = [
    # (local_relative_path,  hf_repo_path)
    ("index/faiss.index",        "index/faiss.index"),
    ("index/metadata_store.pkl", "index/metadata_store.pkl"),
    ("index/bm25_cache.pkl",     "index/bm25_cache.pkl"),
    ("drugbank vocabulary.csv",  "drugbank vocabulary.csv"),
    ("rxnorm_cache.csv",         "rxnorm_cache.csv"),
    ("acc_aha_chunks.jsonl",     "acc_aha_chunks.jsonl"),
    ("dailymed_chunks.jsonl",    "dailymed_chunks.jsonl"),
    ("guidelines_retry.jsonl",   "guidelines_retry.jsonl"),
]

for local_rel_path, hf_path in files_to_upload:
    local_full = os.path.join(base_path, local_rel_path)
    if os.path.exists(local_full):
        size_mb = os.path.getsize(local_full) / (1024 * 1024)
        print(f"\nUploading [{size_mb:.1f} MB] {local_rel_path}  →  {hf_path} ...", flush=True)
        try:
            api.upload_file(
                path_or_fileobj=local_full,
                path_in_repo=hf_path,
                repo_id=repo_id,
                repo_type="dataset",
            )
            print(f"  ✓ Done: {hf_path}")
        except Exception as e:
            print(f"  ✗ Failed {hf_path}: {e}")
    else:
        print(f"  ⚠ Skipped (not found): {local_full}")

print("\nDataset upload finished.")
