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
    $._error_sentinel,
  ],

  extras: $ => [/[ \t\r\n\f]/, $.comment],

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
  ],

  rules: {
    source_file: $ => seq(
      repeat($._newline),
      optional(seq(separated($, choice($._declaration, $._statement)), repeat($._newline))),
    ),

    _declaration: $ => choice(
      $.function_definition,
      $.struct_definition,
      $.enum_definition,
      $.constant_definition,
      $.import,
      $.export,
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

    export: $ => seq(
      'export',
      field('declaration', choice(
        $.function_definition,
        $.struct_definition,
        $.enum_definition,
        $.constant_definition,
      )),
    ),

    // A constant is a type-name token, so it cannot collide with the
    // `identifier` assignment that statements use.
    constant_definition: $ => seq(
      field('name', $.type_identifier),
      optional(seq(':', field('type', $.type))),
      '=',
      field('value', $._expression),
    ),

    function_definition: $ => seq(
      'def',
      field('name', $.identifier),
      field('parameters', $.parameters),
      '->',
      field('return_type', $.type),
      $._newline,
      content($, 'body'),
      'end',
    ),

    parameters: $ => seq('(', commaSep($.parameter), ')'),

    parameter: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.type),
    ),

    struct_definition: $ => seq(
      'struct',
      field('name', $.type_identifier),
      $._newline,
      repeat(choice(seq(field('field', $.field_declaration), $._newline), $._newline)),
      'end',
    ),

    field_declaration: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $.type),
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
      $._expression,
    ),

    assignment: $ => seq(
      field('left', $.identifier),
      optional(seq(':', field('type', $.type))),
      '=',
      field('right', $._expression),
    ),

    compound_assignment: $ => seq(
      field('left', $.identifier),
      field('operator', choice(...COMPOUND_OPERATORS)),
      field('right', $._expression),
    ),

    return: $ => prec.right(seq('return', optional(field('value', $._expression)))),

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

    pattern_bindings: $ => seq('(', commaSep1($.identifier), ')'),

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
      $.list,
      $.map,
      $.string,
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
        optional(field('block', $.block)),
      ),
      seq(
        field('module', $.type_identifier),
        '.',
        field('function', $._name),
        optional(field('arguments', $.argument_list)),
        optional(field('block', $.block)),
      ),
    )),

    method_call: $ => prec.left(PREC.postfix, choice(
      seq(
        field('receiver', $._primary),
        '.',
        field('method', $.identifier),
        field('arguments', $.argument_list),
        optional(field('block', $.block)),
      ),
      seq(
        field('receiver', $._primary),
        '.',
        field('method', $.identifier),
        field('block', $.block),
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

    type_path: $ => prec.right(seq(
      $.type_identifier,
      repeat1(seq('.', $.type_identifier)),
    )),

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

    escape_sequence: _ => token.immediate(prec(1, /\\["\\#nrt]/)),

    interpolation: $ => seq(
      token.immediate(prec(2, '#{')),
      $._expression,
      '}',
    ),

    integer: _ => /\d+/,

    float: _ => /\d+\.\d+/,

    true: _ => 'true',
    false: _ => 'false',
    nil: _ => 'nil',

    identifier: _ => /[a-z_\u00b5][a-zA-Z0-9_\u00b5]*[?!]?/,

    type_identifier: _ => /[A-Z][a-zA-Z0-9_]*/,

    comment: _ => token(prec(-1, /#.*/)),
  },
});
