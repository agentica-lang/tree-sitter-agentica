# tree-sitter-agentica

A [tree-sitter](https://tree-sitter.github.io) grammar for [Agentica](https://github.com/sonic182/agentica), a programming language optimized for AI agent development. It supports editor syntax features and structural search and rewrite with [ast-grep](https://ast-grep.github.io/).

This grammar is a work in progress. It intentionally accepts a small superset of the interpreter's syntax to support tools; see [known differences](docs/compatibility.md).

## Quick start

```sh
npm ci
npx tree-sitter generate
npx tree-sitter test
```

See [development](docs/development.md) for build, parse, and interpreter integration commands; [grammar details](docs/grammar.md) for node types and scanner behavior; and the [ast-grep guide](docs/ast-grep.md) for structural search and rules.

## License

MIT. See [LICENSE](LICENSE). The design takes ideas from [tree-sitter-ruby](https://github.com/tree-sitter/tree-sitter-ruby); no code was copied from it.
