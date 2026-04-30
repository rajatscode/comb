// ast.ts — AST type definitions for the Comb language

export interface SourceLoc {
  line: number;
  column: number;
}

// Top-level

export interface Module {
  kind: 'module';
  name: string;
  params: Param[];
  body: Declaration[];
  loc: SourceLoc;
}

export interface Param {
  name: string;
  type: TypeExpr;
}

// Declarations

export type Declaration =
  | SignalDecl
  | CombDecl
  | AlwaysBlock
  | ViewBlock
  | EnumDecl
  | AssertDecl;

export interface SignalDecl {
  kind: 'signal';
  name: string;
  type: TypeExpr;
  initial: Expr;
  loc: SourceLoc;
}

export interface CombDecl {
  kind: 'comb';
  name: string;
  expr: Expr;
  deps: string[]; // filled by verification pass
  loc: SourceLoc;
}

export interface AlwaysBlock {
  kind: 'always';
  trigger: EventTrigger;
  body: Statement[];
  reads: string[];  // filled by verification pass
  writes: string[]; // filled by verification pass
  loc: SourceLoc;
}

export interface ViewBlock {
  kind: 'view';
  children: VNode[];
  loc: SourceLoc;
}

export interface EnumDecl {
  kind: 'enum';
  name: string;
  variants: string[];
  loc: SourceLoc;
}

export interface AssertDecl {
  kind: 'assert';
  mode: 'always' | 'once';
  expr: Expr;
  deps: string[]; // filled by verification pass
  loc: SourceLoc;
}

export interface EventTrigger {
  name: string;
  params: string[];
}

// Statements

export type Statement =
  | SignalAssign
  | IfStatement
  | ExprStatement;

export interface SignalAssign {
  kind: 'assign';
  target: Expr;
  value: Expr;
  loc: SourceLoc;
}

export interface IfStatement {
  kind: 'if';
  condition: Expr;
  then: Statement[];
  else_?: Statement[];
  loc: SourceLoc;
}

export interface ExprStatement {
  kind: 'expr_stmt';
  expr: Expr;
  loc: SourceLoc;
}

// View nodes

export type VNode =
  | VElement
  | VText
  | VExpr
  | VIf
  | VFor
  | VComponent;

export interface VElement {
  kind: 'element';
  tag: string;
  attrs: VAttr[];
  children: VNode[];
  selfClosing: boolean;
  loc: SourceLoc;
}

export interface VText {
  kind: 'text';
  value: string;
  loc: SourceLoc;
}

export interface VExpr {
  kind: 'expr';
  expr: Expr;
  loc: SourceLoc;
}

export interface VIf {
  kind: 'if';
  condition: Expr;
  then: VNode[];
  else_?: VNode[];
  loc: SourceLoc;
}

export interface VFor {
  kind: 'for';
  variable: string;
  iterable: Expr;
  body: VNode[];
  loc: SourceLoc;
}

export interface VComponent {
  kind: 'component';
  name: string;
  props: VAttr[];
  children: VNode[];
  selfClosing: boolean;
  loc: SourceLoc;
}

export interface VAttr {
  name: string;
  value: Expr | null;
  isEvent: boolean;
  isBind: boolean;
  modifier?: string;
  eventArgs?: Expr[];
}

// Expressions

export type Expr =
  | Literal
  | Identifier
  | BinaryExpr
  | UnaryExpr
  | TernaryExpr
  | CallExpr
  | MemberExpr
  | IndexExpr
  | ArrayExpr
  | ObjectExpr
  | SpreadExpr
  | LambdaExpr
  | RangeExpr
  | TemplateExpr;

export interface Literal {
  kind: 'literal';
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  loc: SourceLoc;
}

export interface Identifier {
  kind: 'identifier';
  name: string;
  loc: SourceLoc;
}

export interface BinaryExpr {
  kind: 'binary';
  op: string;
  left: Expr;
  right: Expr;
  loc: SourceLoc;
}

export interface UnaryExpr {
  kind: 'unary';
  op: string;
  operand: Expr;
  loc: SourceLoc;
}

export interface TernaryExpr {
  kind: 'ternary';
  condition: Expr;
  then: Expr;
  else_: Expr;
  loc: SourceLoc;
}

export interface CallExpr {
  kind: 'call';
  callee: Expr;
  args: Expr[];
  loc: SourceLoc;
}

export interface MemberExpr {
  kind: 'member';
  object: Expr;
  property: string;
  loc: SourceLoc;
}

export interface IndexExpr {
  kind: 'index';
  object: Expr;
  index: Expr;
  loc: SourceLoc;
}

export interface ArrayExpr {
  kind: 'array';
  elements: Expr[];
  loc: SourceLoc;
}

export interface ObjectExpr {
  kind: 'object';
  properties: { key: string; value: Expr }[];
  loc: SourceLoc;
}

export interface SpreadExpr {
  kind: 'spread';
  expr: Expr;
  loc: SourceLoc;
}

export interface LambdaExpr {
  kind: 'lambda';
  params: string[];
  body: Expr;
  loc: SourceLoc;
}

export interface RangeExpr {
  kind: 'range';
  start: Expr;
  end: Expr;
  loc: SourceLoc;
}

export interface TemplateExpr {
  kind: 'template';
  parts: (string | Expr)[];
  loc: SourceLoc;
}

// Types

export type TypeExpr =
  | SimpleType
  | ArrayType
  | ObjectType;

export interface SimpleType {
  kind: 'simple';
  name: string;
}

export interface ArrayType {
  kind: 'array';
  element: TypeExpr;
}

export interface ObjectType {
  kind: 'object';
  fields: { name: string; type: TypeExpr }[];
}
