#!/usr/bin/env bash
# Parse every Agentica source of the interpreter repository and fail on any
# ERROR or MISSING node, except in fixtures that are invalid on purpose.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="${1:-${AGENTICA_REPO:-$HOME/apps/agentica}}"
repo="$(cd "$repo" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cd "$repo"
find examples stdlib tests/fixtures tests/bdd -name '*.agc' -type f | sort > "$work/files"

mkdir -p "$work/site"
find site/content -name '*.md' -type f | sort | while read -r page; do
  awk -v out="$work/site/$(echo "$page" | tr '/' '_')" '
    /^```agentica[[:space:]]*$/ { n++; file = out "." n ".agc"; inside = 1; next }
    /^```/ && inside { inside = 0; close(file); next }
    inside { print > file }
  ' "$page"
done
find "$work/site" -name '*.agc' -type f | sort >> "$work/files"

# A fixture is invalid on purpose when its .expected reports a LEX- or PARSE-
# diagnostic as the program result.
rg -l --glob '*.expected' '^\s*"code": "(LEX|PARSE)-' tests/fixtures 2>/dev/null \
  | sed 's/\.expected$/.agc/' | while read -r agc; do
    [ -f "$agc" ] && echo "$agc"
  done | sort > "$work/allowlist" || true

total=$(wc -l < "$work/files")
config="$work/config.json"
printf '{"parser-directories": []}\n' > "$config"

cd "$root"
set +e
npx --no-install tree-sitter parse --config-path "$config" --quiet --stat --paths <(sed "s#^\([^/]\)#$repo/\1#" "$work/files") > "$work/stat" 2>&1
set -e

{ rg -o '^\S+\.agc\s' "$work/stat" || true; } | sed 's/\s*$//' | sed "s#^$repo/##" | sort -u > "$work/failed"
comm -23 "$work/failed" "$work/allowlist" > "$work/unexpected"
comm -13 "$work/failed" "$work/allowlist" > "$work/fixed"

failed=$(wc -l < "$work/failed")
allowed=$(wc -l < "$work/allowlist")
unexpected=$(wc -l < "$work/unexpected")

echo "files: $total"
echo "clean: $((total - failed))"
echo "allowlist (invalid on purpose): $allowed"
sed 's/^/  /' "$work/allowlist"
if [ -s "$work/fixed" ]; then
  echo "allowlisted files that parse without errors:"
  sed 's/^/  /' "$work/fixed"
fi
if [ "$unexpected" -gt 0 ]; then
  echo "unexpected parse errors: $unexpected"
  rg -F -f "$work/unexpected" "$work/stat" | sed "s#$repo/##; s#$work/site/#site:#; s/^/  /"
  exit 1
fi
echo "all valid files parse without ERROR or MISSING nodes"
