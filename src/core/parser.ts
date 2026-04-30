// parser.ts — Recursive descent parser with Pratt expression parsing for Comb

import { Token, TokenType } from './lexer.js';
import type {
  Module, Param, Declaration, InputDecl, OutputDecl, SignalDecl, TokenDecl, CellDecl,
  CombDecl, ConstraintDecl, ConstraintClause,
  AlwaysBlock, ViewBlock, StyleBlock, EnumDecl, AssertDecl, EventTrigger, Statement,
  SignalAssign, IfStatement, ExprStatement, VNode, VElement, VText, VExpr, VIf, VFor,
  VComponent, VAttr, Expr, Literal, Identifier, BinaryExpr, UnaryExpr,
  TernaryExpr, CallExpr, MemberExpr, IndexExpr, ArrayExpr, ObjectExpr,
  SpreadExpr, LambdaExpr, RangeExpr, TypeExpr, ObjectType, SourceLoc,
} from './ast.js';

export class ParseError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`Parse error at ${line}:${column}: ${message}`);
  }
}

export function parse(tokens: Token[]): Module[] {
  return new Parser(tokens).parseProgram();
}

class Parser {
  private pos = 0;
  private inStatementContext = false;

  constructor(private tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  private peekAt(offset: number): Token {
    return this.tokens[this.pos + offset] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  private advance(): Token {
    const t = this.peek();
    this.pos++;
    return t;
  }

  private expect(type: TokenType, context?: string): Token {
    const t = this.peek();
    if (t.type !== type) {
      const ctx = context ? ` (${context})` : '';
      this.error(`Expected '${type}' but got '${t.type}' ('${t.value}')${ctx}`);
    }
    return this.advance();
  }

  private match(type: TokenType): boolean {
    if (this.peek().type === type) { this.advance(); return true; }
    return false;
  }

  private check(type: TokenType): boolean { return this.peek().type === type; }

  private loc(): SourceLoc {
    const t = this.peek();
    return { line: t.line, column: t.column };
  }

  private error(message: string): never {
    const t = this.peek();
    throw new ParseError(message, t.line, t.column);
  }

  // Top-level

  parseProgram(): Module[] {
    const modules: Module[] = [];
    while (!this.check(TokenType.EOF)) modules.push(this.parseModule());
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
    while (this.match(TokenType.Comma)) params.push(this.parseParam());
    return params;
  }

  private parseParam(): Param {
    const name = this.expect(TokenType.Identifier, 'param name').value;
    this.expect(TokenType.Colon, 'param type');
    return { name, type: this.parseType() };
  }

  // Types

  private parseType(): TypeExpr {
    let type: TypeExpr;
    if (this.check(TokenType.LBrace)) {
      type = this.parseObjectType();
    } else {
      const name = this.expect(TokenType.Identifier, 'type name').value;
      // Check for range type: int(0..255) or float(0.0..1.0)
      if ((name === 'int' || name === 'float') && this.check(TokenType.LParen)) {
        this.advance(); // consume '('
        const minStr = this.expect(TokenType.Number, 'range min').value;
        this.expect(TokenType.DotDot, 'range separator (..)');
        const maxStr = this.expect(TokenType.Number, 'range max').value;
        this.expect(TokenType.RParen, 'range end');
        type = { kind: 'range', base: name as 'int' | 'float', min: Number(minStr), max: Number(maxStr) };
      } else {
        type = { kind: 'simple', name };
      }
    }
    while (this.check(TokenType.LBracket) && this.peekAt(1).type === TokenType.RBracket) {
      this.advance(); this.advance();
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
      fields.push({ name, type: this.parseType() });
      if (!this.check(TokenType.RBrace)) this.expect(TokenType.Comma, 'field separator');
    }
    this.expect(TokenType.RBrace, 'object type end');
    return { kind: 'object', fields };
  }

  // Declarations

  private parseDeclaration(): Declaration {
    const t = this.peek();
    switch (t.type) {
      case TokenType.Input: return this.parseInputDecl();
      case TokenType.Output: return this.parseOutputDecl();
      case TokenType.Signal: return this.parseSignalDecl();
      case TokenType.Token: return this.parseTokenDecl();
      case TokenType.Cell: return this.parseCellDecl();
      case TokenType.Comb: return this.parseCombDecl();
      case TokenType.Constraint: return this.parseConstraintDecl();
      case TokenType.Always: return this.parseAlwaysBlock();
      case TokenType.View: return this.parseViewBlock();
      case TokenType.Style: return this.parseStyleBlock();
      case TokenType.Enum: return this.parseEnumDecl();
      case TokenType.Assert: return this.parseAssertDecl();
      default: this.error(`Unexpected token '${t.value}' in module body, expected declaration`);
    }
  }

  private parseInputDecl(): InputDecl {
    const loc = this.loc();
    this.expect(TokenType.Input);
    const name = this.expect(TokenType.Identifier, 'input name').value;
    this.expect(TokenType.Colon, 'input type');
    const type = this.parseType();
    let initial: Expr | undefined;
    if (this.match(TokenType.Assign)) {
      initial = this.parseExpr();
    }
    this.expect(TokenType.Semicolon, 'input declaration');
    return { kind: 'input', name, type, initial, loc };
  }

  private parseOutputDecl(): OutputDecl {
    const loc = this.loc();
    this.expect(TokenType.Output);
    const name = this.expect(TokenType.Identifier, 'output name').value;
    this.expect(TokenType.Colon, 'output type');
    const type = this.parseType();
    let initial: Expr | undefined;
    if (this.match(TokenType.Assign)) {
      initial = this.parseExpr();
    }
    this.expect(TokenType.Semicolon, 'output declaration');
    return { kind: 'output', name, type, initial, loc };
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

  private parseTokenDecl(): TokenDecl {
    const loc = this.loc();
    this.expect(TokenType.Token);
    const name = this.expect(TokenType.Identifier, 'token name').value;
    this.expect(TokenType.Colon, 'token type');
    const type = this.parseType();
    this.expect(TokenType.Assign, 'token initializer');
    const initial = this.parseExpr();
    this.expect(TokenType.Semicolon, 'token declaration');
    return { kind: 'token', name, type, initial, loc };
  }

  private parseCellDecl(): CellDecl {
    const loc = this.loc();
    this.expect(TokenType.Cell);
    const name = this.expect(TokenType.Identifier, 'cell name').value;
    this.expect(TokenType.Colon, 'cell type');
    const type = this.parseType();
    this.expect(TokenType.Assign, 'cell initializer');
    const initial = this.parseExpr();
    this.expect(TokenType.Semicolon, 'cell declaration');
    return { kind: 'cell', name, type, initial, loc };
  }

  private parseConstraintDecl(): ConstraintDecl {
    const loc = this.loc();
    this.expect(TokenType.Constraint);
    const name = this.expect(TokenType.Identifier, 'constraint name').value;
    this.expect(TokenType.LBrace, 'constraint body');
    const clauses: ConstraintClause[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      clauses.push(this.parseConstraintClause());
    }
    this.expect(TokenType.RBrace, 'constraint body end');
    return { kind: 'constraint', name, clauses, loc };
  }

  private parseConstraintClause(): ConstraintClause {
    this.expect(TokenType.LParen, 'constraint clause inputs');
    const inputs: string[] = [];
    if (!this.check(TokenType.RParen)) {
      inputs.push(this.expect(TokenType.Identifier, 'constraint input').value);
      while (this.match(TokenType.Comma)) {
        inputs.push(this.expect(TokenType.Identifier, 'constraint input').value);
      }
    }
    this.expect(TokenType.RParen, 'constraint clause inputs end');
    // Expect => (parsed as = then >)
    this.expect(TokenType.Assign, 'constraint arrow');
    this.expect(TokenType.Gt, 'constraint arrow');
    this.expect(TokenType.LBrace, 'constraint clause body');
    const body: Statement[] = [];
    this.inStatementContext = true;
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      body.push(this.parseStatement());
    }
    this.inStatementContext = false;
    this.expect(TokenType.RBrace, 'constraint clause body end');
    return { inputs, body };
  }

  private parseCombDecl(): CombDecl {
    const loc = this.loc();
    this.expect(TokenType.Comb);
    const name = this.expect(TokenType.Identifier, 'comb name').value;
    this.expect(TokenType.Assign, 'comb expression');
    const expr = this.parseExpr();
    this.expect(TokenType.Semicolon, 'comb declaration');
    return { kind: 'comb', name, expr, deps: [], loc };
  }

  private parseAlwaysBlock(): AlwaysBlock {
    const loc = this.loc();
    this.expect(TokenType.Always);
    this.expect(TokenType.At, 'always trigger');
    this.expect(TokenType.LParen, 'always trigger');
    const firstName = this.expect(TokenType.Identifier, 'event/signal name').value;

    // Detect sensitivity list: @(sig1, sig2, ...) — comma after first identifier
    if (this.check(TokenType.Comma)) {
      const signals = [firstName];
      while (this.match(TokenType.Comma)) {
        signals.push(this.expect(TokenType.Identifier, 'sensitivity signal').value);
      }
      this.expect(TokenType.RParen, 'sensitivity list');
      this.expect(TokenType.LBrace, 'always body');
      const body: Statement[] = [];
      while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
        body.push(this.parseStatement());
      }
      this.expect(TokenType.RBrace, 'always body end');
      const name = `sense_${signals.join('_')}`;
      return { kind: 'always', triggerKind: 'sensitivity', trigger: { name, params: [], signals }, body, reads: [], writes: [], loc };
    }

    // Event trigger: @(eventName) or @(eventName(param1, param2))
    let triggerParams: string[] = [];
    if (this.match(TokenType.LParen)) {
      while (!this.check(TokenType.RParen) && !this.check(TokenType.EOF)) {
        triggerParams.push(this.expect(TokenType.Identifier, 'event param').value);
        if (!this.check(TokenType.RParen)) this.expect(TokenType.Comma, 'event params');
      }
      this.expect(TokenType.RParen, 'event params');
    }
    this.expect(TokenType.RParen, 'always trigger');
    this.expect(TokenType.LBrace, 'always body');
    const body: Statement[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      body.push(this.parseStatement());
    }
    this.expect(TokenType.RBrace, 'always body end');
    return { kind: 'always', triggerKind: 'event', trigger: { name: firstName, params: triggerParams }, body, reads: [], writes: [], loc };
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

  private parseStyleBlock(): StyleBlock {
    const loc = this.loc();
    this.expect(TokenType.Style);
    this.expect(TokenType.LBrace, 'style block');
    const css = this.check(TokenType.String) ? this.advance().value : '';
    this.expect(TokenType.RBrace, 'style block end');
    return { kind: 'style', css, loc };
  }

  private parseEnumDecl(): EnumDecl {
    const loc = this.loc();
    this.expect(TokenType.Enum);
    const name = this.expect(TokenType.Identifier, 'enum name').value;
    this.expect(TokenType.LBrace, 'enum body');
    const variants: string[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      variants.push(this.expect(TokenType.Identifier, 'enum variant').value);
      if (!this.check(TokenType.RBrace)) this.expect(TokenType.Comma, 'enum variants');
    }
    this.expect(TokenType.RBrace, 'enum body end');
    return { kind: 'enum', name, variants, loc };
  }

  private parseAssertDecl(): AssertDecl {
    const loc = this.loc();
    this.expect(TokenType.Assert);
    let mode: 'always' | 'once' = 'once';
    if (this.check(TokenType.Always)) {
      this.advance();
      mode = 'always';
    }
    const expr = this.parseExpr();
    this.expect(TokenType.Semicolon, 'assert declaration');
    return { kind: 'assert', mode, expr, deps: [], loc };
  }

  // Statements

  private parseStatement(): Statement {
    if (this.check(TokenType.AtIf) || this.check(TokenType.If)) return this.parseIfStatement();

    const loc = this.loc();
    this.inStatementContext = true;
    const expr = this.parseExpr();
    this.inStatementContext = false;

    if (this.check(TokenType.SignalAssign)) {
      this.advance();
      this.inStatementContext = true;
      const value = this.parseExpr();
      this.inStatementContext = false;
      this.expect(TokenType.Semicolon, 'signal assignment');
      return { kind: 'assign', target: expr, value, loc };
    }

    this.match(TokenType.Semicolon);
    return { kind: 'expr_stmt', expr, loc };
  }

  private parseIfStatement(): IfStatement {
    const loc = this.loc();
    // Accept both @if and bare if
    if (this.check(TokenType.AtIf)) this.advance();
    else this.expect(TokenType.If, 'if statement');
    const condition = this.parseExpr();
    this.expect(TokenType.LBrace, 'if body');
    const then: Statement[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) then.push(this.parseStatement());
    this.expect(TokenType.RBrace, 'if body end');

    let else_: Statement[] | undefined;
    if (this.check(TokenType.AtElse) || this.check(TokenType.Else)) {
      this.advance();
      if (this.check(TokenType.AtIf) || this.check(TokenType.If)) {
        else_ = [this.parseIfStatement()];
      } else {
        this.expect(TokenType.LBrace, 'else body');
        else_ = [];
        while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) else_.push(this.parseStatement());
        this.expect(TokenType.RBrace, 'else body end');
      }
    }
    return { kind: 'if', condition, then, else_, loc };
  }

  // View nodes

  private parseVNode(): VNode | null {
    const t = this.peek();
    if (t.type === TokenType.AtIf) return this.parseVIf();
    if (t.type === TokenType.AtFor) return this.parseVFor();
    if (t.type === TokenType.JsxOpen) return this.parseVElement();
    if (t.type === TokenType.LBrace) return this.parseVExprNode();
    if (t.type === TokenType.String) {
      const loc = this.loc();
      return { kind: 'text', value: this.advance().value, loc };
    }
    this.advance();
    return null;
  }

  private parseVElement(): VElement | VComponent {
    const loc = this.loc();
    const tag = this.expect(TokenType.JsxOpen, 'element tag').value;
    const isComponent = tag[0] >= 'A' && tag[0] <= 'Z';
    const attrs: VAttr[] = [];
    while (!this.check(TokenType.JsxTagEnd) && !this.check(TokenType.JsxSelfClose) && !this.check(TokenType.EOF)) {
      attrs.push(this.parseVAttr());
    }

    if (this.check(TokenType.JsxSelfClose)) {
      this.advance();
      if (isComponent) return { kind: 'component', name: tag, props: attrs, children: [], selfClosing: true, loc };
      return { kind: 'element', tag, attrs, children: [], selfClosing: true, loc };
    }

    this.expect(TokenType.JsxTagEnd, 'element tag end');
    const children: VNode[] = [];
    while (!this.check(TokenType.JsxClose) && !this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const node = this.parseVNode();
      if (node) children.push(node);
    }
    if (this.check(TokenType.JsxClose)) {
      const closeTag = this.advance().value;
      if (closeTag !== tag) this.error(`Mismatched closing tag: expected </${tag}> but got </${closeTag}>`);
    }

    if (isComponent) return { kind: 'component', name: tag, props: attrs, children, selfClosing: false, loc };
    return { kind: 'element', tag, attrs, children, selfClosing: false, loc };
  }

  private parseVAttr(): VAttr {
    const t = this.peek();

    if (t.type === TokenType.AtBind) {
      this.advance();
      this.expect(TokenType.Assign, '@bind value');
      return { name: 'bind', value: this.parseAttrExpr(), isEvent: false, isBind: true };
    }

    if (t.type === TokenType.At) {
      this.advance();
      const nameTok = this.expect(TokenType.Identifier, 'event name');
      let name = nameTok.value;
      let modifier: string | undefined;
      const dotIdx = name.indexOf('.');
      if (dotIdx >= 0) { modifier = name.slice(dotIdx + 1); name = name.slice(0, dotIdx); }

      this.expect(TokenType.Assign, 'event handler');
      const handlerName = this.expect(TokenType.Identifier, 'event handler name');
      let eventArgs: Expr[] | undefined;
      if (this.check(TokenType.LParen)) {
        this.advance();
        eventArgs = [];
        while (!this.check(TokenType.RParen) && !this.check(TokenType.EOF)) {
          eventArgs.push(this.parseExpr());
          if (!this.check(TokenType.RParen)) this.expect(TokenType.Comma, 'event args');
        }
        this.expect(TokenType.RParen, 'event args');
      }
      const handler: Identifier = { kind: 'identifier', name: handlerName.value, loc: { line: handlerName.line, column: handlerName.column } };
      return { name, value: handler, isEvent: true, isBind: false, modifier, eventArgs };
    }

    const nameTok = this.expect(TokenType.Identifier, 'attribute name');
    // := binding syntax: propName:={expr}
    if (this.check(TokenType.Colon) && this.peekAt(1).type === TokenType.Assign) {
      this.advance(); // consume :
      this.advance(); // consume =
      if (this.check(TokenType.LBrace)) {
        this.advance();
        const expr = this.parseExpr();
        this.expect(TokenType.RBrace, 'binding expression');
        return { name: nameTok.value, value: expr, isEvent: false, isBind: false, isBinding: true };
      }
      return { name: nameTok.value, value: this.parseAttrExpr(), isEvent: false, isBind: false, isBinding: true };
    }
    if (this.match(TokenType.Assign)) {
      if (this.check(TokenType.LBrace)) {
        this.advance();
        const expr = this.parseExpr();
        this.expect(TokenType.RBrace, 'attr expression');
        return { name: nameTok.value, value: expr, isEvent: false, isBind: false };
      }
      if (this.check(TokenType.String)) {
        const s = this.advance();
        return { name: nameTok.value, value: { kind: 'literal', value: s.value, type: 'string', loc: { line: s.line, column: s.column } }, isEvent: false, isBind: false };
      }
      return { name: nameTok.value, value: this.parseAttrExpr(), isEvent: false, isBind: false };
    }
    return { name: nameTok.value, value: null, isEvent: false, isBind: false };
  }

  private parseAttrExpr(): Expr {
    if (this.check(TokenType.LBrace)) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TokenType.RBrace, 'attr expression');
      return expr;
    }
    const t = this.advance();
    return { kind: 'identifier', name: t.value, loc: { line: t.line, column: t.column } };
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

  // Expressions (Pratt parser)

  parseExpr(minPrec = 0): Expr {
    let left = this.parseUnary();

    while (true) {
      const t = this.peek();

      if (t.type === TokenType.Question && minPrec <= 1) {
        this.advance();
        const then = this.parseExpr(0);
        this.expect(TokenType.Colon, 'ternary else');
        const else_ = this.parseExpr(1);
        left = { kind: 'ternary', condition: left, then, else_, loc: left.loc };
        continue;
      }

      if (t.type === TokenType.DotDot && minPrec <= 2) {
        this.advance();
        const end = this.parseExpr(3);
        left = { kind: 'range', start: left, end, loc: left.loc };
        continue;
      }

      const prec = this.getBinaryPrec(t);
      if (prec >= 0 && prec >= minPrec) {
        this.advance();
        const right = this.parseExpr(prec + 1);
        left = { kind: 'binary', op: t.value, left, right, loc: left.loc };
        continue;
      }

      if (t.type === TokenType.LParen && minPrec <= 12) {
        this.advance();
        const args: Expr[] = [];
        while (!this.check(TokenType.RParen) && !this.check(TokenType.EOF)) {
          if (this.check(TokenType.Pipe)) args.push(this.parseLambda());
          else args.push(this.parseExpr());
          if (!this.check(TokenType.RParen)) this.expect(TokenType.Comma, 'function args');
        }
        this.expect(TokenType.RParen, 'function call');
        left = { kind: 'call', callee: left, args, loc: left.loc };
        continue;
      }

      if (t.type === TokenType.Dot && minPrec <= 12) {
        this.advance();
        left = { kind: 'member', object: left, property: this.expect(TokenType.Identifier, 'member access').value, loc: left.loc };
        continue;
      }

      if (t.type === TokenType.LBracket && minPrec <= 12) {
        this.advance();
        const index = this.parseExpr();
        this.expect(TokenType.RBracket, 'index access');
        left = { kind: 'index', object: left, index, loc: left.loc };
        continue;
      }

      break;
    }
    return left;
  }

  private getBinaryPrec(t: Token): number {
    switch (t.type) {
      case TokenType.Or: return 3;
      case TokenType.And: return 4;
      case TokenType.Eq: case TokenType.Neq: return 5;
      case TokenType.Lt: case TokenType.Gt: case TokenType.Gte: return 6;
      case TokenType.SignalAssign: return this.inStatementContext ? -1 : 6;
      case TokenType.Plus: case TokenType.Minus: return 7;
      case TokenType.Star: case TokenType.Slash: case TokenType.Percent: return 8;
      default: return -1;
    }
  }

  private parseUnary(): Expr {
    const loc = this.loc();
    if (this.peek().type === TokenType.Not) { this.advance(); return { kind: 'unary', op: '!', operand: this.parseUnary(), loc }; }
    if (this.peek().type === TokenType.Minus) { this.advance(); return { kind: 'unary', op: '-', operand: this.parseUnary(), loc }; }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    const loc = this.loc();

    if (t.type === TokenType.Number) {
      this.advance();
      return { kind: 'literal', value: t.value.includes('.') ? parseFloat(t.value) : parseInt(t.value, 10), type: 'number', loc };
    }
    if (t.type === TokenType.String) { this.advance(); return { kind: 'literal', value: t.value, type: 'string', loc }; }
    if (t.type === TokenType.True) { this.advance(); return { kind: 'literal', value: true, type: 'boolean', loc }; }
    if (t.type === TokenType.False) { this.advance(); return { kind: 'literal', value: false, type: 'boolean', loc }; }
    if (t.type === TokenType.LParen) { this.advance(); const expr = this.parseExpr(); this.expect(TokenType.RParen, 'parenthesized expression'); return expr; }
    if (t.type === TokenType.LBracket) return this.parseArrayExpr();
    if (t.type === TokenType.LBrace) return this.parseObjectExpr();
    if (t.type === TokenType.Spread) { this.advance(); return { kind: 'spread', expr: this.parseExpr(12), loc }; }
    if (t.type === TokenType.Pipe) return this.parseLambda();
    if (t.type === TokenType.Identifier) { this.advance(); return { kind: 'identifier', name: t.value, loc }; }

    this.error(`Unexpected token '${t.value}' (${t.type}) in expression`);
  }

  private parseArrayExpr(): ArrayExpr {
    const loc = this.loc();
    this.expect(TokenType.LBracket);
    const elements: Expr[] = [];
    while (!this.check(TokenType.RBracket) && !this.check(TokenType.EOF)) {
      if (this.check(TokenType.Spread)) elements.push(this.parsePrimary());
      else elements.push(this.parseExpr());
      if (!this.check(TokenType.RBracket)) this.expect(TokenType.Comma, 'array elements');
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
      properties.push({ key, value: this.parseExpr() });
      if (!this.check(TokenType.RBrace)) this.expect(TokenType.Comma, 'object properties');
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
      if (!this.check(TokenType.Pipe)) this.expect(TokenType.Comma, 'lambda params');
    }
    this.expect(TokenType.Pipe, 'lambda body');
    return { kind: 'lambda', params, body: this.parseExpr(), loc };
  }
}
