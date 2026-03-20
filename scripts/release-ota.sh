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

# Stage the release assets in a temp dir before touching git
TEMP_DIR=$(mktemp -d)
echo "[OTA] Staging assets in $TEMP_DIR..."
cp -r dist/v3 "$TEMP_DIR/"
cp version.json "$TEMP_DIR/"

# Delete stale local ota-release branch if present
git branch -D ota-release 2>/dev/null || true

echo "[OTA] Creating orphan ota-release branch (no history)..."
git checkout --orphan ota-release

echo "[OTA] Clearing working tree..."
git rm -rf . --quiet

echo "[OTA] Restoring OTA assets..."
mkdir -p dist/v3
cp -r "$TEMP_DIR/v3/." dist/v3/
cp "$TEMP_DIR/version.json" version.json
rm -rf "$TEMP_DIR"

VERSION=$(node -e "console.log(require('./package.json').version)")

git add dist/v3 version.json
git commit -m "ota: release v$VERSION"

echo "[OTA] Force-pushing single-commit ota-release branch..."
git push --force origin ota-release

echo "[OTA] Returning to main..."
git checkout main

echo "[OTA] Done. v$VERSION deployed to ota-release (single commit, clean history)."
