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

  // Graph should have cell and constraint nodes
  const graph = result.graph!;
  const cellNodes = graph.nodes.filter(n => n.type === 'cell');
  assert(cellNodes.length === 2, `Expected 2 cell nodes, got ${cellNodes.length}`);
  const constraintNodes = graph.nodes.filter(n => n.type === 'constraint');
  assert(constraintNodes.length === 1, `Expected 1 constraint node, got ${constraintNodes.length}`);

  // Bidirectional edges
  const edges = graph.edges;
  assert(edges.some(e => e.from === 'celsius' && e.to === 'constraint:convert'), 'Edge celsius→constraint');
  assert(edges.some(e => e.from === 'constraint:convert' && e.to === 'celsius'), 'Edge constraint→celsius');
  assert(edges.some(e => e.from === 'fahrenheit' && e.to === 'constraint:convert'), 'Edge fahrenheit→constraint');
  assert(edges.some(e => e.from === 'constraint:convert' && e.to === 'fahrenheit'), 'Edge constraint→fahrenheit');
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

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
