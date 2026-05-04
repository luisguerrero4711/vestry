#!/bin/bash
# ─────────────────────────────────────────────
# VESTRY — one-shot GitHub + Netlify deploy
# Run from inside the vestry/ folder
# ─────────────────────────────────────────────
set -e
REPO="vestry"
GITHUB_USER="luisguerrero4711"

echo ""
echo "🏡  Vestry Deploy Script"
echo "────────────────────────"

# 1. Rename branch to main
git branch -m master main 2>/dev/null || git checkout -b main 2>/dev/null || true
echo "✓ Branch: $(git branch --show-current)"

# 2. Ensure gh CLI is available
if ! command -v gh &>/dev/null; then
  echo ""
  echo "Installing GitHub CLI via Homebrew..."
  brew install gh
fi

# 3. Authenticate (opens browser)
if ! gh auth status &>/dev/null; then
  echo ""
  echo "→ Logging into GitHub (browser will open)..."
  gh auth login --web --git-protocol https
fi

# 4. Create repo and push
echo ""
echo "→ Creating GitHub repo: $GITHUB_USER/$REPO ..."
gh repo create "$REPO" \
  --public \
  --source=. \
  --remote=origin \
  --push \
  --description "Vestry — Property management for small real estate investors" \
  2>/dev/null || {
    # Repo already exists — just push
    echo "  (repo may already exist — pushing to existing remote)"
    git remote remove origin 2>/dev/null || true
    git remote add origin "https://github.com/$GITHUB_USER/$REPO.git"
    git push -u origin main --force
  }

echo ""
echo "✅ Code is live on GitHub!"
echo "   https://github.com/$GITHUB_USER/$REPO"
echo ""
echo "────────────────────────────────────────────────────"
echo "Next: Deploy to Netlify"
echo "  1. Go to https://app.netlify.com/start"
echo "  2. Click 'Import from Git' → GitHub → $GITHUB_USER/$REPO"
echo "  3. Build command:  npm run build"
echo "  4. Publish dir:    dist"
echo "  5. Add env vars:"
echo "       VITE_SUPABASE_URL      = <your-project-url>"
echo "       VITE_SUPABASE_ANON_KEY = <your-anon-key>"
echo "  6. Click Deploy!"
echo "────────────────────────────────────────────────────"
