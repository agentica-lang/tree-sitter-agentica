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
- A leading `.name` continues the line before also where the interpreter rejects it (the first line of a body, or after a type annotation such as `-> Void`).
- An `extern` block accepts any type in a signature and a default value is not rejected; the interpreter reports `PARSE-EXTERN-TYPE`, `PARSE-EXTERN-DEFAULT` and the other `PARSE-EXTERN-` codes. `extern`, `callback`, `resource`, `compute`, `free` and `out` are keywords where an extern member or parameter starts and ordinary names elsewhere.
- An `extern module` block parses `out` parameters, `...`, `= "c_name"` and `C.` types too; the interpreter reports `PARSE-EXTERN-MODULE` and `PARSE-EXTERN-TYPE` for them. A `callback` or `struct` line, or a `free:` after a resource, is a syntax error here.
- `µ` is accepted in names, including before `!=`; it is the ast-grep expando character.
- A regex literal may repeat a flag (`/a/ii`) and may hold `#{` as text; the interpreter rejects both.
- A one-line `def` may return `Void` (`def f() -> Void = puts(1)`); the interpreter reports `PARSE-UNEXPECTED-TOKEN` at the `=`.
- A block in braces follows a call written with arguments too (`xs.map(1) { |x| x }`); the interpreter accepts it only after a call written without `(`.
