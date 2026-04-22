#!/usr/bin/env bash
set -euo pipefail
if [ -z "${VITE_GEMINI_API_KEY:-}" ]; then
  echo "ERROR: VITE_GEMINI_API_KEY is not set."
  exit 1
fi
echo "Gemini API key is set. (Value not shown for security)"
