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
  additive: 6,
  multiplicative: 7,
  unary: 8,
  postfix: 9,
};

const COMPOUND_OPERATORS = ['+=', '-=', '*=', '/=', '%='];

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function lines($, item) {
  return choice(
    seq(repeat1(choice(seq(item, $._newline), $._newline)), optional(item)),
    item,
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
    $._error_sentinel,
  ],

  extras: $ => [/[ \t\r\n\f]/, $.comment],

  word: $ => $.identifier,

  supertypes: $ => [$._statement, $._expression, $._pattern],

  conflicts: $ => [
    [$.body],
  ],

  rules: {
    source_file: $ => optional(lines($, choice($._declaration, $._statement))),

    _declaration: $ => choice(
      $.function_definition,
      $.struct_definition,
      $.enum_definition,
      $.import,
      $.export,
    ),

    import: $ => seq(
      'import',
      field('path', $.string),
      'as',
      field('alias', $.type_identifier),
    ),

    export: $ => seq(
      'export',
      field('declaration', choice(
        $.function_definition,
        $.struct_definition,
        $.enum_definition,
      )),
    ),

    function_definition: $ => seq(
      'def',
      field('name', $.identifier),
      field('parameters', $.parameters),
      '->',
      field('return_type', $.type),
      $._newline,
      optional(field('body', $.body)),
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

    body: $ => lines($, $._statement),

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
      optional(field('consequence', $.body)),
      repeat(field('alternative', $.elsif)),
      optional(field('alternative', $.else)),
      'end',
    ),

    elsif: $ => seq(
      'elsif',
      field('condition', $._expression),
      $._newline,
      optional(field('consequence', $.body)),
    ),

    else: $ => seq('else', optional(field('body', $.body))),

    while: $ => seq(
      'while',
      field('condition', $._expression),
      optional(alias($._loop_do, 'do')),
      $._newline,
      optional(field('body', $.body)),
      'end',
    ),

    for: $ => seq(
      'for',
      field('variable', $.identifier),
      'in',
      field('iterable', $._expression),
      optional(alias($._loop_do, 'do')),
      $._newline,
      optional(field('body', $.body)),
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
      optional(field('body', $.body)),
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
      $.true,
      $.false,
      $.nil,
    ),

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
      field('name', $.identifier),
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
      optional(field('body', $.body)),
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
