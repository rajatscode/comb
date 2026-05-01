// compiler-test.ts — Verification tests for the compiler pipeline
// Run: npx tsx src/core/compiler-test.ts

import { compile } from './compiler.js';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

console.log('\nCompiler Verification Tests\n');

// Test 1: counter.comb produces clean graph
test('counter.comb — clean compile with correct deps', () => {
  const source = fs.readFileSync(path.resolve('examples/counter.comb'), 'utf-8');
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.graph !== undefined, 'Expected graph output');
  assert(result.ast !== undefined, 'Expected AST output');

  const graph = result.graph!;
  const signalNodes = graph.nodes.filter(n => n.type === 'signal');
  const combNodes = graph.nodes.filter(n => n.type === 'comb');
  const eventNodes = graph.nodes.filter(n => n.type === 'event');

  assert(signalNodes.length === 2, `Expected 2 signals, got ${signalNodes.length}`);
  const sigNames = signalNodes.map(n => n.name).sort();
  assert(sigNames.includes('count'), `Expected signal 'count'`);
  assert(sigNames.includes('accent'), `Expected signal 'accent' (token)`);

  assert(combNodes.length === 2, `Expected 2 combs, got ${combNodes.length}`);
  const combNames = combNodes.map(n => n.name).sort();
  assert(combNames[0] === 'doubled' && combNames[1] === 'label', `Expected combs [doubled, label], got ${combNames}`);

  // Check data edges: count → label, count → doubled
  const dataEdges = graph.edges.filter(e => e.type === 'data' && e.from === 'count');
  const dataTargets = dataEdges.map(e => e.to).sort();
  assert(dataTargets.includes('doubled'), 'Expected edge count → doubled');
  assert(dataTargets.includes('label'), 'Expected edge count → label');

  assert(eventNodes.length === 3, `Expected 3 events, got ${eventNodes.length}`);
});

// Test 2: traffic-light.comb compiles
test('traffic-light.comb — clean compile', () => {
  const source = fs.readFileSync(path.resolve('examples/traffic-light.comb'), 'utf-8');
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.graph !== undefined, 'Expected graph output');

  const graph = result.graph!;
  const signals = graph.nodes.filter(n => n.type === 'signal');
  assert(signals.length === 3, `Expected 3 signals, got ${signals.length}`);

  // comb 'color' depends on 'phase', comb 'can_walk' depends on 'phase' and 'walk_requested'
  const ast = result.ast!;
  const colorComb = ast.body.find(d => d.kind === 'comb' && d.name === 'color') as any;
  assert(colorComb.deps.includes('phase'), 'color should depend on phase');

  const canWalkComb = ast.body.find(d => d.kind === 'comb' && d.name === 'can_walk') as any;
  assert(canWalkComb.deps.includes('phase'), 'can_walk should depend on phase');
  assert(canWalkComb.deps.includes('walk_requested'), 'can_walk should depend on walk_requested');
});

// Test 3: undefined reference → compile error
test('undefined reference produces error', () => {
  const source = `
module Bad {
  signal x: int = 0;
  comb derived = x + nonexistent;
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected errors for undefined reference');
  assert(result.errors.some(e => e.message.includes('nonexistent')), `Error should mention 'nonexistent', got: ${result.errors.map(e => e.message)}`);
});

// Test 4: circular comb dependency → cycle error
test('circular comb dependency produces error', () => {
  const source = `
module Cycle {
  signal s: int = 0;
  comb a = b + 1;
  comb b = a + 1;
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected errors for circular dependency');
  assert(result.errors.some(e => e.message.includes('Circular') || e.message.includes('cycle')), `Error should mention circularity, got: ${result.errors.map(e => e.message)}`);
});

// Test 5: writing to a comb → error
test('writing to comb in always block produces error', () => {
  const source = `
module WriteErr {
  signal x: int = 0;
  comb derived = x * 2;
  always @(update) {
    derived <= 5;
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for writing to comb');
  assert(result.errors.some(e => e.message.includes('derived') && e.message.includes('comb')), `Error should mention writing to comb, got: ${result.errors.map(e => e.message)}`);
});

// Test 6: always block reads/writes populated
test('always block reads and writes correctly populated', () => {
  const source = `
module RW {
  signal a: int = 0;
  signal b: int = 0;
  always @(swap) {
    a <= b;
    b <= a;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const ast = result.ast!;
  const always = ast.body.find(d => d.kind === 'always') as any;
  assert(always.writes.includes('a'), 'Should write to a');
  assert(always.writes.includes('b'), 'Should write to b');
  assert(always.reads.includes('a'), 'Should read a');
  assert(always.reads.includes('b'), 'Should read b');
});

// Test 7: view bindings in graph — fine-grained view-effect nodes
test('view bindings create fine-grained graph nodes', () => {
  const source = `
module ViewTest {
  signal count: int = 0;
  comb display = count + 1;
  view {
    <p>{display}</p>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const graph = result.graph!;
  const viewEffects = graph.nodes.filter(n => n.type === 'view-effect');
  assert(viewEffects.length >= 1, `Expected at least 1 view-effect node, got ${viewEffects.length}`);
  const displayEffect = viewEffects.find(n => n.id === 'view:display');
  assert(displayEffect !== undefined, 'Expected view:display node');
  assert(displayEffect!.viewTarget !== undefined, 'Expected viewTarget on view:display');
  assert(displayEffect!.viewTarget!.element === 'p', `Expected element 'p', got '${displayEffect!.viewTarget!.element}'`);
  assert(displayEffect!.viewTarget!.binding === 'text', `Expected binding 'text', got '${displayEffect!.viewTarget!.binding}'`);
  const displayEdge = graph.edges.find(e => e.to === 'view:display' && e.from === 'display');
  assert(displayEdge !== undefined, 'Expected edge display → view:display');
});

// Test 8: object literal values tracked as deps
test('comb deps from object literal values', () => {
  const source = `
module ObjTest {
  signal x: int = 1;
  signal y: int = 2;
  comb info = { a: x, b: y };
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const ast = result.ast!;
  const infoComb = ast.body.find(d => d.kind === 'comb' && d.name === 'info') as any;
  assert(infoComb.deps.includes('x'), 'info should depend on x');
  assert(infoComb.deps.includes('y'), 'info should depend on y');
});

// Test 9: <= inside bare if blocks within always blocks
test('signal assign inside bare if/else in always block', () => {
  const source = `
module IfTest {
  enum Phase { Red, Green, Yellow }
  signal phase: Phase = Phase.Red;
  always @(next_phase) {
    if (phase == Phase.Red) {
      phase <= Phase.Green;
    } else if (phase == Phase.Green) {
      phase <= Phase.Yellow;
    } else {
      phase <= Phase.Red;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const ast = result.ast!;
  const always = ast.body.find(d => d.kind === 'always') as any;
  assert(always.writes.includes('phase'), 'Should write to phase');
  assert(always.reads.includes('phase'), 'Should read phase');
});

// Test 10: sensitivity-triggered always block — clean compile
test('sensitivity-triggered always — clean compile with graph', () => {
  const source = `
module TempConvert {
  signal celsius: int = 0;
  signal fahrenheit: int = 32;

  always @(celsius) {
    fahrenheit <= celsius * 9 / 5 + 32;
  }

  always @(fahrenheit) {
    celsius <= (fahrenheit - 32) * 5 / 9;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const graph = result.graph!;
  const sensNodes = graph.nodes.filter(n => n.type === 'sensitivity');
  assert(sensNodes.length === 2, `Expected 2 sensitivity nodes, got ${sensNodes.length}`);

  // Check edges: celsius → sense node → fahrenheit
  const sensEdgesFromCelsius = graph.edges.filter(e => e.from === 'celsius' && e.type === 'data');
  assert(sensEdgesFromCelsius.length > 0, 'Expected data edge from celsius to sensitivity node');
  const sensWriteToFahr = graph.edges.filter(e => e.to === 'fahrenheit' && e.type === 'write');
  assert(sensWriteToFahr.length > 0, 'Expected write edge from sensitivity node to fahrenheit');
});

// Test 11: sensitivity list — read outside sensitivity list → error
test('sensitivity — read outside sensitivity list produces error', () => {
  const source = `
module Bad {
  signal a: int = 0;
  signal b: int = 0;
  signal c: int = 0;

  always @(a) {
    c <= a + b;
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for reading b outside sensitivity list');
  assert(result.errors.some(e => e.message.includes("'b'") && e.message.includes('sensitivity')), `Error should mention b and sensitivity, got: ${result.errors.map(e => e.message)}`);
});

// Test 12: sensitivity list — write to own sensitivity signal → error
test('sensitivity — self-triggering write produces error', () => {
  const source = `
module Bad {
  signal x: int = 0;

  always @(x) {
    x <= x + 1;
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for self-triggering write');
  assert(result.errors.some(e => e.message.includes("'x'") && e.message.includes('self-trigger')), `Error should mention self-trigger, got: ${result.errors.map(e => e.message)}`);
});

// Test 13: sensitivity list — undefined signal in sensitivity list → error
test('sensitivity — undefined signal in list produces error', () => {
  const source = `
module Bad {
  signal a: int = 0;

  always @(a, nonexistent) {
    a <= 1;
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for undefined signal in sensitivity list');
  assert(result.errors.some(e => e.message.includes('nonexistent')), `Error should mention nonexistent, got: ${result.errors.map(e => e.message)}`);
});

// Test 14: sensitivity block generates createEffect in output
test('sensitivity — codegen emits createEffect', () => {
  const source = `
module Sync {
  signal a: int = 0;
  signal b: int = 0;

  always @(a) {
    b <= a * 2;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.js!.includes('createEffect'), 'Generated code should contain createEffect');
  assert(result.js!.includes('sense_a'), 'Generated code should contain sense_a name');
  assert(!result.js!.includes('function sense_a'), 'Should not generate a function declaration for sensitivity block');
});

// Test 15: token declaration — compiles to signal + CSS custom property effect
test('token declaration — signal + CSS custom property', () => {
  const source = `
module Theme {
  token primary: color = "#0052CC";
  token radius: length = "8px";
  comb info = primary;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('createSignal("#0052CC"'), 'Should create signal for token');
  assert(js.includes("setProperty('--primary'"), 'Should set CSS custom property --primary');
  assert(js.includes("setProperty('--radius'"), 'Should set CSS custom property --radius');
  assert(js.includes("token:primary"), 'Should name effect token:primary');

  // Token should appear as signal in graph with isToken
  const graph = result.graph!;
  const primaryNode = graph.nodes.find(n => n.name === 'primary');
  assert(primaryNode !== undefined, 'Expected primary node in graph');
  assert(primaryNode!.type === 'signal', 'Token should be signal type in graph');
  assert(primaryNode!.isToken === true, 'Token node should have isToken flag');

  // Comb should depend on token (treated as signal)
  const ast = result.ast!;
  const infoComb = ast.body.find(d => d.kind === 'comb' && d.name === 'info') as any;
  assert(infoComb.deps.includes('primary'), 'Comb should depend on token');
});

// Test 16: scoped style block — CSS scoping with hash
test('scoped style block — CSS class scoping', () => {
  const source = `
module Button {
  style {
    .btn { padding: 8px; }
    .btn:hover { background: blue; }
  }
  view {
    <button class="btn">Click</button>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  // Style should be injected
  assert(js.includes("document.createElement('style')"), 'Should create style element');
  assert(js.includes('document.head.appendChild(__style)'), 'Should append style to head');

  // CSS classes should be scoped with hash
  assert(js.includes('.btn_'), 'CSS should have scoped .btn_ class');

  // View class attribute should also be scoped
  assert(js.includes("'class', 'btn_"), 'View class attr should be scoped');
});

// Test 17: token in always block — writable like signal
test('token writable in always block', () => {
  const source = `
module Theme {
  token accent: color = "#ff0000";
  always @(setAccent(color)) {
    accent <= color;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('setAccent'), 'Should have setAccent event handler');
  assert(js.includes('setAccent(color)'), 'Should accept color param');
});

// Test 18: multi-module composition — clean compile
test('multi-module composition — clean compile', () => {
  const source = `
module Child {
  input label: string = "hello";
  output clicks: int = 0;

  always @(click) {
    clicks <= clicks + 1;
  }

  view {
    <div>
      <span>{label}</span>
      <button @click=click>Click</button>
    </div>
  }
}

module App {
  signal title: string = "Parent";
  signal childClicks: int = 0;

  view {
    <div>
      <h2>{title}</h2>
      <Child label={title} clicks:={childClicks} />
      <p>{childClicks}</p>
    </div>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  // Both modules should be in generated JS
  assert(js.includes('function Child('), 'Should generate Child factory');
  assert(js.includes('function App('), 'Should generate App factory');

  // Child should accept __props
  assert(js.includes('__props'), 'Child should use __props');
  assert(js.includes('__props.label'), 'Child should read label from __props');
  assert(js.includes('__props.clicks'), 'Child should read clicks from __props');

  // Child should return __ports
  assert(js.includes('__ports'), 'Child should return __ports');

  // Parent should wire reactive input effect
  assert(js.includes('wire:label'), 'Parent should create wire effect for label input');

  // Parent should wire output binding
  assert(js.includes('bind:clicks'), 'Parent should create bind effect for clicks output');
});

// Test 19: input is read-only — cannot write to input
test('input is read-only — write produces error', () => {
  const source = `
module Bad {
  input x: int = 0;
  always @(update) {
    x <= 5;
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for writing to input');
  assert(result.errors.some(e => e.message.includes("'x'") && e.message.includes('input') && e.message.includes('read-only')), `Error should mention input read-only, got: ${result.errors.map(e => e.message)}`);
});

// Test 20: output is writable in always blocks
test('output is writable in always block', () => {
  const source = `
module Counter {
  output count: int = 0;
  always @(inc) {
    count <= count + 1;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('setCount'), 'Should generate setter for output');
});

// Test 21: input used in comb expression
test('input used as comb dependency', () => {
  const source = `
module Display {
  input value: int = 0;
  comb doubled = value * 2;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const ast = result.modules![0];
  const comb = ast.body.find(d => d.kind === 'comb' && d.name === 'doubled') as any;
  assert(comb.deps.includes('value'), 'doubled should depend on input value');
});

// Test 22: := binding syntax parsed correctly
test(':= binding syntax parsed correctly', () => {
  const source = `
module Child {
  output result: int = 0;
  view { <span>{result}</span> }
}
module Parent {
  signal myResult: int = 0;
  view {
    <Child result:={myResult} />
    <span>{myResult}</span>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('bind:result'), 'Should wire output binding for result');
});

// --- Test 23: Event modifier @click.prevent ---
test('event modifier — @click.prevent emits preventDefault', () => {
  const source = `module App {
  signal x: int = 0;
  always @(go) { x <= x + 1; }
  view { <button @click.prevent=go>Go</button> }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const js = result.js!;
  assert(js.includes('e.preventDefault()'), 'Should emit e.preventDefault()');
  assert(js.includes("addEventListener('click'"), 'Should listen to click event');
});

// --- Test 24: Multiple event modifiers @submit.prevent.stop ---
test('event modifiers — @submit.prevent.stop emits both', () => {
  const source = `module App {
  signal x: int = 0;
  always @(go) { x <= x + 1; }
  view { <form @submit.prevent.stop=go><button>Go</button></form> }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const js = result.js!;
  assert(js.includes('e.preventDefault()'), 'Should emit e.preventDefault()');
  assert(js.includes('e.stopPropagation()'), 'Should emit e.stopPropagation()');
});

// --- Test 25: Token + scoped style in counter ---
test('counter.comb with token + scoped style compiles', () => {
  const counterSrc = fs.readFileSync(path.resolve('examples/counter.comb'), 'utf-8');
  const result = compile(counterSrc);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const js = result.js!;
  assert(js.includes('token:accent'), 'Should have token effect for accent');
  assert(js.includes('__style'), 'Should inject scoped style');
  assert(js.includes('counter_'), 'Should scope .counter class');
  assert(js.includes('display_'), 'Should scope .display class');
  assert(js.includes('var(--accent)'), 'Style should reference CSS var');
});

// --- Test 26: Cell + constraint — clean compile with createCell + createPropagator ---
test('cell + constraint — compiles to createCell + createPropagator', () => {
  const source = `
module TempConverter {
  cell celsius: float = 0.0;
  cell fahrenheit: float = 32.0;

  constraint convert {
    (celsius) => {
      fahrenheit <= celsius * 9.0 / 5.0 + 32.0;
    }
    (fahrenheit) => {
      celsius <= (fahrenheit - 32.0) * 5.0 / 9.0;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('createCell'), 'Should use createCell for cells');
  assert(js.includes('createPropagator'), 'Should use createPropagator for constraint clauses');
  assert(js.includes("name: 'celsius'"), 'Should name celsius cell');
  assert(js.includes("name: 'fahrenheit'"), 'Should name fahrenheit cell');
  assert(js.includes("convert:0"), 'Should name first clause convert:0');
  assert(js.includes("convert:1"), 'Should name second clause convert:1');

  // Graph should have cell and constraint nodes (per-clause)
  const graph = result.graph!;
  const cellNodes = graph.nodes.filter(n => n.type === 'cell');
  assert(cellNodes.length === 2, `Expected 2 cell nodes, got ${cellNodes.length}`);
  const constraintNodes = graph.nodes.filter(n => n.type === 'constraint');
  assert(constraintNodes.length === 2, `Expected 2 constraint nodes (one per clause), got ${constraintNodes.length}`);

  // Per-clause edges: clause 0 (celsius → fahrenheit), clause 1 (fahrenheit → celsius)
  const edges = graph.edges;
  assert(edges.some(e => e.from === 'celsius' && e.to === 'constraint:convert:0'), 'Edge celsius→constraint:convert:0');
  assert(edges.some(e => e.from === 'constraint:convert:0' && e.to === 'fahrenheit'), 'Edge constraint:convert:0→fahrenheit');
  assert(edges.some(e => e.from === 'fahrenheit' && e.to === 'constraint:convert:1'), 'Edge fahrenheit→constraint:convert:1');
  assert(edges.some(e => e.from === 'constraint:convert:1' && e.to === 'celsius'), 'Edge constraint:convert:1→celsius');
});

// --- Test 27: Constraint — reading non-input cell produces error ---
test('constraint — reading undeclared input produces error', () => {
  const source = `
module Bad {
  cell a: int = 0;
  cell b: int = 0;
  cell c: int = 0;

  constraint sync {
    (a) => {
      b <= a + c;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for reading undeclared input');
  assert(result.errors.some(e => e.message.includes("'c'") && e.message.includes('not declared')), `Error should mention undeclared read of c, got: ${result.errors.map(e => e.message)}`);
});

// --- Test 28: Constraint — self-triggering write produces error ---
test('constraint — writing to own input produces error', () => {
  const source = `
module Bad {
  cell x: int = 0;
  cell y: int = 0;

  constraint loop {
    (x) => {
      x <= x + 1;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for self-triggering write');
  assert(result.errors.some(e => e.message.includes("'x'") && e.message.includes('self-trigger')), `Error should mention self-trigger, got: ${result.errors.map(e => e.message)}`);
});

// --- Test 29: Constraint — non-cell input produces error ---
test('constraint — non-cell input produces error', () => {
  const source = `
module Bad {
  signal x: int = 0;
  cell y: int = 0;

  constraint sync {
    (x) => {
      y <= x;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for non-cell input');
  assert(result.errors.some(e => e.message.includes("'x'") && e.message.includes('not a cell')), `Error should mention not a cell, got: ${result.errors.map(e => e.message)}`);
});

// --- Test 30: counter.comb — fine-grained view-effect nodes ---
test('counter.comb — fine-grained view-effect nodes with viewTarget', () => {
  const counterSrc = fs.readFileSync(path.resolve('examples/counter.comb'), 'utf-8');
  const result = compile(counterSrc);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const graph = result.graph!;
  const viewEffects = graph.nodes.filter(n => n.type === 'view-effect');
  assert(viewEffects.length >= 2, `Expected at least 2 view-effect nodes, got ${viewEffects.length}`);

  // Should have view:label and view:doubled (or view:count depending on expressions)
  const labelEffect = viewEffects.find(n => n.id === 'view:label');
  const doubledEffect = viewEffects.find(n => n.id === 'view:doubled');
  assert(labelEffect !== undefined, `Expected view:label node, got: ${viewEffects.map(n => n.id)}`);
  assert(doubledEffect !== undefined, `Expected view:doubled node, got: ${viewEffects.map(n => n.id)}`);

  // viewTarget should have element and binding info
  assert(labelEffect!.viewTarget !== undefined, 'view:label should have viewTarget');
  assert(labelEffect!.viewTarget!.binding === 'text', 'view:label binding should be text');
  assert(doubledEffect!.viewTarget !== undefined, 'view:doubled should have viewTarget');
  assert(doubledEffect!.viewTarget!.binding === 'text', 'view:doubled binding should be text');

  // Edges should go from specific signals/combs to view nodes
  assert(graph.edges.some(e => e.from === 'label' && e.to === 'view:label'), 'Edge label→view:label');
  assert(graph.edges.some(e => e.from === 'doubled' && e.to === 'view:doubled'), 'Edge doubled→view:doubled');

  // Codegen should include viewTarget in effect metadata
  const js = result.js!;
  assert(js.includes('viewTarget:'), 'Generated JS should include viewTarget metadata');
  assert(js.includes("binding: 'text'"), 'Generated JS should include text binding');
});

// --- Test 31: Cell imports are conditional ---
test('cell/constraint imports only when used', () => {
  const source = `
module Simple {
  signal x: int = 0;
  comb doubled = x * 2;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const js = result.js!;
  assert(!js.includes('createCell'), 'Should not import createCell when no cells');
  assert(!js.includes('createPropagator'), 'Should not import createPropagator when no constraints');
});

// --- Test 32: Parsing @(posedge x) always block ---
test('posedge always block — clean compile', () => {
  const source = `
module EdgeTest {
  signal clk: bool = false;
  signal count: int = 0;

  always @(posedge clk) {
    count <= count + 1;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.js !== undefined, 'Expected JS output');

  const ast = result.ast!;
  const always = ast.body.find(d => d.kind === 'always') as any;
  assert(always !== undefined, 'Expected always block');
  assert(always.triggerKind === 'posedge', `Expected posedge trigger, got ${always.triggerKind}`);
  assert(always.edgeExpr !== undefined, 'Expected edge expression');
  assert(always.edgeExpr.kind === 'identifier' && always.edgeExpr.name === 'clk', 'Edge expr should be clk');
});

// --- Test 33: Parsing assert temporal ---
test('temporal assertion — clean parse and compile', () => {
  const source = `
module TemporalTest {
  signal x: bool = false;
  signal y: bool = false;

  assert temporal @(posedge x) eventually(y) within 5000;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.js !== undefined, 'Expected JS output');

  const ast = result.ast!;
  const temporal = ast.body.find(d => d.kind === 'temporal_assert') as any;
  assert(temporal !== undefined, 'Expected temporal_assert declaration');
  assert(temporal.operator === 'eventually', `Expected eventually operator, got ${temporal.operator}`);
  assert(temporal.triggerEdge === 'posedge', `Expected posedge edge, got ${temporal.triggerEdge}`);
  assert(temporal.duration === 5000, `Expected duration 5000, got ${temporal.duration}`);
  assert(temporal.trigger.kind === 'identifier' && temporal.trigger.name === 'x', 'Trigger should be x');
  assert(temporal.property.kind === 'identifier' && temporal.property.name === 'y', 'Property should be y');
});

// --- Test 34: Parsing range types int(0..255) ---
test('range type int(0..255) — parsed correctly', () => {
  const source = `
module RangeTest {
  signal r: int(0..255) = 128;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const ast = result.ast!;
  const sig = ast.body.find(d => d.kind === 'signal') as any;
  assert(sig.type.kind === 'range', `Expected range type, got ${sig.type.kind}`);
  assert(sig.type.min === 0, `Expected min 0, got ${sig.type.min}`);
  assert(sig.type.max === 255, `Expected max 255, got ${sig.type.max}`);
  assert(sig.type.base.name === 'int', `Expected base int, got ${sig.type.base.name}`);
});

// --- Test 35: Parsing union types X | string ---
test('union type X | string — parsed correctly', () => {
  const source = `
module UnionTest {
  signal status: X | string = "loading";
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const ast = result.ast!;
  const sig = ast.body.find(d => d.kind === 'signal') as any;
  assert(sig.type.kind === 'union', `Expected union type, got ${sig.type.kind}`);
  assert(sig.type.members.length === 2, `Expected 2 union members, got ${sig.type.members.length}`);
  assert(sig.type.hasX === true, 'Expected hasX to be true');
});

// --- Test 36: Type checking — type mismatch produces warning ---
test('type mismatch produces warning', () => {
  const source = `
module TypeTest {
  signal x: int = "hello";
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no compile errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.warnings.length > 0, `Expected warnings for type mismatch, got ${result.warnings.length}`);
  assert(result.warnings.some(w => w.message.includes('Type mismatch')), `Expected type mismatch warning, got: ${result.warnings.map(w => w.message)}`);
});

// --- Test 37: Edge-triggered codegen output ---
test('posedge codegen — emits createEdgeEffect', () => {
  const source = `
module EdgeCodegen {
  signal clk: bool = false;
  signal count: int = 0;

  always @(posedge clk) {
    count <= count + 1;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('createEdgeEffect'), 'Should emit createEdgeEffect');
  assert(js.includes("'posedge'"), 'Should include posedge string');
  assert(js.includes('posedge_clk'), 'Should name effect posedge_clk');
});

// --- Test 38: Temporal assertion codegen output ---
test('temporal assertion codegen — emits createTemporalAssert', () => {
  const source = `
module TemporalCodegen {
  signal trigger: bool = false;
  signal prop: bool = false;

  assert temporal @(trigger) eventually(prop) within 3000;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('createTemporalAssert'), 'Should emit createTemporalAssert');
  assert(js.includes("'eventually'"), 'Should include eventually operator');
  assert(js.includes('duration: 3000'), 'Should include duration');
  assert(js.includes("posedge(") && js.includes("eventually("), 'Should generate descriptive temporal assertion name');
});

// --- Test 39: Negedge always block ---
test('negedge always block — clean compile', () => {
  const source = `
module NegedgeTest {
  signal enable: bool = true;
  signal count: int = 0;

  always @(negedge enable) {
    count <= 0;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('createEdgeEffect'), 'Should emit createEdgeEffect');
  assert(js.includes("'negedge'"), 'Should include negedge string');
});

// --- Test 40: New builtins — floor, round, min, max, abs, reduce, slice ---
test('new builtins — floor, round, min, max, abs compile', () => {
  const source = `
module BuiltinTest {
  signal x: float = 3.7;
  signal y: float = 2.1;
  comb floored = floor(x);
  comb rounded = round(x);
  comb minimum = min(x, y);
  comb maximum = max(x, y);
  comb absolute = abs(x);
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('Math.floor'), 'Should emit Math.floor');
  assert(js.includes('Math.round'), 'Should emit Math.round');
  assert(js.includes('Math.min'), 'Should emit Math.min');
  assert(js.includes('Math.max'), 'Should emit Math.max');
  assert(js.includes('Math.abs'), 'Should emit Math.abs');
});

// --- Test 41: Constraint hardening — constraint locals used in body ---
test('constraint hardening — locals used in body expressions', () => {
  const source = `
module ConstraintLocals {
  cell a: int = 10;
  cell b: int = 20;

  constraint sync {
    (a) => {
      b <= a * 2;
    }
    (b) => {
      a <= b / 2;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  // The constraint body should use __a and __b (locals) instead of a() and b()
  assert(js.includes('const __a = a()'), 'Should read a into __a');
  assert(js.includes('const __b = b()'), 'Should read b into __b');
  // Inside clause body, reads of input cells should use locals
  assert(js.includes('setB((__a * 2))'), 'Clause body should use __a local');
  assert(js.includes('setA((__b / 2))'), 'Clause body should use __b local');
  // Should include writes metadata
  assert(js.includes("writes: ['b']"), 'First clause should declare writes: b');
  assert(js.includes("writes: ['a']"), 'Second clause should declare writes: a');
});

// --- Test 42: Type compatible — int compatible with float ---
test('type compatibility — int assigned to float produces no warning', () => {
  const source = `
module TypeCompat {
  signal x: float = 42;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors`);
  assert(result.warnings.length === 0, `Expected no warnings for int->float widening, got: ${result.warnings.map(w => w.message)}`);
});

// =============================================
// Feature: Custom Function Declarations (fn)
// =============================================

// --- Test 43: fn declaration — parses and emits correct JS function ---
test('fn declaration — parses and emits correct JS function', () => {
  const source = `
module FnTest {
  signal x: int = 5;

  fn clamp(value: int, min: int, max: int) -> int {
    value < min ? min : value > max ? max : value;
  }

  comb clamped = clamp(x, 0, 10);
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('function clamp(value, min, max)'), 'Should emit function declaration');
  assert(js.includes('return'), 'Should have implicit return for last expression');
  assert(js.includes('clamp(x()'), 'Should call clamp with signal read');
});

// --- Test 44: fn with explicit return ---
test('fn with explicit return statement', () => {
  const source = `
module ReturnTest {
  fn add(a: int, b: int) -> int {
    return a + b;
  }

  signal x: int = 0;
  comb sum = add(x, 5);
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('function add(a, b)'), 'Should emit function declaration');
  assert(js.includes('return (a + b)'), 'Should emit explicit return');
});

// --- Test 45: fn call arg count validation ---
test('fn call — wrong arg count produces error', () => {
  const source = `
module ArgTest {
  fn double(x: int) -> int {
    x * 2;
  }

  signal a: int = 5;
  comb result = double(a, 3);
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for wrong arg count');
  assert(result.errors.some(e => e.message.includes("'double'") && e.message.includes('1') && e.message.includes('2')), `Error should mention arg count mismatch, got: ${result.errors.map(e => e.message)}`);
});

// --- Test 46: fn call to user-defined function compiles correctly ---
test('fn call to user-defined function compiles correctly', () => {
  const source = `
module CallTest {
  signal price: float = 19.99;

  fn formatPrice(amount: float) -> string {
    "$" + str(amount);
  }

  comb display = formatPrice(price);
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('function formatPrice(amount)'), 'Should emit formatPrice');
  assert(js.includes('formatPrice(price())'), 'Comb should call formatPrice with signal read');
});

// =============================================
// Feature: String Template Literals
// =============================================

// --- Test 47: Template literal with interpolation ---
test('template literal with interpolation parses and emits JS template literal', () => {
  const source = `
module TemplateTest {
  signal name: string = "World";
  signal count: int = 3;

  comb greeting = \`Hello, \${name}! You have \${count} items.\`;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('`Hello, ${name()}'), 'Should emit JS template literal with signal read');
  assert(js.includes('${count()}'), 'Should emit interpolation for count signal');
});

// --- Test 48: Template literal without interpolation ---
test('template literal without interpolation', () => {
  const source = `
module SimpleTemplate {
  signal x: int = 0;
  comb msg = \`hello world\`;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('`hello world`'), 'Should emit plain template literal');
});

// =============================================
// Feature: Destructuring Assignment
// =============================================

// --- Test 49: Object destructuring ---
test('const { a, b } = obj — parses and emits JS destructuring', () => {
  const source = `
module DestructTest {
  signal data: { x: int, y: int } = { x: 1, y: 2 };

  always @(update) {
    const { x, y } = data;
    data <= { x: y, y: x };
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('const { x, y } ='), 'Should emit object destructuring');
});

// --- Test 50: Array destructuring ---
test('const [first, ...rest] = arr — parses and emits JS destructuring', () => {
  const source = `
module ArrayDestructTest {
  signal items: int[] = [1, 2, 3];

  always @(process) {
    const [first, ...rest] = items;
    items <= rest;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('const [first, ...rest] ='), 'Should emit array destructuring with rest');
});

// =============================================
// Feature: Try/Catch
// =============================================

// --- Test 51: Try/catch without param ---
test('try/catch — parses and emits JS try/catch', () => {
  const source = `
module TryCatchTest {
  signal result: int = 0;
  signal error: string = "";

  always @(submit) {
    try {
      result <= 42;
    } catch {
      error <= "Something went wrong";
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('try {'), 'Should emit try block');
  assert(js.includes('} catch ('), 'Should emit catch block');
  assert(js.includes('setResult(42)'), 'Try body should have signal assign');
  assert(js.includes('setError("Something went wrong")'), 'Catch body should have signal assign');
});

// --- Test 52: Try/catch with param ---
test('try/catch with error parameter', () => {
  const source = `
module TryCatchParamTest {
  signal error: string = "";

  always @(submit) {
    try {
      error <= "";
    } catch (e) {
      error <= "Error caught";
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('catch (e)'), 'Should emit catch with named parameter');
});

// --- Test 53: Calling undefined function produces error ---
test('calling undefined function produces error', () => {
  const source = `
module UndefinedFn {
  signal x: int = 0;
  comb result = nonExistentFn(x);
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for undefined function');
  assert(result.errors.some(e => e.message.includes('nonExistentFn')), `Error should mention nonExistentFn, got: ${result.errors.map(e => e.message)}`);
});

// --- Test 54: Method call — arr.map(|x| x + 1) compiles ---
test('method call — arr.map compiles to arr.map((x) => x + 1)', () => {
  const source = `
module MethodTest {
  signal items: int[] = [1, 2, 3];
  comb doubled = items.map(|x| x * 2);
  comb filtered = items.filter(|x| x > 1);
  comb joined = items.join(", ");
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('.map('), 'Should emit .map() method call');
  assert(js.includes('.filter('), 'Should emit .filter() method call');
  assert(js.includes('.join('), 'Should emit .join() method call');
  assert(js.includes('(x) => (x * 2)'), 'Lambda should compile to arrow function');
});

// --- Test 55: Object.keys global method call compiles ---
test('Object.keys(obj) compiles to Object.keys(obj)', () => {
  const source = `
module GlobalTest {
  signal config: string = "test";
  comb parsed = JSON.parse(config);
  comb logged = console.log(config);
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('JSON.parse('), 'Should emit JSON.parse()');
  assert(js.includes('console.log('), 'Should emit console.log()');
});

// --- Test 56: Component with <slot /> and parent with children compiles ---
test('component with slot and parent children — clean compile', () => {
  const source = `
module Card {
  input title: string = "";

  view {
    <div class="card">
      <h3>{title}</h3>
      <div class="card-body">
        <slot />
      </div>
    </div>
  }
}

module App {
  view {
    <Card title="My Card">
      <p>Child content here</p>
    </Card>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  // Card factory should accept __children parameter
  assert(js.includes('__children'), 'Card should accept __children parameter');
  // Card should insert __children at slot position
  assert(js.includes('appendChild(__children)'), 'Card should append __children at slot');
  // App should create child content and pass to Card
  assert(js.includes('createDocumentFragment'), 'App should create document fragment for children');
});

// --- Test 57: select @bind emits change event ---
test('select @bind — emits change event listener', () => {
  const source = `
module SelectTest {
  signal category: string = "a";
  view {
    <select @bind=category>
      <option value="a">A</option>
      <option value="b">B</option>
    </select>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes("addEventListener('change'"), 'Select should use change event');
  assert(js.includes('.value = category()'), 'Select should bind value property');
  assert(!js.includes("addEventListener('input'"), 'Select should not use input event');
});

// --- Test 58: checkbox @bind emits checked property ---
test('checkbox @bind — emits checked property binding', () => {
  const source = `
module CheckboxTest {
  signal agreed: bool = false;
  view {
    <input type="checkbox" @bind=agreed />
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('.checked = agreed()'), 'Checkbox should bind checked property');
  assert(js.includes('e.target.checked'), 'Checkbox should read e.target.checked');
  assert(js.includes("addEventListener('change'"), 'Checkbox should use change event');
});

// --- Test 59: radio @bind emits checked comparison ---
test('radio @bind — emits checked comparison binding', () => {
  const source = `
module RadioTest {
  signal color: string = "red";
  view {
    <input type="radio" name="color" value="red" @bind=color />
    <input type="radio" name="color" value="blue" @bind=color />
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('.checked = (color()'), 'Radio should compare checked to value');
  assert(js.includes('if (e.target.checked)'), 'Radio should check if target is checked');
  assert(js.includes("addEventListener('change'"), 'Radio should use change event');
});

// --- Test 60: textarea @bind compiles correctly ---
test('textarea @bind — compiles with value property and input event', () => {
  const source = `
module TextareaTest {
  signal text: string = "";
  view {
    <textarea @bind=text></textarea>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('.value = text()'), 'Textarea should bind value property');
  assert(js.includes("addEventListener('input'"), 'Textarea should use input event');
});

// --- Test 61: Lambda params do not trigger undefined reference ---
test('lambda params — no undefined reference errors', () => {
  const source = `
module LambdaTest {
  signal users: string[] = ["alice", "bob"];
  comb upper = users.map(|u| u);
  comb found = users.find(|item| item == "alice");
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
});

// --- Test 62: async block parses and emits correct async IIFE ---
test('async block — parses and emits async IIFE with try/catch', () => {
  const source = `
module UserList {
  signal users: string[] = [];
  signal loading: bool = false;
  signal error: string = "";

  always @(loadUsers) {
    loading <= true;
    error <= "";
    async {
      const response = await fetch("/api/users");
      const data = await response.json();
      users <= data;
      loading <= false;
    } catch {
      error <= "Failed to load users";
      loading <= false;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  // Should contain async IIFE
  assert(js.includes('(async () => {'), 'Should emit async IIFE');
  assert(js.includes('try {'), 'Should emit try block');
  assert(js.includes('catch (__err)'), 'Should emit catch block');
  assert(js.includes('await fetch'), 'Should emit await expression');
  assert(js.includes('await response.json()'), 'Should emit chained await');
  assert(js.includes('batch('), 'Should wrap signal writes in batch');
  assert(js.includes('setUsers('), 'Should emit setUsers');
  assert(js.includes('setLoading('), 'Should emit setLoading');
  assert(js.includes('setError('), 'Should emit setError');
});

// --- Test 63: await outside async block produces parse error ---
test('await outside async block — produces error', () => {
  const source = `
module Bad {
  signal data: string = "";
  always @(load) {
    const x = await fetch("/api");
    data <= x;
  }
}`;
  const result = compile(source);
  assert(result.errors.length > 0, 'Expected error for await outside async block');
  assert(result.errors.some(e => e.message.includes('await')), `Error should mention await, got: ${result.errors.map(e => e.message)}`);
});

// --- Test 64: fetch, console.log, JSON.parse don't produce undefined reference errors ---
test('browser globals — no undefined reference errors', () => {
  const source = `
module Globals {
  signal data: string = "";
  always @(test) {
    async {
      const r = await fetch("/api");
      const d = await r.json();
      data <= d;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
});

// --- Test 65: const declaration inside always block ---
test('const declaration — compiles to JS const', () => {
  const source = `
module ConstTest {
  signal x: int = 0;
  always @(compute) {
    const y = 42;
    x <= y;
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const js = result.js!;
  assert(js.includes('const y = 42'), 'Should emit const declaration');
  assert(js.includes('setX(y)'), 'Should use const variable in assignment');
});

// --- Test 66: async block without catch ---
test('async block — without catch compiles cleanly', () => {
  const source = `
module Simple {
  signal data: string = "";
  always @(load) {
    async {
      const r = await fetch("/api");
      const d = await r.json();
      data <= d;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('(async () => {'), 'Should emit async IIFE');
  assert(!js.includes('try {'), 'Should NOT emit try block when no catch');
  assert(!js.includes('catch'), 'Should NOT emit catch when no catch body');
});

// --- Test 67: setTimeout compiles as global function call ---
test('setTimeout — compiles as global function call', () => {
  const source = `
module Timer {
  signal fired: bool = false;
  always @(startTimer) {
    setTimeout(|_| fired, 1000);
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const js = result.js!;
  assert(js.includes('setTimeout('), 'Should emit setTimeout call');
});

// --- Test 68: async block reads/writes tracked in always block ---
test('async block — reads and writes tracked correctly', () => {
  const source = `
module AsyncRW {
  signal loading: bool = false;
  signal data: string = "";
  always @(load) {
    loading <= true;
    async {
      const r = await fetch("/api");
      data <= "loaded";
      loading <= false;
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const ast = result.ast!;
  const always = ast.body.find(d => d.kind === 'always') as any;
  assert(always.writes.includes('loading'), 'Should write to loading');
  assert(always.writes.includes('data'), 'Should write to data');
});

// --- Test 32: @for with key=expr parses keyExpr ---
test('@for with key=expr — keyExpr is present in AST', () => {
  const source = `
module ListApp {
  signal items: array = [{ id: 1, name: "a" }, { id: 2, name: "b" }];
  view {
    <ul>
      @for item in items key=item.id {
        <li>{item.name}</li>
      }
    </ul>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const ast = result.ast!;
  const viewDecl = ast.body.find(d => d.kind === 'view') as any;
  assert(viewDecl !== undefined, 'Expected view declaration');

  // The @for node is inside the <ul> element
  const ulEl = viewDecl.children[0];
  const forNode = ulEl.children[0];
  assert(forNode.kind === 'for', 'Expected @for node');
  assert(forNode.variable === 'item', 'Expected variable to be item');
  assert(forNode.keyExpr !== undefined, 'Expected keyExpr to be present');
  assert(forNode.keyExpr.kind === 'member', 'Expected keyExpr to be member expression');
  assert(forNode.keyExpr.property === 'id', 'Expected keyExpr property to be id');
});

// --- Test 33: @for with key emits reconcileKeyed ---
test('@for with key — codegen emits reconcileKeyed', () => {
  const source = `
module ListApp {
  signal items: array = [{ id: 1, name: "a" }];
  view {
    <ul>
      @for item in items key=item.id {
        <li>{item.name}</li>
      }
    </ul>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('reconcileKeyed'), 'Should emit reconcileKeyed call');
  assert(js.includes('__forState'), 'Should create keyed state');
  assert(js.includes('keyMap'), 'Should reference keyMap in state');
  assert(js.includes('__item.id'), 'Should emit key function with item.id');
});

// --- Test 34: @for without key — backward compatible full re-render ---
test('@for without key — backward compat, no reconcileKeyed', () => {
  const source = `
module ListApp {
  signal items: array = ["a", "b", "c"];
  view {
    <ul>
      @for item in items {
        <li>{item}</li>
      }
    </ul>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(!js.includes('reconcileKeyed'), 'Should NOT emit reconcileKeyed for unkeyed @for');
  assert(js.includes('for (const item of'), 'Should emit traditional for-of loop');
  assert(js.includes('.remove()'), 'Should clear container on each render');
});

// --- Test 35: @for with key — imports reconcileKeyed ---
test('@for with key — imports reconcileKeyed from runtime', () => {
  const source = `
module ListApp {
  signal items: array = [{ id: 1 }];
  view {
    @for item in items key=item.id {
      <div>{item.id}</div>
    }
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);

  const js = result.js!;
  assert(js.includes('reconcileKeyed'), 'Should import reconcileKeyed');
  // Import line should have reconcileKeyed
  const importLine = js.split('\n').find(l => l.includes('import'));
  assert(importLine !== undefined && importLine.includes('reconcileKeyed'), 'Import line should include reconcileKeyed');
});

// --- Test 32: Source map — not produced without sourceFile ---
test('source map — not produced without sourceFile option', () => {
  const source = `
module Tiny {
  signal x: int = 0;
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors`);
  assert(result.sourceMap === undefined, 'sourceMap should be undefined when sourceFile not provided');
});

// --- Test 33: Source map — produced with sourceFile ---
test('source map — produced with sourceFile option', () => {
  const source = `
module Counter {
  signal count: int = 0;
  comb label = "Count: " + str(count);
  comb doubled = count * 2;
  always @(increment) { count <= count + 1; }
  view {
    <p>{label}</p>
  }
}`;
  const result = compile(source, { sourceFile: 'counter.comb' });
  assert(result.errors.length === 0, `Expected no errors`);
  assert(typeof result.sourceMap === 'string', 'sourceMap should be a string');
  assert(result.sourceMap!.length > 0, 'sourceMap should be non-empty');
});

// --- Test 34: Source map — valid JSON with version 3 ---
test('source map — valid v3 JSON structure', () => {
  const source = `
module Counter {
  signal count: int = 0;
  comb doubled = count * 2;
  always @(inc) { count <= count + 1; }
  view {
    <p>{doubled}</p>
  }
}`;
  const result = compile(source, { sourceFile: 'counter.comb' });
  assert(result.errors.length === 0, `Expected no errors`);

  const map = JSON.parse(result.sourceMap!);
  assert(map.version === 3, 'version should be 3');
  assert(map.file === 'counter.js', `file should be counter.js, got ${map.file}`);
  assert(Array.isArray(map.sources), 'sources should be an array');
  assert(map.sources[0] === 'counter.comb', `sources[0] should be counter.comb, got ${map.sources[0]}`);
  assert(typeof map.mappings === 'string', 'mappings should be a string');
  assert(map.mappings.length > 0, 'mappings should be non-empty');
  assert(Array.isArray(map.sourcesContent), 'sourcesContent should be an array');
  assert(map.sourcesContent[0] === source, 'sourcesContent should contain original source');
});

// --- Test 35: Source map — has mappings for signal declarations ---
test('source map — has mappings for signal declarations', () => {
  const source = `
module Counter {
  signal count: int = 0;
  comb doubled = count * 2;
}`;
  const result = compile(source, { sourceFile: 'counter.comb' });
  assert(result.errors.length === 0, `Expected no errors`);

  const map = JSON.parse(result.sourceMap!);
  // Mappings should have multiple lines (semicolon-separated)
  const mappingLines = map.mappings.split(';');
  assert(mappingLines.length > 1, `Should have multiple mapping lines, got ${mappingLines.length}`);
  const nonEmpty = mappingLines.filter((l: string) => l.length > 0);
  assert(nonEmpty.length > 0, 'At least some mapping lines should have data');
});

// --- Test 36: Source map — counter.comb from file ---
test('counter.comb — source map from file compilation', () => {
  const counterSrc = fs.readFileSync(path.resolve('examples/counter.comb'), 'utf-8');
  const result = compile(counterSrc, { sourceFile: 'counter.comb' });
  assert(result.errors.length === 0, `Expected no errors`);
  assert(result.sourceMap !== undefined, 'Should produce source map');

  const map = JSON.parse(result.sourceMap!);
  assert(map.version === 3, 'Source map version 3');
  assert(map.sources[0] === 'counter.comb', 'Source is counter.comb');
  assert(map.mappings.length > 0, 'Non-empty mappings');
});

// =============================================
// Feature: CDC Async Boundary Analysis
// =============================================

// --- Test: CDC detects unsynchronized async write ---
test('CDC: detects unsynchronized async write', () => {
  const result = compile(`module T {
    signal data: string = "";
    comb display = data;
    always @(load) {
      async { data <= "loaded"; }
    }
    view { <div>{display}</div> }
  }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.warnings.some(w => w.message.includes('CDC') && w.message.includes('data') && w.message.includes('display')), `should warn about async boundary, got: ${result.warnings.map(w => w.message)}`);
});

// --- Test: CDC detects race condition on same signal ---
test('CDC: detects race condition on same signal', () => {
  const result = compile(`module T {
    signal result: string = "";
    always @(search) {
      async { result <= "a"; }
    }
    always @(autoComplete) {
      async { result <= "b"; }
    }
  }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.warnings.some(w => w.message.includes('CDC') && w.message.includes('result') && w.message.includes('race')), `should warn about race condition, got: ${result.warnings.map(w => w.message)}`);
});

// --- Test: CDC detects missing catch in async block ---
test('CDC: detects missing catch in async block', () => {
  const result = compile(`module T {
    signal data: string = "";
    always @(load) {
      async { data <= "loaded"; }
    }
  }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.warnings.some(w => w.message.includes('CDC') && w.message.includes('catch')), `should warn about missing catch, got: ${result.warnings.map(w => w.message)}`);
});

// --- Test: CDC no warning when async block has catch ---
test('CDC: no warning when async block has catch', () => {
  const result = compile(`module T {
    signal data: string = "";
    signal error: string = "";
    always @(load) {
      async {
        data <= "loaded";
      } catch {
        error <= "failed";
      }
    }
  }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(!result.warnings.some(w => w.message.includes('CDC') && w.message.includes('catch')), `should NOT warn about missing catch when catch exists, got: ${result.warnings.map(w => w.message)}`);
});

// --- Test: CDC async-unsafe.comb compiles with warnings ---
test('async-unsafe.comb — compiles with CDC warnings', () => {
  const source = fs.readFileSync(path.resolve('examples/async-unsafe.comb'), 'utf-8');
  const result = compile(source);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  assert(result.js !== undefined, 'Expected JS output');
  const cdcWarnings = result.warnings.filter(w => w.message.includes('CDC'));
  assert(cdcWarnings.length >= 3, `Expected at least 3 CDC warnings, got ${cdcWarnings.length}: ${cdcWarnings.map(w => w.message)}`);
});

// --- State Space Inference Tests ---

test('state-space: enum signal has correct states', () => {
  const result = compile(`module T { enum Phase { Red, Yellow, Green } signal p: Phase = Phase.Red; view { <div></div> } }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const graph = result.graph!;
  const node = graph.nodes.find(n => n.name === 'p');
  assert(node !== undefined, 'Expected node p');
  assert(node!.valueType === 'Phase', `Expected valueType='Phase', got '${node!.valueType}'`);
  assert(Array.isArray(node!.states), 'Expected states to be an array');
  assert(node!.states!.length === 3, `Expected 3 states, got ${node!.states!.length}`);
  assert(node!.states!.includes('Phase.Red'), 'Expected Phase.Red in states');
  assert(node!.states!.includes('Phase.Yellow'), 'Expected Phase.Yellow in states');
  assert(node!.states!.includes('Phase.Green'), 'Expected Phase.Green in states');
});

test('state-space: bool signal has states [true, false]', () => {
  const result = compile(`module T { signal active: bool = false; view { <div></div> } }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const graph = result.graph!;
  const node = graph.nodes.find(n => n.name === 'active');
  assert(node !== undefined, 'Expected node active');
  assert(node!.valueType === 'bool', `Expected valueType='bool', got '${node!.valueType}'`);
  assert(Array.isArray(node!.states), 'Expected states to be an array');
  assert(node!.states!.length === 2, `Expected 2 states, got ${node!.states!.length}`);
  assert(node!.states!.includes('true'), 'Expected true in states');
  assert(node!.states!.includes('false'), 'Expected false in states');
});

test('state-space: bounded int with guard pattern has correct states', () => {
  const result = compile(`module T { signal idx: int = 0; always @(tick) { idx <= idx + 1; if (idx >= 3) { idx <= 0; } } view { <div></div> } }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const graph = result.graph!;
  const node = graph.nodes.find(n => n.name === 'idx');
  assert(node !== undefined, 'Expected node idx');
  assert(Array.isArray(node!.states), `Expected states to be an array, got ${JSON.stringify(node!.states)}`);
  assert(node!.states!.includes('0'), 'Expected 0 in states');
  assert(node!.states!.includes('3'), 'Expected 3 in states');
  assert(node!.states!.length === 4, `Expected 4 states (0,1,2,3), got ${node!.states!.length}: ${JSON.stringify(node!.states)}`);
});

test('state-space: unbounded int counter has no states', () => {
  const result = compile(`module T { signal cycle: int = 0; always @(tick) { cycle <= cycle + 1; } view { <div></div> } }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const graph = result.graph!;
  const node = graph.nodes.find(n => n.name === 'cycle');
  assert(node !== undefined, 'Expected node cycle');
  assert(node!.states === undefined || node!.states === null, `Expected no states for unbounded int, got ${JSON.stringify(node!.states)}`);
});

test('state-space: bool comb has states [true, false]', () => {
  const result = compile(`module T { signal x: int = 0; comb isPositive = x > 0; view { <div></div> } }`);
  assert(result.errors.length === 0, `Expected no errors, got: ${result.errors.map(e => e.message).join(', ')}`);
  const graph = result.graph!;
  const node = graph.nodes.find(n => n.name === 'isPositive');
  assert(node !== undefined, 'Expected node isPositive');
  assert(node!.valueType === 'bool', `Expected valueType='bool', got '${node!.valueType}'`);
  assert(Array.isArray(node!.states), 'Expected states to be an array');
  assert(node!.states!.length === 2, `Expected 2 states, got ${node!.states!.length}`);
  assert(node!.states!.includes('true'), 'Expected true in states');
  assert(node!.states!.includes('false'), 'Expected false in states');
});

test('CDC: transitive taint through comb chain', () => {
  const result = compile(`module T {
    signal data: string = "";
    comb derived = data;
    comb downstream = derived;
    always @(load) {
      async { data <= "loaded"; }
    }
    view { <div>{downstream}</div> }
  }`);
  // downstream transitively reads async-written 'data' through 'derived'
  assert(result.warnings.some(w => w.message.includes('CDC') && w.message.includes('downstream')),
    'should warn about transitive async taint on downstream');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
