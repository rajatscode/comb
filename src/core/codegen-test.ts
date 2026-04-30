// codegen-test.ts — Tests for the codegen output
// Run: npx tsx src/core/codegen-test.ts

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

console.log('\nCodegen Tests\n');

// Test 1: counter.comb generates valid-shaped JS
test('counter.comb — generates JS with expected structure', () => {
  const source = fs.readFileSync(path.resolve('examples/counter.comb'), 'utf-8');
  const result = compile(source);
  assert(result.errors.length === 0, `Compile errors: ${result.errors.map(e => e.message)}`);
  assert(result.js !== undefined, 'Expected JS output');

  const js = result.js!;

  // Import from runtime
  assert(js.includes("import { createSignal, createComb, createEffect, batch, createScope } from '../runtime/signals.js'"), 'Missing runtime import');

  // Static graph export
  assert(js.includes('export const __graph ='), 'Missing __graph export');

  // Module factory export
  assert(js.includes('export function Counter(root)'), 'Missing Counter factory export');

  // Signal creation with meta
  assert(js.includes('createSignal(0,'), 'Missing createSignal call');
  assert(js.includes("name: 'count'"), 'Missing signal name meta');
  assert(js.includes("module: $m"), 'Missing signal module meta');

  // Comb creation with deps
  assert(js.includes('createComb('), 'Missing createComb call');
  assert(js.includes("name: 'label'"), 'Missing comb name meta');
  assert(js.includes('["count"]'), 'Missing comb deps for label');

  // Event handlers wrapped in batch
  assert(js.includes('function increment()'), 'Missing increment handler');
  assert(js.includes('function decrement()'), 'Missing decrement handler');
  assert(js.includes('function reset()'), 'Missing reset handler');
  assert(js.includes('batch(() => {'), 'Missing batch wrapper');

  // Signal setter
  assert(js.includes('setCount('), 'Missing setCount call');

  // DOM creation
  assert(js.includes("document.createElement('div')"), 'Missing createElement');
  assert(js.includes("document.createTextNode("), 'Missing createTextNode');

  // Reactive text binding
  assert(js.includes('createEffect('), 'Missing createEffect');
  assert(js.includes('.data = String('), 'Missing reactive text binding');

  // Event binding
  assert(js.includes("addEventListener('click'"), 'Missing click event binding');
});

// Test 2: traffic-light.comb generates JS with enum and conditional
test('traffic-light.comb — generates JS with enum and @if', () => {
  const source = fs.readFileSync(path.resolve('examples/traffic-light.comb'), 'utf-8');
  const result = compile(source);
  assert(result.errors.length === 0, `Compile errors: ${result.errors.map(e => e.message)}`);
  const js = result.js!;

  // Enum
  assert(js.includes('const Phase = Object.freeze({'), 'Missing enum');
  assert(js.includes("Red: 'Phase.Red'"), 'Missing enum variant');

  // @if in view
  assert(js.includes("document.createComment('@if')"), 'Missing @if comment anchor');

  // Conditional rendering effect
  assert(js.includes('.remove()'), 'Missing conditional cleanup');
  assert(js.includes("display = 'contents'"), 'Missing contents display');
});

// Test 3: JS output is syntactically valid (no runtime errors during parse)
test('counter.comb — generated JS is parseable', () => {
  const source = fs.readFileSync(path.resolve('examples/counter.comb'), 'utf-8');
  const result = compile(source);
  const js = result.js!;

  // Strip imports and exports (not valid in Function constructor) to test syntax
  const jsStripped = js
    .replace(/^import .*/gm, '// import stripped')
    .replace(/^export /gm, '');
  try {
    new Function(jsStripped);
  } catch (e: any) {
    throw new Error(`Generated JS has syntax error: ${e.message}\n\nGenerated code:\n${jsStripped}`);
  }
});

// Test 4: __graph is valid JSON-serializable
test('__graph is JSON-serializable', () => {
  const source = fs.readFileSync(path.resolve('examples/counter.comb'), 'utf-8');
  const result = compile(source);
  const js = result.js!;

  // Extract __graph value from JS
  const match = js.match(/export const __graph = ([\s\S]*?);$/m);
  assert(match !== null, 'Could not extract __graph');
  try {
    const graph = JSON.parse(match![1]);
    assert(Array.isArray(graph.nodes), '__graph.nodes should be array');
    assert(Array.isArray(graph.edges), '__graph.edges should be array');
    assert(graph.nodes.length > 0, '__graph should have nodes');
    assert(graph.edges.length > 0, '__graph should have edges');
  } catch (e: any) {
    throw new Error(`__graph is not valid JSON: ${e.message}`);
  }
});

// Test 5: signal reads use function call syntax
test('signals and combs read via function call', () => {
  const source = `
module ReadTest {
  signal x: int = 5;
  comb doubled = x * 2;
  view {
    <p>{doubled}</p>
  }
}`;
  const result = compile(source);
  assert(result.errors.length === 0, `Errors: ${result.errors.map(e => e.message)}`);
  const js = result.js!;

  // Inside comb expression: x() not x
  assert(js.includes('x()'), 'Signal should be read as x()');
  // Inside view expression: doubled() not doubled
  assert(js.includes('doubled()'), 'Comb should be read as doubled()');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
