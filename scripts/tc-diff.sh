#!/usr/bin/env bash
# Typecheck gate for this branch.
#
# `npm run typecheck` reports 356 pre-existing errors on main (untyped legacy
# components, mostly implicit-any). A clean run is therefore not achievable and
# not the bar. The bar is: this branch introduces no NEW error.
#
# Usage:
#   scripts/tc-diff.sh --save    # record the baseline (run once, on main)
#   scripts/tc-diff.sh           # fail if any error is not in the baseline
set -uo pipefail

BASELINE="${TC_BASELINE:-.claude/tc-baseline.txt}"

npm run typecheck 2>&1 | grep -E "error TS" | sort > /tmp/tc-current-$$.txt

if [ "${1:-}" = "--save" ]; then
    mkdir -p "$(dirname "$BASELINE")"
    mv /tmp/tc-current-$$.txt "$BASELINE"
    echo "baseline saved: $(wc -l < "$BASELINE") errors"
    exit 0
fi

if [ ! -f "$BASELINE" ]; then
    echo "no baseline at $BASELINE — run: scripts/tc-diff.sh --save" >&2
    rm -f /tmp/tc-current-$$.txt
    exit 2
fi

NEW=$(comm -13 "$BASELINE" /tmp/tc-current-$$.txt)
FIXED=$(comm -23 "$BASELINE" /tmp/tc-current-$$.txt)
rm -f /tmp/tc-current-$$.txt

if [ -n "$FIXED" ]; then
    echo "resolved (baseline errors that no longer occur):"
    echo "$FIXED" | sed 's/^/  - /'
fi

if [ -n "$NEW" ]; then
    echo "NEW type errors introduced by this branch:" >&2
    echo "$NEW" | sed 's/^/  /' >&2
    exit 1
fi

echo "no new type errors"
