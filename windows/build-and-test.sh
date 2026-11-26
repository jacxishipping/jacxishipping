#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  JACXI SHIPPING - WINDOWS APP BUILD & TEST PIPELINE     "
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ">> 1. Running xUnit Test Suite..."
dotnet test JacxiShipping.WindowsApp.Tests/JacxiShipping.WindowsApp.Tests.csproj

echo ">> 2. Building Solution..."
dotnet build JacxiShipping.slnx -c Release

echo "=========================================================="
echo "  BUILD & TEST SUCCESSFUL!                                "
echo "=========================================================="
