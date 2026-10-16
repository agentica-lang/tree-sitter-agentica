(identifier) @variable

(type_identifier) @type

((type_identifier) @type.builtin
  (#match? @type.builtin
    "^(BDD|Bool|Dir|File|FileHandle|FileInfo|Float|Fn|Header|HTTP|HttpBody|HttpClient|HttpClientOptions|HttpResponse|HttpServer|HttpServerOptions|HttpWire|HttpWriter|Int|IO|Json|JSON|List|Listener|Map|Nil|Path|Process|ProcessOutput|Random|Range|Request|Response|Result|Socket|String|System|Task|TCP|Time|TLS|Void)$"))

; Keywords

[
  "def"
  "struct"
  "enum"
  "type"
  "import"
  "export"
  "as"
  "from"
  "end"
  "do"
] @keyword

[
  "if"
  "elsif"
  "else"
  "case"
] @keyword.conditional

[
  "while"
  "for"
  "in"
  (break)
  (next)
] @keyword.repeat

"return" @keyword.return

"try" @keyword.exception

[
  "and"
  "or"
  "not"
] @keyword.operator

; Declarations

(function_definition
  name: (identifier) @function)

(parameter
  name: (identifier) @variable.parameter)

(block_parameter
  name: (identifier) @variable.parameter)

(struct_definition
  name: (type_identifier) @type.definition)

(field_declaration
  name: (identifier) @property)

(enum_definition
  name: (type_identifier) @type.definition)

(type_alias_definition
  name: (type_identifier) @type.definition)

(enum_variant
  name: (type_identifier) @constant)

(type_parameters
  (type_identifier) @type.parameter)

(import
  alias: (type_identifier) @module)

(constant_definition
  name: (type_identifier) @constant)

; Calls

(call
  module: (type_identifier) @module)

(call
  function: (identifier) @function.call)

(method_call
  method: (identifier) @function.method.call)

(function_reference
  module: (type_identifier) @module)

(function_reference
  name: (identifier) @function)

(field_access
  field: (identifier) @property)

(named_argument
  name: (identifier) @property)

; Types

(type_path
  (type_identifier) @constant .)

; Patterns

(variant_pattern
  variant: (identifier) @function.builtin)

((identifier) @variable.builtin
  (#eq? @variable.builtin "_"))

; Literals

(string) @string

(escape_sequence) @string.escape

(integer) @number

(float) @number.float

[
  (true)
  (false)
] @boolean

(nil) @constant.builtin

(comment) @comment

; Operators and punctuation

[
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "=="
  "!="
  "<"
  "<="
  ">"
  ">="
  "+"
  "-"
  "*"
  "/"
  "%"
  "|>"
  "!"
  "&&"
  "||"
  ".."
  "..."
  "&"
  "->"
] @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  "."
  ":"
  "|"
] @punctuation.delimiter

(interpolation
  "#{" @punctuation.special
  "}" @punctuation.special) @embedded
