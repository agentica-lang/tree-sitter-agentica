#!/usr/bin/env bash
# Parses a body with a very long run of comment lines. The scanner looks ahead
# over comment lines to find a leading `.name`; the look-ahead is bounded, so
# the time stays linear in the run length. Fails on an error or past the limit.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
lines="${1:-20000}"
limit="${2:-20}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

{
  printf 'def main() -> Void\n  x = 1\n'
  awk -v n="$lines" 'BEGIN { for (i = 0; i < n; i++) print "  # comment line" }'
  printf '  y = 2\nend\n'
} > "$work/comments.agc"
printf '{"parser-directories": []}\n' > "$work/config.json"
cd "$root"

timeout "$limit" "$root/node_modules/.bin/tree-sitter" parse --config-path "$work/config.json" \
  --quiet "$work/comments.agc"
echo "parsed $lines comment lines within ${limit}s"
