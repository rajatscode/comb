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

  assert(signalNodes.length === 1, `Expected 1 signal, got ${signalNodes.length}`);
  assert(signalNodes[0].name === 'count', `Expected signal 'count', got '${signalNodes[0].name}'`);

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

// Test 7: view bindings in graph
test('view bindings create graph edges', () => {
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
  const viewNode = graph.nodes.find(n => n.type === 'view-binding');
  assert(viewNode !== undefined, 'Expected view-binding node');
  const viewEdges = graph.edges.filter(e => e.to === 'view');
  assert(viewEdges.some(e => e.from === 'display'), 'Expected edge display → view');
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

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
