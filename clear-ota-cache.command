#!/bin/bash
# AZ Photo Command Center — OTA Cache Clearer
# Run this if the app looks outdated after installing a new DMG.
# It deletes the cached OTA update so the app loads the version bundled in the DMG.

CACHE_DIR="$HOME/Library/Application Support/az-photo-command-center"
OTA_DIR="$CACHE_DIR/latest_v3"
OTA_VERSION_FILE="$CACHE_DIR/ota_installed_version.json"

echo "========================================="
echo "  AZ Photo Command Center v2.4.2 — Cache Clear"
echo "========================================="
echo ""

if [ -d "$OTA_DIR" ]; then
  echo "Found OTA cache at:"
  echo "  $OTA_DIR"
  echo ""
  read -p "Delete it and reset to bundled DMG version? (y/n): " CONFIRM
  if [[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]]; then
    rm -rf "$OTA_DIR"
    rm -f "$OTA_VERSION_FILE"
    echo ""
    echo "Cache cleared. Relaunch AZ Photo Command Center."
  else
    echo "Cancelled."
  fi
else
  echo "No OTA cache found — nothing to clear."
  echo "(App is already using the bundled DMG version.)"
fi

echo ""
read -p "Press Enter to close..."
