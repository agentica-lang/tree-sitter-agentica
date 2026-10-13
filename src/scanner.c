#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <string.h>

enum TokenType {
  NEWLINE,
  IDENTIFIER_BEFORE_NEQ,
  BREAK,
  NEXT,
  STRING_CONTENT,
  LOOP_DO,
  ERROR_SENTINEL,
};

static const char *const RESERVED[] = {
  "def", "struct", "enum", "case", "do", "import", "export", "end", "if",
  "elsif", "else", "while", "for", "in", "return", "try", "true", "false",
  "nil", "and", "or", "not",
};

static bool is_word_start(int32_t c) {
  return (c >= 'a' && c <= 'z') || c == '_';
}

static bool is_word_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_';
}

static bool is_reserved(const char *word) {
  for (size_t i = 0; i < sizeof(RESERVED) / sizeof(RESERVED[0]); i++) {
    if (strcmp(word, RESERVED[i]) == 0) return true;
  }
  return false;
}

static void skip_blanks(TSLexer *lexer) {
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r' || lexer->lookahead == '\f') {
    lexer->advance(lexer, true);
  }
}

static bool at_line_end(TSLexer *lexer) {
  skip_blanks(lexer);
  if (lexer->eof(lexer) || lexer->lookahead == '\n' || lexer->lookahead == '#') {
    return true;
  }
  const char *end = "end";
  for (int i = 0; i < 3; i++) {
    if (lexer->lookahead != end[i]) return false;
    lexer->advance(lexer, false);
  }
  return lexer->eof(lexer) || !is_word_char(lexer->lookahead);
}

static bool scan_string_content(TSLexer *lexer) {
  bool has_content = false;
  for (;;) {
    if (lexer->eof(lexer)) break;
    int32_t c = lexer->lookahead;
    if (c == '"' || c == '\\' || c == '\n' || c == '\r') break;
    if (c == '#') {
      lexer->mark_end(lexer);
      lexer->advance(lexer, false);
      if (lexer->lookahead == '{') {
        lexer->result_symbol = STRING_CONTENT;
        return has_content;
      }
      has_content = true;
      continue;
    }
    lexer->advance(lexer, false);
    has_content = true;
  }
  lexer->mark_end(lexer);
  lexer->result_symbol = STRING_CONTENT;
  return has_content;
}

void *tree_sitter_agentica_external_scanner_create(void) { return NULL; }

void tree_sitter_agentica_external_scanner_destroy(void *payload) { (void)payload; }

unsigned tree_sitter_agentica_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}

void tree_sitter_agentica_external_scanner_deserialize(void *payload, const char *buffer,
                                                       unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

bool tree_sitter_agentica_external_scanner_scan(void *payload, TSLexer *lexer,
                                                const bool *valid_symbols) {
  (void)payload;
  if (valid_symbols[ERROR_SENTINEL]) return false;
  if (valid_symbols[STRING_CONTENT]) return scan_string_content(lexer);

  for (;;) {
    skip_blanks(lexer);
    if (lexer->lookahead != '\n') break;
    if (valid_symbols[NEWLINE]) {
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = NEWLINE;
      return true;
    }
    lexer->advance(lexer, true);
  }

  bool want_word = valid_symbols[IDENTIFIER_BEFORE_NEQ] || valid_symbols[BREAK] ||
                   valid_symbols[NEXT] || valid_symbols[LOOP_DO];
  if (!want_word || !is_word_start(lexer->lookahead)) return false;

  char word[8];
  size_t length = 0;
  while (is_word_char(lexer->lookahead)) {
    if (length < sizeof(word) - 1) word[length] = (char)lexer->lookahead;
    length++;
    lexer->advance(lexer, false);
  }
  word[length < sizeof(word) ? length : sizeof(word) - 1] = '\0';
  bool short_word = length < sizeof(word);
  lexer->mark_end(lexer);

  if (lexer->lookahead == '!') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '=' && valid_symbols[IDENTIFIER_BEFORE_NEQ] &&
        !(short_word && is_reserved(word))) {
      lexer->result_symbol = IDENTIFIER_BEFORE_NEQ;
      return true;
    }
    return false;
  }

  if (!short_word || lexer->lookahead == '?') return false;
  if (valid_symbols[LOOP_DO] && strcmp(word, "do") == 0) {
    lexer->result_symbol = LOOP_DO;
    return true;
  }
  bool is_break = strcmp(word, "break") == 0 && valid_symbols[BREAK];
  bool is_next = strcmp(word, "next") == 0 && valid_symbols[NEXT];
  if ((is_break || is_next) && at_line_end(lexer)) {
    lexer->result_symbol = is_break ? BREAK : NEXT;
    return true;
  }
  return false;
}
