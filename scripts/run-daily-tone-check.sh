#!/usr/bin/env zsh
set -euo pipefail

ROOT="/Users/tuesdaymorning/Devguru/sajangnim_insta"
cd "$ROOT"

echo "[tone-check] running A/B test (20 cases)"
node scripts/run-tone-ab-test.mjs --limit 20

echo "[tone-check] analyzing latest result"
node scripts/analyze-tone-ab-results.mjs --latest

LATEST_REPORT=$(ls -1t data/ab_tone_analysis_*.md | head -n 1)
echo "[tone-check] latest report: $LATEST_REPORT"
echo "[tone-check] top lines:"
sed -n '1,60p' "$LATEST_REPORT"
