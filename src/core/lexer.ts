// lexer.ts — Hand-written tokenizer for the Comb language
// Supports JSX-mode switching for view blocks

export enum TokenType {
  // Keywords
  Module = 'module',
  Signal = 'signal',
  Comb = 'comb',
  Always = 'always',
  View = 'view',
  Enum = 'enum',
  If = 'if',
  Else = 'else',
  Input = 'input',
  Output = 'output',
  Token = 'token',
  Style = 'style',
  Assert = 'assert',
  In = 'in',
  True = 'true',
  False = 'false',

  // Directives
  AtIf = '@if',
  AtElse = '@else',
  AtFor = '@for',
  AtBind = '@bind',

  // Literals
  Number = 'NUMBER',
  String = 'STRING',
  Identifier = 'IDENTIFIER',

  // Operators
  Plus = '+',
  Minus = '-',
  Star = '*',
  Slash = '/',
  Percent = '%',
  Assign = '=',
  SignalAssign = '<=',
  Eq = '==',
  Neq = '!=',
  Gt = '>',
  Lt = '<',
  Gte = '>=',
  And = '&&',
  Or = '||',
  Not = '!',
  Question = '?',
  Colon = ':',
  Dot = '.',
  DotDot = '..',
  Spread = '...',
  Comma = ',',
  Semicolon = ';',
  At = '@',
  Pipe = '|',

  // Brackets
  LParen = '(',
  RParen = ')',
  LBrace = '{',
  RBrace = '}',
  LBracket = '[',
  RBracket = ']',

  // JSX-specific
  JsxOpen = 'JSX_OPEN',
  JsxClose = 'JSX_CLOSE',
  JsxSelfClose = 'JSX_SELF_CLOSE',
  JsxTagEnd = 'JSX_TAG_END',

  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  module: TokenType.Module,
  signal: TokenType.Signal,
  comb: TokenType.Comb,
  always: TokenType.Always,
  input: TokenType.Input,
  output: TokenType.Output,
  token: TokenType.Token,
  style: TokenType.Style,
  assert: TokenType.Assert,
  view: TokenType.View,
  enum: TokenType.Enum,
  if: TokenType.If,
  else: TokenType.Else,
  in: TokenType.In,
  true: TokenType.True,
  false: TokenType.False,
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;
  let inViewBlock = false;
  let viewBraceDepth = 0;
  let inJsxTag = false;

  function peek(offset = 0): string {
    return source[pos + offset] ?? '\0';
  }

  function advance(): string {
    const ch = source[pos] ?? '\0';
    pos++;
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  }

  function tok(type: TokenType, value: string, l: number, c: number): Token {
    return { type, value, line: l, column: c };
  }

  function skipWhitespace(): void {
    while (pos < source.length) {
      const ch = peek();
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        advance();
      } else if (ch === '/' && peek(1) === '/') {
        while (pos < source.length && peek() !== '\n') advance();
      } else if (ch === '/' && peek(1) === '*') {
        advance(); advance();
        while (pos < source.length && !(peek() === '*' && peek(1) === '/')) advance();
        if (pos < source.length) { advance(); advance(); }
      } else {
        break;
      }
    }
  }

  function isDigit(ch: string): boolean { return ch >= '0' && ch <= '9'; }
  function isAlpha(ch: string): boolean { return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'; }
  function isIdentChar(ch: string): boolean { return isAlpha(ch) || isDigit(ch); }

  function readString(): string {
    const quote = advance();
    let str = '';
    while (pos < source.length && peek() !== quote) {
      if (peek() === '\\') {
        advance();
        const esc = advance();
        switch (esc) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case '\\': str += '\\'; break;
          case '"': str += '"'; break;
          case "'": str += "'"; break;
          default: str += esc;
        }
      } else {
        str += advance();
      }
    }
    if (pos < source.length) advance();
    return str;
  }

  function readNumber(): string {
    let num = '';
    while (pos < source.length && (isDigit(peek()) || peek() === '.')) {
      if (peek() === '.' && !isDigit(peek(1))) break;
      num += advance();
    }
    return num;
  }

  function readIdentifier(): string {
    let id = '';
    while (pos < source.length && isIdentChar(peek())) id += advance();
    return id;
  }

  function readJsxText(): string {
    let text = '';
    while (pos < source.length) {
      const ch = peek();
      if (ch === '<' || ch === '{' || ch === '@' || ch === '}') break;
      text += advance();
    }
    return text;
  }

  function tokenizeOneToken(): void {
    skipWhitespace();
    if (pos >= source.length) return;
    const sl = line, sc = col;
    const ch = peek();

    if (ch === '"' || ch === "'") {
      tokens.push(tok(TokenType.String, readString(), sl, sc));
      return;
    }
    if (isDigit(ch)) {
      tokens.push(tok(TokenType.Number, readNumber(), sl, sc));
      return;
    }
    if (isAlpha(ch)) {
      const id = readIdentifier();
      tokens.push(tok(KEYWORDS[id] ?? TokenType.Identifier, id, sl, sc));
      return;
    }

    switch (ch) {
      case '+': advance(); tokens.push(tok(TokenType.Plus, '+', sl, sc)); return;
      case '-': advance(); tokens.push(tok(TokenType.Minus, '-', sl, sc)); return;
      case '*': advance(); tokens.push(tok(TokenType.Star, '*', sl, sc)); return;
      case '/': advance(); tokens.push(tok(TokenType.Slash, '/', sl, sc)); return;
      case '%': advance(); tokens.push(tok(TokenType.Percent, '%', sl, sc)); return;
      case '?': advance(); tokens.push(tok(TokenType.Question, '?', sl, sc)); return;
      case ':': advance(); tokens.push(tok(TokenType.Colon, ':', sl, sc)); return;
      case ',': advance(); tokens.push(tok(TokenType.Comma, ',', sl, sc)); return;
      case ';': advance(); tokens.push(tok(TokenType.Semicolon, ';', sl, sc)); return;
      case '(': advance(); tokens.push(tok(TokenType.LParen, '(', sl, sc)); return;
      case ')': advance(); tokens.push(tok(TokenType.RParen, ')', sl, sc)); return;
      case '[': advance(); tokens.push(tok(TokenType.LBracket, '[', sl, sc)); return;
      case ']': advance(); tokens.push(tok(TokenType.RBracket, ']', sl, sc)); return;
      case '{': advance(); tokens.push(tok(TokenType.LBrace, '{', sl, sc)); return;
      case '}': advance(); tokens.push(tok(TokenType.RBrace, '}', sl, sc)); return;
      case '|':
        advance();
        if (peek() === '|') { advance(); tokens.push(tok(TokenType.Or, '||', sl, sc)); }
        else { tokens.push(tok(TokenType.Pipe, '|', sl, sc)); }
        return;
      case '&':
        advance();
        if (peek() === '&') { advance(); tokens.push(tok(TokenType.And, '&&', sl, sc)); }
        return;
      case '!':
        advance();
        if (peek() === '=') { advance(); tokens.push(tok(TokenType.Neq, '!=', sl, sc)); }
        else { tokens.push(tok(TokenType.Not, '!', sl, sc)); }
        return;
      case '=':
        advance();
        if (peek() === '=') { advance(); tokens.push(tok(TokenType.Eq, '==', sl, sc)); }
        else { tokens.push(tok(TokenType.Assign, '=', sl, sc)); }
        return;
      case '<':
        advance();
        if (peek() === '=') { advance(); tokens.push(tok(TokenType.SignalAssign, '<=', sl, sc)); }
        else { tokens.push(tok(TokenType.Lt, '<', sl, sc)); }
        return;
      case '>':
        advance();
        if (peek() === '=') { advance(); tokens.push(tok(TokenType.Gte, '>=', sl, sc)); }
        else { tokens.push(tok(TokenType.Gt, '>', sl, sc)); }
        return;
      case '.':
        if (peek(1) === '.' && peek(2) === '.') { advance(); advance(); advance(); tokens.push(tok(TokenType.Spread, '...', sl, sc)); }
        else if (peek(1) === '.') { advance(); advance(); tokens.push(tok(TokenType.DotDot, '..', sl, sc)); }
        else { advance(); tokens.push(tok(TokenType.Dot, '.', sl, sc)); }
        return;
      case '@':
        advance();
        if (isAlpha(peek())) {
          const id = readIdentifier();
          const d = '@' + id;
          if (d === '@if') tokens.push(tok(TokenType.AtIf, '@if', sl, sc));
          else if (d === '@else') tokens.push(tok(TokenType.AtElse, '@else', sl, sc));
          else if (d === '@for') tokens.push(tok(TokenType.AtFor, '@for', sl, sc));
          else {
            tokens.push(tok(TokenType.At, '@', sl, sc));
            tokens.push(tok(TokenType.Identifier, id, sl, sc + 1));
          }
        } else {
          tokens.push(tok(TokenType.At, '@', sl, sc));
        }
        return;
      default:
        advance();
        return;
    }
  }

  function tokenizeExprInBraces(): void {
    let depth = 1;
    while (pos < source.length && depth > 0) {
      skipWhitespace();
      if (pos >= source.length) break;
      const sl = line, sc = col;
      const ch = peek();
      if (ch === '{') { depth++; advance(); tokens.push(tok(TokenType.LBrace, '{', sl, sc)); continue; }
      if (ch === '}') {
        depth--;
        if (depth === 0) { advance(); tokens.push(tok(TokenType.RBrace, '}', sl, sc)); return; }
        advance(); tokens.push(tok(TokenType.RBrace, '}', sl, sc)); continue;
      }
      tokenizeOneToken();
    }
  }

  function tokenizeDirectiveExprUntilBrace(): void {
    while (pos < source.length) {
      skipWhitespace();
      if (pos >= source.length) break;
      const sl = line, sc = col;
      if (peek() === '{') {
        advance();
        tokens.push(tok(TokenType.LBrace, '{', sl, sc));
        viewBraceDepth++;
        return;
      }
      tokenizeOneToken();
    }
  }

  function tokenizeEventValue(): void {
    const sl = line, sc = col;
    const name = readIdentifier();
    tokens.push(tok(TokenType.Identifier, name, sl, sc));
    if (peek() === '(') {
      advance();
      tokens.push(tok(TokenType.LParen, '(', line, col - 1));
      let depth = 1;
      while (pos < source.length && depth > 0) {
        skipWhitespace();
        const al = line, ac = col;
        if (peek() === ')') {
          depth--;
          if (depth === 0) { advance(); tokens.push(tok(TokenType.RParen, ')', al, ac)); break; }
        }
        if (peek() === '(') { depth++; advance(); tokens.push(tok(TokenType.LParen, '(', al, ac)); continue; }
        tokenizeOneToken();
      }
    }
  }

  function tokenizeJsxAttributes(): void {
    while (pos < source.length) {
      skipWhitespace();
      if (pos >= source.length) break;
      const sl = line, sc = col;
      const ch = peek();

      if (ch === '/' && peek(1) === '>') {
        advance(); advance();
        tokens.push(tok(TokenType.JsxSelfClose, '/>', sl, sc));
        inJsxTag = false;
        return;
      }
      if (ch === '>') {
        advance();
        tokens.push(tok(TokenType.JsxTagEnd, '>', sl, sc));
        inJsxTag = false;
        return;
      }
      if (ch === '@') {
        advance();
        let name = readIdentifier();
        while (peek() === '.') { advance(); name += '.' + readIdentifier(); }
        if (name === 'bind') {
          tokens.push(tok(TokenType.AtBind, '@bind', sl, sc));
        } else {
          tokens.push(tok(TokenType.At, '@', sl, sc));
          tokens.push(tok(TokenType.Identifier, name, sl, sc + 1));
        }
        skipWhitespace();
        if (peek() === '=') {
          advance();
          tokens.push(tok(TokenType.Assign, '=', line, col - 1));
          skipWhitespace();
          if (peek() === '{') {
            advance();
            tokens.push(tok(TokenType.LBrace, '{', line, col - 1));
            tokenizeExprInBraces();
          } else {
            tokenizeEventValue();
          }
        }
        continue;
      }
      if (isAlpha(ch)) {
        const name = readIdentifier();
        tokens.push(tok(TokenType.Identifier, name, sl, sc));
        skipWhitespace();
        // := binding syntax: propName:={expr}
        if (peek() === ':' && peek(1) === '=') {
          advance(); advance();
          tokens.push(tok(TokenType.Colon, ':', line, col - 2));
          tokens.push(tok(TokenType.Assign, '=', line, col - 1));
          skipWhitespace();
          if (peek() === '{') {
            advance();
            tokens.push(tok(TokenType.LBrace, '{', line, col - 1));
            tokenizeExprInBraces();
          } else if (peek() === '"' || peek() === "'") {
            const ql = line, qc = col;
            tokens.push(tok(TokenType.String, readString(), ql, qc));
          } else {
            const vl = line, vc = col;
            tokens.push(tok(TokenType.Identifier, readIdentifier(), vl, vc));
          }
        } else if (peek() === '=') {
          advance();
          tokens.push(tok(TokenType.Assign, '=', line, col - 1));
          skipWhitespace();
          if (peek() === '{') {
            advance();
            tokens.push(tok(TokenType.LBrace, '{', line, col - 1));
            tokenizeExprInBraces();
          } else if (peek() === '"' || peek() === "'") {
            const ql = line, qc = col;
            tokens.push(tok(TokenType.String, readString(), ql, qc));
          } else {
            const vl = line, vc = col;
            tokens.push(tok(TokenType.Identifier, readIdentifier(), vl, vc));
          }
        }
        continue;
      }
      advance();
    }
  }

  function tokenizeViewContent(): void {
    skipWhitespace();
    if (pos >= source.length) return;
    const sl = line, sc = col;
    const ch = peek();

    if (ch === '}' && !inJsxTag) {
      viewBraceDepth--;
      if (viewBraceDepth <= 0) { inViewBlock = false; viewBraceDepth = 0; }
      advance();
      tokens.push(tok(TokenType.RBrace, '}', sl, sc));
      return;
    }
    if (ch === '{' && !inJsxTag) {
      advance();
      tokens.push(tok(TokenType.LBrace, '{', sl, sc));
      tokenizeExprInBraces();
      return;
    }
    if (ch === '@') {
      advance();
      const id = readIdentifier();
      const directive = '@' + id;
      if (directive === '@if') {
        tokens.push(tok(TokenType.AtIf, '@if', sl, sc));
        tokenizeDirectiveExprUntilBrace();
        return;
      } else if (directive === '@else') {
        tokens.push(tok(TokenType.AtElse, '@else', sl, sc));
        return;
      } else if (directive === '@for') {
        tokens.push(tok(TokenType.AtFor, '@for', sl, sc));
        tokenizeDirectiveExprUntilBrace();
        return;
      } else if (directive === '@bind') {
        tokens.push(tok(TokenType.AtBind, '@bind', sl, sc));
      } else {
        let fullName = id;
        if (peek() === '.') { advance(); fullName += '.' + readIdentifier(); }
        tokens.push(tok(TokenType.At, '@', sl, sc));
        tokens.push(tok(TokenType.Identifier, fullName, sl, sc + 1));
      }
      return;
    }
    if (ch === '<') {
      if (peek(1) === '/') {
        advance(); advance();
        const tag = readIdentifier();
        skipWhitespace();
        if (peek() === '>') advance();
        tokens.push(tok(TokenType.JsxClose, tag, sl, sc));
        return;
      }
      advance();
      const tag = readIdentifier();
      if (tag.length === 0) {
        tokens.push(tok(TokenType.Lt, '<', sl, sc));
        return;
      }
      tokens.push(tok(TokenType.JsxOpen, tag, sl, sc));
      inJsxTag = true;
      tokenizeJsxAttributes();
      return;
    }

    const text = readJsxText().trim();
    if (text.length > 0) {
      tokens.push(tok(TokenType.String, text, sl, sc));
    }
  }

  // Main loop
  while (pos < source.length) {
    if (inViewBlock && !inJsxTag) {
      tokenizeViewContent();
      continue;
    }

    skipWhitespace();
    if (pos >= source.length) break;

    const sl = line, sc = col;
    const ch = peek();

    if (ch === '"' || ch === "'") {
      tokens.push(tok(TokenType.String, readString(), sl, sc));
      continue;
    }
    if (isDigit(ch)) {
      tokens.push(tok(TokenType.Number, readNumber(), sl, sc));
      continue;
    }
    if (isAlpha(ch)) {
      const id = readIdentifier();
      const kwType = KEYWORDS[id];
      if (kwType) {
        tokens.push(tok(kwType, id, sl, sc));
        if (kwType === TokenType.View) {
          skipWhitespace();
          if (peek() === '{') {
            advance();
            tokens.push(tok(TokenType.LBrace, '{', line, col - 1));
            inViewBlock = true;
            viewBraceDepth = 1;
          }
        }
        if (kwType === TokenType.Style) {
          skipWhitespace();
          if (peek() === '{') {
            advance();
            tokens.push(tok(TokenType.LBrace, '{', line, col - 1));
            // Read raw CSS content until matching '}'
            let css = '';
            let depth = 1;
            while (pos < source.length && depth > 0) {
              const c = peek();
              if (c === '{') depth++;
              if (c === '}') { depth--; if (depth === 0) break; }
              css += advance();
            }
            tokens.push(tok(TokenType.String, css.trim(), line, col));
            if (peek() === '}') {
              advance();
              tokens.push(tok(TokenType.RBrace, '}', line, col - 1));
            }
          }
        }
      } else {
        tokens.push(tok(TokenType.Identifier, id, sl, sc));
      }
      continue;
    }
    if (ch === '@') {
      advance();
      if (!isAlpha(peek())) {
        tokens.push(tok(TokenType.At, '@', sl, sc));
        continue;
      }
      const dsl = line, dsc = col;
      const id = readIdentifier();
      const directive = '@' + id;
      if (directive === '@if') tokens.push(tok(TokenType.AtIf, '@if', sl, sc));
      else if (directive === '@else') tokens.push(tok(TokenType.AtElse, '@else', sl, sc));
      else if (directive === '@for') tokens.push(tok(TokenType.AtFor, '@for', sl, sc));
      else {
        tokens.push(tok(TokenType.At, '@', sl, sc));
        tokens.push(tok(TokenType.Identifier, id, dsl, dsc));
      }
      continue;
    }

    switch (ch) {
      case '+': advance(); tokens.push(tok(TokenType.Plus, '+', sl, sc)); break;
      case '-': advance(); tokens.push(tok(TokenType.Minus, '-', sl, sc)); break;
      case '*': advance(); tokens.push(tok(TokenType.Star, '*', sl, sc)); break;
      case '/': advance(); tokens.push(tok(TokenType.Slash, '/', sl, sc)); break;
      case '%': advance(); tokens.push(tok(TokenType.Percent, '%', sl, sc)); break;
      case '?': advance(); tokens.push(tok(TokenType.Question, '?', sl, sc)); break;
      case ':': advance(); tokens.push(tok(TokenType.Colon, ':', sl, sc)); break;
      case ',': advance(); tokens.push(tok(TokenType.Comma, ',', sl, sc)); break;
      case ';': advance(); tokens.push(tok(TokenType.Semicolon, ';', sl, sc)); break;
      case '(': advance(); tokens.push(tok(TokenType.LParen, '(', sl, sc)); break;
      case ')': advance(); tokens.push(tok(TokenType.RParen, ')', sl, sc)); break;
      case '[': advance(); tokens.push(tok(TokenType.LBracket, '[', sl, sc)); break;
      case ']': advance(); tokens.push(tok(TokenType.RBracket, ']', sl, sc)); break;
      case '{': advance(); tokens.push(tok(TokenType.LBrace, '{', sl, sc)); break;
      case '}': advance(); tokens.push(tok(TokenType.RBrace, '}', sl, sc)); break;
      case '|':
        advance();
        if (peek() === '|') { advance(); tokens.push(tok(TokenType.Or, '||', sl, sc)); }
        else { tokens.push(tok(TokenType.Pipe, '|', sl, sc)); }
        break;
      case '&':
        advance();
        if (peek() === '&') { advance(); tokens.push(tok(TokenType.And, '&&', sl, sc)); }
        break;
      case '!':
        advance();
        if (peek() === '=') { advance(); tokens.push(tok(TokenType.Neq, '!=', sl, sc)); }
        else { tokens.push(tok(TokenType.Not, '!', sl, sc)); }
        break;
      case '=':
        advance();
        if (peek() === '=') { advance(); tokens.push(tok(TokenType.Eq, '==', sl, sc)); }
        else { tokens.push(tok(TokenType.Assign, '=', sl, sc)); }
        break;
      case '<':
        advance();
        if (peek() === '=') { advance(); tokens.push(tok(TokenType.SignalAssign, '<=', sl, sc)); }
        else { tokens.push(tok(TokenType.Lt, '<', sl, sc)); }
        break;
      case '>':
        advance();
        if (peek() === '=') { advance(); tokens.push(tok(TokenType.Gte, '>=', sl, sc)); }
        else { tokens.push(tok(TokenType.Gt, '>', sl, sc)); }
        break;
      case '.':
        if (peek(1) === '.' && peek(2) === '.') { advance(); advance(); advance(); tokens.push(tok(TokenType.Spread, '...', sl, sc)); }
        else if (peek(1) === '.') { advance(); advance(); tokens.push(tok(TokenType.DotDot, '..', sl, sc)); }
        else { advance(); tokens.push(tok(TokenType.Dot, '.', sl, sc)); }
        break;
      default:
        advance();
        break;
    }
  }

  tokens.push(tok(TokenType.EOF, '', line, col));
  return tokens;
}
