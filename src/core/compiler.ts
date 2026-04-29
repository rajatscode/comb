// compiler.ts — Pipeline orchestrator: source → tokens → AST → JavaScript
// PURE FUNCTION: no IO, no fs, no side effects. Runs in the browser.

import { tokenize } from './lexer.js';
import { parse, ParseError } from './parser.js';
import { generate } from './codegen.js';
import type { Module } from './ast.js';

// ============================================================
// Public types
// ============================================================

export interface CompileResult {
  js: string;
  modules: Module[];
  errors: CompileError[];
  graphMetadata: GraphMetadata;
}

export interface CompileError {
  message: string;
  line: number;
  column: number;
}

export interface GraphMetadata {
  signals: { name: string; type: string; deps: string[] }[];
  combs: { name: string; deps: string[] }[];
  events: { name: string; writes: string[] }[];
}

// ============================================================
// Compile
// ============================================================

export function compile(source: string): CompileResult {
  const errors: CompileError[] = [];

  // Tokenize
  let tokens;
  try {
    tokens = tokenize(source);
  } catch (e: any) {
    return {
      js: '',
      modules: [],
      errors: [{ message: e.message, line: e.line ?? 1, column: e.column ?? 1 }],
      graphMetadata: { signals: [], combs: [], events: [] },
    };
  }

  // Parse
  let modules: Module[];
  try {
    modules = parse(tokens);
  } catch (e: any) {
    if (e instanceof ParseError) {
      return {
        js: '',
        modules: [],
        errors: [{ message: e.message, line: e.line, column: e.column }],
        graphMetadata: { signals: [], combs: [], events: [] },
      };
    }
    return {
      js: '',
      modules: [],
      errors: [{ message: String(e), line: 1, column: 1 }],
      graphMetadata: { signals: [], combs: [], events: [] },
    };
  }

  // Generate
  let js: string;
  try {
    js = generate(modules);
  } catch (e: any) {
    return {
      js: '',
      modules,
      errors: [{ message: `Codegen error: ${e.message}`, line: 1, column: 1 }],
      graphMetadata: extractGraphMetadata(modules),
    };
  }

  return {
    js,
    modules,
    errors,
    graphMetadata: extractGraphMetadata(modules),
  };
}

// ============================================================
// Graph metadata extraction
// ============================================================

function extractGraphMetadata(modules: Module[]): GraphMetadata {
  const signals: GraphMetadata['signals'] = [];
  const combs: GraphMetadata['combs'] = [];
  const events: GraphMetadata['events'] = [];

  for (const mod of modules) {
    for (const decl of mod.body) {
      if (decl.kind === 'signal') {
        signals.push({
          name: decl.name,
          type: typeToString(decl.type),
          deps: [],
        });
      }
      if (decl.kind === 'comb') {
        combs.push({
          name: decl.name,
          deps: collectIdentifiers(decl.expr),
        });
      }
      if (decl.kind === 'always') {
        const writes: string[] = [];
        collectWrites(decl.body, writes);
        events.push({
          name: decl.trigger.name,
          writes,
        });
      }
    }
  }

  return { signals, combs, events };
}

function typeToString(type: import('./ast.js').TypeExpr): string {
  if (type.kind === 'simple') return type.name;
  if (type.kind === 'array') return typeToString(type.element) + '[]';
  if (type.kind === 'object') {
    const fields = type.fields.map(f => `${f.name}: ${typeToString(f.type)}`).join(', ');
    return `{ ${fields} }`;
  }
  return 'unknown';
}

function collectIdentifiers(expr: import('./ast.js').Expr): string[] {
  const ids = new Set<string>();
  walkExpr(expr, e => {
    if (e.kind === 'identifier') ids.add(e.name);
  });
  return [...ids];
}

function collectWrites(stmts: import('./ast.js').Statement[], writes: string[]): void {
  for (const stmt of stmts) {
    if (stmt.kind === 'assign' && stmt.target.kind === 'identifier') {
      if (!writes.includes(stmt.target.name)) writes.push(stmt.target.name);
    }
    if (stmt.kind === 'if') {
      collectWrites(stmt.then, writes);
      if (stmt.else_) collectWrites(stmt.else_, writes);
    }
  }
}

function walkExpr(expr: import('./ast.js').Expr, fn: (e: import('./ast.js').Expr) => void): void {
  fn(expr);
  switch (expr.kind) {
    case 'binary': walkExpr(expr.left, fn); walkExpr(expr.right, fn); break;
    case 'unary': walkExpr(expr.operand, fn); break;
    case 'ternary': walkExpr(expr.condition, fn); walkExpr(expr.then, fn); walkExpr(expr.else_, fn); break;
    case 'call': walkExpr(expr.callee, fn); expr.args.forEach(a => walkExpr(a, fn)); break;
    case 'member': walkExpr(expr.object, fn); break;
    case 'index': walkExpr(expr.object, fn); walkExpr(expr.index, fn); break;
    case 'array': expr.elements.forEach(e => walkExpr(e, fn)); break;
    case 'spread': walkExpr(expr.expr, fn); break;
    case 'lambda': walkExpr(expr.body, fn); break;
    case 'range': walkExpr(expr.start, fn); walkExpr(expr.end, fn); break;
  }
}
