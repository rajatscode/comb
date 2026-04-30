// compiler.ts — Pipeline: source → tokens → AST → verify → codegen → JS + static graph OR errors

import { tokenize } from './lexer.js';
import { parse, ParseError } from './parser.js';
import { verify, type CompileError, type CompileWarning } from './verify.js';
import { generate } from './codegen.js';
import type { Module } from './ast.js';
import type { StaticGraph } from './graph.js';

export type { CompileError, CompileWarning };

export interface CompileResult {
  js?: string;
  ast?: Module;
  modules?: Module[];
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

  // Build module registry for cross-module verification
  const moduleRegistry = new Map<string, Module>();
  for (const m of modules) moduleRegistry.set(m.name, m);

  // Verify and generate ALL modules
  const allErrors: CompileError[] = [];
  const allWarnings: CompileWarning[] = [];
  const jsChunks: string[] = [];
  let primaryGraph: StaticGraph | undefined;

  for (const mod of modules) {
    const result = verify(mod, moduleRegistry);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);

    if (result.errors.length === 0) {
      try {
        jsChunks.push(generate(mod, result.graph));
      } catch (e: any) {
        allErrors.push({ message: `Codegen error in ${mod.name}: ${e.message}`, line: 1, column: 1 });
      }
    }

    // Use last module's graph as primary (the "app" module)
    primaryGraph = result.graph;
  }

  if (allErrors.length > 0) {
    return { errors: allErrors, warnings: allWarnings, modules };
  }

  const js = jsChunks.join('\n\n');
  // Return last module as primary AST for backward compat
  const primaryMod = modules[modules.length - 1];
  return { js, ast: primaryMod, modules, graph: primaryGraph, errors: [], warnings: allWarnings };
}
