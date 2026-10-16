# ast-grep

The `ast-grep/` directory contains a configured ast-grep project for Agentica. Build the grammar library, then run commands from that directory:

```sh
npx tree-sitter build -o agentica.so
cd ast-grep
ast-grep run --lang agentica -p '$X = $X.push($Y)' ~/apps/agentica/stdlib
ast-grep scan ~/apps/agentica/stdlib
ast-grep test --skip-snapshot-tests
```

`sgconfig.yml` registers the `agentica` language for `.agc` files and uses `µ` as the expando character because `$` is not valid in Agentica names. The grammar accepts `µ` in names, so `$A!=$B` is the same pattern as `$A != $B`.

Metavariables are names: `$X` can stand for an expression, a name, or a statement, but not where the grammar needs a type name. For example, `x: $T = 1` does not parse, and `$T(name: $N)` parses as a `call`, not a `construct`. Match types with a `kind` or `regex` rule instead.

## Example rule

`rules/quadratic-append.yml` warns on `xs = xs.push(y)` and on `s += t` when `s` is a String (assigned a string literal, declared `String`, or `t` holds a string literal outside any call) inside a `while` or `for` loop. Each pass copies the whole value, so the loop is quadratic.

The rule is syntactic and misses some forms:

- `s = s + x`;
- a String that starts from a non-literal value (`s = name`);
- a typed reassignment (`ys: List[Int] = ys.push(y)`);
- chained pushes (`xs = xs.push(a).push(b)`).
