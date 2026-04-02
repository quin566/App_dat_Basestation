#!/usr/bin/env bash
# release-ota.sh — builds dist/v3 and force-pushes it to a single-commit ota-release branch.
# This keeps the main branch history clean while still providing a downloadable zip for OTA.
set -e

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "[OTA] Error: Must be on main branch to cut a release (currently on '$CURRENT_BRANCH')."
  exit 1
fi

echo "[OTA] Building dist/v3..."
npm run build

# ── STAGE: copy assets + capture version BEFORE any git operations ──────────
TEMP_DIR=$(mktemp -d)
echo "[OTA] Staging assets in $TEMP_DIR..."
cp -r dist/v3 "$TEMP_DIR/"
# Always derive version from package.json — version.json is overwritten here so they stay in sync
VERSION=$(node -e "process.stdout.write(require('./package.json').version)")
echo "{ \"version\": \"$VERSION\" }" > "$TEMP_DIR/version.json"
echo "$VERSION" > "$TEMP_DIR/VERSION"

# ── GIT: create a fresh orphan branch with no history ───────────────────────
git branch -D ota-release 2>/dev/null || true

echo "[OTA] Creating orphan ota-release branch (no history)..."
git checkout --orphan ota-release

echo "[OTA] Clearing working tree..."
git rm -rf . --quiet

# ── RESTORE: put OTA assets back, read version from temp file ───────────────
echo "[OTA] Restoring OTA assets..."
mkdir -p dist/v3
cp -r "$TEMP_DIR/v3/." dist/v3/
cp "$TEMP_DIR/version.json" version.json
VERSION=$(cat "$TEMP_DIR/VERSION")
rm -rf "$TEMP_DIR"

# ── COMMIT & PUSH ────────────────────────────────────────────────────────────
git add dist/v3 version.json
git commit -m "ota: release v$VERSION"

echo "[OTA] Force-pushing single-commit ota-release branch..."
git push --force origin ota-release

echo "[OTA] Returning to main..."
git checkout main

echo "[OTA] Done. v$VERSION deployed to ota-release (single commit, clean history)."
