// parser.ts — Recursive descent parser with Pratt expression parsing for Comb

import { Token, TokenType } from './lexer.js';
import type {
  Module, Param, Declaration, SignalDecl, CombDecl, AlwaysBlock,
  ViewBlock, EnumDecl, EventTrigger, Statement, SignalAssign,
  IfStatement, ExprStatement, VNode, VElement, VText, VExpr, VIf, VFor,
  VComponent, VAttr, Expr, Literal, Identifier, BinaryExpr, UnaryExpr,
  TernaryExpr, CallExpr, MemberExpr, IndexExpr, ArrayExpr, ObjectExpr,
  SpreadExpr, LambdaExpr, RangeExpr, TypeExpr, SimpleType, ArrayType,
  ObjectType, SourceLoc,
} from './ast.js';

// ============================================================
// Parser errors
// ============================================================

export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
  ) {
    super(`Parse error at ${line}:${column}: ${message}`);
  }
}

// ============================================================
// Parser class
// ============================================================

export function parse(tokens: Token[]): Module[] {
  const parser = new Parser(tokens);
  return parser.parseProgram();
}

class Parser {
  private pos = 0;
  private tokens: Token[];
  private inStatementContext = false; // When true, <= is assignment not comparison

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // --------------------------------------------------------
  // Token helpers
  // --------------------------------------------------------

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  private peekAt(offset: number): Token {
    return this.tokens[this.pos + offset] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  private advance(): Token {
    const tok = this.peek();
    this.pos++;
    return tok;
  }

  private expect(type: TokenType, context?: string): Token {
    const tok = this.peek();
    if (tok.type !== type) {
      const ctx = context ? ` (${context})` : '';
      this.error(`Expected '${type}' but got '${tok.type}' ('${tok.value}')${ctx}`);
    }
    return this.advance();
  }

  private match(type: TokenType): boolean {
    if (this.peek().type === type) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private checkValue(value: string): boolean {
    return this.peek().value === value;
  }

  private loc(): SourceLoc {
    const tok = this.peek();
    return { line: tok.line, column: tok.column };
  }

  private error(message: string): never {
    const tok = this.peek();
    throw new ParseError(message, tok.line, tok.column);
  }

  // --------------------------------------------------------
  // Top-level
  // --------------------------------------------------------

  parseProgram(): Module[] {
    const modules: Module[] = [];
    while (!this.check(TokenType.EOF)) {
      modules.push(this.parseModule());
    }
    return modules;
  }

  private parseModule(): Module {
    const loc = this.loc();
    this.expect(TokenType.Module, 'module declaration');
    const name = this.expect(TokenType.Identifier, 'module name').value;

    let params: Param[] = [];
    if (this.match(TokenType.LParen)) {
      params = this.parseParamList();
      this.expect(TokenType.RParen, 'module params');
    }

    this.expect(TokenType.LBrace, 'module body');
    const body: Declaration[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      body.push(this.parseDeclaration());
    }
    this.expect(TokenType.RBrace, 'module body end');

    return { kind: 'module', name, params, body, loc };
  }

  private parseParamList(): Param[] {
    const params: Param[] = [];
    if (this.check(TokenType.RParen)) return params;

    params.push(this.parseParam());
    while (this.match(TokenType.Comma)) {
      params.push(this.parseParam());
    }
    return params;
  }

  private parseParam(): Param {
    const name = this.expect(TokenType.Identifier, 'param name').value;
    this.expect(TokenType.Colon, 'param type');
    const type = this.parseType();
    return { name, type };
  }

  // --------------------------------------------------------
  // Types
  // --------------------------------------------------------

  private parseType(): TypeExpr {
    let type: TypeExpr;

    // Object type: { field: type, ... }
    if (this.check(TokenType.LBrace)) {
      type = this.parseObjectType();
    } else {
      // Simple type name
      const name = this.expect(TokenType.Identifier, 'type name').value;
      type = { kind: 'simple', name };
    }

    // Array suffix: [][]
    while (this.check(TokenType.LBracket) && this.peekAt(1).type === TokenType.RBracket) {
      this.advance(); // [
      this.advance(); // ]
      type = { kind: 'array', element: type };
    }

    return type;
  }

  private parseObjectType(): ObjectType {
    this.expect(TokenType.LBrace);
    const fields: { name: string; type: TypeExpr }[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const name = this.expect(TokenType.Identifier, 'field name').value;
      this.expect(TokenType.Colon, 'field type');
      const type = this.parseType();
      fields.push({ name, type });
      if (!this.check(TokenType.RBrace)) {
        this.expect(TokenType.Comma, 'field separator');
      }
    }
    this.expect(TokenType.RBrace, 'object type end');
    return { kind: 'object', fields };
  }

  // --------------------------------------------------------
  // Declarations
  // --------------------------------------------------------

  private parseDeclaration(): Declaration {
    const tok = this.peek();

    switch (tok.type) {
      case TokenType.Signal: return this.parseSignalDecl();
      case TokenType.Comb: return this.parseCombDecl();
      case TokenType.Always: return this.parseAlwaysBlock();
      case TokenType.View: return this.parseViewBlock();
      case TokenType.Enum: return this.parseEnumDecl();
      default:
        this.error(`Unexpected token '${tok.value}' in module body, expected declaration`);
    }
  }

  private parseSignalDecl(): SignalDecl {
    const loc = this.loc();
    this.expect(TokenType.Signal);
    const name = this.expect(TokenType.Identifier, 'signal name').value;
    this.expect(TokenType.Colon, 'signal type');
    const type = this.parseType();
    this.expect(TokenType.Assign, 'signal initializer');
    const initial = this.parseExpr();
    this.expect(TokenType.Semicolon, 'signal declaration');
    return { kind: 'signal', name, type, initial, loc };
  }

  private parseCombDecl(): CombDecl {
    const loc = this.loc();
    this.expect(TokenType.Comb);
    const name = this.expect(TokenType.Identifier, 'comb name').value;
    this.expect(TokenType.Assign, 'comb expression');
    const expr = this.parseExpr();
    this.expect(TokenType.Semicolon, 'comb declaration');
    return { kind: 'comb', name, expr, loc };
  }

  private parseAlwaysBlock(): AlwaysBlock {
    const loc = this.loc();
    this.expect(TokenType.Always);
    this.expect(TokenType.At, 'always trigger');
    this.expect(TokenType.LParen, 'always trigger');

    const triggerName = this.expect(TokenType.Identifier, 'event name').value;
    let triggerParams: string[] = [];
    if (this.match(TokenType.LParen)) {
      // Parameterized event: @(reveal(r, c))
      while (!this.check(TokenType.RParen) && !this.check(TokenType.EOF)) {
        triggerParams.push(this.expect(TokenType.Identifier, 'event param').value);
        if (!this.check(TokenType.RParen)) {
          this.expect(TokenType.Comma, 'event params');
        }
      }
      this.expect(TokenType.RParen, 'event params');
    }

    this.expect(TokenType.RParen, 'always trigger');

    const trigger: EventTrigger = { name: triggerName, params: triggerParams };

    this.expect(TokenType.LBrace, 'always body');
    const body: Statement[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      body.push(this.parseStatement());
    }
    this.expect(TokenType.RBrace, 'always body end');

    return { kind: 'always', trigger, body, loc };
  }

  private parseViewBlock(): ViewBlock {
    const loc = this.loc();
    this.expect(TokenType.View);
    this.expect(TokenType.LBrace, 'view block');
    const children: VNode[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const node = this.parseVNode();
      if (node) children.push(node);
    }
    this.expect(TokenType.RBrace, 'view block end');
    return { kind: 'view', children, loc };
  }

  private parseEnumDecl(): EnumDecl {
    const loc = this.loc();
    this.expect(TokenType.Enum);
    const name = this.expect(TokenType.Identifier, 'enum name').value;
    this.expect(TokenType.LBrace, 'enum body');
    const variants: string[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      variants.push(this.expect(TokenType.Identifier, 'enum variant').value);
      if (!this.check(TokenType.RBrace)) {
        this.expect(TokenType.Comma, 'enum variants');
      }
    }
    this.expect(TokenType.RBrace, 'enum body end');
    return { kind: 'enum', name, variants, loc };
  }

  // --------------------------------------------------------
  // Statements (inside always blocks)
  // --------------------------------------------------------

  private parseStatement(): Statement {
    // @if statement
    if (this.check(TokenType.AtIf)) {
      return this.parseIfStatement();
    }

    // Inside always blocks, <= is signal assignment, NOT comparison.
    // Parse the LHS without letting the Pratt parser consume <=.
    // We use inStatement mode to exclude SignalAssign from binary ops.
    const loc = this.loc();
    this.inStatementContext = true;
    const expr = this.parseExpr();
    this.inStatementContext = false;

    // Signal assignment: expr <= value;
    if (this.check(TokenType.SignalAssign)) {
      this.advance(); // consume <=
      this.inStatementContext = true;
      const value = this.parseExpr();
      this.inStatementContext = false;
      this.expect(TokenType.Semicolon, 'signal assignment');
      return { kind: 'assign', target: expr, value, loc } as SignalAssign;
    }

    // Expression statement (function call like init())
    if (this.match(TokenType.Semicolon)) {
      return { kind: 'expr_stmt', expr, loc } as ExprStatement;
    }

    return { kind: 'expr_stmt', expr, loc } as ExprStatement;
  }

  private parseIfStatement(): IfStatement {
    const loc = this.loc();
    this.expect(TokenType.AtIf);

    // Condition can be with or without parens
    const condition = this.parseExpr();

    this.expect(TokenType.LBrace, '@if body');
    const then: Statement[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      then.push(this.parseStatement());
    }
    this.expect(TokenType.RBrace, '@if body end');

    let else_: Statement[] | undefined;
    if (this.check(TokenType.AtElse)) {
      this.advance();
      if (this.check(TokenType.AtIf)) {
        // @else @if chaining
        else_ = [this.parseIfStatement()];
      } else {
        this.expect(TokenType.LBrace, '@else body');
        else_ = [];
        while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
          else_.push(this.parseStatement());
        }
        this.expect(TokenType.RBrace, '@else body end');
      }
    }

    return { kind: 'if', condition, then, else_, loc };
  }

  // --------------------------------------------------------
  // View nodes (JSX-like)
  // --------------------------------------------------------

  private parseVNode(): VNode | null {
    const tok = this.peek();

    // @if directive in view
    if (tok.type === TokenType.AtIf) {
      return this.parseVIf();
    }

    // @for directive in view
    if (tok.type === TokenType.AtFor) {
      return this.parseVFor();
    }

    // JSX element open: <tag or <Component
    if (tok.type === TokenType.JsxOpen) {
      return this.parseVElement();
    }

    // Expression interpolation: { expr }
    if (tok.type === TokenType.LBrace) {
      return this.parseVExprNode();
    }

    // Text content
    if (tok.type === TokenType.String) {
      const loc = this.loc();
      const text = this.advance().value;
      return { kind: 'text', value: text, loc } as VText;
    }

    // Skip unknown tokens in view context
    this.advance();
    return null;
  }

  private parseVElement(): VElement | VComponent {
    const loc = this.loc();
    const openTag = this.expect(TokenType.JsxOpen, 'element tag');
    const tag = openTag.value;
    const isComponent = tag[0] >= 'A' && tag[0] <= 'Z';

    // Parse attributes
    const attrs: VAttr[] = [];
    while (!this.check(TokenType.JsxTagEnd) && !this.check(TokenType.JsxSelfClose) && !this.check(TokenType.EOF)) {
      attrs.push(this.parseVAttr());
    }

    // Self-closing
    if (this.check(TokenType.JsxSelfClose)) {
      this.advance();
      if (isComponent) {
        return { kind: 'component', name: tag, props: attrs, children: [], selfClosing: true, loc } as VComponent;
      }
      return { kind: 'element', tag, attrs, children: [], selfClosing: true, loc };
    }

    // Regular tag with children
    this.expect(TokenType.JsxTagEnd, 'element tag end');

    const children: VNode[] = [];
    while (!this.check(TokenType.JsxClose) && !this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const node = this.parseVNode();
      if (node) children.push(node);
    }

    // Closing tag
    if (this.check(TokenType.JsxClose)) {
      const closeTag = this.advance().value;
      if (closeTag !== tag) {
        this.error(`Mismatched closing tag: expected </${tag}> but got </${closeTag}>`);
      }
    }

    if (isComponent) {
      return { kind: 'component', name: tag, props: attrs, children, selfClosing: false, loc } as VComponent;
    }
    return { kind: 'element', tag, attrs, children, selfClosing: false, loc };
  }

  private parseVAttr(): VAttr {
    const tok = this.peek();

    // @bind=signal
    if (tok.type === TokenType.AtBind) {
      this.advance();
      this.expect(TokenType.Assign, '@bind value');
      const value = this.parseAttrExpr();
      return { name: 'bind', value, isEvent: false, isBind: true };
    }

    // @event=handler
    if (tok.type === TokenType.At) {
      this.advance();
      const nameTok = this.expect(TokenType.Identifier, 'event name');
      let name = nameTok.value;
      let modifier: string | undefined;

      // Check for modifier in name (already handled by lexer: "keydown.enter")
      const dotIdx = name.indexOf('.');
      if (dotIdx >= 0) {
        modifier = name.slice(dotIdx + 1);
        name = name.slice(0, dotIdx);
      }

      this.expect(TokenType.Assign, 'event handler');

      // Handler can be: identifier, identifier(args)
      const handlerName = this.expect(TokenType.Identifier, 'event handler name');
      let eventArgs: Expr[] | undefined;
      if (this.check(TokenType.LParen)) {
        this.advance();
        eventArgs = [];
        while (!this.check(TokenType.RParen) && !this.check(TokenType.EOF)) {
          eventArgs.push(this.parseExpr());
          if (!this.check(TokenType.RParen)) {
            this.expect(TokenType.Comma, 'event args');
          }
        }
        this.expect(TokenType.RParen, 'event args');
      }

      const handler: Identifier = { kind: 'identifier', name: handlerName.value, loc: { line: handlerName.line, column: handlerName.column } };
      return { name, value: handler, isEvent: true, isBind: false, modifier, eventArgs };
    }

    // Regular attribute: name="value" or name={expr}
    const nameTok = this.expect(TokenType.Identifier, 'attribute name');

    if (this.match(TokenType.Assign)) {
      // Attribute has a value
      if (this.check(TokenType.LBrace)) {
        // Expression value: name={expr}
        this.advance();
        const expr = this.parseExpr();
        this.expect(TokenType.RBrace, 'attr expression');
        return { name: nameTok.value, value: expr, isEvent: false, isBind: false };
      }
      if (this.check(TokenType.String)) {
        // String value: name="value"
        const strTok = this.advance();
        return {
          name: nameTok.value,
          value: { kind: 'literal', value: strTok.value, type: 'string', loc: { line: strTok.line, column: strTok.column } } as Literal,
          isEvent: false,
          isBind: false,
        };
      }
      // Identifier value: disabled=something
      const val = this.parseAttrExpr();
      return { name: nameTok.value, value: val, isEvent: false, isBind: false };
    }

    // Boolean attribute: disabled (no value)
    return { name: nameTok.value, value: null, isEvent: false, isBind: false };
  }

  private parseAttrExpr(): Expr {
    if (this.check(TokenType.LBrace)) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TokenType.RBrace, 'attr expression');
      return expr;
    }
    const tok = this.advance();
    return { kind: 'identifier', name: tok.value, loc: { line: tok.line, column: tok.column } };
  }

  private parseVIf(): VIf {
    const loc = this.loc();
    this.expect(TokenType.AtIf);
    const condition = this.parseExpr();
    this.expect(TokenType.LBrace, '@if body in view');
    const then: VNode[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const node = this.parseVNode();
      if (node) then.push(node);
    }
    this.expect(TokenType.RBrace, '@if body end in view');

    let else_: VNode[] | undefined;
    if (this.check(TokenType.AtElse)) {
      this.advance();
      this.expect(TokenType.LBrace, '@else body in view');
      else_ = [];
      while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
        const node = this.parseVNode();
        if (node) else_.push(node);
      }
      this.expect(TokenType.RBrace, '@else body end in view');
    }

    return { kind: 'if', condition, then, else_, loc };
  }

  private parseVFor(): VFor {
    const loc = this.loc();
    this.expect(TokenType.AtFor);
    const variable = this.expect(TokenType.Identifier, '@for variable').value;
    this.expect(TokenType.In, '@for iterable');
    const iterable = this.parseExpr();
    this.expect(TokenType.LBrace, '@for body');
    const body: VNode[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const node = this.parseVNode();
      if (node) body.push(node);
    }
    this.expect(TokenType.RBrace, '@for body end');
    return { kind: 'for', variable, iterable, body, loc };
  }

  private parseVExprNode(): VExpr {
    const loc = this.loc();
    this.expect(TokenType.LBrace);
    const expr = this.parseExpr();
    this.expect(TokenType.RBrace, 'view expression');
    return { kind: 'expr', expr, loc };
  }

  // --------------------------------------------------------
  // Expressions (Pratt parser)
  // --------------------------------------------------------

  parseExpr(minPrec = 0): Expr {
    let left = this.parseUnary();

    while (true) {
      const tok = this.peek();

      // Ternary
      if (tok.type === TokenType.Question && minPrec <= 1) {
        this.advance();
        const then = this.parseExpr(0);
        this.expect(TokenType.Colon, 'ternary else');
        const else_ = this.parseExpr(1); // right-associative
        left = { kind: 'ternary', condition: left, then, else_, loc: left.loc } as TernaryExpr;
        continue;
      }

      // Range (..)
      if (tok.type === TokenType.DotDot && minPrec <= 2) {
        this.advance();
        const end = this.parseExpr(3);
        left = { kind: 'range', start: left, end, loc: left.loc } as RangeExpr;
        continue;
      }

      // Binary operators
      const prec = this.getBinaryPrec(tok);
      if (prec >= 0 && prec >= minPrec) {
        this.advance();
        const right = this.parseExpr(prec + 1);
        left = { kind: 'binary', op: tok.value, left, right, loc: left.loc } as BinaryExpr;
        continue;
      }

      // Postfix: call, member, index
      if (tok.type === TokenType.LParen && minPrec <= 12) {
        this.advance();
        const args: Expr[] = [];
        while (!this.check(TokenType.RParen) && !this.check(TokenType.EOF)) {
          // Check for lambda: |params| expr
          if (this.check(TokenType.Pipe)) {
            args.push(this.parseLambda());
          } else {
            args.push(this.parseExpr());
          }
          if (!this.check(TokenType.RParen)) {
            this.expect(TokenType.Comma, 'function args');
          }
        }
        this.expect(TokenType.RParen, 'function call');
        left = { kind: 'call', callee: left, args, loc: left.loc } as CallExpr;
        continue;
      }

      if (tok.type === TokenType.Dot && minPrec <= 12) {
        this.advance();
        const prop = this.expect(TokenType.Identifier, 'member access').value;
        left = { kind: 'member', object: left, property: prop, loc: left.loc } as MemberExpr;
        continue;
      }

      if (tok.type === TokenType.LBracket && minPrec <= 12) {
        this.advance();
        const index = this.parseExpr();
        this.expect(TokenType.RBracket, 'index access');
        left = { kind: 'index', object: left, index, loc: left.loc } as IndexExpr;
        continue;
      }

      break;
    }

    return left;
  }

  private getBinaryPrec(tok: Token): number {
    switch (tok.type) {
      case TokenType.Or: return 3;
      case TokenType.And: return 4;
      case TokenType.Eq:
      case TokenType.Neq: return 5;
      case TokenType.Lt:
      case TokenType.Gt:
      case TokenType.Gte: return 6;
      // <= is SignalAssign in lexer. In statement context it's assignment (not a binop).
      // In expression context (comb, view, etc.) it's LTE comparison.
      case TokenType.SignalAssign: return this.inStatementContext ? -1 : 6;
      case TokenType.Plus:
      case TokenType.Minus: return 7;
      case TokenType.Star:
      case TokenType.Slash:
      case TokenType.Percent: return 8;
      default: return -1;
    }
  }

  private parseUnary(): Expr {
    const tok = this.peek();
    const loc = this.loc();

    if (tok.type === TokenType.Not) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'unary', op: '!', operand, loc } as UnaryExpr;
    }

    if (tok.type === TokenType.Minus) {
      // Only treat as unary minus if it's at the start of an expression
      // (i.e., not after a value token)
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'unary', op: '-', operand, loc } as UnaryExpr;
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const tok = this.peek();
    const loc = this.loc();

    // Number literal
    if (tok.type === TokenType.Number) {
      this.advance();
      const num = tok.value.includes('.') ? parseFloat(tok.value) : parseInt(tok.value, 10);
      return { kind: 'literal', value: num, type: 'number', loc } as Literal;
    }

    // String literal
    if (tok.type === TokenType.String) {
      this.advance();
      return { kind: 'literal', value: tok.value, type: 'string', loc } as Literal;
    }

    // Boolean literals
    if (tok.type === TokenType.True) {
      this.advance();
      return { kind: 'literal', value: true, type: 'boolean', loc } as Literal;
    }
    if (tok.type === TokenType.False) {
      this.advance();
      return { kind: 'literal', value: false, type: 'boolean', loc } as Literal;
    }

    // Parenthesized expression
    if (tok.type === TokenType.LParen) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TokenType.RParen, 'parenthesized expression');
      return expr;
    }

    // Array literal: [elements]
    if (tok.type === TokenType.LBracket) {
      return this.parseArrayExpr();
    }

    // Object literal: { key: value, ... }
    if (tok.type === TokenType.LBrace) {
      return this.parseObjectExpr();
    }

    // Spread: ...expr
    if (tok.type === TokenType.Spread) {
      this.advance();
      const expr = this.parseExpr(12); // high precedence - just the next primary+postfix
      return { kind: 'spread', expr, loc } as SpreadExpr;
    }

    // Lambda: |params| expr
    if (tok.type === TokenType.Pipe) {
      return this.parseLambda();
    }

    // Identifier
    if (tok.type === TokenType.Identifier) {
      this.advance();
      return { kind: 'identifier', name: tok.value, loc } as Identifier;
    }

    this.error(`Unexpected token '${tok.value}' (${tok.type}) in expression`);
  }

  private parseArrayExpr(): ArrayExpr {
    const loc = this.loc();
    this.expect(TokenType.LBracket);
    const elements: Expr[] = [];
    while (!this.check(TokenType.RBracket) && !this.check(TokenType.EOF)) {
      if (this.check(TokenType.Spread)) {
        elements.push(this.parsePrimary()); // will hit the Spread case
      } else {
        elements.push(this.parseExpr());
      }
      if (!this.check(TokenType.RBracket)) {
        this.expect(TokenType.Comma, 'array elements');
      }
    }
    this.expect(TokenType.RBracket, 'array literal');
    return { kind: 'array', elements, loc };
  }

  private parseObjectExpr(): ObjectExpr {
    const loc = this.loc();
    this.expect(TokenType.LBrace);
    const properties: { key: string; value: Expr }[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const key = this.expect(TokenType.Identifier, 'object key').value;
      this.expect(TokenType.Colon, 'object property');
      const value = this.parseExpr();
      properties.push({ key, value });
      if (!this.check(TokenType.RBrace)) {
        this.expect(TokenType.Comma, 'object properties');
      }
    }
    this.expect(TokenType.RBrace, 'object literal');
    return { kind: 'object', properties, loc };
  }

  private parseLambda(): LambdaExpr {
    const loc = this.loc();
    this.expect(TokenType.Pipe);
    const params: string[] = [];
    while (!this.check(TokenType.Pipe) && !this.check(TokenType.EOF)) {
      params.push(this.expect(TokenType.Identifier, 'lambda param').value);
      if (!this.check(TokenType.Pipe)) {
        this.expect(TokenType.Comma, 'lambda params');
      }
    }
    this.expect(TokenType.Pipe, 'lambda body');
    const body = this.parseExpr();
    return { kind: 'lambda', params, body, loc };
  }
}
