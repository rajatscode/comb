// codegen.ts — JavaScript code generator for verified Comb AST
// Emits readable ES module JavaScript targeting the Comb runtime API

import type {
  Module, Declaration, InputDecl, OutputDecl, SignalDecl, TokenDecl, CombDecl, CellDecl,
  ConstraintDecl, AlwaysBlock, ViewBlock, StyleBlock, EnumDecl, AssertDecl, TemporalAssertDecl, FnDecl,
  Statement, SignalAssign, IfStatement, ExprStatement, ReturnStmt, DestructureStmt, TryStmt,
  VNode, VElement, VText, VExpr, VIf, VFor,
  VComponent, VAttr, Expr,
} from './ast.js';
import type { StaticGraph } from './graph.js';

interface GenContext {
  moduleName: string;
  signals: Set<string>;
  combs: Set<string>;
  cells: Set<string>;
  params: Set<string>;
  inputs: Set<string>;
  outputs: Set<string>;
  enums: Map<string, string[]>;
  userFunctions: Set<string>;
  indent: number;
  elCount: number;
  txtCount: number;
  assertCount: number;
  temporalCount: number;
  scopeHash: string;
  hasStyle: boolean;
  constraintLocals?: Map<string, string>;
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 5);
}

function createContext(mod: Module): GenContext {
  const ctx: GenContext = {
    moduleName: mod.name,
    signals: new Set(),
    combs: new Set(),
    cells: new Set(),
    params: new Set(),
    inputs: new Set(),
    outputs: new Set(),
    enums: new Map(),
    userFunctions: new Set(),
    indent: 1,
    elCount: 0,
    txtCount: 0,
    assertCount: 0,
    temporalCount: 0,
    scopeHash: simpleHash(mod.name),
    hasStyle: mod.body.some(d => d.kind === 'style'),
  };
  for (const decl of mod.body) {
    if (decl.kind === 'input') { ctx.inputs.add(decl.name); ctx.signals.add(decl.name); }
    if (decl.kind === 'output') { ctx.outputs.add(decl.name); ctx.signals.add(decl.name); }
    if (decl.kind === 'signal') ctx.signals.add(decl.name);
    if (decl.kind === 'token') ctx.signals.add(decl.name); // tokens are reactive signals
    if (decl.kind === 'cell') { ctx.cells.add(decl.name); ctx.signals.add(decl.name); } // cells are reactive
    if (decl.kind === 'comb') ctx.combs.add(decl.name);
    if (decl.kind === 'enum') ctx.enums.set(decl.name, decl.variants);
    if (decl.kind === 'fn') ctx.userFunctions.add(decl.name);
  }
  for (const p of mod.params) ctx.params.add(p.name);
  return ctx;
}

function hasStyleBlock(ctx: GenContext): boolean { return ctx.hasStyle; }
function ind(ctx: GenContext): string { return '  '.repeat(ctx.indent); }
function nextEl(ctx: GenContext): string { return `el${ctx.elCount++}`; }
function nextTxt(ctx: GenContext): string { return `txt${ctx.txtCount++}`; }
function capitalize(s: string): string { return s[0].toUpperCase() + s.slice(1); }
function escapeStr(s: string): string { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n'); }

export function generate(mod: Module, graph: StaticGraph): string {
  const ctx = createContext(mod);
  const lines: string[] = [];

  // Imports
  const hasCells = mod.body.some(d => d.kind === 'cell');
  const hasConstraints = mod.body.some(d => d.kind === 'constraint');
  const hasEdgeTriggers = mod.body.some(d => d.kind === 'always' && (d.triggerKind === 'posedge' || d.triggerKind === 'negedge'));
  const hasTemporalAsserts = mod.body.some(d => d.kind === 'temporal_assert');
  const importParts = ['createSignal', 'createComb', 'createEffect', 'batch', 'createScope', 'circuit'];
  if (hasCells) importParts.push('createCell');
  if (hasConstraints) importParts.push('createPropagator');
  if (hasEdgeTriggers) importParts.push('createEdgeEffect');
  if (hasTemporalAsserts) importParts.push('createTemporalAssert');
  lines.push(`import { ${importParts.join(', ')} } from '../runtime/index.js';`);

  // Conditional color utility import
  const colorBuiltins = ['rgbToHsv', 'hsvToRgb', 'rgbToHex'];
  const src = JSON.stringify(mod);
  const usedColorFns = colorBuiltins.filter(fn => src.includes(fn));
  if (usedColorFns.length > 0) {
    lines.push(`import { ${usedColorFns.join(', ')} } from '../runtime/color.js';`);
  }
  lines.push('');

  // Static graph export
  lines.push(`export const __graph = ${JSON.stringify(graph, null, 2)};`);
  lines.push('');

  // Module factory function
  const hasInputs = ctx.inputs.size > 0;
  const hasOutputs = ctx.outputs.size > 0;
  const hasPorts = hasInputs || hasOutputs;
  const paramNames = mod.params.map(p => p.name);

  // Build signature: ModuleName(__props, root) or ModuleName(root)
  let sigParts: string[] = [];
  if (paramNames.length > 0) sigParts.push(`{ ${paramNames.join(', ')} }`);
  if (hasPorts) sigParts.push('__props');
  sigParts.push('root');
  lines.push(`export function ${mod.name}(${sigParts.join(', ')}) {`);
  if (hasPorts) lines.push(`  if (!__props) __props = {};`);
  lines.push(`  const $m = '${mod.name}';`);
  lines.push(`  circuit.loadStaticGraph(__graph);`);
  lines.push(`  const __scope = createScope();`);
  lines.push('');

  for (const decl of mod.body) {
    lines.push(...emitDecl(decl, ctx));
    lines.push('');
  }

  // Build return with ports
  if (hasPorts) {
    const portEntries: string[] = [];
    for (const name of ctx.inputs) {
      portEntries.push(`${name}: { set: set${capitalize(name)} }`);
    }
    for (const name of ctx.outputs) {
      portEntries.push(`${name}: { get: ${name}, set: set${capitalize(name)} }`);
    }
    lines.push(`  return { dispose: __scope.dispose, __ports: { ${portEntries.join(', ')} } };`);
  } else {
    lines.push('  return { dispose: __scope.dispose };');
  }
  lines.push('}');
  lines.push('');

  // __test export — headless factory with signal/comb access, no view
  lines.push(`export function __test() {`);
  lines.push(`  const $m = '${mod.name}';`);
  lines.push(`  circuit.loadStaticGraph(__graph);`);
  lines.push(`  const __scope = createScope();`);
  lines.push('');

  const signalNames: string[] = [];
  const combNames: string[] = [];
  const testCtx = { ...ctx, indent: 1, elCount: 0, txtCount: 0, assertCount: 0 };

  for (const decl of mod.body) {
    if (decl.kind === 'input' || decl.kind === 'output' || decl.kind === 'signal' || decl.kind === 'token' || decl.kind === 'comb' || decl.kind === 'cell' || decl.kind === 'constraint' || decl.kind === 'enum' || decl.kind === 'assert' || decl.kind === 'temporal_assert' || decl.kind === 'fn') {
      lines.push(...emitDecl(decl, testCtx));
      lines.push('');
      if (decl.kind === 'signal' || decl.kind === 'token' || decl.kind === 'input' || decl.kind === 'output' || decl.kind === 'cell') signalNames.push(decl.name);
      if (decl.kind === 'comb') combNames.push(decl.name);
    }
  }

  // Build return object
  const signalEntries = signalNames.map(n => `${n}: { get: ${n}, set: set${capitalize(n)} }`).join(', ');
  const combEntries = combNames.map(n => `${n}`).join(', ');
  lines.push(`  return {`);
  lines.push(`    signals: { ${signalEntries} },`);
  lines.push(`    combs: { ${combEntries} },`);
  lines.push(`    dispose: __scope.dispose,`);
  lines.push(`  };`);
  lines.push('}');

  return lines.join('\n');
}

// Declarations

function emitDecl(decl: Declaration, ctx: GenContext): string[] {
  switch (decl.kind) {
    case 'input': return emitInput(decl, ctx);
    case 'output': return emitOutput(decl, ctx);
    case 'signal': return emitSignal(decl, ctx);
    case 'token': return emitToken(decl, ctx);
    case 'comb': return emitComb(decl, ctx);
    case 'always': return emitAlways(decl, ctx);
    case 'view': return emitView(decl, ctx);
    case 'style': return emitStyle(decl, ctx);
    case 'enum': return emitEnum(decl, ctx);
    case 'cell': return emitCell(decl, ctx);
    case 'constraint': return emitConstraint(decl, ctx);
    case 'assert': return emitAssert(decl, ctx);
    case 'temporal_assert': return emitTemporalAssert(decl, ctx);
    case 'fn': return emitFnDecl(decl, ctx);
  }
}

function emitInput(decl: InputDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const init = decl.initial ? emitExpr(decl.initial, ctx) : 'undefined';
  const setter = 'set' + capitalize(decl.name);
  return [`${i}const [${decl.name}, ${setter}] = createSignal(__props.${decl.name} ?? ${init}, { name: '${decl.name}', module: $m });`];
}

function emitOutput(decl: OutputDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const init = decl.initial ? emitExpr(decl.initial, ctx) : 'undefined';
  const setter = 'set' + capitalize(decl.name);
  return [`${i}const [${decl.name}, ${setter}] = createSignal(__props.${decl.name} ?? ${init}, { name: '${decl.name}', module: $m });`];
}

function emitSignal(decl: SignalDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const init = emitExpr(decl.initial, ctx);
  const setter = 'set' + capitalize(decl.name);
  const typeName = decl.type.kind === 'simple' ? decl.type.name : undefined;
  const meta = typeName
    ? `{ name: '${decl.name}', module: $m, type: '${typeName}' }`
    : `{ name: '${decl.name}', module: $m }`;
  return [`${i}const [${decl.name}, ${setter}] = createSignal(${init}, ${meta});`];
}

function emitToken(decl: TokenDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const init = emitExpr(decl.initial, ctx);
  const setter = 'set' + capitalize(decl.name);
  const typeName = decl.type.kind === 'simple' ? decl.type.name : undefined;
  const meta = typeName
    ? `{ name: '${decl.name}', module: $m, type: '${typeName}' }`
    : `{ name: '${decl.name}', module: $m }`;
  const cssVar = `--${decl.name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  return [
    `${i}const [${decl.name}, ${setter}] = createSignal(${init}, ${meta});`,
    `${i}createEffect(() => {`,
    `${i}  document.documentElement.style.setProperty('${cssVar}', String(${decl.name}()));`,
    `${i}}, { name: 'token:${decl.name}', module: $m });`,
  ];
}

function emitComb(decl: CombDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const expr = emitExpr(decl.expr, ctx);
  const depsArr = JSON.stringify(decl.deps);
  return [`${i}const ${decl.name} = createComb(() => ${expr}, { name: '${decl.name}', module: $m, deps: ${depsArr} });`];
}

function emitCell(decl: CellDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const init = emitExpr(decl.initial, ctx);
  const setter = 'set' + capitalize(decl.name);
  return [`${i}const [${decl.name}, ${setter}] = createCell(${init}, { name: '${decl.name}', module: $m });`];
}

function emitConstraint(decl: ConstraintDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const lines: string[] = [];
  for (let ci = 0; ci < decl.clauses.length; ci++) {
    const clause = decl.clauses[ci];
    // Build constraint locals map: input name → local variable name
    const constraintLocals = new Map<string, string>();
    for (const inp of clause.inputs) {
      constraintLocals.set(inp, `__${inp}`);
    }

    // Extract writes from clause body
    const clauseWrites = new Set<string>();
    for (const stmt of clause.body) {
      collectStmtWrites(stmt, clauseWrites);
    }
    const writesArr = [...clauseWrites];

    lines.push(`${i}createPropagator(() => {`);
    lines.push(`${i}  // Read inputs: ${clause.inputs.join(', ')}`);
    for (const inp of clause.inputs) {
      lines.push(`${i}  const __${inp} = ${inp}();`);
    }
    lines.push(`${i}  batch(() => {`);
    const savedIndent = ctx.indent;
    const savedLocals = ctx.constraintLocals;
    ctx.indent += 2;
    ctx.constraintLocals = constraintLocals;
    for (const stmt of clause.body) lines.push(...emitStmt(stmt, ctx));
    ctx.constraintLocals = savedLocals;
    ctx.indent = savedIndent;
    lines.push(`${i}  });`);
    const writesStr = writesArr.length > 0 ? `, writes: [${writesArr.map(w => `'${w}'`).join(', ')}]` : '';
    lines.push(`${i}}, { name: '${decl.name}:${ci}', module: $m, deps: [${clause.inputs.map(inp => `'${inp}'`).join(', ')}]${writesStr} });`);
  }
  return lines;
}

function collectStmtWrites(stmt: Statement, writes: Set<string>): void {
  if (stmt.kind === 'assign' && stmt.target.kind === 'identifier') {
    writes.add(stmt.target.name);
  }
  if (stmt.kind === 'if') {
    for (const s of stmt.then) collectStmtWrites(s, writes);
    if (stmt.else_) for (const s of stmt.else_) collectStmtWrites(s, writes);
  }
}

function emitEnum(decl: EnumDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const lines = [`${i}const ${decl.name} = Object.freeze({`];
  for (const v of decl.variants) {
    lines.push(`${i}  ${v}: '${decl.name}.${v}',`);
  }
  lines.push(`${i}});`);
  return lines;
}

function emitAlways(decl: AlwaysBlock, ctx: GenContext): string[] {
  const i = ind(ctx);

  // Edge-triggered: compile to createEdgeEffect
  if ((decl.triggerKind === 'posedge' || decl.triggerKind === 'negedge') && decl.edgeExpr) {
    const edgeName = decl.edgeExpr.kind === 'identifier' ? decl.edgeExpr.name : 'expr';
    const exprCode = emitExpr(decl.edgeExpr, ctx);
    const lines = [
      `${i}createEdgeEffect(() => ${exprCode}, '${decl.triggerKind}', () => {`,
      `${i}  batch(() => {`,
    ];
    ctx.indent += 2;
    for (const stmt of decl.body) lines.push(...emitStmt(stmt, ctx));
    ctx.indent -= 2;
    lines.push(`${i}  });`);
    lines.push(`${i}}, { name: '${decl.triggerKind}_${edgeName}', module: $m });`);
    return lines;
  }

  // Sensitivity-triggered: compile to createEffect
  if (decl.triggerKind === 'sensitivity' && decl.trigger.signals) {
    const signals = decl.trigger.signals;
    const sensName = `sense_${signals.join('_')}`;
    const lines = [
      `${i}createEffect(() => {`,
      `${i}  // Read sensitivity deps`,
    ];
    for (const sig of signals) {
      lines.push(`${i}  const __${sig} = ${sig}();`);
    }
    lines.push(`${i}  batch(() => {`);
    ctx.indent += 2;
    for (const stmt of decl.body) lines.push(...emitStmt(stmt, ctx));
    ctx.indent -= 2;
    lines.push(`${i}  });`);
    lines.push(`${i}}, { name: '${sensName}', module: $m });`);
    return lines;
  }

  // Event-triggered: compile to named function
  const name = decl.trigger.name;
  const params = decl.trigger.params;
  const paramList = params.length > 0 ? params.join(', ') : '';
  const lines = [
    `${i}function ${name}(${paramList}) {`,
    `${i}  batch(() => {`,
  ];
  ctx.indent += 2;
  for (const stmt of decl.body) lines.push(...emitStmt(stmt, ctx));
  ctx.indent -= 2;
  lines.push(`${i}  });`);
  lines.push(`${i}}`);
  return lines;
}

function emitAssert(decl: AssertDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const idx = ctx.assertCount++;
  const assertId = `assert:${idx}`;
  const exprStr = emitExpr(decl.expr, ctx);
  const exprSource = exprStr.replace(/\(\)/g, '');
  const valuesEntries = decl.deps.map(d => `${d}: ${d}()`).join(', ');
  return [
    `${i}createEffect(() => {`,
    `${i}  const __ok = ${exprStr};`,
    `${i}  if (!__ok) {`,
    `${i}    circuit.assertionFailed('${assertId}', {`,
    `${i}      expr: '${escapeStr(exprSource)}',`,
    `${i}      module: $m,`,
    `${i}      values: { ${valuesEntries} },`,
    `${i}    });`,
    `${i}  }`,
    `${i}}, { name: '${assertId}', module: $m });`,
  ];
}

function emitTemporalAssert(decl: TemporalAssertDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const idx = ctx.temporalCount++;
  const temporalId = `temporal:${idx}`;
  const triggerExpr = emitExpr(decl.trigger, ctx);
  const propertyExpr = emitExpr(decl.property, ctx);
  const durationStr = decl.duration !== undefined ? `, duration: ${decl.duration}` : '';
  return [
    `${i}createTemporalAssert(`,
    `${i}  () => ${triggerExpr},`,
    `${i}  '${decl.operator}',`,
    `${i}  () => ${propertyExpr},`,
    `${i}  { name: '${temporalId}', module: $m${durationStr} }`,
    `${i});`,
  ];
}

function emitFnDecl(decl: FnDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const paramNames = decl.params.map(p => p.name).join(', ');
  const lines = [`${i}function ${decl.name}(${paramNames}) {`];
  ctx.indent++;
  // Emit body statements. The last expression statement gets an implicit return.
  for (let si = 0; si < decl.body.length; si++) {
    const stmt = decl.body[si];
    const isLast = si === decl.body.length - 1;
    if (isLast && stmt.kind === 'expr_stmt') {
      // Implicit return for last expression statement
      lines.push(`${ind(ctx)}return ${emitExpr(stmt.expr, ctx)};`);
    } else {
      lines.push(...emitStmt(stmt, ctx));
    }
  }
  ctx.indent--;
  lines.push(`${i}}`);
  return lines;
}
// Statements

function emitStmt(stmt: Statement, ctx: GenContext): string[] {
  switch (stmt.kind) {
    case 'assign': return emitAssign(stmt, ctx);
    case 'if': return emitIf(stmt, ctx);
    case 'expr_stmt': return [`${ind(ctx)}${emitExpr(stmt.expr, ctx)};`];
    case 'return': return emitReturn(stmt, ctx);
    case 'destructure': return emitDestructure(stmt, ctx);
    case 'try': return emitTry(stmt, ctx);
  }
}

function emitAssign(stmt: SignalAssign, ctx: GenContext): string[] {
  const i = ind(ctx);
  const value = emitExpr(stmt.value, ctx);

  if (stmt.target.kind === 'identifier') {
    return [`${i}set${capitalize(stmt.target.name)}(${value});`];
  }

  if (stmt.target.kind === 'index') {
    const { base, indices } = flattenIndex(stmt.target);
    if (base.kind === 'identifier') {
      const setter = 'set' + capitalize(base.name);
      const tmpVar = `__tmp${ctx.elCount++}`;
      const lines = [`${i}const ${tmpVar} = JSON.parse(JSON.stringify(${base.name}()));`];
      let access = tmpVar;
      for (const idx of indices) access += `[${emitExpr(idx, ctx)}]`;
      lines.push(`${i}${access} = ${value};`);
      lines.push(`${i}${setter}(${tmpVar});`);
      return lines;
    }
  }

  const target = emitExpr(stmt.target, ctx);
  return [`${i}${target} = ${value};`];
}

function emitIf(stmt: IfStatement, ctx: GenContext): string[] {
  const i = ind(ctx);
  const lines = [`${i}if (${emitExpr(stmt.condition, ctx)}) {`];
  ctx.indent++;
  for (const s of stmt.then) lines.push(...emitStmt(s, ctx));
  ctx.indent--;
  if (stmt.else_ && stmt.else_.length > 0) {
    if (stmt.else_.length === 1 && stmt.else_[0].kind === 'if') {
      lines.push(`${i}} else {`);
      ctx.indent++;
      lines.push(...emitStmt(stmt.else_[0], ctx));
      ctx.indent--;
      lines.push(`${i}}`);
    } else {
      lines.push(`${i}} else {`);
      ctx.indent++;
      for (const s of stmt.else_) lines.push(...emitStmt(s, ctx));
      ctx.indent--;
      lines.push(`${i}}`);
    }
  } else {
    lines.push(`${i}}`);
  }
  return lines;
}

function emitReturn(stmt: ReturnStmt, ctx: GenContext): string[] {
  const i = ind(ctx);
  if (stmt.value) {
    return [`${i}return ${emitExpr(stmt.value, ctx)};`];
  }
  return [`${i}return;`];
}

function emitDestructure(stmt: DestructureStmt, ctx: GenContext): string[] {
  const i = ind(ctx);
  const value = emitExpr(stmt.value, ctx);
  if (stmt.pattern.kind === 'object') {
    const fields = stmt.pattern.fields.map(f => f.alias ? `${f.key}: ${f.alias}` : f.key).join(', ');
    return [`${i}const { ${fields} } = ${value};`];
  } else {
    const elements = [...stmt.pattern.elements];
    if (stmt.pattern.rest) elements.push(`...${stmt.pattern.rest}`);
    return [`${i}const [${elements.join(', ')}] = ${value};`];
  }
}

function emitTry(stmt: TryStmt, ctx: GenContext): string[] {
  const i = ind(ctx);
  const catchParam = stmt.catchParam || '__err';
  const lines = [`${i}try {`];
  ctx.indent++;
  for (const s of stmt.body) lines.push(...emitStmt(s, ctx));
  ctx.indent--;
  lines.push(`${i}} catch (${catchParam}) {`);
  ctx.indent++;
  for (const s of stmt.catchBody) lines.push(...emitStmt(s, ctx));
  ctx.indent--;
  lines.push(`${i}}`);
  return lines;
}

// View

function emitView(decl: ViewBlock, ctx: GenContext): string[] {
  const lines: string[] = [];
  for (const child of decl.children) lines.push(...emitVNode(child, 'root', ctx, 'root'));
  return lines;
}

function getVElementDesc(node: VElement, ctx: GenContext): string {
  let desc = node.tag;
  for (const attr of node.attrs) {
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

function primaryReactiveNameFromExpr(expr: Expr, ctx: GenContext): string {
  if (expr.kind === 'identifier' && (ctx.signals.has(expr.name) || ctx.combs.has(expr.name))) return expr.name;
  if (expr.kind === 'binary') return primaryReactiveNameFromExpr(expr.left, ctx) || primaryReactiveNameFromExpr(expr.right, ctx);
  if (expr.kind === 'unary') return primaryReactiveNameFromExpr(expr.operand, ctx);
  if (expr.kind === 'ternary') return primaryReactiveNameFromExpr(expr.condition, ctx);
  if (expr.kind === 'member') return primaryReactiveNameFromExpr(expr.object, ctx);
  if (expr.kind === 'call' && expr.callee.kind === 'identifier') return expr.callee.name;
  return '';
}

function emitStyle(decl: StyleBlock, ctx: GenContext): string[] {
  const i = ind(ctx);
  const hash = ctx.scopeHash;
  // Scope class names: .foo → .foo_hash
  const scopedCss = decl.css.replace(/\.([a-zA-Z_][\w-]*)/g, `.$1_${hash}`);
  const escaped = escapeStr(scopedCss);
  return [
    `${i}const __style = document.createElement('style');`,
    `${i}__style.textContent = '${escaped}';`,
    `${i}document.head.appendChild(__style);`,
  ];
}

function emitVNode(node: VNode, parent: string, ctx: GenContext, parentDesc: string): string[] {
  switch (node.kind) {
    case 'element': return emitVElement(node, parent, ctx, parentDesc);
    case 'component': return emitVComponent(node, parent, ctx, parentDesc);
    case 'text': return emitVText(node, parent, ctx);
    case 'expr': return emitVExpr(node, parent, ctx, parentDesc);
    case 'if': return emitVIf(node, parent, ctx, parentDesc);
    case 'for': return emitVFor(node, parent, ctx, parentDesc);
    default: return [];
  }
}

function emitVElement(node: VElement, parent: string, ctx: GenContext, parentDesc: string): string[] {
  const i = ind(ctx);
  const v = nextEl(ctx);
  const elDesc = getVElementDesc(node, ctx);
  const lines = [`${i}const ${v} = document.createElement('${node.tag}');`];

  for (const attr of node.attrs) {
    if (attr.isEvent) {
      lines.push(...emitEventAttr(attr, v, ctx));
    } else if (attr.isBind) {
      const typeAttr = node.attrs.find(a => a.name === 'type' && a.value?.kind === 'literal');
      const inputType = (typeAttr && typeAttr.value?.kind === 'literal') ? String(typeAttr.value.value) : '';
      lines.push(...emitBindAttr(attr, v, ctx, elDesc, inputType));
    } else if (attr.value) {
      if (attr.value.kind === 'literal' && attr.value.type === 'string') {
        let attrVal = String(attr.value.value);
        if (attr.name === 'class' && hasStyleBlock(ctx)) {
          attrVal = attrVal.split(/\s+/).map(c => `${c}_${ctx.scopeHash}`).join(' ');
        }
        lines.push(`${i}${v}.setAttribute('${attr.name}', '${escapeStr(attrVal)}');`);
      } else if (isReactive(attr.value, ctx)) {
        const viewName = primaryReactiveNameFromExpr(attr.value, ctx) || attr.name;
        const boolAttrs = ['disabled', 'checked', 'readonly', 'hidden', 'required'];
        if (boolAttrs.includes(attr.name)) {
          lines.push(`${i}createEffect(() => { const __v = ${emitExpr(attr.value, ctx)}; if (__v) ${v}.setAttribute('${attr.name}', ''); else ${v}.removeAttribute('${attr.name}'); }, { name: 'view:attr:${viewName}', module: $m, viewTarget: { element: '${escapeStr(elDesc)}', binding: 'attr:${attr.name}' } });`);
        } else {
          lines.push(`${i}createEffect(() => { ${v}.setAttribute('${attr.name}', ${emitExpr(attr.value, ctx)}); }, { name: 'view:attr:${viewName}', module: $m, viewTarget: { element: '${escapeStr(elDesc)}', binding: 'attr:${attr.name}' } });`);
        }
      } else {
        lines.push(`${i}${v}.setAttribute('${attr.name}', ${emitExpr(attr.value, ctx)});`);
      }
    }
  }

  for (const child of node.children) lines.push(...emitVNode(child, v, ctx, elDesc));
  lines.push(`${i}${parent}.appendChild(${v});`);
  return lines;
}

function emitVComponent(node: VComponent, parent: string, ctx: GenContext, parentDesc: string): string[] {
  const i = ind(ctx);
  const v = nextEl(ctx);
  const childVar = `__child${ctx.elCount}`;
  const lines = [
    `${i}const ${v} = document.createElement('div');`,
    `${i}${v}.style.display = 'contents';`,
  ];

  // Collect initial prop values for child factory
  const propsEntries: string[] = [];
  const inputBindings: { name: string; expr: string }[] = [];
  const outputBindings: { name: string; expr: Expr }[] = [];
  for (const prop of node.props) {
    if (prop.isEvent) continue;
    if (prop.isBinding && prop.value) {
      // := binding — bidirectional output wire
      propsEntries.push(`${prop.name}: ${emitExpr(prop.value, ctx)}`);
      outputBindings.push({ name: prop.name, expr: prop.value });
    } else if (prop.value) {
      propsEntries.push(`${prop.name}: ${emitExpr(prop.value, ctx)}`);
      if (isReactive(prop.value, ctx)) {
        inputBindings.push({ name: prop.name, expr: emitExpr(prop.value, ctx) });
      }
    }
  }
  const propsObj = propsEntries.length > 0 ? `{ ${propsEntries.join(', ')} }` : '{}';
  lines.push(`${i}const ${childVar} = ${node.name}(${propsObj}, ${v});`);

  // Wire reactive input forwarding
  for (const bind of inputBindings) {
    lines.push(`${i}createEffect(() => {`);
    lines.push(`${i}  if (${childVar}.__ports && ${childVar}.__ports.${bind.name}) ${childVar}.__ports.${bind.name}.set(${bind.expr});`);
    lines.push(`${i}}, { name: 'wire:${bind.name}', module: $m });`);
  }

  // Wire output bindings (child output → parent signal)
  for (const bind of outputBindings) {
    if (bind.expr.kind === 'identifier') {
      const parentSetter = `set${capitalize(bind.expr.name)}`;
      lines.push(`${i}createEffect(() => {`);
      lines.push(`${i}  if (${childVar}.__ports && ${childVar}.__ports.${bind.name}) ${parentSetter}(${childVar}.__ports.${bind.name}.get());`);
      lines.push(`${i}}, { name: 'bind:${bind.name}', module: $m });`);
    }
  }

  for (const prop of node.props) {
    if (prop.isEvent) lines.push(...emitEventAttr(prop, v, ctx));
  }

  lines.push(`${i}${parent}.appendChild(${v});`);
  return lines;
}

function emitVText(node: VText, parent: string, ctx: GenContext): string[] {
  const i = ind(ctx);
  const v = nextTxt(ctx);
  return [
    `${i}const ${v} = document.createTextNode('${escapeStr(node.value)}');`,
    `${i}${parent}.appendChild(${v});`,
  ];
}

function emitVExpr(node: VExpr, parent: string, ctx: GenContext, parentDesc: string): string[] {
  const i = ind(ctx);
  const v = nextTxt(ctx);
  const expr = emitExpr(node.expr, ctx);
  const lines: string[] = [];

  if (isReactive(node.expr, ctx)) {
    const viewName = primaryReactiveNameFromExpr(node.expr, ctx) || v;
    lines.push(`${i}const ${v} = document.createTextNode('');`);
    lines.push(`${i}createEffect(() => { ${v}.data = String(${expr}); }, { name: 'view:${viewName}', module: $m, viewTarget: { element: '${escapeStr(parentDesc)}', binding: 'text' } });`);
  } else {
    lines.push(`${i}const ${v} = document.createTextNode(String(${expr}));`);
  }
  lines.push(`${i}${parent}.appendChild(${v});`);
  return lines;
}

function emitVIf(node: VIf, parent: string, ctx: GenContext, parentDesc: string): string[] {
  const i = ind(ctx);
  const anchor = nextEl(ctx);
  const container = nextEl(ctx);
  const cond = emitExpr(node.condition, ctx);
  const lines = [
    `${i}const ${anchor} = document.createComment('@if');`,
    `${i}${parent}.appendChild(${anchor});`,
    `${i}let ${container} = null;`,
    `${i}createEffect(() => {`,
  ];
  ctx.indent++;
  const ii = ind(ctx);
  lines.push(`${ii}if (${container}) { ${container}.remove(); ${container} = null; }`);
  lines.push(`${ii}if (${cond}) {`);
  ctx.indent++;
  lines.push(`${ind(ctx)}${container} = document.createElement('span');`);
  lines.push(`${ind(ctx)}${container}.style.display = 'contents';`);
  for (const child of node.then) lines.push(...emitVNode(child, container, ctx, parentDesc));
  lines.push(`${ind(ctx)}${anchor}.parentNode.insertBefore(${container}, ${anchor}.nextSibling);`);
  ctx.indent--;

  if (node.else_ && node.else_.length > 0) {
    lines.push(`${ii}} else {`);
    ctx.indent++;
    lines.push(`${ind(ctx)}${container} = document.createElement('span');`);
    lines.push(`${ind(ctx)}${container}.style.display = 'contents';`);
    for (const child of node.else_) lines.push(...emitVNode(child, container, ctx, parentDesc));
    lines.push(`${ind(ctx)}${anchor}.parentNode.insertBefore(${container}, ${anchor}.nextSibling);`);
    ctx.indent--;
  }

  lines.push(`${ii}}`);
  ctx.indent--;
  lines.push(`${i}}, { name: 'if:${anchor}', module: $m });`);
  return lines;
}

function emitVFor(node: VFor, parent: string, ctx: GenContext, parentDesc: string): string[] {
  const i = ind(ctx);
  const anchor = nextEl(ctx);
  const container = nextEl(ctx);
  const lines = [
    `${i}const ${anchor} = document.createComment('@for');`,
    `${i}${parent}.appendChild(${anchor});`,
    `${i}let ${container} = null;`,
    `${i}createEffect(() => {`,
  ];
  ctx.indent++;
  const ii = ind(ctx);
  lines.push(`${ii}if (${container}) { ${container}.remove(); ${container} = null; }`);
  lines.push(`${ii}${container} = document.createElement('span');`);
  lines.push(`${ii}${container}.style.display = 'contents';`);

  if (node.iterable.kind === 'range') {
    const start = emitExpr(node.iterable.start, ctx);
    const end = emitExpr(node.iterable.end, ctx);
    lines.push(`${ii}for (let ${node.variable} = ${start}; ${node.variable} < ${end}; ${node.variable}++) {`);
  } else {
    lines.push(`${ii}for (const ${node.variable} of ${emitExpr(node.iterable, ctx)}) {`);
  }

  ctx.indent++;
  for (const child of node.body) lines.push(...emitVNode(child, container, ctx, parentDesc));
  ctx.indent--;

  lines.push(`${ii}}`);
  lines.push(`${ii}${anchor}.parentNode.insertBefore(${container}, ${anchor}.nextSibling);`);
  ctx.indent--;
  lines.push(`${i}}, { name: 'for:${anchor}', module: $m });`);
  return lines;
}

function emitEventAttr(attr: VAttr, elVar: string, ctx: GenContext): string[] {
  const i = ind(ctx);
  const event = attr.name;
  const handler = attr.value && attr.value.kind === 'identifier' ? attr.value.name : 'unknown';
  const modifiers = attr.modifier ? attr.modifier.split('.') : [];

  // Check for DOM event modifiers (prevent, stop) vs key modifiers (enter, escape, etc.)
  const domModifiers = modifiers.filter(m => m === 'prevent' || m === 'stop');
  const keyModifiers = modifiers.filter(m => m !== 'prevent' && m !== 'stop');

  // Build modifier preamble
  const preamble: string[] = [];
  for (const m of domModifiers) {
    if (m === 'prevent') preamble.push('e.preventDefault();');
    if (m === 'stop') preamble.push('e.stopPropagation();');
  }

  const needsEventParam = domModifiers.length > 0 || keyModifiers.length > 0 || (attr.eventArgs && attr.eventArgs.length > 0 && event === 'contextmenu');

  if (attr.eventArgs && attr.eventArgs.length > 0) {
    const args = attr.eventArgs.map(a => emitExpr(a, ctx)).join(', ');
    const pre = preamble.length > 0 ? ` ${preamble.join(' ')}` : '';
    return [`${i}${elVar}.addEventListener('${event}', (e) => {${pre} ${handler}(${args}); });`];
  }
  if (keyModifiers.length > 0) {
    const keyCheck = `e.key === '${capitalize(keyModifiers[0])}'`;
    const pre = preamble.length > 0 ? ` ${preamble.join(' ')}` : '';
    return [`${i}${elVar}.addEventListener('${event}', (e) => {${pre} if (${keyCheck}) ${handler}(); });`];
  }
  if (domModifiers.length > 0) {
    const pre = preamble.join(' ');
    return [`${i}${elVar}.addEventListener('${event}', (e) => { ${pre} ${handler}(); });`];
  }
  return [`${i}${elVar}.addEventListener('${event}', ${handler});`];
}

function emitBindAttr(attr: VAttr, elVar: string, ctx: GenContext, elDesc: string = '', inputType: string = ''): string[] {
  const i = ind(ctx);
  if (!attr.value || attr.value.kind !== 'identifier') return [];
  const name = attr.value.name;
  const setter = 'set' + capitalize(name);
  const coerce = (inputType === 'range' || inputType === 'number') ? 'Number(e.target.value)' : 'e.target.value';
  return [
    `${i}${elVar}.value = ${name}();`,
    `${i}createEffect(() => { ${elVar}.value = ${name}(); }, { name: 'view:bind:${name}', module: $m, viewTarget: { element: '${escapeStr(elDesc)}', binding: 'bind:value' } });`,
    `${i}${elVar}.addEventListener('input', (e) => { ${setter}(${coerce}); });`,
  ];
}

// Expressions

function emitExpr(expr: Expr, ctx: GenContext): string {
  switch (expr.kind) {
    case 'literal':
      if (expr.type === 'string') return JSON.stringify(expr.value);
      return String(expr.value);
    case 'identifier':
      // Check constraint locals first — use pre-read local variable
      if (ctx.constraintLocals && ctx.constraintLocals.has(expr.name)) {
        return ctx.constraintLocals.get(expr.name)!;
      }
      if (ctx.signals.has(expr.name) || ctx.combs.has(expr.name)) return `${expr.name}()`;
      return expr.name;
    case 'binary': {
      const op = expr.op === '<=' ? '<=' : expr.op;
      return `(${emitExpr(expr.left, ctx)} ${op} ${emitExpr(expr.right, ctx)})`;
    }
    case 'unary':
      return `${expr.op}${emitExpr(expr.operand, ctx)}`;
    case 'ternary':
      return `(${emitExpr(expr.condition, ctx)} ? ${emitExpr(expr.then, ctx)} : ${emitExpr(expr.else_, ctx)})`;
    case 'call':
      return emitCall(expr, ctx);
    case 'member':
      return `${emitExpr(expr.object, ctx)}.${expr.property}`;
    case 'index':
      return `${emitExpr(expr.object, ctx)}[${emitExpr(expr.index, ctx)}]`;
    case 'array':
      return `[${expr.elements.map(e => emitExpr(e, ctx)).join(', ')}]`;
    case 'object':
      return `{ ${expr.properties.map(p => `${p.key}: ${emitExpr(p.value, ctx)}`).join(', ')} }`;
    case 'spread':
      return `...${emitExpr(expr.expr, ctx)}`;
    case 'lambda':
      return `(${expr.params.join(', ')}) => ${emitExpr(expr.body, ctx)}`;
    case 'range': {
      const s = emitExpr(expr.start, ctx);
      const e = emitExpr(expr.end, ctx);
      return `Array.from({ length: ${e} - ${s} }, (_, i) => i + ${s})`;
    }
    case 'template': {
      let result = '`';
      for (const part of expr.parts) {
        if (typeof part === 'string') {
          result += part;
        } else {
          result += '${' + emitExpr(part, ctx) + '}';
        }
      }
      result += '`';
      return result;
    }
  }
}

function emitCall(expr: Expr & { kind: 'call' }, ctx: GenContext): string {
  if (expr.callee.kind === 'identifier') {
    const name = expr.callee.name;
    const args = expr.args.map(a => emitExpr(a, ctx)).join(', ');
    if (name === 'str') return `String(${args})`;
    if (name === 'int') return `parseInt(${args}, 10)`;
    if (name === 'float') return `parseFloat(${args})`;
    if (name === 'now') return `Date.now()`;
    if (name === 'format_time') return `new Date(${args}).toLocaleTimeString()`;
    if (name === 'len' && expr.args.length === 1) return `${emitExpr(expr.args[0], ctx)}.length`;
    if (name === 'contains' && expr.args.length === 2) return `${emitExpr(expr.args[0], ctx)}.includes(${emitExpr(expr.args[1], ctx)})`;
    if (name === 'append' && expr.args.length === 2) return `[...${emitExpr(expr.args[0], ctx)}, ${emitExpr(expr.args[1], ctx)}]`;
    if (name === 'reduce' && expr.args.length === 3) return `${emitExpr(expr.args[0], ctx)}.reduce(${emitExpr(expr.args[1], ctx)}, ${emitExpr(expr.args[2], ctx)})`;
    if (name === 'slice' && expr.args.length >= 2) return `${emitExpr(expr.args[0], ctx)}.slice(${expr.args.slice(1).map(a => emitExpr(a, ctx)).join(', ')})`;
    if (name === 'floor' && expr.args.length === 1) return `Math.floor(${emitExpr(expr.args[0], ctx)})`;
    if (name === 'round' && expr.args.length === 1) return `Math.round(${emitExpr(expr.args[0], ctx)})`;
    if (name === 'min' && expr.args.length === 2) return `Math.min(${emitExpr(expr.args[0], ctx)}, ${emitExpr(expr.args[1], ctx)})`;
    if (name === 'max' && expr.args.length === 2) return `Math.max(${emitExpr(expr.args[0], ctx)}, ${emitExpr(expr.args[1], ctx)})`;
    if (name === 'abs' && expr.args.length === 1) return `Math.abs(${emitExpr(expr.args[0], ctx)})`;
    return `${emitExpr(expr.callee, ctx)}(${args})`;
  }
  if (expr.callee.kind === 'member') {
    const obj = emitExpr(expr.callee.object, ctx);
    const method = expr.callee.property;
    const args = expr.args.map(a => emitExpr(a, ctx)).join(', ');
    if (method === 'len' && expr.args.length === 0) return `${obj}.length`;
    return `${obj}.${method}(${args})`;
  }
  const callee = emitExpr(expr.callee, ctx);
  const args = expr.args.map(a => emitExpr(a, ctx)).join(', ');
  return `${callee}(${args})`;
}

// Helpers

function isReactive(expr: Expr, ctx: GenContext): boolean {
  switch (expr.kind) {
    case 'identifier': return ctx.signals.has(expr.name) || ctx.combs.has(expr.name);
    case 'binary': return isReactive(expr.left, ctx) || isReactive(expr.right, ctx);
    case 'unary': return isReactive(expr.operand, ctx);
    case 'ternary': return isReactive(expr.condition, ctx) || isReactive(expr.then, ctx) || isReactive(expr.else_, ctx);
    case 'call': return isReactive(expr.callee, ctx) || expr.args.some(a => isReactive(a, ctx));
    case 'member': return isReactive(expr.object, ctx);
    case 'index': return isReactive(expr.object, ctx) || isReactive(expr.index, ctx);
    case 'array': return expr.elements.some(e => isReactive(e, ctx));
    case 'object': return expr.properties.some(p => isReactive(p.value, ctx));
    case 'template': return expr.parts.some(p => typeof p !== 'string' && isReactive(p, ctx));
    default: return false;
  }
}

function flattenIndex(expr: Expr): { base: Expr; indices: Expr[] } {
  const indices: Expr[] = [];
  let current = expr;
  while (current.kind === 'index') {
    indices.unshift(current.index);
    current = current.object;
  }
  return { base: current, indices };
}
