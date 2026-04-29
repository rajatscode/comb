// lexer.ts — Hand-written tokenizer for the Comb language
// Supports JSX-mode switching for view blocks

// ============================================================
// Token types
// ============================================================

export enum TokenType {
  // Keywords
  Module = 'module',
  Signal = 'signal',
  Comb = 'comb',
  Always = 'always',
  View = 'view',
  Enum = 'enum',
  In = 'in',
  True = 'true',
  False = 'false',

  // Directives (@ prefixed)
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
  JsxOpen = 'JSX_OPEN',       // <tag
  JsxClose = 'JSX_CLOSE',     // </tag>
  JsxSelfClose = 'JSX_SELF_CLOSE', // />
  JsxTagEnd = 'JSX_TAG_END',  // > (closing the opening tag)

  // Special
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// ============================================================
// Keywords map
// ============================================================

const KEYWORDS: Record<string, TokenType> = {
  'module': TokenType.Module,
  'signal': TokenType.Signal,
  'comb': TokenType.Comb,
  'always': TokenType.Always,
  'view': TokenType.View,
  'enum': TokenType.Enum,
  'in': TokenType.In,
  'true': TokenType.True,
  'false': TokenType.False,
};

// ============================================================
// Tokenizer
// ============================================================

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;
  let inViewBlock = false;
  let viewBraceDepth = 0;
  // Track brace depth to know when JSX-like elements are expected
  let jsxTagDepth = 0; // how deep in JSX element tags we are (between < and >)
  let inJsxTag = false; // currently scanning attributes inside <tag ... >

  function peek(offset = 0): string {
    return source[pos + offset] ?? '\0';
  }

  function advance(): string {
    const ch = source[pos] ?? '\0';
    pos++;
    if (ch === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  function makeToken(type: TokenType, value: string, startLine: number, startCol: number): Token {
    return { type, value, line: startLine, column: startCol };
  }

  function skipWhitespace(): void {
    while (pos < source.length) {
      const ch = peek();
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        advance();
      } else if (ch === '/' && peek(1) === '/') {
        // Line comment
        while (pos < source.length && peek() !== '\n') advance();
      } else if (ch === '/' && peek(1) === '*') {
        // Block comment
        advance(); advance();
        while (pos < source.length && !(peek() === '*' && peek(1) === '/')) advance();
        if (pos < source.length) { advance(); advance(); }
      } else {
        break;
      }
    }
  }

  function readString(): string {
    const quote = advance(); // consume opening quote
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
    if (pos < source.length) advance(); // consume closing quote
    return str;
  }

  function readNumber(): string {
    let num = '';
    while (pos < source.length && (isDigit(peek()) || peek() === '.')) {
      if (peek() === '.' && !isDigit(peek(1))) break; // don't consume ".." or ".method"
      num += advance();
    }
    return num;
  }

  function readIdentifier(): string {
    let id = '';
    while (pos < source.length && isIdentChar(peek())) {
      id += advance();
    }
    return id;
  }

  function isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  function isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  function isIdentChar(ch: string): boolean {
    return isAlpha(ch) || isDigit(ch);
  }

  function isUpperCase(ch: string): boolean {
    return ch >= 'A' && ch <= 'Z';
  }

  // Read JSX text content (everything between > and next < or { or @)
  function readJsxText(): string {
    let text = '';
    while (pos < source.length) {
      const ch = peek();
      if (ch === '<' || ch === '{' || ch === '@' || ch === '}') break;
      text += advance();
    }
    return text;
  }

  function tokenizeViewContent(): void {
    // Inside view block: handle JSX-like syntax
    skipWhitespace();
    if (pos >= source.length) return;

    const startLine = line;
    const startCol = col;
    const ch = peek();

    if (ch === '}' && !inJsxTag) {
      // Could be end of view block or end of @if/@for block
      viewBraceDepth--;
      if (viewBraceDepth <= 0) {
        inViewBlock = false;
        viewBraceDepth = 0;
      }
      advance();
      tokens.push(makeToken(TokenType.RBrace, '}', startLine, startCol));
      return;
    }

    if (ch === '{' && !inJsxTag) {
      // Expression interpolation in view or block open
      advance();
      tokens.push(makeToken(TokenType.LBrace, '{', startLine, startCol));
      // Now we need to tokenize an expression until matching }
      // We switch to normal mode temporarily
      tokenizeExprInBraces();
      return;
    }

    if (ch === '@') {
      // Directive: @if, @else, @for, @bind, @click, etc.
      advance();
      const idStart = pos;
      const id = readIdentifier();
      const directive = '@' + id;

      if (directive === '@if') {
        tokens.push(makeToken(TokenType.AtIf, '@if', startLine, startCol));
        // Tokenize the condition expression until we hit '{'
        tokenizeDirectiveExprUntilBrace();
        return;
      } else if (directive === '@else') {
        tokens.push(makeToken(TokenType.AtElse, '@else', startLine, startCol));
        // @else may be followed by @if (chaining) or {
        // Let the next call handle it
        return;
      } else if (directive === '@for') {
        tokens.push(makeToken(TokenType.AtFor, '@for', startLine, startCol));
        // Tokenize: variable in iterable {
        tokenizeDirectiveExprUntilBrace();
        return;
      } else if (directive === '@bind') {
        tokens.push(makeToken(TokenType.AtBind, '@bind', startLine, startCol));
      } else {
        // Event handler like @click, @contextmenu, @keydown, @input
        // Check for modifier: @keydown.enter
        let fullName = id;
        if (peek() === '.') {
          advance();
          fullName += '.' + readIdentifier();
        }
        tokens.push(makeToken(TokenType.At, '@', startLine, startCol));
        tokens.push(makeToken(TokenType.Identifier, fullName, startLine, startCol + 1));
      }
      return;
    }

    if (ch === '<') {
      if (peek(1) === '/') {
        // Closing tag: </tag>
        advance(); advance(); // consume </
        const tag = readIdentifier();
        skipWhitespace();
        if (peek() === '>') advance(); // consume >
        tokens.push(makeToken(TokenType.JsxClose, tag, startLine, startCol));
        return;
      }

      // Opening tag: <tag or <Component
      advance(); // consume <
      const tag = readIdentifier();
      if (tag.length === 0) {
        // Not a tag, probably a comparison (shouldn't happen in view)
        tokens.push(makeToken(TokenType.Lt, '<', startLine, startCol));
        return;
      }

      if (isUpperCase(tag[0])) {
        tokens.push(makeToken(TokenType.JsxOpen, tag, startLine, startCol));
      } else {
        tokens.push(makeToken(TokenType.JsxOpen, tag, startLine, startCol));
      }

      // Now tokenize attributes until > or />
      inJsxTag = true;
      tokenizeJsxAttributes();
      return;
    }

    // Plain text content between elements
    const text = readJsxText().trim();
    if (text.length > 0) {
      tokens.push(makeToken(TokenType.String, text, startLine, startCol));
    }
  }

  function tokenizeJsxAttributes(): void {
    while (pos < source.length) {
      skipWhitespace();
      if (pos >= source.length) break;

      const startLine = line;
      const startCol = col;
      const ch = peek();

      if (ch === '/' && peek(1) === '>') {
        // Self-closing
        advance(); advance();
        tokens.push(makeToken(TokenType.JsxSelfClose, '/>', startLine, startCol));
        inJsxTag = false;
        return;
      }

      if (ch === '>') {
        advance();
        tokens.push(makeToken(TokenType.JsxTagEnd, '>', startLine, startCol));
        inJsxTag = false;
        return;
      }

      if (ch === '@') {
        // Event attr or @bind
        advance();
        let name = readIdentifier();
        // Check for modifier
        if (peek() === '.') {
          advance();
          name += '.' + readIdentifier();
        }
        if (name === 'bind') {
          tokens.push(makeToken(TokenType.AtBind, '@bind', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.At, '@', startLine, startCol));
          tokens.push(makeToken(TokenType.Identifier, name, startLine, startCol + 1));
        }
        // Expect = value
        skipWhitespace();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.Assign, '=', line, col - 1));
          skipWhitespace();
          // Value can be identifier, identifier(args), or {expr}
          if (peek() === '{') {
            advance();
            tokens.push(makeToken(TokenType.LBrace, '{', line, col - 1));
            tokenizeExprInBraces();
          } else {
            // Simple identifier or identifier(args)
            tokenizeEventValue();
          }
        }
        continue;
      }

      if (isAlpha(ch)) {
        // Attribute name
        const name = readIdentifier();
        tokens.push(makeToken(TokenType.Identifier, name, startLine, startCol));
        skipWhitespace();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.Assign, '=', line, col - 1));
          skipWhitespace();
          if (peek() === '{') {
            advance();
            tokens.push(makeToken(TokenType.LBrace, '{', line, col - 1));
            tokenizeExprInBraces();
          } else if (peek() === '"' || peek() === "'") {
            const sl = line, sc = col;
            const str = readString();
            tokens.push(makeToken(TokenType.String, str, sl, sc));
          } else {
            // Boolean or identifier value
            const sl = line, sc = col;
            const val = readIdentifier();
            tokens.push(makeToken(TokenType.Identifier, val, sl, sc));
          }
        }
        continue;
      }

      // Unknown char in JSX tag - skip
      advance();
    }
  }

  function tokenizeEventValue(): void {
    // Read event handler value: identifier or identifier(args)
    const sl = line, sc = col;
    const name = readIdentifier();
    tokens.push(makeToken(TokenType.Identifier, name, sl, sc));

    if (peek() === '(') {
      advance();
      tokens.push(makeToken(TokenType.LParen, '(', line, col - 1));
      // Tokenize args until )
      let depth = 1;
      while (pos < source.length && depth > 0) {
        skipWhitespace();
        const ch = peek();
        const al = line, ac = col;
        if (ch === ')') {
          depth--;
          if (depth === 0) {
            advance();
            tokens.push(makeToken(TokenType.RParen, ')', al, ac));
            break;
          }
        }
        if (ch === '(') {
          depth++;
          advance();
          tokens.push(makeToken(TokenType.LParen, '(', al, ac));
          continue;
        }
        // Tokenize one expression token
        tokenizeOneToken();
      }
    }
  }

  function tokenizeDirectiveExprUntilBrace(): void {
    // Tokenize expression tokens (condition, @for variable/iterable) until '{'
    // Then emit '{' and track brace depth for view content inside.
    while (pos < source.length) {
      skipWhitespace();
      if (pos >= source.length) break;

      const ch = peek();
      const sl = line, sc = col;

      if (ch === '{') {
        // This opens the directive body — track it as view content
        advance();
        tokens.push(makeToken(TokenType.LBrace, '{', sl, sc));
        viewBraceDepth++;
        return;
      }

      // Tokenize one expression token
      tokenizeOneToken();
    }
  }

  function tokenizeExprInBraces(): void {
    // Tokenize expression tokens until matching }
    let depth = 1;
    while (pos < source.length && depth > 0) {
      skipWhitespace();
      if (pos >= source.length) break;

      const ch = peek();
      const sl = line, sc = col;

      if (ch === '{') {
        depth++;
        advance();
        tokens.push(makeToken(TokenType.LBrace, '{', sl, sc));
        continue;
      }
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          advance();
          tokens.push(makeToken(TokenType.RBrace, '}', sl, sc));
          return;
        }
        advance();
        tokens.push(makeToken(TokenType.RBrace, '}', sl, sc));
        continue;
      }

      tokenizeOneToken();
    }
  }

  function tokenizeOneToken(): void {
    skipWhitespace();
    if (pos >= source.length) return;

    const startLine = line;
    const startCol = col;
    const ch = peek();

    // String literal
    if (ch === '"' || ch === "'") {
      const str = readString();
      tokens.push(makeToken(TokenType.String, str, startLine, startCol));
      return;
    }

    // Number literal
    if (isDigit(ch)) {
      const num = readNumber();
      tokens.push(makeToken(TokenType.Number, num, startLine, startCol));
      return;
    }

    // Identifier or keyword
    if (isAlpha(ch)) {
      const id = readIdentifier();
      const kwType = KEYWORDS[id];
      if (kwType) {
        tokens.push(makeToken(kwType, id, startLine, startCol));
      } else {
        tokens.push(makeToken(TokenType.Identifier, id, startLine, startCol));
      }
      return;
    }

    // Operators and punctuation
    switch (ch) {
      case '+': advance(); tokens.push(makeToken(TokenType.Plus, '+', startLine, startCol)); return;
      case '-': advance(); tokens.push(makeToken(TokenType.Minus, '-', startLine, startCol)); return;
      case '*': advance(); tokens.push(makeToken(TokenType.Star, '*', startLine, startCol)); return;
      case '/': advance(); tokens.push(makeToken(TokenType.Slash, '/', startLine, startCol)); return;
      case '%': advance(); tokens.push(makeToken(TokenType.Percent, '%', startLine, startCol)); return;
      case '?': advance(); tokens.push(makeToken(TokenType.Question, '?', startLine, startCol)); return;
      case ':': advance(); tokens.push(makeToken(TokenType.Colon, ':', startLine, startCol)); return;
      case ',': advance(); tokens.push(makeToken(TokenType.Comma, ',', startLine, startCol)); return;
      case ';': advance(); tokens.push(makeToken(TokenType.Semicolon, ';', startLine, startCol)); return;
      case '(': advance(); tokens.push(makeToken(TokenType.LParen, '(', startLine, startCol)); return;
      case ')': advance(); tokens.push(makeToken(TokenType.RParen, ')', startLine, startCol)); return;
      case '[': advance(); tokens.push(makeToken(TokenType.LBracket, '[', startLine, startCol)); return;
      case ']': advance(); tokens.push(makeToken(TokenType.RBracket, ']', startLine, startCol)); return;
      case '{': advance(); tokens.push(makeToken(TokenType.LBrace, '{', startLine, startCol)); return;
      case '}': advance(); tokens.push(makeToken(TokenType.RBrace, '}', startLine, startCol)); return;
      case '|':
        advance();
        if (peek() === '|') {
          advance();
          tokens.push(makeToken(TokenType.Or, '||', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Pipe, '|', startLine, startCol));
        }
        return;
      case '&':
        advance();
        if (peek() === '&') {
          advance();
          tokens.push(makeToken(TokenType.And, '&&', startLine, startCol));
        }
        return;
      case '!':
        advance();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.Neq, '!=', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Not, '!', startLine, startCol));
        }
        return;
      case '=':
        advance();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.Eq, '==', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Assign, '=', startLine, startCol));
        }
        return;
      case '<':
        advance();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.SignalAssign, '<=', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Lt, '<', startLine, startCol));
        }
        return;
      case '>':
        advance();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.Gte, '>=', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Gt, '>', startLine, startCol));
        }
        return;
      case '.':
        if (peek(1) === '.' && peek(2) === '.') {
          advance(); advance(); advance();
          tokens.push(makeToken(TokenType.Spread, '...', startLine, startCol));
        } else if (peek(1) === '.') {
          advance(); advance();
          tokens.push(makeToken(TokenType.DotDot, '..', startLine, startCol));
        } else {
          advance();
          tokens.push(makeToken(TokenType.Dot, '.', startLine, startCol));
        }
        return;
      case '@':
        advance();
        const id = readIdentifier();
        const directive = '@' + id;
        if (directive === '@if') {
          tokens.push(makeToken(TokenType.AtIf, '@if', startLine, startCol));
        } else if (directive === '@else') {
          tokens.push(makeToken(TokenType.AtElse, '@else', startLine, startCol));
        } else if (directive === '@for') {
          tokens.push(makeToken(TokenType.AtFor, '@for', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.At, '@', startLine, startCol));
          tokens.push(makeToken(TokenType.Identifier, id, startLine, startCol + 1));
        }
        return;
      default:
        advance(); // skip unknown
        return;
    }
  }

  // Main tokenize loop
  while (pos < source.length) {
    if (inViewBlock && !inJsxTag) {
      tokenizeViewContent();
      continue;
    }

    skipWhitespace();
    if (pos >= source.length) break;

    const startLine = line;
    const startCol = col;
    const ch = peek();

    // String literal
    if (ch === '"' || ch === "'") {
      const str = readString();
      tokens.push(makeToken(TokenType.String, str, startLine, startCol));
      continue;
    }

    // Number literal
    if (isDigit(ch)) {
      const num = readNumber();
      tokens.push(makeToken(TokenType.Number, num, startLine, startCol));
      continue;
    }

    // Identifier or keyword
    if (isAlpha(ch)) {
      const id = readIdentifier();
      const kwType = KEYWORDS[id];
      if (kwType) {
        tokens.push(makeToken(kwType, id, startLine, startCol));
        // Check if this is 'view' followed by '{'
        if (kwType === TokenType.View) {
          skipWhitespace();
          if (peek() === '{') {
            advance();
            tokens.push(makeToken(TokenType.LBrace, '{', line, col - 1));
            inViewBlock = true;
            viewBraceDepth = 1;
          }
        }
      } else {
        tokens.push(makeToken(TokenType.Identifier, id, startLine, startCol));
      }
      continue;
    }

    // @ directives
    if (ch === '@') {
      advance();
      // If next char is not alpha, it's a bare @ (e.g. always @(event))
      if (!isAlpha(peek())) {
        tokens.push(makeToken(TokenType.At, '@', startLine, startCol));
        continue;
      }
      const dsl = line, dsc = col;
      const id = readIdentifier();
      const directive = '@' + id;
      if (directive === '@if') {
        tokens.push(makeToken(TokenType.AtIf, '@if', startLine, startCol));
      } else if (directive === '@else') {
        tokens.push(makeToken(TokenType.AtElse, '@else', startLine, startCol));
      } else if (directive === '@for') {
        tokens.push(makeToken(TokenType.AtFor, '@for', startLine, startCol));
      } else {
        tokens.push(makeToken(TokenType.At, '@', startLine, startCol));
        tokens.push(makeToken(TokenType.Identifier, id, dsl, dsc));
      }
      continue;
    }

    // Operators and punctuation
    switch (ch) {
      case '+': advance(); tokens.push(makeToken(TokenType.Plus, '+', startLine, startCol)); break;
      case '-': advance(); tokens.push(makeToken(TokenType.Minus, '-', startLine, startCol)); break;
      case '*': advance(); tokens.push(makeToken(TokenType.Star, '*', startLine, startCol)); break;
      case '/': advance(); tokens.push(makeToken(TokenType.Slash, '/', startLine, startCol)); break;
      case '%': advance(); tokens.push(makeToken(TokenType.Percent, '%', startLine, startCol)); break;
      case '?': advance(); tokens.push(makeToken(TokenType.Question, '?', startLine, startCol)); break;
      case ':': advance(); tokens.push(makeToken(TokenType.Colon, ':', startLine, startCol)); break;
      case ',': advance(); tokens.push(makeToken(TokenType.Comma, ',', startLine, startCol)); break;
      case ';': advance(); tokens.push(makeToken(TokenType.Semicolon, ';', startLine, startCol)); break;
      case '(': advance(); tokens.push(makeToken(TokenType.LParen, '(', startLine, startCol)); break;
      case ')': advance(); tokens.push(makeToken(TokenType.RParen, ')', startLine, startCol)); break;
      case '[': advance(); tokens.push(makeToken(TokenType.LBracket, '[', startLine, startCol)); break;
      case ']': advance(); tokens.push(makeToken(TokenType.RBracket, ']', startLine, startCol)); break;
      case '{': advance(); tokens.push(makeToken(TokenType.LBrace, '{', startLine, startCol)); break;
      case '}': advance(); tokens.push(makeToken(TokenType.RBrace, '}', startLine, startCol)); break;
      case '|':
        advance();
        if (peek() === '|') {
          advance();
          tokens.push(makeToken(TokenType.Or, '||', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Pipe, '|', startLine, startCol));
        }
        break;
      case '&':
        advance();
        if (peek() === '&') {
          advance();
          tokens.push(makeToken(TokenType.And, '&&', startLine, startCol));
        }
        break;
      case '!':
        advance();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.Neq, '!=', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Not, '!', startLine, startCol));
        }
        break;
      case '=':
        advance();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.Eq, '==', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Assign, '=', startLine, startCol));
        }
        break;
      case '<':
        advance();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.SignalAssign, '<=', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Lt, '<', startLine, startCol));
        }
        break;
      case '>':
        advance();
        if (peek() === '=') {
          advance();
          tokens.push(makeToken(TokenType.Gte, '>=', startLine, startCol));
        } else {
          tokens.push(makeToken(TokenType.Gt, '>', startLine, startCol));
        }
        break;
      case '.':
        if (peek(1) === '.' && peek(2) === '.') {
          advance(); advance(); advance();
          tokens.push(makeToken(TokenType.Spread, '...', startLine, startCol));
        } else if (peek(1) === '.') {
          advance(); advance();
          tokens.push(makeToken(TokenType.DotDot, '..', startLine, startCol));
        } else {
          advance();
          tokens.push(makeToken(TokenType.Dot, '.', startLine, startCol));
        }
        break;
      default:
        advance(); // skip unknown characters
        break;
    }
  }

  tokens.push(makeToken(TokenType.EOF, '', line, col));
  return tokens;
}
