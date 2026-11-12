(identifier) @variable

(type_identifier) @type

((type_identifier) @type.builtin
  (#match? @type.builtin
    "^(ATS|Await|Base64|Bool|Bytes|C|Channel|Codec|Dir|File|FileHandle|FileInfo|Float|Fn|IO|Int|JSON|Json|JsonField|Lazy|List|Listener|Map|Math|Native|Nil|OpenSSL|Optional|Path|Process|ProcessOutput|Profile|Random|Range|Result|Set|Socket|String|StructMember|System|TCP|TLS|Task|TaskDown|TaskExit|TaskRef|Test|TestCase|Time|TlsClientOptions|TlsContext|TlsServerOptions|Void|Zlib)$"))

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
  "extern"
  "module"
  "compute"
  "callback"
  "resource"
  "free"
  "free_ref"
  "out"
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

(extern_function_definition
  name: (identifier) @function)

(callback_definition
  name: (type_identifier) @type.definition)

(resource_definition
  name: (type_identifier) @type.definition)

(module_resource_definition
  name: (type_identifier) @type.definition)

(parameter
  name: (identifier) @variable.parameter)

(extern_parameter
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

(reexport
  module: (type_identifier) @module)

(reexport
  name: (identifier) @function)

; The C function that frees a resource: a `type_identifier` when it starts
; with a capital letter (`PQfinish`). `C.Function` stays a type.
(resource_definition
  free: [(identifier) (type_identifier)] @function)

(function_reference
  name: (identifier) @function)

(field_access
  field: (identifier) @property)

(named_argument
  name: (identifier) @property)

; Types

((type_path
   . (type_identifier) @_family
   . (type_identifier) @type .)
  (#match? @_family
    "^(OpenSSL|HTTP|HttpWire|Logger|LogRegistry|TLS|TCP|JSON|File|Process|C|Native)$"))

(type_path
  (type_identifier) @constant .)

; A builtin nested name, `Family.Member` (`OpenSSL.Digest`, `HTTP.Request`,
; `Logger.Event`, `TLS.Context`, `File.Handle`), is a type. The two names are
; captured by one pattern so that the family and the member are highlighted
; together; the predicate tests both names against the families and the members
; that the builtin catalog knows, and a third segment (`Logger.Level.Info`) keeps
; its constant color.
((type_path
   . (type_identifier) @type.builtin
   . (type_identifier) @type.builtin)
  (#match? @type.builtin
    "^(OpenSSL|HTTP|HttpWire|Logger|LogRegistry|TLS|TCP|JSON|File|Process|C|Native|Digest|HMAC|CMAC|Cipher|KDF|Random|RSA|Request|Response|Header|ClientOptions|ServerOptions|Client|Server|Handler|Event|Level|Context|Socket|Value|Handle|Options|Pointer|Function|Mutex)$"))

((scoped_type_identifier
   module: (type_identifier) @type.builtin
   name: (type_identifier) @type.builtin)
  (#match? @type.builtin
    "^(OpenSSL|HTTP|HttpWire|Logger|LogRegistry|TLS|TCP|JSON|File|Process|C|Native|Digest|HMAC|CMAC|Cipher|KDF|Random|RSA|Request|Response|Header|ClientOptions|ServerOptions|Client|Server|Handler|Event|Level|Context|Socket|Value|Handle|Options|Pointer|Function|Mutex)$"))

; Patterns

(variant_pattern
  variant: (identifier) @function.builtin)

((identifier) @variable.builtin
  (#eq? @variable.builtin "_"))

; `none` is a constant of the language, not a keyword: the parser sees an
; identifier, so it must come after the generic (identifier) rule.
((identifier) @constant.builtin
  (#eq? @constant.builtin "none"))

; Literals

(string) @string

[
  (heredoc_beginning)
  (heredoc_content)
  (heredoc_end)
] @string

(regex) @string.regexp

(regex_flags) @character.special

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

; The slashes of a regex are the division token, so this comes after the
; operators to take them back: it relies on a later pattern winning over an
; earlier one for the same node, as in the tree-sitter CLI and Neovim.
(regex "/" @string.regexp)

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
