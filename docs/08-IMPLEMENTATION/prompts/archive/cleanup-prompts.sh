#!/bin/bash
# Cleanup root from prompt spam
echo "Cleaning root from PROMPT_*.md spam..."
mkdir -p docs/08-IMPLEMENTATION/prompts/archive
mv PROMPT_*.md docs/08-IMPLEMENTATION/prompts/archive/ 2>/dev/null || true
mv AGENTS_2.md docs/08-IMPLEMENTATION/prompts/archive/ 2>/dev/null || true
echo "Root after cleanup:"
ls -1 *.md 2>/dev/null | head -20
echo ""
echo "Archive:"
ls -1 docs/08-IMPLEMENTATION/prompts/archive/ 2>/dev/null | head -20
echo ""
echo "Done — root bersih"
