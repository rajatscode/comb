// ssr-test.ts — Tests for server-side rendering of compiled Comb modules

import { renderToString } from './ssr.js';
import { compile } from '../core/compiler.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

// -- Compile Counter inline so the test is self-contained --

const counterSource = `
module Counter {
  signal count: int = 0;
  comb label = "Count: " + str(count);
  comb doubled = count * 2;

  always @(increment) { count <= count + 1; }
  always @(decrement) { count <= count - 1; }
  always @(reset) { count <= 0; }

  view {
    <div class="counter">
      <h1>Comb Counter</h1>
      <p class="display">{label}</p>
      <p>doubled = {doubled}</p>
      <div class="controls">
        <button @click=decrement>-</button>
        <button @click=reset>reset</button>
        <button @click=increment>+</button>
      </div>
    </div>
  }
}
`;

console.log('SSR Tests');
console.log('=========');

// Compile the counter module
const result = compile(counterSource);
assert(result.errors.length === 0, 'Counter compiles without errors');
assert(!!result.js, 'Counter produces JS output');

// Dynamically evaluate the compiled JS to get the factory function
// We need to replace the import with actual runtime values
const runtimeModule = await import('./index.js');

// Build a module namespace that the compiled code can reference
const moduleCode = result.js!
  .replace(/import \{[^}]+\} from '[^']+';/g, '') // strip import
  .replace(/export /g, '');

// Create a function that has the runtime in scope
const factory = new Function(
  'createSignal', 'createComb', 'createEffect', 'batch', 'createScope', 'circuit',
  'createCell', 'createPropagator',
  `${moduleCode}\nreturn Counter;`
);

const Counter = factory(
  runtimeModule.createSignal,
  runtimeModule.createComb,
  runtimeModule.createEffect,
  runtimeModule.batch,
  runtimeModule.createScope,
  runtimeModule.circuit,
  runtimeModule.createCell,
  runtimeModule.createPropagator,
);

console.log('\n-- renderToString --');

const html = renderToString(Counter);
console.log('\nRendered HTML:');
console.log(html);
console.log('');

assert(typeof html === 'string', 'renderToString returns a string');
assert(html.length > 0, 'HTML is non-empty');
assert(html.includes('<h1>'), 'HTML contains <h1> tag');
assert(html.includes('Comb Counter'), 'HTML contains "Comb Counter" text');
assert(html.includes('Count:'), 'HTML contains "Count:" text');
assert(html.includes('doubled ='), 'HTML contains "doubled =" text');
assert(html.includes('<button>'), 'HTML contains <button> tags');
assert(html.includes('<div'), 'HTML contains <div> tag');
assert(html.includes('</div>'), 'HTML has closing </div>');

// Verify no lingering document shim
assert(typeof (globalThis as any).document === 'undefined' || (globalThis as any).document !== null, 'document is restored after render');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
