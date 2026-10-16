# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Rust bindings: a `tree-sitter-agentica` crate exposing `LANGUAGE`,
  `NODE_TYPES` and the highlights, locals and tags queries, so Rust tools can
  depend on the grammar by git revision.
- Module constants: `NAME = expr` and `NAME: Type = expr` at the top level,
  `export` in front to share them. `constant_definition` nodes; the
  highlights and tags queries mark them.
- Named imports: `import {area, Square as Sq} from "shapes"`, as an
  `import_list` of `import_name` nodes (`name`, `rename`).
- The pipe operator `x |> f(a)` as a `pipe` node, with the `|>` precedence of
  the Agentica grammar (below `+`, above the comparisons).

### Changed

- **Breaking:** the import syntax follows Agentica. `import Models from
  "models"` replaces `import "models" as Models`, and the `import` node's
  `path` now follows the `from` keyword. The old form no longer parses.

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
