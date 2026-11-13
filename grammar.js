/**
 * @file Agentica grammar for tree-sitter
 * @author Johanderson Mogollón
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  range: 1,
  or: 2,
  and: 3,
  equality: 4,
  comparison: 5,
  pipe: 6,
  additive: 7,
  multiplicative: 8,
  unary: 9,
  postfix: 10,
};

const COMPOUND_OPERATORS = ['+=', '-=', '*=', '/=', '%='];

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function separated($, item) {
  return seq(item, repeat(seq(repeat1($._newline), item)));
}

function content($, name) {
  return seq(
    repeat($._newline),
    optional(seq(field(name, $.body), repeat($._newline))),
  );
}

module.exports = grammar({
  name: 'agentica',

  externals: $ => [
    $._newline,
    $._identifier_before_neq,
    $.break,
    $.next,
    $.string_content,
    $._loop_do,
    $._true_before_neq,
    $._false_before_neq,
    $._nil_before_neq,
    $.heredoc_beginning,
    $._heredoc_body_start,
    $.heredoc_content,
    $.heredoc_end,
    $._private,
    $._error_sentinel,
  ],

  // A heredoc body lies on the lines after its opener, so it cannot be a child
  // of the expression that holds `<<~NAME`. As in tree-sitter-ruby, the scanner
  // emits it at the line break of the opener line, as an extra.
  extras: $ => [/[ \t\r\n\f]/, $.comment, $.heredoc_body],

  word: $ => $.identifier,

  reserved: {
    global: _ => [
      'def', 'struct', 'enum', 'case', 'do', 'import', 'export', 'end', 'if',
      'elsif', 'else', 'while', 'for', 'in', 'return', 'try', 'true', 'false',
      'nil', 'and', 'or', 'not',
    ],
  },

  supertypes: $ => [$._statement, $._expression, $._pattern],

  conflicts: $ => [
    [$.body],
    [$.type_path],
    [$._primary, $.type_application],
  ],

  rules: {
    source_file: $ => seq(
      repeat($._newline),
      optional(seq(
        separated($, choice($._declaration, $._statement, $.private_line)),
        repeat($._newline),
      )),
    ),

    _declaration: $ => choice(
      $.function_definition,
      $.struct_definition,
      $.enum_definition,
      $.type_alias_definition,
      $.constant_definition,
      $.import,
      $.reexport,
      $.extern_block,
      $.extern_module_block,
      $.module_block,
    ),

    // `module Name ... end` groups declarations of one file under a name. A
    // lowercase `module` is a name.
    module_block: $ => seq(
      'module',
      field('name', $.type_identifier),
      $._newline,
      repeat(choice(
        seq(field('member', $._module_member), $._newline),
        seq($.private_line, $._newline),
        $._newline,
      )),
      'end',
    ),

    // `private` alone on its line, at the level of the declarations of a file
    // or a module block, or among the fields of a struct: what comes after it
    // is private. The scanner emits it only for the word alone on its line (a
    // comment may follow), so `private = 1`, `private()` and a field
    // `private: Int` keep `private` as a name. A second line in one scope is
    // the interpreter's error (`PARSE-SECOND-PRIVATE`), not this grammar's.
    private_line: $ => alias($._private, 'private'),

    _module_member: $ => choice(
      $.function_definition,
      $.struct_definition,
      $.enum_definition,
      $.type_alias_definition,
      $.constant_definition,
    ),

    // `import Alias from "path"` or `import {a, B as C} from "path"`: one form
    // per line, so the alias and the name list are two alternatives.
    import: $ => seq(
      'import',
      choice(
        field('alias', $.type_identifier),
        field('names', $.import_list),
      ),
      'from',
      field('path', $.string),
    ),

    import_list: $ => seq('{', commaSep1($.import_name), '}'),

    // The original name comes first; `as` gives the local name. Both keep the
    // case rule of the name they stand for, which the checker enforces.
    import_name: $ => seq(
      field('name', choice($.identifier, $.type_identifier)),
      optional(seq('as', field('rename', choice($.identifier, $.type_identifier)))),
    ),

    // `export Alias.name` makes a name of an imported file importable again. It
    // is the only use of `export`: a declaration is public unless it comes
    // after a `private_line`.
    reexport: $ => seq(
      'export',
      field('module', $.type_identifier),
      '.',
      field('name', choice($.identifier, $.type_identifier)),
    ),

    // `extern "lib" ... end` declares C functions of a native library. A
    // member is one line, except a C struct, which has fields and an `end`.
    // The members are the nodes that carry a `name`: a C struct reuses
    // `struct_definition`, and a function with no body is an
    // `extern_function_definition`, not a `function_definition`.
    extern_block: $ => seq(
      'extern',
      field('library', $.string),
      $._newline,
      repeat(choice(seq(field('member', $._extern_member), $._newline), $._newline)),
      'end',
    ),

    _extern_member: $ => choice(
      $.extern_function_definition,
      $.callback_definition,
      $.resource_definition,
      $.struct_definition,
    ),

    // `extern module "NAME" ... end` declares the functions of a native module
    // with Agentica types. Its members reuse `extern_function_definition` (a
    // `def` or `compute def` with no body) and add `module_resource_definition`,
    // which has no `free:` because the module frees its resources. `callback`,
    // `struct`, `out`, `...`, `= "c_name"` and `C.` types are not members: the
    // interpreter rejects them (`PARSE-EXTERN-MODULE`), and so does this grammar
    // for `callback` and `struct`. `module` is a keyword only after `extern`.
    extern_module_block: $ => seq(
      'extern',
      'module',
      field('library', $.string),
      $._newline,
      repeat(choice(seq(field('member', $._extern_module_member), $._newline), $._newline)),
      'end',
    ),

    _extern_module_member: $ => choice(
      $.extern_function_definition,
      $.module_resource_definition,
    ),

    module_resource_definition: $ => seq(
      'resource',
      field('name', $.type_identifier),
    ),

    // `= "c_name"` after the result gives the C symbol when it differs from
    // the name. `compute def` runs off the scheduler.
    extern_function_definition: $ => seq(
      optional('compute'),
      'def',
      field('name', $.identifier),
      field('parameters', $.extern_parameters),
      '->',
      field('return_type', $.type),
      optional(seq('=', field('symbol', $.string))),
    ),

    callback_definition: $ => seq(
      'callback',
      field('name', $.type_identifier),
      field('parameters', $.extern_parameters),
      '->',
      field('return_type', $.type),
    ),

    // `resource Name, free: c_name` (or `free_ref:`, or `free: C.Function`):
    // the type of the C pointers that the block's functions return.
    resource_definition: $ => seq(
      'resource',
      field('name', $.type_identifier),
      ',',
      field('free_kind', choice('free', 'free_ref')),
      ':',
      field('free', choice($.identifier, $.type_identifier, $.scoped_type_identifier)),
    ),

    // A bare `...` ends the fixed parameters of a variadic C function.
    extern_parameters: $ => seq(
      '(',
      commaSep(choice($.extern_parameter, '...')),
      ')',
    ),

    // `out` marks an out parameter only before a name, so `out: C.Pointer` is
    // a parameter called `out`.
    extern_parameter: $ => seq(
      choice(
        seq(optional('out'), field('name', $.identifier)),
        field('name', alias('out', $.identifier)),
      ),
      ':',
      field('type', $.type),
    ),

    // A constant is a type-name token, so it cannot collide with the
    // `identifier` assignment that statements use.
    constant_definition: $ => seq(
      field('name', $.type_identifier),
      optional(seq(':', field('type', $.type))),
      '=',
      field('value', $._expression),
    ),

    type_alias_definition: $ => seq(
      'type',
      field('name', $.type_identifier),
      optional(field('type_parameters', $.type_parameters)),
      '=',
      field('type', $.type),
    ),

    function_definition: $ => seq(
      'def',
      field('name', $.identifier),
      optional(field('type_parameters', $.type_parameters)),
      field('parameters', $.parameters),
      '->',
      field('return_type', $.type),
      choice(
        seq($._newline, content($, 'body'), 'end'),
        // `def f(x: Int) -> Int = x * 2`: the expression is the whole body.
        seq('=', field('value', $._expression)),
      ),
    ),

    parameters: $ => seq('(', commaSep($.parameter), ')'),

    // The parser takes any expression as a default, so that the checker can
    // say why one is not allowed.
    parameter: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.type),
      optional(seq('=', field('default', $._expression))),
    ),

    struct_definition: $ => seq(
      'struct',
      field('name', $.type_identifier),
      optional(field('type_parameters', $.type_parameters)),
      $._newline,
      repeat(choice(
        seq(field('field', $.field_declaration), $._newline),
        seq($.private_line, $._newline),
        $._newline,
      )),
      'end',
    ),

    // Like a parameter, a field takes any expression as a default, so that
    // the checker can say why one is not allowed.
    field_declaration: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.type),
      optional(seq('=', field('default', $._expression))),
    ),

    enum_definition: $ => seq(
      'enum',
      field('name', $.type_identifier),
      optional(field('type_parameters', $.type_parameters)),
      $._newline,
      repeat(choice(seq(field('variant', $.enum_variant), $._newline), $._newline)),
      'end',
    ),

    type_parameters: $ => seq('[', commaSep1($.type_identifier), ']'),

    enum_variant: $ => seq(
      field('name', $.type_identifier),
      optional(field('payload', $.variant_payload)),
    ),

    variant_payload: $ => seq('(', commaSep1($.type), ')'),

    // Types

    type: $ => seq(
      field('name', choice($.type_identifier, $.scoped_type_identifier)),
      optional(field('arguments', $.type_arguments)),
    ),

    scoped_type_identifier: $ => seq(
      field('module', $.type_identifier),
      '.',
      field('name', $.type_identifier),
    ),

    type_arguments: $ => seq('[', commaSep1($.type), ']'),

    // Statements

    body: $ => separated($, $._statement),

    _statement: $ => choice(
      $.assignment,
      $.compound_assignment,
      $.return,
      $.break,
      $.next,
      $.if,
      $.while,
      $.for,
      $.case,
      $.guard,
      $._expression,
    ),

    // `return x if c`, `break if c`, `next if c`: the `if` with one statement.
    guard: $ => seq(
      field('statement', choice($.return, $.break, $.next)),
      'if',
      field('condition', $._expression),
    ),

    assignment: $ => seq(
      field('left', $.identifier),
      optional(seq(':', field('type', $.type))),
      '=',
      field('right', choice($._expression, $.case)),
    ),

    compound_assignment: $ => seq(
      field('left', $.identifier),
      field('operator', choice(...COMPOUND_OPERATORS)),
      field('right', choice($._expression, $.case)),
    ),

    return: $ => prec.right(seq('return', optional(field('value', choice($._expression, $.case))))),

    if: $ => seq(
      'if',
      field('condition', $._expression),
      $._newline,
      content($, 'consequence'),
      repeat(field('alternative', $.elsif)),
      optional(field('alternative', $.else)),
      'end',
    ),

    elsif: $ => seq(
      'elsif',
      field('condition', $._expression),
      $._newline,
      content($, 'consequence'),
    ),

    else: $ => seq('else', content($, 'body')),

    while: $ => seq(
      'while',
      field('condition', $._expression),
      optional(alias($._loop_do, 'do')),
      $._newline,
      content($, 'body'),
      'end',
    ),

    for: $ => seq(
      'for',
      field('variable', $.identifier),
      'in',
      field('iterable', $._expression),
      optional(alias($._loop_do, 'do')),
      $._newline,
      content($, 'body'),
      'end',
    ),

    case: $ => seq(
      'case',
      field('value', $._expression),
      optional(alias($._loop_do, 'do')),
      $._newline,
      repeat($._newline),
      repeat(field('arm', $.case_arm)),
      'end',
    ),

    case_arm: $ => prec.right(seq(
      field('pattern', $._pattern),
      repeat(seq(',', field('pattern', $._pattern))),
      optional(seq('if', field('guard', $._expression))),
      '->',
      content($, 'body'),
    )),

    _pattern: $ => choice(
      $.identifier,
      $.integer,
      $.float,
      $.string,
      $.true,
      $.false,
      $.nil,
      $.negative_number,
      $.variant_pattern,
    ),

    negative_number: $ => seq('-', choice($.integer, $.float)),

    variant_pattern: $ => choice(
      seq(
        field('variant', $.identifier),
        field('bindings', $.pattern_bindings),
      ),
      seq(
        field('variant', $.type_path),
        optional(field('bindings', $.pattern_bindings)),
      ),
    ),

    // A slot binds a name or `_`, or matches a nested literal or variant.
    pattern_bindings: $ => seq('(', commaSep1($._pattern), ')'),

    // Expressions

    _expression: $ => choice(
      $.range,
      $.binary,
      $.pipe,
      $.unary,
      $.try,
      $._primary,
    ),

    range: $ => prec.left(PREC.range, seq(
      field('begin', $._expression),
      field('operator', choice('..', '...')),
      field('end', $._expression),
    )),

    binary: $ => {
      const table = [
        [PREC.or, choice('or', '||')],
        [PREC.and, choice('and', '&&')],
        [PREC.equality, choice('==', '!=')],
        [PREC.comparison, choice('<', '<=', '>', '>=')],
        [PREC.additive, choice('+', '-')],
        [PREC.multiplicative, choice('*', '/', '%')],
      ];
      return choice(...table.map(([precedence, operator]) => prec.left(precedence, seq(
        field('left', $._expression),
        // @ts-ignore
        field('operator', operator),
        field('right', $._expression),
      ))));
    },

    // `x |> f(a)` is `f(x, a)`. The right side is a call (not an expression),
    // so `x |> f() + 1` cannot continue past the call: the pipe reduces first.
    // Our grammar accepts that as `(x |> f()) + 1`, a superset the spec rejects.
    pipe: $ => prec.left(PREC.pipe, seq(
      field('left', $._expression),
      '|>',
      field('right', $.pipe_target),
    )),

    pipe_target: $ => seq(optional('try'), $.call),

    unary: $ => prec(PREC.unary, seq(
      field('operator', choice('-', 'not', '!')),
      field('operand', $._expression),
    )),

    try: $ => prec(PREC.unary, seq('try', field('value', $._expression))),

    _primary: $ => choice(
      $.parenthesized_expression,
      $._name,
      $.call,
      $.method_call,
      $.field_access,
      $.index,
      $.function_reference,
      $.construct,
      $.type_identifier,
      $.type_path,
      $.type_application,
      $.lambda,
      $.list,
      $.map,
      $.string,
      $.regex,
      $.heredoc_beginning,
      $.integer,
      $.float,
      $._true,
      $._false,
      $._nil,
    ),

    _true: $ => choice($.true, alias($._true_before_neq, $.true)),
    _false: $ => choice($.false, alias($._false_before_neq, $.false)),
    _nil: $ => choice($.nil, alias($._nil_before_neq, $.nil)),

    _name: $ => choice(
      $.identifier,
      alias($._identifier_before_neq, $.identifier),
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    call: $ => prec.left(PREC.postfix, choice(
      seq(
        field('function', $.identifier),
        field('arguments', $.argument_list),
        optional(field('block', $._block)),
      ),
      // `run do ... end`, `twice { |x| x + 1 }`: no `()` before a block.
      seq(
        field('function', $.identifier),
        field('block', $._block),
      ),
      seq(
        field('module', $.type_identifier),
        '.',
        field('function', $._name),
        optional(field('arguments', $.argument_list)),
        optional(field('block', $._block)),
      ),
    )),

    method_call: $ => prec.left(PREC.postfix, choice(
      seq(
        field('receiver', $._primary),
        '.',
        field('method', $.identifier),
        field('arguments', $.argument_list),
        optional(field('block', $._block)),
      ),
      seq(
        field('receiver', $._primary),
        '.',
        field('method', $.identifier),
        field('block', $._block),
      ),
    )),

    field_access: $ => prec.left(PREC.postfix, seq(
      field('receiver', $._primary),
      '.',
      field('field', $._name),
    )),

    index: $ => prec.left(PREC.postfix, seq(
      field('receiver', $._primary),
      '[',
      field('index', $._expression),
      ']',
    )),

    function_reference: $ => seq(
      '&',
      optional(seq(field('module', $.type_identifier), '.')),
      field('name', $._name),
    ),

    construct: $ => seq(
      field('type', choice($.type_identifier, $.type_path)),
      field('arguments', $.argument_list),
    ),

    // A type with two or more arguments as a value, `JSON.decode(text, Map[String,
    // Int])`. One argument stays an `index`, which reads the same.
    type_application: $ => seq(
      field('name', $.type_identifier),
      alias(seq('[', $.type, ',', commaSep1($.type), ']'), $.type_arguments),
    ),

    // `Geo.Point` is a path; a further `.name` (`Geo.Point.members`,
    // `Limits.NAMES.size`) reads a member of it. Only the token after the dot
    // tells the two apart, so the parser keeps both readings until then.
    type_path: $ => seq(
      $.type_identifier,
      repeat1(seq('.', $.type_identifier)),
    ),

    argument_list: $ => seq(
      '(',
      commaSep(choice($._expression, $.named_argument)),
      ')',
    ),

    named_argument: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression),
    ),

    _block: $ => choice($.block, $.brace_block),

    // `xs.map { |x| x * 2 }`: the body is a lambda's, one line or several.
    brace_block: $ => seq(
      '{',
      optional(field('parameters', $.block_parameters)),
      content($, 'body'),
      '}',
    ),

    // `->(x) { x + 1 }` and `-> { 42 }`: a block written as a value.
    lambda: $ => seq(
      '->',
      optional(field('parameters', $.lambda_parameters)),
      '{',
      content($, 'body'),
      '}',
    ),

    lambda_parameters: $ => seq('(', commaSep1($.block_parameter), ')'),

    block: $ => seq(
      'do',
      optional(field('parameters', $.block_parameters)),
      content($, 'body'),
      'end',
    ),

    block_parameters: $ => seq('|', commaSep1($.block_parameter), '|'),

    block_parameter: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('type', $.type))),
    ),

    list: $ => seq('[', commaSep($._expression), ']'),

    map: $ => seq('{', commaSep($.pair), '}'),

    pair: $ => seq(
      field('key', $._expression),
      ':',
      field('value', $._expression),
    ),

    string: $ => seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
        $.interpolation,
      )),
      token.immediate('"'),
    ),

    // `/pattern/flags`. The opening `/` is the division token: the parser takes
    // it as a regex only where an expression starts, so after a value it stays
    // division, as in the interpreter's lexer. The body is the pattern as
    // written: a backslash goes with the next character, so `\/` does not end
    // it. A body is never empty, so `//` stays two operators.
    regex: $ => seq(
      '/',
      repeat1(choice(
        $.regex_content,
        alias($._regex_escape, $.escape_sequence),
      )),
      token.immediate('/'),
      optional($.regex_flags),
    ),

    regex_content: _ => token.immediate(prec(1, /[^\/\\\n]+/)),

    _regex_escape: _ => token.immediate(prec(1, /\\[^\n]/)),

    regex_flags: _ => token.immediate(/[im]+/),

    // The body keeps the source text: the common indentation that the compiler
    // removes stays inside `heredoc_content`.
    heredoc_body: $ => seq(
      $._heredoc_body_start,
      repeat(choice(
        $.heredoc_content,
        $.escape_sequence,
        $.interpolation,
      )),
      $.heredoc_end,
    ),

    escape_sequence: _ => token.immediate(prec(1, /\\["\\#nrt]/)),

    interpolation: $ => seq(
      token.immediate(prec(2, '#{')),
      $._expression,
      '}',
    ),

    // A `_` may separate two digits: `1_000`, `0.000_5`. `0x`, `0b` and `0o` (either case) start a hex, binary or
    // octal integer: `0xFF`, `0b1010_1010`, `0o755`.
    integer: _ => /0[xX][0-9a-fA-F]+(_[0-9a-fA-F]+)*|0[bB][01]+(_[01]+)*|0[oO][0-7]+(_[0-7]+)*|\d+(_\d+)*/,

    // The exponent follows the digits or the fraction: `1e5`, `1.5e-3`, `2.0E+10`.
    float: _ => /\d+(_\d+)*(\.\d+(_\d+)*)?[eE][+-]?\d+(_\d+)*|\d+(_\d+)*\.\d+(_\d+)*/,

    true: _ => 'true',
    false: _ => 'false',
    nil: _ => 'nil',

    identifier: _ => /[a-z_\u00b5][a-zA-Z0-9_\u00b5]*[?!]?/,

    type_identifier: _ => /[A-Z][a-zA-Z0-9_]*/,

    comment: _ => token(prec(-1, /#.*/)),
  },
});
