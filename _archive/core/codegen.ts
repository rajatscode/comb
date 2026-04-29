// codegen.ts — JavaScript code generator for Comb AST
// Emits readable JavaScript that uses the Comb runtime

import type {
  Module, Declaration, SignalDecl, CombDecl, AlwaysBlock,
  ViewBlock, EnumDecl, Statement, SignalAssign, IfStatement,
  ExprStatement, VNode, VElement, VText, VExpr, VIf, VFor,
  VComponent, VAttr, Expr, Literal, Identifier, BinaryExpr,
  UnaryExpr, TernaryExpr, CallExpr, MemberExpr, IndexExpr,
  ArrayExpr, ObjectExpr, SpreadExpr, LambdaExpr, RangeExpr,
} from './ast.js';

// ============================================================
// Code generation context
// ============================================================

interface GenContext {
  moduleName: string;
  signals: Set<string>;       // signal names (need getter/setter)
  combs: Set<string>;         // comb names (need getter call)
  params: Set<string>;        // module param names
  enums: Map<string, string[]>; // enum name → variants
  indent: number;
  varCounter: number;
}

function newContext(moduleName: string): GenContext {
  return {
    moduleName,
    signals: new Set(),
    combs: new Set(),
    params: new Set(),
    enums: new Map(),
    indent: 1,
    varCounter: 0,
  };
}

function indent(ctx: GenContext): string {
  return '  '.repeat(ctx.indent);
}

function nextVar(ctx: GenContext, prefix = 'el'): string {
  return `${prefix}${++ctx.varCounter}`;
}

// ============================================================
// Main entry
// ============================================================

export function generate(modules: Module[]): string {
  const parts: string[] = [];

  // Imports
  parts.push(
    "import { createSignal, createComb, createEffect, batch } from '../runtime/signals.js';",
    "import { circuit } from '../runtime/circuit.js';",
    '',
  );

  for (const mod of modules) {
    parts.push(generateModule(mod));
    parts.push('');
  }

  return parts.join('\n');
}

// ============================================================
// Module generation
// ============================================================

function generateModule(mod: Module): string {
  const ctx = newContext(mod.name);
  const lines: string[] = [];

  // Collect signal/comb/enum names first (for reactive access patterns)
  for (const decl of mod.body) {
    if (decl.kind === 'signal') ctx.signals.add(decl.name);
    if (decl.kind === 'comb') ctx.combs.add(decl.name);
    if (decl.kind === 'enum') ctx.enums.set(decl.name, decl.variants);
  }
  for (const p of mod.params) {
    ctx.params.add(p.name);
  }

  // Module function signature
  const paramNames = mod.params.map(p => p.name);
  const paramList = paramNames.length > 0
    ? `{ ${paramNames.join(', ')} }, root`
    : 'root';
  lines.push(`export function ${mod.name}(${paramList}) {`);
  lines.push(`  const moduleId = '${mod.name}';`);
  lines.push('');

  // Generate each declaration
  for (const decl of mod.body) {
    const declLines = generateDeclaration(decl, ctx);
    lines.push(...declLines);
    lines.push('');
  }

  lines.push('}');
  return lines.join('\n');
}

// ============================================================
// Declaration generation
// ============================================================

function generateDeclaration(decl: Declaration, ctx: GenContext): string[] {
  switch (decl.kind) {
    case 'signal': return generateSignal(decl, ctx);
    case 'comb': return generateComb(decl, ctx);
    case 'always': return generateAlways(decl, ctx);
    case 'view': return generateView(decl, ctx);
    case 'enum': return generateEnum(decl, ctx);
  }
}

function generateSignal(decl: SignalDecl, ctx: GenContext): string[] {
  const i = indent(ctx);
  const setterName = 'set' + capitalize(decl.name);
  const initExpr = generateExprRead(decl.initial, ctx);
  return [
    `${i}// Signal: ${decl.name}`,
    `${i}const [${decl.name}, ${setterName}] = createSignal(${initExpr}, '${decl.name}', moduleId);`,
  ];
}

function generateComb(decl: CombDecl, ctx: GenContext): string[] {
  const i = indent(ctx);
  const expr = generateExprRead(decl.expr, ctx);
  return [
    `${i}// Combinational: ${decl.name}`,
    `${i}const ${decl.name} = createComb(() => ${expr}, '${decl.name}', moduleId);`,
  ];
}

function generateEnum(decl: EnumDecl, ctx: GenContext): string[] {
  const i = indent(ctx);
  const lines: string[] = [];
  lines.push(`${i}// Enum: ${decl.name}`);
  lines.push(`${i}const ${decl.name} = Object.freeze({`);
  for (const variant of decl.variants) {
    lines.push(`${i}  ${variant}: '${decl.name}.${variant}',`);
  }
  lines.push(`${i}});`);
  return lines;
}

function generateAlways(decl: AlwaysBlock, ctx: GenContext): string[] {
  const i = indent(ctx);
  const lines: string[] = [];
  const eventName = decl.trigger.name;
  const params = decl.trigger.params;
  const paramList = params.length > 0 ? params.join(', ') : '';

  lines.push(`${i}// Event handler: ${eventName}`);
  lines.push(`${i}function ${eventName}(${paramList}) {`);
  lines.push(`${i}  batch(() => {`);

  ctx.indent += 2;
  for (const stmt of decl.body) {
    lines.push(...generateStatement(stmt, ctx));
  }
  ctx.indent -= 2;

  lines.push(`${i}  });`);
  lines.push(`${i}}`);
  return lines;
}

// ============================================================
// Statement generation
// ============================================================

function generateStatement(stmt: Statement, ctx: GenContext): string[] {
  switch (stmt.kind) {
    case 'assign': return generateAssign(stmt, ctx);
    case 'if': return generateIf(stmt, ctx);
    case 'expr_stmt': return generateExprStmt(stmt, ctx);
  }
}

function generateAssign(stmt: SignalAssign, ctx: GenContext): string[] {
  const i = indent(ctx);
  const value = generateExprRead(stmt.value, ctx);

  // Simple signal assignment: signal <= value → setSignal(value)
  if (stmt.target.kind === 'identifier') {
    const setterName = 'set' + capitalize(stmt.target.name);
    return [`${i}${setterName}(${value});`];
  }

  // Indexed assignment: arr[i][j] <= value → setArr(produce(arr(), i, j, value))
  // For simplicity, generate a functional update
  if (stmt.target.kind === 'index') {
    const { base, indices } = flattenIndex(stmt.target);
    if (base.kind === 'identifier') {
      const setterName = 'set' + capitalize(base.name);
      const baseName = base.name;
      // Generate a deep clone + set
      const idxExprs = indices.map(idx => generateExprRead(idx, ctx));
      // Use a helper approach: clone, set path, return
      const tempVar = nextVar(ctx, 'arr');
      const lines: string[] = [];
      lines.push(`${i}const ${tempVar} = JSON.parse(JSON.stringify(${baseName}()));`);
      let access = tempVar;
      for (let k = 0; k < idxExprs.length - 1; k++) {
        access += `[${idxExprs[k]}]`;
      }
      access += `[${idxExprs[idxExprs.length - 1]}]`;
      lines.push(`${i}${access} = ${value};`);
      lines.push(`${i}${setterName}(${tempVar});`);
      return lines;
    }
  }

  // Fallback
  const target = generateExprRead(stmt.target, ctx);
  return [`${i}/* TODO: assign */ ${target} = ${value};`];
}

function generateIf(stmt: IfStatement, ctx: GenContext): string[] {
  const i = indent(ctx);
  const cond = generateExprRead(stmt.condition, ctx);
  const lines: string[] = [];
  lines.push(`${i}if (${cond}) {`);
  ctx.indent++;
  for (const s of stmt.then) {
    lines.push(...generateStatement(s, ctx));
  }
  ctx.indent--;
  if (stmt.else_ && stmt.else_.length > 0) {
    // Check if else is a single @if (chained)
    if (stmt.else_.length === 1 && stmt.else_[0].kind === 'if') {
      lines.push(`${i}} else {`);
      ctx.indent++;
      lines.push(...generateStatement(stmt.else_[0], ctx));
      ctx.indent--;
      lines.push(`${i}}`);
    } else {
      lines.push(`${i}} else {`);
      ctx.indent++;
      for (const s of stmt.else_) {
        lines.push(...generateStatement(s, ctx));
      }
      ctx.indent--;
      lines.push(`${i}}`);
    }
  } else {
    lines.push(`${i}}`);
  }
  return lines;
}

function generateExprStmt(stmt: ExprStatement, ctx: GenContext): string[] {
  const i = indent(ctx);
  const expr = generateExprRead(stmt.expr, ctx);
  return [`${i}${expr};`];
}

// ============================================================
// View generation
// ============================================================

function generateView(decl: ViewBlock, ctx: GenContext): string[] {
  const i = indent(ctx);
  const lines: string[] = [];
  lines.push(`${i}// View`);
  lines.push(`${i}function render() {`);
  ctx.indent++;
  for (const child of decl.children) {
    lines.push(...generateVNode(child, 'root', ctx));
  }
  ctx.indent--;
  lines.push(`${i}}`);
  lines.push('');
  lines.push(`${i}render();`);
  return lines;
}

function generateVNode(node: VNode, parentVar: string, ctx: GenContext): string[] {
  switch (node.kind) {
    case 'element': return generateVElement(node, parentVar, ctx);
    case 'component': return generateVComponent(node, parentVar, ctx);
    case 'text': return generateVText(node, parentVar, ctx);
    case 'expr': return generateVExprNode(node, parentVar, ctx);
    case 'if': return generateVIf(node, parentVar, ctx);
    case 'for': return generateVFor(node, parentVar, ctx);
    default: return [];
  }
}

function generateVElement(node: VElement, parentVar: string, ctx: GenContext): string[] {
  const i = indent(ctx);
  const lines: string[] = [];
  const varName = nextVar(ctx);

  // Build static attrs
  const staticAttrs: string[] = [];
  const dynamicAttrs: VAttr[] = [];
  const eventAttrs: VAttr[] = [];

  for (const attr of node.attrs) {
    if (attr.isEvent) {
      eventAttrs.push(attr);
    } else if (attr.isBind) {
      dynamicAttrs.push(attr);
    } else if (attr.value && attr.value.kind === 'literal' && attr.value.type === 'string') {
      staticAttrs.push(`'${attr.name}': '${attr.value.value}'`);
    } else if (attr.value) {
      dynamicAttrs.push(attr);
    }
  }

  // Create element
  if (staticAttrs.length > 0) {
    lines.push(`${i}const ${varName} = document.createElement('${node.tag}');`);
    for (const attr of node.attrs) {
      if (!attr.isEvent && !attr.isBind && attr.value && attr.value.kind === 'literal' && attr.value.type === 'string') {
        lines.push(`${i}${varName}.setAttribute('${attr.name}', '${attr.value.value}');`);
      }
    }
  } else {
    lines.push(`${i}const ${varName} = document.createElement('${node.tag}');`);
  }

  // Dynamic attributes
  for (const attr of dynamicAttrs) {
    if (attr.isBind && attr.value) {
      // Two-way binding
      const signalName = attr.value.kind === 'identifier' ? attr.value.name : generateExprRead(attr.value, ctx);
      const setterName = 'set' + capitalize(signalName);
      lines.push(`${i}${varName}.value = ${signalName}();`);
      lines.push(`${i}createEffect(() => { ${varName}.value = ${signalName}(); }, 'bind_${signalName}', moduleId);`);
      lines.push(`${i}${varName}.addEventListener('input', (e) => { ${setterName}(e.target.value); });`);
    } else if (attr.value) {
      const exprCode = generateExprRead(attr.value, ctx);
      if (isReactive(attr.value, ctx)) {
        lines.push(`${i}createEffect(() => { ${varName}.setAttribute('${attr.name}', ${exprCode}); }, 'attr_${attr.name}', moduleId);`);
      } else {
        lines.push(`${i}${varName}.setAttribute('${attr.name}', ${exprCode});`);
      }
    }
  }

  // Event handlers
  for (const attr of eventAttrs) {
    const eventName = attr.name;
    const handlerName = attr.value && attr.value.kind === 'identifier' ? attr.value.name : 'unknown';
    const domEvent = eventName === 'contextmenu' ? 'contextmenu' : eventName;

    if (attr.eventArgs && attr.eventArgs.length > 0) {
      const args = attr.eventArgs.map(a => generateExprRead(a, ctx)).join(', ');
      if (domEvent === 'contextmenu') {
        lines.push(`${i}${varName}.addEventListener('${domEvent}', (e) => { e.preventDefault(); ${handlerName}(${args}); });`);
      } else {
        lines.push(`${i}${varName}.addEventListener('${domEvent}', () => ${handlerName}(${args}));`);
      }
    } else if (attr.modifier) {
      // e.g. @keydown.enter=send
      lines.push(`${i}${varName}.addEventListener('${domEvent}', (e) => { if (e.key === '${capitalize(attr.modifier)}') ${handlerName}(); });`);
    } else {
      lines.push(`${i}${varName}.addEventListener('${domEvent}', ${handlerName});`);
    }
  }

  // Children
  for (const child of node.children) {
    lines.push(...generateVNode(child, varName, ctx));
  }

  lines.push(`${i}${parentVar}.appendChild(${varName});`);
  return lines;
}

function generateVComponent(node: VComponent, parentVar: string, ctx: GenContext): string[] {
  const i = indent(ctx);
  const lines: string[] = [];
  const containerVar = nextVar(ctx, 'container');

  lines.push(`${i}const ${containerVar} = document.createElement('div');`);
  lines.push(`${i}${containerVar}.style.display = 'contents';`);

  // Build props object
  const propsEntries: string[] = [];
  const eventAttrs: VAttr[] = [];
  for (const prop of node.props) {
    if (prop.isEvent) {
      eventAttrs.push(prop);
    } else if (prop.value) {
      const val = generateExprRead(prop.value, ctx);
      propsEntries.push(`${prop.name}: ${val}`);
    }
  }

  const propsObj = propsEntries.length > 0
    ? `{ ${propsEntries.join(', ')} }`
    : '{}';
  lines.push(`${i}${node.name}(${propsObj}, ${containerVar});`);

  // Attach events to the container
  for (const attr of eventAttrs) {
    const eventName = attr.name;
    const handlerName = attr.value && attr.value.kind === 'identifier' ? attr.value.name : 'unknown';
    const domEvent = eventName === 'contextmenu' ? 'contextmenu' : eventName;

    if (attr.eventArgs && attr.eventArgs.length > 0) {
      const args = attr.eventArgs.map(a => generateExprRead(a, ctx)).join(', ');
      if (domEvent === 'contextmenu') {
        lines.push(`${i}${containerVar}.addEventListener('${domEvent}', (e) => { e.preventDefault(); ${handlerName}(${args}); });`);
      } else {
        lines.push(`${i}${containerVar}.addEventListener('${domEvent}', () => ${handlerName}(${args}));`);
      }
    } else {
      lines.push(`${i}${containerVar}.addEventListener('${domEvent}', ${handlerName});`);
    }
  }

  lines.push(`${i}${parentVar}.appendChild(${containerVar});`);
  return lines;
}

function generateVText(node: VText, parentVar: string, ctx: GenContext): string[] {
  const i = indent(ctx);
  const varName = nextVar(ctx, 'txt');
  lines_result: {
    return [
      `${i}const ${varName} = document.createTextNode('${escapeString(node.value)}');`,
      `${i}${parentVar}.appendChild(${varName});`,
    ];
  }
}

function generateVExprNode(node: VExpr, parentVar: string, ctx: GenContext): string[] {
  const i = indent(ctx);
  const lines: string[] = [];
  const varName = nextVar(ctx, 'txt');
  const expr = generateExprRead(node.expr, ctx);

  if (isReactive(node.expr, ctx)) {
    lines.push(`${i}const ${varName} = document.createTextNode('');`);
    lines.push(`${i}createEffect(() => { ${varName}.textContent = String(${expr}); }, 'text_${varName}', moduleId);`);
  } else {
    lines.push(`${i}const ${varName} = document.createTextNode(String(${expr}));`);
  }
  lines.push(`${i}${parentVar}.appendChild(${varName});`);
  return lines;
}

function generateVIf(node: VIf, parentVar: string, ctx: GenContext): string[] {
  const i = indent(ctx);
  const lines: string[] = [];
  const anchorVar = nextVar(ctx, 'anchor');
  const containerVar = nextVar(ctx, 'ifBlock');

  lines.push(`${i}const ${anchorVar} = document.createComment('@if');`);
  lines.push(`${i}${parentVar}.appendChild(${anchorVar});`);
  lines.push(`${i}let ${containerVar} = null;`);

  const condExpr = generateExprRead(node.condition, ctx);

  lines.push(`${i}createEffect(() => {`);
  ctx.indent++;
  const ii = indent(ctx);
  lines.push(`${ii}if (${containerVar}) { ${containerVar}.remove(); ${containerVar} = null; }`);
  lines.push(`${ii}if (${condExpr}) {`);
  ctx.indent++;
  const thenContainer = nextVar(ctx, 'then');
  lines.push(`${indent(ctx)}${containerVar} = document.createElement('div');`);
  lines.push(`${indent(ctx)}${containerVar}.style.display = 'contents';`);
  for (const child of node.then) {
    lines.push(...generateVNode(child, containerVar, ctx));
  }
  lines.push(`${indent(ctx)}${anchorVar}.parentNode.insertBefore(${containerVar}, ${anchorVar}.nextSibling);`);
  ctx.indent--;

  if (node.else_ && node.else_.length > 0) {
    lines.push(`${ii}} else {`);
    ctx.indent++;
    const elseContainer = nextVar(ctx, 'elseBlock');
    lines.push(`${indent(ctx)}${containerVar} = document.createElement('div');`);
    lines.push(`${indent(ctx)}${containerVar}.style.display = 'contents';`);
    for (const child of node.else_) {
      lines.push(...generateVNode(child, containerVar, ctx));
    }
    lines.push(`${indent(ctx)}${anchorVar}.parentNode.insertBefore(${containerVar}, ${anchorVar}.nextSibling);`);
    ctx.indent--;
  }

  lines.push(`${ii}}`);
  ctx.indent--;
  lines.push(`${i}}, 'if_${anchorVar}', moduleId);`);

  return lines;
}

function generateVFor(node: VFor, parentVar: string, ctx: GenContext): string[] {
  const i = indent(ctx);
  const lines: string[] = [];
  const anchorVar = nextVar(ctx, 'forAnchor');
  const containerVar = nextVar(ctx, 'forBlock');

  lines.push(`${i}const ${anchorVar} = document.createComment('@for');`);
  lines.push(`${i}${parentVar}.appendChild(${anchorVar});`);
  lines.push(`${i}let ${containerVar} = null;`);

  const iterExpr = generateExprRead(node.iterable, ctx);

  lines.push(`${i}createEffect(() => {`);
  ctx.indent++;
  const ii = indent(ctx);
  lines.push(`${ii}if (${containerVar}) { ${containerVar}.remove(); ${containerVar} = null; }`);
  lines.push(`${ii}${containerVar} = document.createElement('div');`);
  lines.push(`${ii}${containerVar}.style.display = 'contents';`);

  // Generate range iteration
  if (node.iterable.kind === 'range') {
    const startExpr = generateExprRead(node.iterable.start, ctx);
    const endExpr = generateExprRead(node.iterable.end, ctx);
    lines.push(`${ii}for (let ${node.variable} = ${startExpr}; ${node.variable} < ${endExpr}; ${node.variable}++) {`);
  } else {
    lines.push(`${ii}const __items = ${iterExpr};`);
    lines.push(`${ii}for (const ${node.variable} of __items) {`);
  }

  ctx.indent++;
  for (const child of node.body) {
    lines.push(...generateVNode(child, containerVar, ctx));
  }
  ctx.indent--;

  lines.push(`${ii}}`);
  lines.push(`${ii}${anchorVar}.parentNode.insertBefore(${containerVar}, ${anchorVar}.nextSibling);`);
  ctx.indent--;
  lines.push(`${i}}, 'for_${anchorVar}', moduleId);`);

  return lines;
}

// ============================================================
// Expression generation
// ============================================================

function generateExprRead(expr: Expr, ctx: GenContext): string {
  switch (expr.kind) {
    case 'literal':
      return generateLiteral(expr);
    case 'identifier':
      return generateIdentifierRead(expr, ctx);
    case 'binary':
      return generateBinary(expr, ctx);
    case 'unary':
      return generateUnary(expr, ctx);
    case 'ternary':
      return generateTernary(expr, ctx);
    case 'call':
      return generateCall(expr, ctx);
    case 'member':
      return generateMember(expr, ctx);
    case 'index':
      return generateIndex(expr, ctx);
    case 'array':
      return generateArray(expr, ctx);
    case 'object':
      return generateObject(expr, ctx);
    case 'spread':
      return `...${generateExprRead(expr.expr, ctx)}`;
    case 'lambda':
      return generateLambda(expr, ctx);
    case 'range':
      return generateRange(expr, ctx);
    default:
      return '/* unknown expr */';
  }
}

function generateLiteral(expr: Literal): string {
  if (expr.type === 'string') return JSON.stringify(expr.value);
  if (expr.type === 'boolean') return String(expr.value);
  return String(expr.value);
}

function generateIdentifierRead(expr: Identifier, ctx: GenContext): string {
  const name = expr.name;
  // Signals and combs are accessed as function calls
  if (ctx.signals.has(name) || ctx.combs.has(name)) {
    return `${name}()`;
  }
  // Params are direct access
  if (ctx.params.has(name)) {
    return name;
  }
  // Enum names are direct access
  if (ctx.enums.has(name)) {
    return name;
  }
  // Everything else: could be a local var, enum reference, etc.
  return name;
}

function generateBinary(expr: BinaryExpr, ctx: GenContext): string {
  const left = generateExprRead(expr.left, ctx);
  const right = generateExprRead(expr.right, ctx);
  const op = expr.op === '<=' ? '<=' : expr.op; // <= in expression = LTE
  return `(${left} ${op} ${right})`;
}

function generateUnary(expr: UnaryExpr, ctx: GenContext): string {
  const operand = generateExprRead(expr.operand, ctx);
  return `${expr.op}${operand}`;
}

function generateTernary(expr: TernaryExpr, ctx: GenContext): string {
  const cond = generateExprRead(expr.condition, ctx);
  const then = generateExprRead(expr.then, ctx);
  const else_ = generateExprRead(expr.else_, ctx);
  return `(${cond} ? ${then} : ${else_})`;
}

function generateCall(expr: CallExpr, ctx: GenContext): string {
  // Built-in free functions
  if (expr.callee.kind === 'identifier') {
    const name = expr.callee.name;
    const args = expr.args.map(a => generateExprRead(a, ctx)).join(', ');
    if (name === 'str') return `String(${args})`;
    if (name === 'int') return `parseInt(${args}, 10)`;
    if (name === 'float') return `parseFloat(${args})`;
    if (name === 'now') return `Date.now()`;
    if (name === 'format_time') return `new Date(${args}).toLocaleTimeString()`;
    return `${generateExprRead(expr.callee, ctx)}(${args})`;
  }

  // Built-in method call translations
  if (expr.callee.kind === 'member') {
    const obj = generateExprRead(expr.callee.object, ctx);
    const method = expr.callee.property;
    const args = expr.args.map(a => generateExprRead(a, ctx)).join(', ');

    // .len() → .length (property, no call parens)
    if (method === 'len' && expr.args.length === 0) return `${obj}.length`;

    return `${obj}.${method}(${args})`;
  }

  const callee = generateExprRead(expr.callee, ctx);
  const args = expr.args.map(a => generateExprRead(a, ctx)).join(', ');
  return `${callee}(${args})`;
}

function generateMember(expr: MemberExpr, ctx: GenContext): string {
  const obj = generateExprRead(expr.object, ctx);
  return `${obj}.${expr.property}`;
}

function generateIndex(expr: IndexExpr, ctx: GenContext): string {
  const obj = generateExprRead(expr.object, ctx);
  const idx = generateExprRead(expr.index, ctx);
  return `${obj}[${idx}]`;
}

function generateArray(expr: ArrayExpr, ctx: GenContext): string {
  const elements = expr.elements.map(e => generateExprRead(e, ctx)).join(', ');
  return `[${elements}]`;
}

function generateObject(expr: ObjectExpr, ctx: GenContext): string {
  const props = expr.properties.map(p => {
    const val = generateExprRead(p.value, ctx);
    return `${p.key}: ${val}`;
  }).join(', ');
  return `{ ${props} }`;
}

function generateLambda(expr: LambdaExpr, ctx: GenContext): string {
  const params = expr.params.join(', ');
  const body = generateExprRead(expr.body, ctx);
  return `(${params}) => ${body}`;
}

function generateRange(expr: RangeExpr, ctx: GenContext): string {
  const start = generateExprRead(expr.start, ctx);
  const end = generateExprRead(expr.end, ctx);
  return `Array.from({ length: ${end} - ${start} }, (_, i) => i + ${start})`;
}

// ============================================================
// Helpers
// ============================================================

function isReactive(expr: Expr, ctx: GenContext): boolean {
  switch (expr.kind) {
    case 'identifier':
      return ctx.signals.has(expr.name) || ctx.combs.has(expr.name);
    case 'binary':
      return isReactive(expr.left, ctx) || isReactive(expr.right, ctx);
    case 'unary':
      return isReactive(expr.operand, ctx);
    case 'ternary':
      return isReactive(expr.condition, ctx) || isReactive(expr.then, ctx) || isReactive(expr.else_, ctx);
    case 'call':
      return isReactive(expr.callee, ctx) || expr.args.some(a => isReactive(a, ctx));
    case 'member':
      return isReactive(expr.object, ctx);
    case 'index':
      return isReactive(expr.object, ctx) || isReactive(expr.index, ctx);
    case 'array':
      return expr.elements.some(e => isReactive(e, ctx));
    default:
      return false;
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

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
