// verify.ts — Verification pass: dependency extraction, resolution, cycle detection

import type { Module, Declaration, CombDecl, AlwaysBlock, AssertDecl, ConstraintDecl, Expr, Statement, VNode } from './ast.js';
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

type SymbolKind = 'signal' | 'comb' | 'enum' | 'input' | 'output' | 'cell';

export function verify(mod: Module, moduleRegistry?: Map<string, Module>): VerifyResult {
  const errors: CompileError[] = [];
  const warnings: CompileWarning[] = [];
  const symbols = new Map<string, SymbolKind>();
  const enumValues = new Set<string>(); // e.g. "Phase.Red"
  const builtins = new Set(['str', 'int', 'float', 'len', 'contains', 'append', 'push', 'pop', 'slice', 'map', 'filter', 'concat', 'Math', 'JSON', 'console', 'parseInt', 'parseFloat', 'toString', 'rgbToHsv', 'hsvToRgb', 'rgbToHex']);

  // Track user-defined functions: name → param count
  const userFunctions = new Map<string, number>();

  // 1. Build symbol table
  for (const decl of mod.body) {
    if (decl.kind === 'input') symbols.set(decl.name, 'input');
    if (decl.kind === 'output') symbols.set(decl.name, 'output');
    if (decl.kind === 'signal') symbols.set(decl.name, 'signal');
    if (decl.kind === 'token') symbols.set(decl.name, 'signal'); // tokens are signals
    if (decl.kind === 'comb') symbols.set(decl.name, 'comb');
    if (decl.kind === 'cell') symbols.set(decl.name, 'cell');
    if (decl.kind === 'enum') {
      symbols.set(decl.name, 'enum');
      for (const v of decl.variants) enumValues.add(`${decl.name}.${v}`);
    }
    if (decl.kind === 'fn') {
      userFunctions.set(decl.name, decl.params.length);
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
    return symbols.has(name) || builtins.has(name) || enumValues.has(name) || userFunctions.has(name) || (localScope?.has(name) ?? false);
  }

  // 1b. Validate user-defined function call arg counts
  function validateCallArgCounts(expr: Expr, loc: { line: number; column: number }): void {
    walkExpr(expr, e => {
      if (e.kind === 'call' && e.callee.kind === 'identifier') {
        const name = e.callee.name;
        if (userFunctions.has(name)) {
          const expected = userFunctions.get(name)!;
          if (e.args.length !== expected) {
            errors.push({ message: `Function '${name}' expects ${expected} arguments but got ${e.args.length}`, line: loc.line, column: loc.column });
          }
        }
      }
    });
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

      // Validate function call arg counts
      validateCallArgCounts(decl.expr, decl.loc);
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
          } else if (kind !== 'signal' && kind !== 'output' && kind !== 'cell') {
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

  // 3b. Verify constraint clauses
  for (const decl of mod.body) {
    if (decl.kind === 'constraint') {
      for (const clause of decl.clauses) {
        // Verify all declared inputs exist and are cells
        for (const inp of clause.inputs) {
          if (!symbols.has(inp)) {
            errors.push({ message: `Undefined cell '${inp}' in constraint '${decl.name}' clause inputs`, line: decl.loc.line, column: decl.loc.column });
          } else if (symbols.get(inp) !== 'cell') {
            errors.push({ message: `'${inp}' is not a cell — constraint '${decl.name}' inputs must be cells`, line: decl.loc.line, column: decl.loc.column });
          }
        }

        // Collect reads and writes in clause body
        const reads = new Set<string>();
        const writes = new Set<string>();
        collectAlwaysReadsWrites(clause.body, reads, writes, symbols, new Set());

        // Verify reads are subset of declared inputs
        const inputSet = new Set(clause.inputs);
        for (const r of reads) {
          if (symbols.has(r) && isReactiveKind(symbols.get(r)!) && !inputSet.has(r)) {
            errors.push({ message: `Read of '${r}' not declared in constraint '${decl.name}' clause inputs (${clause.inputs.join(', ')})`, line: decl.loc.line, column: decl.loc.column });
          }
        }

        // Verify write targets are cells
        for (const w of writes) {
          if (!symbols.has(w)) {
            errors.push({ message: `Undefined cell '${w}' written in constraint '${decl.name}'`, line: decl.loc.line, column: decl.loc.column });
          } else if (symbols.get(w) !== 'cell') {
            errors.push({ message: `'${w}' is not a cell — constraint '${decl.name}' can only write to cells`, line: decl.loc.line, column: decl.loc.column });
          }
        }

        // Verify no clause writes to its own inputs (no self-triggering)
        for (const w of writes) {
          if (inputSet.has(w)) {
            errors.push({ message: `Cannot write to '${w}' in constraint '${decl.name}' — it is a declared input of this clause (would self-trigger)`, line: decl.loc.line, column: decl.loc.column });
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
  return kind === 'signal' || kind === 'comb' || kind === 'input' || kind === 'output' || kind === 'cell';
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
    if (stmt.kind === 'return' && stmt.value) {
      walkExpr(stmt.value, e => {
        if (e.kind === 'identifier' && symbols.has(e.name) && isReactiveKind(symbols.get(e.name)!)) {
          reads.add(e.name);
        }
      });
    }
    if (stmt.kind === 'destructure') {
      walkExpr(stmt.value, e => {
        if (e.kind === 'identifier' && symbols.has(e.name) && isReactiveKind(symbols.get(e.name)!)) {
          reads.add(e.name);
        }
      });
      // Add destructured names to local scope
      if (stmt.pattern.kind === 'object') {
        for (const f of stmt.pattern.fields) localScope.add(f.alias ?? f.key);
      } else {
        for (const el of stmt.pattern.elements) localScope.add(el);
        if (stmt.pattern.rest) localScope.add(stmt.pattern.rest);
      }
    }
    if (stmt.kind === 'try') {
      collectAlwaysReadsWrites(stmt.body, reads, writes, symbols, localScope);
      if (stmt.catchParam) localScope.add(stmt.catchParam);
      collectAlwaysReadsWrites(stmt.catchBody, reads, writes, symbols, localScope);
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
    if (decl.kind === 'cell') {
      nodes.push({ id: decl.name, name: decl.name, type: 'cell' });
    }
    if (decl.kind === 'constraint') {
      const constraintId = `constraint:${decl.name}`;
      nodes.push({ id: constraintId, name: decl.name, type: 'constraint' });
      // Bidirectional edges: collect all cells referenced across all clauses
      const allCells = new Set<string>();
      for (const clause of decl.clauses) {
        for (const inp of clause.inputs) allCells.add(inp);
        const writes = new Set<string>();
        collectAlwaysReadsWrites(clause.body, new Set(), writes, symbols, new Set());
        for (const w of writes) allCells.add(w);
      }
      for (const cell of allCells) {
        edges.push({ from: cell, to: constraintId, type: 'data' });
        edges.push({ from: constraintId, to: cell, type: 'write' });
      }
    }
    if (decl.kind === 'view') {
      const viewEffects: { id: string; deps: string[]; viewTarget: { element: string; binding: string } }[] = [];
      collectViewEffects(decl.children, 'root', viewEffects, symbols);
      for (const eff of viewEffects) {
        nodes.push({ id: eff.id, name: eff.id, type: 'view-effect', viewTarget: eff.viewTarget });
        for (const dep of eff.deps) {
          edges.push({ from: dep, to: eff.id, type: 'data' });
        }
      }
    }
  }

  return { nodes, edges };
}

function getElementDesc(vn: VNode): string {
  if (vn.kind === 'element') {
    let desc = vn.tag;
    for (const attr of vn.attrs) {
      if (attr.name === 'id' && attr.value?.kind === 'literal' && attr.value.type === 'string') {
        return `${desc}#${attr.value.value}`;
      }
      if (attr.name === 'class' && attr.value?.kind === 'literal' && attr.value.type === 'string') {
        const cls = String(attr.value.value).split(/\s+/)[0];
        if (cls) desc += `.${cls}`;
      }
    }
    return desc;
  }
  if (vn.kind === 'component') return vn.name;
  return 'root';
}

function primaryReactiveName(expr: Expr, symbols: Map<string, SymbolKind>): string {
  if (expr.kind === 'identifier' && symbols.has(expr.name) && isReactiveKind(symbols.get(expr.name)!)) return expr.name;
  if (expr.kind === 'call' && expr.callee.kind === 'identifier') return expr.callee.name;
  if (expr.kind === 'binary') return primaryReactiveName(expr.left, symbols) || primaryReactiveName(expr.right, symbols);
  if (expr.kind === 'unary') return primaryReactiveName(expr.operand, symbols);
  if (expr.kind === 'ternary') return primaryReactiveName(expr.condition, symbols);
  if (expr.kind === 'member') return primaryReactiveName(expr.object, symbols);
  return '';
}

function exprHasReactive(expr: Expr, symbols: Map<string, SymbolKind>): boolean {
  let found = false;
  walkExpr(expr, e => { if (e.kind === 'identifier' && symbols.has(e.name) && isReactiveKind(symbols.get(e.name)!)) found = true; });
  return found;
}

function collectExprDeps(expr: Expr, symbols: Map<string, SymbolKind>): string[] {
  const deps = new Set<string>();
  walkExpr(expr, e => { if (e.kind === 'identifier' && symbols.has(e.name) && isReactiveKind(symbols.get(e.name)!)) deps.add(e.name); });
  return [...deps];
}

function collectViewEffects(
  vnodes: VNode[],
  parentDesc: string,
  effects: { id: string; deps: string[]; viewTarget: { element: string; binding: string } }[],
  symbols: Map<string, SymbolKind>,
): void {
  for (const vn of vnodes) {
    if (vn.kind === 'expr' && exprHasReactive(vn.expr, symbols)) {
      const deps = collectExprDeps(vn.expr, symbols);
      const name = primaryReactiveName(vn.expr, symbols) || deps[0] || 'expr';
      effects.push({ id: `view:${name}`, deps, viewTarget: { element: parentDesc, binding: 'text' } });
    }
    if (vn.kind === 'element') {
      const elDesc = getElementDesc(vn);
      for (const attr of vn.attrs) {
        if (attr.isBind && attr.value) {
          const deps = collectExprDeps(attr.value, symbols);
          if (deps.length > 0) {
            const name = primaryReactiveName(attr.value, symbols) || deps[0];
            effects.push({ id: `view:bind:${name}`, deps, viewTarget: { element: elDesc, binding: `bind:${attr.name}` } });
          }
        } else if (attr.value && !attr.isEvent && exprHasReactive(attr.value, symbols)) {
          const deps = collectExprDeps(attr.value, symbols);
          const name = primaryReactiveName(attr.value, symbols) || deps[0];
          effects.push({ id: `view:attr:${attr.name}`, deps, viewTarget: { element: elDesc, binding: `attr:${attr.name}` } });
        }
      }
      collectViewEffects(vn.children, elDesc, effects, symbols);
    }
    if (vn.kind === 'component') {
      const compDesc = getElementDesc(vn);
      collectViewEffects(vn.children, compDesc, effects, symbols);
    }
    if (vn.kind === 'if') {
      const condDeps = collectExprDeps(vn.condition, symbols);
      if (condDeps.length > 0) {
        const name = primaryReactiveName(vn.condition, symbols) || condDeps[0];
        effects.push({ id: `view:if:${name}`, deps: condDeps, viewTarget: { element: parentDesc, binding: 'if' } });
      }
      collectViewEffects(vn.then, parentDesc, effects, symbols);
      if (vn.else_) collectViewEffects(vn.else_, parentDesc, effects, symbols);
    }
    if (vn.kind === 'for') {
      const iterDeps = collectExprDeps(vn.iterable, symbols);
      if (iterDeps.length > 0) {
        const name = primaryReactiveName(vn.iterable, symbols) || iterDeps[0];
        effects.push({ id: `view:for:${name}`, deps: iterDeps, viewTarget: { element: parentDesc, binding: 'for' } });
      }
      collectViewEffects(vn.body, parentDesc, effects, symbols);
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
