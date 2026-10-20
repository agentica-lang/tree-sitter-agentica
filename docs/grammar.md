# Grammar details

This page describes the syntax tree exposed by the grammar and behavior implemented by the external scanner.

## Node types

Declarations: `function_definition` (`name`, `parameters`, `return_type`, `body`), `parameter` (`name`, `type`, `default`), `struct_definition` (`name`, `field`), `field_declaration`, `enum_definition` (`name`, `type_parameters`, `variant`), `enum_variant` (`name`, `payload`), `type_alias_definition` (`name`, `type`), `import` (`alias` or `names`, `path`), `import_list`, `import_name` (`name`, `rename`), `constant_definition` (`name`, `type`, `value`) and `export` (`declaration`).

Statements: `assignment` (`left`, `type`, `right`), `compound_assignment` (`left`, `operator`, `right`), `return`, `break`, `next`, `if` (`condition`, `consequence`, `alternative`), `elsif`, `else`, `while` (`condition`, `body`), `for` (`variable`, `iterable`, `body`), `case` (`value`, `arm`) and `case_arm` (`pattern`, `guard`, `body`). Agentica has no `when`: an arm is `pattern -> body`, or `pattern if guard -> body`. Patterns include `variant_pattern` (`variant`, `bindings`), `negative_number`, literals, and identifiers (including `_`); the `pattern_bindings` of a variant hold patterns too, so `ok(Reading.Value(0))` nests.

Expressions include `pipe` (`left`, `right`), where `right` is a `pipe_target` wrapping a `call`; `binary` (`left`, `operator`, `right`), `unary`, `range` (`begin`, `operator`, `end`), `try`, `call` (`module`, `function`, `arguments`, `block`), `method_call` (`receiver`, `method`, `arguments`, `block`), `field_access` (`receiver`, `field`), `index`, `function_reference`, `construct` (`type`, `arguments`), `named_argument`, `type_path` (`Color.Red`), `block` (`parameters`, `body`) with `block_parameter`, `list`, `map` with `pair`, `string` with `string_content`, `escape_sequence` and `interpolation`, `heredoc_beginning` (`<<~NAME`), `integer`, `float`, `true`, `false` and `nil`.

Types include `type` (`name`, `arguments`), `scoped_type_identifier` (`Models.User`), `type_arguments` and `type_identifier`.

## Tree shape notes

- A `body` holds at least one statement and spans from the first statement to the last. Blank and comment lines around it belong to the parent node, so an empty body has no `body` node.
- A heredoc body lies on the lines after its opener, so it cannot be a child of the expression that holds `<<~NAME`. The expression holds a `heredoc_beginning`; the body is a `heredoc_body` extra (`heredoc_content`, `escape_sequence`, `interpolation`, `heredoc_end`) placed where the parser stands at the line break of the opener line, as in tree-sitter-ruby. Its text keeps the source indentation that the compiler removes.
- `IO.puts(x)` is a `call` with a `module`; `xs.size` without parentheses is a `field_access`, matching the interpreter's parser.

## External scanner

The scanner in `src/scanner.c` handles lexical context the grammar cannot express on its own:

- Newlines end statements. Inside `(...)`, `[...]`, and `{...}`, they are whitespace, except inside a `do ... end` block. The scanner emits newline tokens only where the parser accepts them.
- A trailing `!` belongs to a name, unless `=` follows it; therefore `a!=b`, `nil!=x`, `true!=x`, and `false!=x` parse as inequality.
- `break` and `next` are loop control only when alone on a line; elsewhere they are ordinary names, as in `next = 1`.
- `do` after a `while`, `for`, or `case` header belongs to that construct, not to a block on the last call: `while xs.any? do`.
- String text may contain any character, including NUL, except `"`, `\\`, a newline, and `#{`.
- `<<~NAME` queues a heredoc. The line break that ends its line starts the first queued body, which runs until a line that holds only spaces and `NAME`; the next body starts at the break after that end line. The newline token of the opener line comes after the last body, so `f(<<~A,` goes on with the next argument after the end line.
