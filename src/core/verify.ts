// verify.ts — Verification pass: dependency extraction, resolution, cycle detection

import type { Module, Declaration, CombDecl, AlwaysBlock, AssertDecl, Expr, Statement, VNode } from './ast.js';
import type { StaticGraph, GraphNode, GraphEdge } from './graph.js';

export interface CompileError {
  message: string;
  line: number;
  column: number;
}

export interface CompileWarning {
  message: string;
  line: number;
  column: number;
}

export interface VerifyResult {
  graph: StaticGraph;
  errors: CompileError[];
  warnings: CompileWarning[];
}

type SymbolKind = 'signal' | 'comb' | 'enum' | 'input' | 'output';

export function verify(mod: Module, moduleRegistry?: Map<string, Module>): VerifyResult {
  const errors: CompileError[] = [];
  const warnings: CompileWarning[] = [];
  const symbols = new Map<string, SymbolKind>();
  const enumValues = new Set<string>(); // e.g. "Phase.Red"
  const builtins = new Set(['str', 'int', 'float', 'len', 'contains', 'append', 'push', 'pop', 'slice', 'map', 'filter', 'concat', 'Math', 'JSON', 'console', 'parseInt', 'parseFloat', 'toString']);

  // 1. Build symbol table
  for (const decl of mod.body) {
    if (decl.kind === 'input') symbols.set(decl.name, 'input');
    if (decl.kind === 'output') symbols.set(decl.name, 'output');
    if (decl.kind === 'signal') symbols.set(decl.name, 'signal');
    if (decl.kind === 'token') symbols.set(decl.name, 'signal'); // tokens are signals
    if (decl.kind === 'comb') symbols.set(decl.name, 'comb');
    if (decl.kind === 'enum') {
      symbols.set(decl.name, 'enum');
      for (const v of decl.variants) enumValues.add(`${decl.name}.${v}`);
    }
  }

  // Also collect always block event trigger params as local scope
  // (they're not module-level symbols but valid identifiers in their block)
  const eventParams = new Map<AlwaysBlock, Set<string>>();
  for (const decl of mod.body) {
    if (decl.kind === 'always') {
      eventParams.set(decl, new Set(decl.trigger.params));
    }
  }

  function isKnownIdentifier(name: string, localScope?: Set<string>): boolean {
    return symbols.has(name) || builtins.has(name) || enumValues.has(name) || (localScope?.has(name) ?? false);
  }

  // 2. Extract comb dependencies
  for (const decl of mod.body) {
    if (decl.kind === 'comb') {
      const deps = new Set<string>();
      collectDeps(decl.expr, deps, symbols, builtins, enumValues);
      decl.deps = [...deps];

      // Verify all referenced identifiers exist
      const allRefs = new Set<string>();
      collectAllIdentifiers(decl.expr, allRefs);
      for (const ref of allRefs) {
        if (!isKnownIdentifier(ref)) {
          errors.push({ message: `Undefined reference '${ref}' in comb '${decl.name}'`, line: decl.loc.line, column: decl.loc.column });
        }
      }
    }
  }

  // 2b. Extract assert dependencies
  for (const decl of mod.body) {
    if (decl.kind === 'assert') {
      const deps = new Set<string>();
      collectDeps(decl.expr, deps, symbols, builtins, enumValues);
      decl.deps = [...deps];

      const allRefs = new Set<string>();
      collectAllIdentifiers(decl.expr, allRefs);
      for (const ref of allRefs) {
        if (!isKnownIdentifier(ref)) {
          errors.push({ message: `Undefined reference '${ref}' in assert`, line: decl.loc.line, column: decl.loc.column });
        }
      }
    }
  }

  // 2c. Auto-detect single-signal sensitivity blocks:
  // always @(sigName) where sigName is a signal/comb → promote to sensitivity
  for (const decl of mod.body) {
    if (decl.kind === 'always' && decl.triggerKind === 'event' && decl.trigger.params.length === 0) {
      const name = decl.trigger.name;
      if (symbols.has(name) && isReactiveKind(symbols.get(name)!)) {
        decl.triggerKind = 'sensitivity';
        decl.trigger.signals = [name];
        decl.trigger.name = `sense_${name}`;
      }
    }
  }

  // 3. Extract always block reads/writes
  for (const decl of mod.body) {
    if (decl.kind === 'always') {
      const reads = new Set<string>();
      const writes = new Set<string>();
      const localScope = eventParams.get(decl) ?? new Set();
      collectAlwaysReadsWrites(decl.body, reads, writes, symbols, localScope);
      decl.reads = [...reads];
      decl.writes = [...writes];

      // Verify all written targets are writable (signals or outputs, not inputs or combs)
      for (const w of writes) {
        if (!symbols.has(w)) {
          errors.push({ message: `Undefined signal '${w}' written in always @(${decl.trigger.name})`, line: decl.loc.line, column: decl.loc.column });
        } else {
          const kind = symbols.get(w)!;
          if (kind === 'comb') {
            errors.push({ message: `Cannot write to '${w}' (comb) in always @(${decl.trigger.name}) — only signals can be assigned`, line: decl.loc.line, column: decl.loc.column });
          } else if (kind === 'input') {
            errors.push({ message: `Cannot write to '${w}' (input) in always @(${decl.trigger.name}) — inputs are read-only`, line: decl.loc.line, column: decl.loc.column });
          } else if (kind !== 'signal' && kind !== 'output') {
            errors.push({ message: `Cannot write to '${w}' (${kind}) in always @(${decl.trigger.name}) — only signals can be assigned`, line: decl.loc.line, column: decl.loc.column });
          }
        }
      }

      // Verify all read identifiers exist
      for (const r of reads) {
        if (!isKnownIdentifier(r, localScope)) {
          errors.push({ message: `Undefined reference '${r}' in always @(${decl.trigger.name})`, line: decl.loc.line, column: decl.loc.column });
        }
      }

      // Sensitivity-specific validation
      if (decl.triggerKind === 'sensitivity' && decl.trigger.signals) {
        const sensList = new Set(decl.trigger.signals);

        // All declared sensitivity signals must exist as signals or combs
        for (const sig of sensList) {
          if (!symbols.has(sig)) {
            errors.push({ message: `Undefined signal '${sig}' in sensitivity list @(${decl.trigger.signals.join(', ')})`, line: decl.loc.line, column: decl.loc.column });
          } else if (!isReactiveKind(symbols.get(sig)!)) {
            errors.push({ message: `'${sig}' is not a signal or comb — cannot appear in sensitivity list`, line: decl.loc.line, column: decl.loc.column });
          }
        }

        // Reads must be subset of sensitivity list
        for (const r of reads) {
          if (symbols.has(r) && isReactiveKind(symbols.get(r)!) && !sensList.has(r)) {
            errors.push({ message: `Read of '${r}' not declared in sensitivity list @(${decl.trigger.signals.join(', ')})`, line: decl.loc.line, column: decl.loc.column });
          }
        }

        // Writes must not overlap sensitivity list (no self-triggering)
        for (const w of writes) {
          if (sensList.has(w)) {
            errors.push({ message: `Cannot write to '${w}' — it appears in its own sensitivity list (would self-trigger)`, line: decl.loc.line, column: decl.loc.column });
          }
        }
      }
    }
  }

  // 4. Cycle detection among combs
  const combDeps = new Map<string, string[]>();
  for (const decl of mod.body) {
    if (decl.kind === 'comb') {
      combDeps.set(decl.name, decl.deps.filter(d => symbols.get(d) === 'comb'));
    }
  }

  const cycleError = detectCycles(combDeps);
  if (cycleError) {
    errors.push({ message: cycleError, line: 1, column: 1 });
  }

  // 5. Build static graph
  const graph = buildGraph(mod, symbols);

  return { graph, errors, warnings };
}

// Collect identifiers that resolve to signals or combs (dependencies)
function isReactiveKind(kind: SymbolKind): boolean {
  return kind === 'signal' || kind === 'comb' || kind === 'input' || kind === 'output';
}

function collectDeps(expr: Expr, deps: Set<string>, symbols: Map<string, SymbolKind>, builtins: Set<string>, enumValues: Set<string>): void {
  walkExpr(expr, e => {
    if (e.kind === 'identifier' && symbols.has(e.name) && isReactiveKind(symbols.get(e.name)!)) {
      deps.add(e.name);
    }
  });
}

// Collect ALL identifiers (for undefined reference checking)
function collectAllIdentifiers(expr: Expr, ids: Set<string>): void {
  walkExpr(expr, e => {
    if (e.kind === 'identifier') ids.add(e.name);
  });
}

// Collect reads and writes in always block statements
function collectAlwaysReadsWrites(
  stmts: Statement[],
  reads: Set<string>,
  writes: Set<string>,
  symbols: Map<string, SymbolKind>,
  localScope: Set<string>,
): void {
  for (const stmt of stmts) {
    if (stmt.kind === 'assign') {
      // LHS target is a write
      if (stmt.target.kind === 'identifier') writes.add(stmt.target.name);
      else if (stmt.target.kind === 'member') collectMemberReads(stmt.target, reads, symbols);
      else if (stmt.target.kind === 'index') {
        walkExpr(stmt.target, e => { if (e.kind === 'identifier' && symbols.has(e.name)) reads.add(e.name); });
      }
      // RHS value contains reads
      walkExpr(stmt.value, e => {
        if (e.kind === 'identifier' && (symbols.has(e.name) || localScope.has(e.name)) && !writes.has(e.name)) {
          if (symbols.has(e.name)) reads.add(e.name);
        }
      });
      // Actually, always collect reads from RHS regardless
      walkExpr(stmt.value, e => {
        if (e.kind === 'identifier' && symbols.has(e.name) && isReactiveKind(symbols.get(e.name)!)) {
          reads.add(e.name);
        }
      });
    }
    if (stmt.kind === 'if') {
      walkExpr(stmt.condition, e => {
        if (e.kind === 'identifier' && symbols.has(e.name) && isReactiveKind(symbols.get(e.name)!)) {
          reads.add(e.name);
        }
      });
      collectAlwaysReadsWrites(stmt.then, reads, writes, symbols, localScope);
      if (stmt.else_) collectAlwaysReadsWrites(stmt.else_, reads, writes, symbols, localScope);
    }
    if (stmt.kind === 'expr_stmt') {
      walkExpr(stmt.expr, e => {
        if (e.kind === 'identifier' && symbols.has(e.name) && isReactiveKind(symbols.get(e.name)!)) {
          reads.add(e.name);
        }
      });
    }
  }
}

function collectMemberReads(expr: Expr, reads: Set<string>, symbols: Map<string, SymbolKind>): void {
  if (expr.kind === 'member') {
    if (expr.object.kind === 'identifier' && symbols.has(expr.object.name)) {
      reads.add(expr.object.name);
    } else {
      collectMemberReads(expr.object, reads, symbols);
    }
  }
}

// Cycle detection via topological sort
function detectCycles(deps: Map<string, string[]>): string | null {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): string | null {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat(node);
      return `Circular dependency detected: ${cycle.join(' → ')}`;
    }
    if (visited.has(node)) return null;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const dep of deps.get(node) ?? []) {
      const err = dfs(dep, path);
      if (err) return err;
    }

    path.pop();
    inStack.delete(node);
    return null;
  }

  for (const node of deps.keys()) {
    const err = dfs(node, []);
    if (err) return err;
  }
  return null;
}

// Build the static graph from verified module
function buildGraph(mod: Module, symbols: Map<string, SymbolKind>): StaticGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let assertIdx = 0;

  for (const decl of mod.body) {
    if (decl.kind === 'input') {
      nodes.push({ id: decl.name, name: decl.name, type: 'signal' });
    }
    if (decl.kind === 'output') {
      nodes.push({ id: decl.name, name: decl.name, type: 'signal' });
    }
    if (decl.kind === 'signal') {
      nodes.push({ id: decl.name, name: decl.name, type: 'signal' });
    }
    if (decl.kind === 'token') {
      nodes.push({ id: decl.name, name: decl.name, type: 'signal', isToken: true });
    }
    if (decl.kind === 'comb') {
      nodes.push({ id: decl.name, name: decl.name, type: 'comb' });
      for (const dep of decl.deps) {
        edges.push({ from: dep, to: decl.name, type: 'data' });
      }
    }
    if (decl.kind === 'always') {
      if (decl.triggerKind === 'sensitivity' && decl.trigger.signals) {
        // Sensitivity block: signals → sensitivity node → written signals
        const sensId = `sense:${decl.trigger.signals.join(',')}`;
        nodes.push({ id: sensId, name: decl.trigger.signals.join(', '), type: 'sensitivity' });
        for (const sig of decl.trigger.signals) {
          edges.push({ from: sig, to: sensId, type: 'data' });
        }
        for (const w of decl.writes) {
          edges.push({ from: sensId, to: w, type: 'write' });
        }
      } else {
        const eventId = `event:${decl.trigger.name}`;
        nodes.push({ id: eventId, name: decl.trigger.name, type: 'event' });
        for (const w of decl.writes) {
          edges.push({ from: eventId, to: w, type: 'write' });
        }
      }
    }
    if (decl.kind === 'assert') {
      const assertId = `assert:${assertIdx++}`;
      nodes.push({ id: assertId, name: assertId, type: 'assert' });
      for (const dep of decl.deps) {
        edges.push({ from: dep, to: assertId, type: 'data' });
      }
    }
    if (decl.kind === 'view') {
      const viewBindings = new Set<string>();
      collectViewBindings(decl.children, viewBindings, symbols);
      if (viewBindings.size > 0) {
        const viewId = 'view';
        nodes.push({ id: viewId, name: 'view', type: 'view-binding' });
        for (const b of viewBindings) {
          edges.push({ from: b, to: viewId, type: 'data' });
        }
      }
    }
  }

  return { nodes, edges };
}

function collectViewBindings(vnodes: VNode[], bindings: Set<string>, symbols: Map<string, SymbolKind>): void {
  for (const vn of vnodes) {
    if (vn.kind === 'expr') {
      walkExpr(vn.expr, e => {
        if (e.kind === 'identifier' && symbols.has(e.name)) bindings.add(e.name);
      });
    }
    if (vn.kind === 'element' || vn.kind === 'component') {
      const children = vn.kind === 'element' ? vn.children : vn.children;
      const attrs = vn.kind === 'element' ? vn.attrs : vn.props;
      for (const attr of attrs) {
        if (attr.value) {
          walkExpr(attr.value, e => {
            if (e.kind === 'identifier' && symbols.has(e.name)) bindings.add(e.name);
          });
        }
        if (attr.eventArgs) {
          for (const arg of attr.eventArgs) {
            walkExpr(arg, e => {
              if (e.kind === 'identifier' && symbols.has(e.name)) bindings.add(e.name);
            });
          }
        }
      }
      collectViewBindings(children, bindings, symbols);
    }
    if (vn.kind === 'if') {
      walkExpr(vn.condition, e => {
        if (e.kind === 'identifier' && symbols.has(e.name)) bindings.add(e.name);
      });
      collectViewBindings(vn.then, bindings, symbols);
      if (vn.else_) collectViewBindings(vn.else_, bindings, symbols);
    }
    if (vn.kind === 'for') {
      walkExpr(vn.iterable, e => {
        if (e.kind === 'identifier' && symbols.has(e.name)) bindings.add(e.name);
      });
      collectViewBindings(vn.body, bindings, symbols);
    }
  }
}

// Walk all sub-expressions
function walkExpr(expr: Expr, fn: (e: Expr) => void): void {
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
    case 'object': expr.properties.forEach(p => walkExpr(p.value, fn)); break;
    case 'template': expr.parts.forEach(p => { if (typeof p !== 'string') walkExpr(p, fn); }); break;
  }
}
