// codegen.ts — JavaScript code generator for verified Comb AST
// Emits readable ES module JavaScript targeting the Comb runtime API

import type {
  Module, Declaration, SignalDecl, CombDecl, AlwaysBlock,
  ViewBlock, EnumDecl, Statement, SignalAssign, IfStatement,
  ExprStatement, VNode, VElement, VText, VExpr, VIf, VFor,
  VComponent, VAttr, Expr,
} from './ast.js';
import type { StaticGraph } from './graph.js';

interface GenContext {
  moduleName: string;
  signals: Set<string>;
  combs: Set<string>;
  params: Set<string>;
  enums: Map<string, string[]>;
  indent: number;
  elCount: number;
  txtCount: number;
}

function createContext(mod: Module): GenContext {
  const ctx: GenContext = {
    moduleName: mod.name,
    signals: new Set(),
    combs: new Set(),
    params: new Set(),
    enums: new Map(),
    indent: 1,
    elCount: 0,
    txtCount: 0,
  };
  for (const decl of mod.body) {
    if (decl.kind === 'signal') ctx.signals.add(decl.name);
    if (decl.kind === 'comb') ctx.combs.add(decl.name);
    if (decl.kind === 'enum') ctx.enums.set(decl.name, decl.variants);
  }
  for (const p of mod.params) ctx.params.add(p.name);
  return ctx;
}

function ind(ctx: GenContext): string { return '  '.repeat(ctx.indent); }
function nextEl(ctx: GenContext): string { return `el${ctx.elCount++}`; }
function nextTxt(ctx: GenContext): string { return `txt${ctx.txtCount++}`; }
function capitalize(s: string): string { return s[0].toUpperCase() + s.slice(1); }
function escapeStr(s: string): string { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n'); }

export function generate(mod: Module, graph: StaticGraph): string {
  const ctx = createContext(mod);
  const lines: string[] = [];

  // Imports
  lines.push("import { createSignal, createComb, createEffect, batch, createScope } from '../runtime/index.js';");
  lines.push('');

  // Static graph export
  lines.push(`export const __graph = ${JSON.stringify(graph, null, 2)};`);
  lines.push('');

  // Module factory function
  const paramNames = mod.params.map(p => p.name);
  const paramList = paramNames.length > 0 ? `{ ${paramNames.join(', ')} }, root` : 'root';
  lines.push(`export function ${mod.name}(${paramList}) {`);
  lines.push(`  const $m = '${mod.name}';`);
  lines.push(`  const __scope = createScope();`);
  lines.push('');

  for (const decl of mod.body) {
    lines.push(...emitDecl(decl, ctx));
    lines.push('');
  }

  lines.push('  return { dispose: __scope.dispose };');
  lines.push('}');
  return lines.join('\n');
}

// Declarations

function emitDecl(decl: Declaration, ctx: GenContext): string[] {
  switch (decl.kind) {
    case 'signal': return emitSignal(decl, ctx);
    case 'comb': return emitComb(decl, ctx);
    case 'always': return emitAlways(decl, ctx);
    case 'view': return emitView(decl, ctx);
    case 'enum': return emitEnum(decl, ctx);
  }
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

function emitComb(decl: CombDecl, ctx: GenContext): string[] {
  const i = ind(ctx);
  const expr = emitExpr(decl.expr, ctx);
  const depsArr = JSON.stringify(decl.deps);
  return [`${i}const ${decl.name} = createComb(() => ${expr}, { name: '${decl.name}', module: $m, deps: ${depsArr} });`];
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

// Statements

function emitStmt(stmt: Statement, ctx: GenContext): string[] {
  switch (stmt.kind) {
    case 'assign': return emitAssign(stmt, ctx);
    case 'if': return emitIf(stmt, ctx);
    case 'expr_stmt': return [`${ind(ctx)}${emitExpr(stmt.expr, ctx)};`];
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

// View

function emitView(decl: ViewBlock, ctx: GenContext): string[] {
  const lines: string[] = [];
  for (const child of decl.children) lines.push(...emitVNode(child, 'root', ctx));
  return lines;
}

function emitVNode(node: VNode, parent: string, ctx: GenContext): string[] {
  switch (node.kind) {
    case 'element': return emitVElement(node, parent, ctx);
    case 'component': return emitVComponent(node, parent, ctx);
    case 'text': return emitVText(node, parent, ctx);
    case 'expr': return emitVExpr(node, parent, ctx);
    case 'if': return emitVIf(node, parent, ctx);
    case 'for': return emitVFor(node, parent, ctx);
    default: return [];
  }
}

function emitVElement(node: VElement, parent: string, ctx: GenContext): string[] {
  const i = ind(ctx);
  const v = nextEl(ctx);
  const lines = [`${i}const ${v} = document.createElement('${node.tag}');`];

  for (const attr of node.attrs) {
    if (attr.isEvent) {
      lines.push(...emitEventAttr(attr, v, ctx));
    } else if (attr.isBind) {
      lines.push(...emitBindAttr(attr, v, ctx));
    } else if (attr.value) {
      if (attr.value.kind === 'literal' && attr.value.type === 'string') {
        lines.push(`${i}${v}.setAttribute('${attr.name}', '${escapeStr(String(attr.value.value))}');`);
      } else if (isReactive(attr.value, ctx)) {
        lines.push(`${i}createEffect(() => { ${v}.setAttribute('${attr.name}', ${emitExpr(attr.value, ctx)}); }, { name: 'attr:${attr.name}', module: $m });`);
      } else {
        lines.push(`${i}${v}.setAttribute('${attr.name}', ${emitExpr(attr.value, ctx)});`);
      }
    }
  }

  for (const child of node.children) lines.push(...emitVNode(child, v, ctx));
  lines.push(`${i}${parent}.appendChild(${v});`);
  return lines;
}

function emitVComponent(node: VComponent, parent: string, ctx: GenContext): string[] {
  const i = ind(ctx);
  const v = nextEl(ctx);
  const lines = [
    `${i}const ${v} = document.createElement('div');`,
    `${i}${v}.style.display = 'contents';`,
  ];

  const propsEntries: string[] = [];
  for (const prop of node.props) {
    if (!prop.isEvent && prop.value) {
      propsEntries.push(`${prop.name}: ${emitExpr(prop.value, ctx)}`);
    }
  }
  const propsObj = propsEntries.length > 0 ? `{ ${propsEntries.join(', ')} }` : '{}';
  lines.push(`${i}${node.name}(${propsObj}, ${v});`);

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

function emitVExpr(node: VExpr, parent: string, ctx: GenContext): string[] {
  const i = ind(ctx);
  const v = nextTxt(ctx);
  const expr = emitExpr(node.expr, ctx);
  const lines: string[] = [];

  if (isReactive(node.expr, ctx)) {
    lines.push(`${i}const ${v} = document.createTextNode('');`);
    lines.push(`${i}createEffect(() => { ${v}.data = String(${expr}); }, { name: 'view:${v}', module: $m });`);
  } else {
    lines.push(`${i}const ${v} = document.createTextNode(String(${expr}));`);
  }
  lines.push(`${i}${parent}.appendChild(${v});`);
  return lines;
}

function emitVIf(node: VIf, parent: string, ctx: GenContext): string[] {
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
  for (const child of node.then) lines.push(...emitVNode(child, container, ctx));
  lines.push(`${ind(ctx)}${anchor}.parentNode.insertBefore(${container}, ${anchor}.nextSibling);`);
  ctx.indent--;

  if (node.else_ && node.else_.length > 0) {
    lines.push(`${ii}} else {`);
    ctx.indent++;
    lines.push(`${ind(ctx)}${container} = document.createElement('span');`);
    lines.push(`${ind(ctx)}${container}.style.display = 'contents';`);
    for (const child of node.else_) lines.push(...emitVNode(child, container, ctx));
    lines.push(`${ind(ctx)}${anchor}.parentNode.insertBefore(${container}, ${anchor}.nextSibling);`);
    ctx.indent--;
  }

  lines.push(`${ii}}`);
  ctx.indent--;
  lines.push(`${i}}, { name: 'if:${anchor}', module: $m });`);
  return lines;
}

function emitVFor(node: VFor, parent: string, ctx: GenContext): string[] {
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
  for (const child of node.body) lines.push(...emitVNode(child, container, ctx));
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

  if (attr.eventArgs && attr.eventArgs.length > 0) {
    const args = attr.eventArgs.map(a => emitExpr(a, ctx)).join(', ');
    if (event === 'contextmenu') {
      return [`${i}${elVar}.addEventListener('${event}', (e) => { e.preventDefault(); ${handler}(${args}); });`];
    }
    return [`${i}${elVar}.addEventListener('${event}', () => ${handler}(${args}));`];
  }
  if (attr.modifier) {
    return [`${i}${elVar}.addEventListener('${event}', (e) => { if (e.key === '${capitalize(attr.modifier)}') ${handler}(); });`];
  }
  return [`${i}${elVar}.addEventListener('${event}', ${handler});`];
}

function emitBindAttr(attr: VAttr, elVar: string, ctx: GenContext): string[] {
  const i = ind(ctx);
  if (!attr.value || attr.value.kind !== 'identifier') return [];
  const name = attr.value.name;
  const setter = 'set' + capitalize(name);
  return [
    `${i}${elVar}.value = ${name}();`,
    `${i}createEffect(() => { ${elVar}.value = ${name}(); }, { name: 'bind:${name}', module: $m });`,
    `${i}${elVar}.addEventListener('input', (e) => { ${setter}(e.target.value); });`,
  ];
}

// Expressions

function emitExpr(expr: Expr, ctx: GenContext): string {
  switch (expr.kind) {
    case 'literal':
      if (expr.type === 'string') return JSON.stringify(expr.value);
      return String(expr.value);
    case 'identifier':
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
    case 'template':
      return `''`; // template not fully supported yet
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
