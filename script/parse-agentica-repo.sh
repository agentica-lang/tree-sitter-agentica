#!/usr/bin/env bash
# Parse every Agentica source of the interpreter repository and fail on any
# ERROR or MISSING node, except in sources that are invalid on purpose.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo="${1:-${AGENTICA_REPO:-$HOME/apps/agentica}}"
repo="$(cd "$repo" && pwd)"
tree_sitter="$root/node_modules/.bin/tree-sitter"

command -v rg > /dev/null || { echo "error: rg is required" >&2; exit 2; }
[ -x "$tree_sitter" ] || { echo "error: $tree_sitter is missing; run npm ci" >&2; exit 2; }

rg_or_none() {
  local status=0
  rg "$@" || status=$?
  [ "$status" -le 1 ] || { echo "error: rg failed with exit code $status" >&2; exit 2; }
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

cd "$repo"
find examples stdlib tests/fixtures tests/bdd -name '*.agc' -type f | sort > "$work/files"

mkdir -p "$work/site"
: > "$work/site-skipped"
find site/content -name '*.md' -type f | sort | while read -r page; do
  awk -v out="$work/site/$(echo "$page" | tr '/' '_')" -v page="$page" -v skipped="$work/site-skipped" '
    /^```agentica([[:space:]]|$)/ {
      n++
      inside = 1
      file = out "." n ".agc"
      if ($0 ~ /expect="(LEX|PARSE)-/) { file = ""; print page " block " n >> skipped }
      next
    }
    /^```/ && inside { inside = 0; if (file != "") close(file); next }
    inside && file != "" { print > file }
  ' "$page"
done
find "$work/site" -name '*.agc' -type f | sort >> "$work/files"

# A fixture is invalid on purpose when its golden starts with a LEX- or PARSE-
# diagnostic: `NAME.expected` for `NAME.agc`, or `NAME.linked` for the file
# that the diagnostic names inside the module fixture folder `NAME/`.
{
  find tests/fixtures -name '*.expected' -type f | sort | while read -r golden; do
    agc="${golden%.expected}.agc"
    if [ -f "$agc" ] && head -1 "$golden" | rg -q -P '^ERROR (LEX-|PARSE-(?!GHERKIN-))'; then
      echo "$agc"
    fi
  done
  find tests/fixtures -name '*.linked' -type f | sort | while read -r golden; do
    file="$(head -1 "$golden" | rg_or_none -o -P '^ERROR (LEX-|PARSE-).* file="\K[^"]+')"
    agc="${golden%.linked}/$file"
    if [ -n "$file" ] && [ -f "$agc" ]; then echo "$agc"; fi
  done
  # Text that a module fixture places where a std module would be, to show that
  # the linker never loads it.
  echo "tests/fixtures/frontend/modules/std-queue-embedded/std/queue.agc"
} | sort > "$work/allowlist"

total=$(wc -l < "$work/files")
config="$work/config.json"
printf '{"parser-directories": []}\n' > "$config"

cd "$root"
status=0
"$tree_sitter" parse --config-path "$config" --quiet --stat \
  --paths <(sed "s#^\([^/]\)#$repo/\1#" "$work/files") > "$work/stat" 2>&1 || status=$?

parsed=$(sed -n 's/^Total parses: \([0-9]*\);.*/\1/p' "$work/stat")
if [ "$parsed" != "$total" ]; then
  echo "error: tree-sitter parsed '${parsed:-nothing}' of $total files (exit code $status)" >&2
  sed 's/^/  /' "$work/stat" >&2
  exit 2
fi

rg_or_none -o '^\S+\.agc\s' "$work/stat" | sed 's/\s*$//' | sed "s#^$repo/##" | sort -u > "$work/failed"
comm -23 "$work/failed" "$work/allowlist" > "$work/unexpected"
comm -13 "$work/failed" "$work/allowlist" > "$work/fixed"

failed=$(wc -l < "$work/failed")
allowed=$(wc -l < "$work/allowlist")
unexpected=$(wc -l < "$work/unexpected")

echo "files: $total"
echo "clean: $((total - failed))"
echo "allowlist (fixtures invalid on purpose): $allowed"
sed 's/^/  /' "$work/allowlist"
echo "site blocks skipped (expect LEX-/PARSE-): $(wc -l < "$work/site-skipped")"
sed 's/^/  /' "$work/site-skipped"
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
