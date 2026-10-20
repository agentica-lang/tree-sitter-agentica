#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

enum TokenType {
  NEWLINE,
  IDENTIFIER_BEFORE_NEQ,
  BREAK,
  NEXT,
  STRING_CONTENT,
  LOOP_DO,
  TRUE_BEFORE_NEQ,
  FALSE_BEFORE_NEQ,
  NIL_BEFORE_NEQ,
  HEREDOC_BEGINNING,
  HEREDOC_BODY_START,
  HEREDOC_CONTENT,
  HEREDOC_END,
  ERROR_SENTINEL,
};

// Bounds that keep the serialized state well under the 1024-byte buffer of
// tree-sitter. A longer name, or a line with more openers, is a parse error.
#define MAX_HEREDOCS 16
#define MAX_HEREDOC_NAME 32

typedef struct {
  uint8_t length;
  char name[MAX_HEREDOC_NAME];
} Heredoc;

// `pending` holds the openers seen on the current line, in order: each body
// starts at the line break after the end line of the one before. `open` is the
// heredoc whose body is being scanned.
typedef struct {
  Heredoc pending[MAX_HEREDOCS];
  uint8_t pending_count;
  bool has_open;
  Heredoc open;
} Scanner;

static const char *const RESERVED[] = {
  "def", "struct", "enum", "case", "do", "import", "export", "end", "if",
  "elsif", "else", "while", "for", "in", "return", "try", "true", "false",
  "nil", "and", "or", "not",
};

static bool is_word_start(int32_t c) {
  return (c >= 'a' && c <= 'z') || c == '_' || c == 0xB5;
}

static bool is_word_char(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
         (c >= '0' && c <= '9') || c == '_' || c == 0xB5;
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

static bool is_upper(int32_t c) { return c >= 'A' && c <= 'Z'; }

// `<<~NAME`, with NAME an uppercase letter and then uppercase letters, digits
// or `_`. Any other `<` is left to the grammar's operators.
static bool scan_heredoc_beginning(Scanner *scanner, TSLexer *lexer) {
  if (lexer->lookahead != '<') return false;
  lexer->advance(lexer, false);
  if (lexer->lookahead != '<') return false;
  lexer->advance(lexer, false);
  if (lexer->lookahead != '~') return false;
  lexer->advance(lexer, false);
  if (!is_upper(lexer->lookahead)) return false;

  Heredoc heredoc = {0};
  while (is_upper(lexer->lookahead) || (lexer->lookahead >= '0' && lexer->lookahead <= '9') ||
         lexer->lookahead == '_') {
    if (heredoc.length == MAX_HEREDOC_NAME) return false;
    heredoc.name[heredoc.length++] = (char)lexer->lookahead;
    lexer->advance(lexer, false);
  }
  if (scanner->pending_count == MAX_HEREDOCS) return false;
  scanner->pending[scanner->pending_count++] = heredoc;
  lexer->mark_end(lexer);
  lexer->result_symbol = HEREDOC_BEGINNING;
  return true;
}

// At the start of a body line: whether the line holds only optional spaces and
// the name. With `mark_name`, the token end is set after the name, for the
// heredoc_end token.
static bool at_heredoc_end_line(const Heredoc *heredoc, TSLexer *lexer, bool mark_name,
                                bool *consumed) {
  while (lexer->lookahead == ' ') {
    lexer->advance(lexer, false);
    *consumed = true;
  }
  for (uint8_t i = 0; i < heredoc->length; i++) {
    if (lexer->lookahead != heredoc->name[i]) return false;
    lexer->advance(lexer, false);
    *consumed = true;
  }
  if (mark_name) lexer->mark_end(lexer);
  while (lexer->lookahead == ' ' || lexer->lookahead == '\r') lexer->advance(lexer, false);
  return lexer->eof(lexer) || lexer->lookahead == '\n';
}

// Body text up to an escape, an interpolation or the end line. Line breaks are
// part of the text; the end line is a token of its own.
static bool scan_heredoc_content(Scanner *scanner, TSLexer *lexer) {
  bool has_content = false;
  bool at_line_start = lexer->get_column(lexer) == 0;
  for (;;) {
    if (at_line_start) {
      at_line_start = false;
      lexer->mark_end(lexer);
      bool consumed = false;
      if (at_heredoc_end_line(&scanner->open, lexer, !has_content, &consumed)) {
        if (has_content) {
          lexer->result_symbol = HEREDOC_CONTENT;
          return true;
        }
        scanner->has_open = false;
        lexer->result_symbol = HEREDOC_END;
        return true;
      }
      has_content = has_content || consumed;
      continue;
    }
    if (lexer->eof(lexer)) break;
    int32_t c = lexer->lookahead;
    if (c == '\\') break;
    if (c == '#') {
      lexer->mark_end(lexer);
      lexer->advance(lexer, false);
      if (lexer->lookahead == '{') {
        lexer->result_symbol = HEREDOC_CONTENT;
        return has_content;
      }
      has_content = true;
      continue;
    }
    lexer->advance(lexer, false);
    has_content = true;
    if (c == '\n') at_line_start = true;
  }
  lexer->mark_end(lexer);
  lexer->result_symbol = HEREDOC_CONTENT;
  return has_content;
}

void *tree_sitter_agentica_external_scanner_create(void) {
  return ts_calloc(1, sizeof(Scanner));
}

void tree_sitter_agentica_external_scanner_destroy(void *payload) { ts_free(payload); }

static unsigned serialize_heredoc(const Heredoc *heredoc, char *buffer) {
  buffer[0] = (char)heredoc->length;
  memcpy(buffer + 1, heredoc->name, heredoc->length);
  return 1 + heredoc->length;
}

static unsigned deserialize_heredoc(Heredoc *heredoc, const char *buffer) {
  heredoc->length = (uint8_t)buffer[0];
  memcpy(heredoc->name, buffer + 1, heredoc->length);
  return 1 + heredoc->length;
}

unsigned tree_sitter_agentica_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = payload;
  unsigned size = 0;
  buffer[size++] = (char)scanner->pending_count;
  buffer[size++] = (char)scanner->has_open;
  if (scanner->has_open) size += serialize_heredoc(&scanner->open, buffer + size);
  for (uint8_t i = 0; i < scanner->pending_count; i++) {
    size += serialize_heredoc(&scanner->pending[i], buffer + size);
  }
  return size;
}

void tree_sitter_agentica_external_scanner_deserialize(void *payload, const char *buffer,
                                                       unsigned length) {
  Scanner *scanner = payload;
  memset(scanner, 0, sizeof(Scanner));
  if (length == 0) return;
  unsigned size = 0;
  scanner->pending_count = (uint8_t)buffer[size++];
  scanner->has_open = buffer[size++];
  if (scanner->has_open) size += deserialize_heredoc(&scanner->open, buffer + size);
  for (uint8_t i = 0; i < scanner->pending_count; i++) {
    size += deserialize_heredoc(&scanner->pending[i], buffer + size);
  }
}

bool tree_sitter_agentica_external_scanner_scan(void *payload, TSLexer *lexer,
                                                const bool *valid_symbols) {
  Scanner *scanner = payload;
  if (valid_symbols[ERROR_SENTINEL]) return false;
  if (valid_symbols[STRING_CONTENT]) return scan_string_content(lexer);
  if (valid_symbols[HEREDOC_CONTENT] && scanner->has_open) {
    return scan_heredoc_content(scanner, lexer);
  }

  for (;;) {
    skip_blanks(lexer);
    if (lexer->lookahead != '\n') break;
    // The line break that ends an opener line starts the first pending body;
    // the line's own NEWLINE comes at the break after the last end line.
    if (scanner->pending_count > 0 && !scanner->has_open &&
        valid_symbols[HEREDOC_BODY_START]) {
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      scanner->open = scanner->pending[0];
      scanner->has_open = true;
      scanner->pending_count--;
      memmove(scanner->pending, scanner->pending + 1, scanner->pending_count * sizeof(Heredoc));
      lexer->result_symbol = HEREDOC_BODY_START;
      return true;
    }
    if (valid_symbols[NEWLINE]) {
      lexer->advance(lexer, false);
      lexer->mark_end(lexer);
      lexer->result_symbol = NEWLINE;
      return true;
    }
    lexer->advance(lexer, true);
  }

  if (valid_symbols[HEREDOC_BEGINNING] && lexer->lookahead == '<') {
    return scan_heredoc_beginning(scanner, lexer);
  }

  bool want_word = valid_symbols[IDENTIFIER_BEFORE_NEQ] || valid_symbols[BREAK] ||
                   valid_symbols[NEXT] || valid_symbols[LOOP_DO] ||
                   valid_symbols[TRUE_BEFORE_NEQ] || valid_symbols[FALSE_BEFORE_NEQ] ||
                   valid_symbols[NIL_BEFORE_NEQ];
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
    if (lexer->lookahead != '=') return false;
    if (short_word && is_reserved(word)) {
      if (strcmp(word, "true") == 0 && valid_symbols[TRUE_BEFORE_NEQ]) {
        lexer->result_symbol = TRUE_BEFORE_NEQ;
        return true;
      }
      if (strcmp(word, "false") == 0 && valid_symbols[FALSE_BEFORE_NEQ]) {
        lexer->result_symbol = FALSE_BEFORE_NEQ;
        return true;
      }
      if (strcmp(word, "nil") == 0 && valid_symbols[NIL_BEFORE_NEQ]) {
        lexer->result_symbol = NIL_BEFORE_NEQ;
        return true;
      }
      return false;
    }
    if (!valid_symbols[IDENTIFIER_BEFORE_NEQ]) return false;
    lexer->result_symbol = IDENTIFIER_BEFORE_NEQ;
    return true;
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
