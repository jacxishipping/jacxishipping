#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  JACXI SHIPPING - WINDOWS APP RELEASE PACKAGER           "
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DIST_DIR="$SCRIPT_DIR/dist/win-x64"
ZIP_FILE="$SCRIPT_DIR/dist/JacxiShipping-Windows-x64-v1.0.0.zip"

mkdir -p "$DIST_DIR"

echo ">> Publishing single-file Windows (x64) release executable..."
dotnet publish JacxiShipping.WindowsApp/JacxiShipping.WindowsApp.csproj \
  -c Release \
  -r win-x64 \
  -p:PublishSingleFile=true \
  --self-contained false \
  -o "$DIST_DIR"

echo ">> Creating distribution zip archive..."
cd "$SCRIPT_DIR/dist"
rm -f "$ZIP_FILE"
zip -r "$ZIP_FILE" win-x64

echo "=========================================================="
echo "  RELEASE READY: $DIST_DIR/JacxiShipping.exe"
echo "  ZIP ARCHIVE:  $ZIP_FILE"
echo "=========================================================="
