# MediRAG 2.0 - Unified Git & Hugging Face Deployment Script (PowerShell)
# This script automates pushing changes to GitHub, Hugging Face Spaces, and Hugging Face Dataset.

$ErrorActionPreference = "Stop"

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "🚀   MediRAG 2.0 - Unified Deployment & Push Console  🚀" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure we are in the correct root directory
$rootPath = "d:\MediRag 2.0"
if (-not (Test-Path "$rootPath\dev_tools")) {
    Write-Host "❌ Error: Root directory '$rootPath' not found or incorrect." -ForegroundColor Red
    exit 1
}
Set-Location $rootPath

# ---------------------------------------------------------------------
# Step 1: Handle Hugging Face Authentication Token
# ---------------------------------------------------------------------
Write-Host "🔑 [1/4] Checking Hugging Face Credentials..." -ForegroundColor Yellow
$hfToken = $env:HF_TOKEN

if (-not $hfToken) {
    Write-Host "💡 HF_TOKEN environment variable is not set." -ForegroundColor Gray
    $hfToken = Read-Host "👉 Please enter/paste your Hugging Face Access Token (write/admin permission)"
    $hfToken = $hfToken.Trim()
    
    if (-not $hfToken) {
        Write-Host "❌ Error: Hugging Face Token is required for Hugging Face upload." -ForegroundColor Red
        exit 1
    }
    
    # Temporarily set HF_TOKEN for child processes in this session
    $env:HF_TOKEN = $hfToken
    Write-Host "✅ Token set in session environment." -ForegroundColor Green
} else {
    Write-Host "✅ Detected existing HF_TOKEN in environment." -ForegroundColor Green
}
Write-Host ""

# ---------------------------------------------------------------------
# Step 2: Push changes to GitHub
# ---------------------------------------------------------------------
Write-Host "🐙 [2/4] Syncing and Pushing to GitHub..." -ForegroundColor Yellow

# Check if git is installed
try {
    $gitVersion = git --version
    Write-Host "   Git detected: $gitVersion" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: Git is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Run git status to see if there are any changes
Write-Host "   Checking for changes..." -ForegroundColor Gray
$status = git status --porcelain

if (-not $status) {
    Write-Host "   ℹ️ No unstaged or uncommitted changes found. Proceeding with repository push..." -ForegroundColor Cyan
} else {
    Write-Host "   ⚠️ Found modified/new files in workspace:" -ForegroundColor Cyan
    git status -s
    Write-Host ""
    
    $commitMsg = Read-Host "👉 Enter git commit message [default: 'Update: MediRAG 2.0 enhancements']"
    if (-not $commitMsg) {
        $commitMsg = "Update: MediRAG 2.0 enhancements"
    }
    
    Write-Host "   Staging files..." -ForegroundColor Gray
    git add .
    
    Write-Host "   Committing changes..." -ForegroundColor Gray
    git commit -m $commitMsg
    Write-Host "   ✅ Changes committed locally." -ForegroundColor Green
}

# Push to GitHub
Write-Host "   Pushing to GitHub remote (origin main)..." -ForegroundColor Gray
try {
    git push origin main
    Write-Host "   ✅ Successfully pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ GitHub push failed or requires explicit branch naming. Attempting standard git push..." -ForegroundColor Yellow
    try {
        git push
        Write-Host "   ✅ Successfully pushed to GitHub!" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Git push failed. Please verify your Git credentials and internet connection." -ForegroundColor Red
        $confirm = Read-Host "Do you want to continue with Hugging Face uploads anyway? (y/N)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            exit 1
        }
    }
}
Write-Host ""

# ---------------------------------------------------------------------
# Step 3: Push Backend Code to Hugging Face Spaces (Docker App)
# ---------------------------------------------------------------------
Write-Host "🤗 [3/4] Uploading Backend Code to Hugging Face Space..." -ForegroundColor Yellow
Write-Host "   Running dev_tools/push_to_hf_space.py..." -ForegroundColor Gray

try {
    python dev_tools/push_to_hf_space.py
    Write-Host "   ✅ Successfully deployed backend to Hugging Face Spaces!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to run push_to_hf_space.py script. See error trace above." -ForegroundColor Red
    $confirm = Read-Host "Do you want to continue with the Dataset upload? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        exit 1
    }
}
Write-Host ""

# ---------------------------------------------------------------------
# Step 4: Upload Index & Chunks to Hugging Face Dataset Repository
# ---------------------------------------------------------------------
Write-Host "📊 [4/4] Uploading FAISS Indices & Chunks to Hugging Face Dataset..." -ForegroundColor Yellow
Write-Host "   Running dev_tools/upload_dataset.py..." -ForegroundColor Gray

try {
    python dev_tools/upload_dataset.py
    Write-Host "   ✅ Successfully updated Hugging Face Dataset repository!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to run upload_dataset.py script. See error trace above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "🎉   CONGRATULATIONS! ALL SYNC & PUSH WORKFLOWS COMPLETE!   🎉" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "   🌐 GitHub:          https://github.com/JoyTheSloth/MediRAG-.git" -ForegroundColor Cyan
Write-Host "   🤗 HF Spaces:        https://huggingface.co/spaces/joytheslothh/MediRAG-API" -ForegroundColor Cyan
Write-Host "   🤗 HF Dataset:       https://huggingface.co/datasets/joytheslothh/MediRAG-Index-Data" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit..."
