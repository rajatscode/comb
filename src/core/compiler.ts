// compiler.ts — Pipeline: source → tokens → AST → verify → static graph OR errors

import { tokenize } from './lexer.js';
import { parse, ParseError } from './parser.js';
import { verify, type CompileError, type CompileWarning } from './verify.js';
import type { Module } from './ast.js';
import type { StaticGraph } from './graph.js';

export type { CompileError, CompileWarning };

export interface CompileResult {
  ast?: Module;
  graph?: StaticGraph;
  errors: CompileError[];
  warnings: CompileWarning[];
}

export function compile(source: string): CompileResult {
  // Tokenize
  let tokens;
  try {
    tokens = tokenize(source);
  } catch (e: any) {
    return { errors: [{ message: e.message, line: e.line ?? 1, column: e.column ?? 1 }], warnings: [] };
  }

  // Parse
  let modules: Module[];
  try {
    modules = parse(tokens);
  } catch (e: any) {
    if (e instanceof ParseError) {
      return { errors: [{ message: e.message, line: e.line, column: e.column }], warnings: [] };
    }
    return { errors: [{ message: String(e), line: 1, column: 1 }], warnings: [] };
  }

  if (modules.length === 0) {
    return { errors: [{ message: 'No module found', line: 1, column: 1 }], warnings: [] };
  }

  // Verify each module (typically one per file)
  const mod = modules[0];
  const result = verify(mod);

  if (result.errors.length > 0) {
    return { errors: result.errors, warnings: result.warnings };
  }

  return { ast: mod, graph: result.graph, errors: [], warnings: result.warnings };
}
