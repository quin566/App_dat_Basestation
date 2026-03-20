#!/bin/bash
# AZ Photo Command Center — One-Click DMG Builder
# Double-click this file from Finder to build the app.

cd "/Users/quintensinclair/Documents/Test Antigravity"

echo "========================================="
echo "  AZ Photo Command Center — DMG Builder"
echo "========================================="
echo ""

echo "[1/3] Installing / verifying dependencies..."
npm install

echo ""
echo "[2/3] Building DMG..."
npm run make

echo ""
echo "[3/3] Done!"
echo ""
echo "Your DMG is in: out/make/"
echo "Drag it to Applications or share it with another Mac."
echo ""
read -p "Press Enter to close..."
