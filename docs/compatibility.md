# Known differences from the interpreter

The grammar accepts a small superset of the [Agentica interpreter](https://github.com/sonic182/agentica). This keeps the grammar simple and supports editor and structural-search tools. These are the known differences:

- Statements are allowed at the top level, so ast-grep patterns such as `$X = $X.push($Y)` parse on their own.
- The blank line required between declarations is not checked.
- Comparisons, equalities, and ranges may chain: `a < b < c`, `1..2..3`.
- A newline is whitespace wherever a statement cannot end, so expressions may continue after a binary operator, `=`, `->`, `not`, `try`, and similar tokens.
- An interpolation may span lines and contain comments.
- A lone carriage return counts as a space.
- In every body, not only `do` blocks, the last statement may share its line with `end` (`1 end`), and `else` may be followed by a statement on the same line.
- A `case` may have no arms and an `enum` may have no variants.
- Any name is a valid `case` pattern (`x ->`), and any name may take bindings (`foo(a) ->`), not only `_`, `ok`, and `error`.
- A variant pattern or type path may have any number of segments (`A.B.C.D`), not only two or three.
- Positional and named arguments may mix in one call or constructor.
- Bare names such as `elif` or `let` are accepted as expression statements.
- `x |> f() + 1` parses as `(x |> f()) + 1`; the specification rejects `+` after a pipe call.
- `µ` is accepted in names, including before `!=`; it is the ast-grep expando character.
