"""
Push backend source code to HF Space using HF API upload_folder.
Uses the Backend's own .gitignore as the source of truth for what to exclude.
"""
import os
import pathlib
from huggingface_hub import HfApi

# Credentials
token = os.environ.get("HF_TOKEN")
if not token:
    raise ValueError("HF_TOKEN environment variable not set.")
api = HfApi(token=token)

repo_id = "joytheslothh/MediRAG-API"
backend_path = r"d:\MediRag 2.0\Backend"

# Files/folders to ignore (gitignore-style globs relative to backend_path)
IGNORE_PATTERNS = [
    # Virtual environments
    ".venv",
    "venv",
    "env",
    ".venv/**",
    "venv/**",
    # Python cache
    "**/__pycache__",
    "**/__pycache__/**",
    "**/*.pyc",
    "**/*.pyo",
    "**/*.pyd",
    ".pytest_cache",
    ".pytest_cache/**",
    # Data directories (downloaded at runtime from HF dataset)
    "data/**",
    "datafinal/**",
    # Logs
    "logs/**",
    "*.log",
    # Build artifacts
    "medirag_cli.egg-info/**",
    ".dist/**",
    "dist/**",
    "build/**",
    # IDE/OS
    ".DS_Store",
    "Thumbs.db",
    ".env",
    ".idea/**",
    ".vscode/**",
    # Local-only deployment files
    "Dockerfile.local",
    "config_local.yaml",
]

print(f"Uploading backend source to HF Space: {repo_id}")
print(f"Source: {backend_path}")
print("(large data files excluded — they download at runtime from HF dataset)")
print()

try:
    api.upload_folder(
        folder_path=backend_path,
        repo_id=repo_id,
        repo_type="space",
        ignore_patterns=IGNORE_PATTERNS,
        commit_message="Update: backend v3.2 — privacy pipeline, consensus, new scripts",
    )
    print(f"\n✓ Successfully uploaded to https://huggingface.co/spaces/{repo_id}")
except Exception as e:
    print(f"\n✗ Upload failed: {e}")
    raise
