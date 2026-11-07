# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `extern module "lib" ... end` blocks (Agentica 0.26.0) parse as
  `extern_module_block`, with the library in the `library` field. Members are
  `extern_function_definition` (`def` and `compute def`, with Agentica types
  and names that may end in `?` or `!`) and `module_resource_definition`
  (`resource Name`, with no `free:`). Highlighted and tagged like `extern`.

## [0.4.0] - 2026-11-04

### Added

- Regex literals `/pattern/flags` parse as `regex`, with `regex_content`,
  `escape_sequence` and `regex_flags`, where an expression starts; a `/`
  after a value stays division. Highlighted as `@string.regexp`.
- Hex, binary and octal integers (`0xFF`, `0b1010`, `0o755`, with `_`
  between digits) parse as `integer`.
- `Bytes` is highlighted as a builtin type.
- `Optional` is highlighted as a builtin type, and `none` as a builtin
  constant.
- The builtin type list of the highlights query matches the names Agentica
  0.23.0 reserves, including `Math`, `Set`, `Test`, `LogLevel` and
  `JsonField`.
- Generic declarations: `def first[T](...)`, `struct Pool[T]` and
  `type Matrix[T] = ...` take `type_parameters`.
- Struct field defaults (`timeout_ms: Int = 30000`) parse as the `default`
  of a `field_declaration`.
- `extern "lib" ... end` blocks parse as `extern_block`, with
  `extern_function_definition` (also `compute def`, `out` parameters, `...`
  and `= "c_name"`), `callback_definition`, `resource_definition` and C
  `struct_definition` members. Highlighted and tagged like the other
  declarations.
- `export Alias.name` re-exports parse as `reexport`.
- Floats with an exponent (`1e5`, `1.5e-3`, `2.0E+10`) parse as `float`.
- A line that starts with `.name` continues the expression of the line before
  (a method chain without parentheses). Up to 64 comment lines between the two
  are skipped; after more, the line break ends the statement, which keeps
  parsing linear.
- A member read on a qualified name (`Pure.MAX_REDIRECTS.to_s`,
  `Geo.Point.members`) parses as `field_access` or `method_call` on a
  `type_path`.

### Removed

- `BDD`, `HTTP`, `HttpBody`, `HttpWriter`, `Request` and `Response` are no
  longer highlighted as builtin types: they are not builtin names (`BDD` and
  `HTTP` are `std/` import aliases).

## [0.3.0] - 2026-10-20

### Added

- Case guards: `pattern if condition -> body`, as the `guard` field of
  `case_arm`.
- Nested patterns: the `pattern_bindings` of a variant hold literals, `_`,
  negative numbers and variants, as in `ok(Reading.Value(0))`.
- Default parameter values: `name: Type = expression`, as the `default` field
  of `parameter`.
- Heredocs `<<~NAME`: a `heredoc_beginning` in the expression and a
  `heredoc_body` extra with `heredoc_content`, `escape_sequence`,
  `interpolation` and `heredoc_end`, emitted by the external scanner. The
  highlights query marks them as strings.
- Digit separators in number literals: `1_000`, `0.000_5`.

### Fixed

- `script/parse-agentica-repo.sh` reads the current golden format of the
  interpreter (`ERROR LEX-...` lines in `.expected` and `.linked` files) to
  find the fixtures that are invalid on purpose.

## [0.2.1] - 2026-10-20

### Fixed

- The published crate includes the `LICENSE` file.
- `src/parser.c` is regenerated, so the language metadata reports the release
  version.

## [0.2.0] - 2026-10-16

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
- Type aliases using `type Name = Type`, including exported aliases, with a
  `type_alias_definition` node.

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

[0.4.0]: https://github.com/agentica-lang/tree-sitter-agentica/releases/tag/v0.4.0
[0.3.0]: https://github.com/agentica-lang/tree-sitter-agentica/releases/tag/v0.3.0
[0.2.1]: https://github.com/agentica-lang/tree-sitter-agentica/releases/tag/v0.2.1
[0.2.0]: https://github.com/agentica-lang/tree-sitter-agentica/releases/tag/v0.2.0
[0.1.0]: https://github.com/agentica-lang/tree-sitter-agentica/releases/tag/v0.1.0
