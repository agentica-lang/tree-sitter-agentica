# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-13

### Added

- A tree-sitter grammar for the core Agentica language: imports and exports;
  `def`, `struct` and `enum` declarations (generic enums included); assignments
  and compound assignments; `if`/`elsif`/`else`, `while`, `for`, `case` with
  patterns, `return`, `break` and `next`; expressions with Agentica's operator
  precedence, ranges, `try`, calls, module calls, method calls, field access,
  indexing, function references, constructors, enum variants, lists, maps,
  `do ... end` blocks with typed parameters, and strings with escapes and
  nested `#{...}` interpolation.
- Node types with fields (`name`, `parameters`, `return_type`, `body`,
  `receiver`, `method`, `arguments`, `block`, ...) for queries and ast-grep
  patterns.
- An external scanner for significant newlines (ignored inside brackets but
  kept in `do` blocks written there), `name!=` against the `?`/`!` name
  suffixes, stand-alone `break`/`next`, the `do` of loop and `case` headers,
  and string text.
- `highlights.scm`, `tags.scm` and `locals.scm` queries, with a highlight test.
- Corpus tests for every construct, and `script/parse-agentica-repo.sh`, which
  parses every Agentica source of the interpreter repository and its site
  examples, skipping only fixtures that are invalid on purpose.
- ast-grep support: an `agentica` custom language in `ast-grep/sgconfig.yml`
  and the `quadratic-append` rule, which warns on `xs = xs.push(y)` and String
  `s += t` inside `while`/`for` loops, with rule tests.

[0.1.0]: https://github.com/sonic182/tree-sitter-agentica/releases/tag/v0.1.0
