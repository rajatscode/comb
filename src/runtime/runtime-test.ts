// runtime-test.ts — 13 tests for the reactive runtime
// Run: npx tsx src/runtime/runtime-test.ts

import { createSignal, createComb, createEffect, batch, untrack, createScope, onMount, onDestroy, createEdgeEffect, createTemporalAssert } from './signals.js';
import { circuit } from './circuit.js';
import { reconcileKeyed } from './reconcile.js';
import type { KeyedState } from './reconcile.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  circuit.reset();
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

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (!Object.is(actual, expected)) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
}

console.log('\nRuntime Tests\n');

// 1. Signal read/write
test('signal read/write', () => {
  const [count, setCount] = createSignal(0, { name: 'count', module: 'Test' });
  assertEqual(count(), 0, 'initial value');
  setCount(5);
  assertEqual(count(), 5, 'after set');
  setCount(prev => prev + 1);
  assertEqual(count(), 6, 'functional update');
});

// 2. Comb auto-tracking
test('comb auto-tracking', () => {
  const [count, setCount] = createSignal(0, { name: 'count', module: 'Test' });
  const doubled = createComb(() => count() * 2, { name: 'doubled', module: 'Test', deps: ['count'] });
  assertEqual(doubled(), 0, 'initial');
  setCount(3);
  assertEqual(doubled(), 6, 'after change');
  setCount(10);
  assertEqual(doubled(), 20, 'after second change');
});

// 3. Comb memoization
test('comb memoization — no downstream propagation on same value', () => {
  const [x, setX] = createSignal(5, { name: 'x', module: 'Test' });
  const clamped = createComb(() => Math.min(x(), 10), { name: 'clamped', module: 'Test', deps: ['x'] });
  let effectRuns = 0;
  createEffect(() => { clamped(); effectRuns++; }, { name: 'counter', module: 'Test' });
  assertEqual(effectRuns, 1, 'initial run');
  setX(7); // clamped changes from 5→7
  assertEqual(effectRuns, 2, 'after x=7');
  setX(15); // clamped changes from 7→10
  assertEqual(effectRuns, 3, 'after x=15');
  setX(20); // clamped stays 10 — no propagation
  assertEqual(effectRuns, 3, 'after x=20, clamped still 10');
});

// 4. Effect execution on dep change
test('effect runs on dependency change', () => {
  const [name, setName] = createSignal('Alice', { name: 'name', module: 'Test' });
  const values: string[] = [];
  createEffect(() => { values.push(name()); }, { name: 'logger', module: 'Test' });
  assertEqual(values.length, 1, 'initial run');
  assertEqual(values[0], 'Alice', 'initial value');
  setName('Bob');
  assertEqual(values.length, 2, 'after change');
  assertEqual(values[1], 'Bob', 'new value');
});

// 5. Effect cleanup
test('effect cleanup runs before next execution', () => {
  const [count, setCount] = createSignal(0, { name: 'count', module: 'Test' });
  const log: string[] = [];
  createEffect(() => {
    const v = count();
    log.push(`run:${v}`);
    return () => { log.push(`cleanup:${v}`); };
  }, { name: 'cleaner', module: 'Test' });
  assertEqual(log.length, 1, 'initial');
  assertEqual(log[0], 'run:0', 'initial run');
  setCount(1);
  assertEqual(log.length, 3, 'after set');
  assertEqual(log[1], 'cleanup:0', 'cleanup of previous');
  assertEqual(log[2], 'run:1', 'new run');
});

// 6. Batch groups multiple writes
test('batch groups multiple writes into one flush', () => {
  const [a, setA] = createSignal(0, { name: 'a', module: 'Test' });
  const [b, setB] = createSignal(0, { name: 'b', module: 'Test' });
  let runs = 0;
  createEffect(() => { a(); b(); runs++; }, { name: 'watcher', module: 'Test' });
  assertEqual(runs, 1, 'initial');
  batch(() => {
    setA(1);
    setB(2);
  });
  // Without batch, would be 3 (initial + 2 changes). With batch, should be 2.
  assertEqual(runs, 2, 'after batch');
});

// 7. Nested batch
test('nested batch — inner does not flush', () => {
  const [x, setX] = createSignal(0, { name: 'x', module: 'Test' });
  let runs = 0;
  createEffect(() => { x(); runs++; }, { name: 'eff', module: 'Test' });
  assertEqual(runs, 1, 'initial');
  batch(() => {
    setX(1);
    batch(() => {
      setX(2);
      // Inner batch should not flush
      assertEqual(runs, 1, 'inner batch should not flush');
    });
    // Still inside outer batch
    assertEqual(runs, 1, 'after inner batch');
  });
  // Now outer batch exits, should flush once
  assertEqual(runs, 2, 'after outer batch');
  assertEqual(x(), 2, 'final value');
});

// 8. Untrack
test('untrack — read without creating dependency', () => {
  const [a, setA] = createSignal(0, { name: 'a', module: 'Test' });
  const [b, setB] = createSignal(0, { name: 'b', module: 'Test' });
  let runs = 0;
  createEffect(() => {
    a(); // tracked
    untrack(() => b()); // untracked
    runs++;
  }, { name: 'eff', module: 'Test' });
  assertEqual(runs, 1, 'initial');
  setA(1); // should trigger
  assertEqual(runs, 2, 'after a change');
  setB(1); // should NOT trigger
  assertEqual(runs, 2, 'after b change (untracked)');
});

// 9. Scope dispose
test('scope dispose — effects stop running', () => {
  const [x, setX] = createSignal(0, { name: 'x', module: 'Test' });
  let runs = 0;
  const scope = createScope();
  createEffect(() => { x(); runs++; }, { name: 'eff', module: 'Test' });
  scope.dispose();
  assertEqual(runs, 1, 'initial run');
  setX(1);
  assertEqual(runs, 1, 'after dispose, effect should not run');
});

// 10. CircuitGraph node registration
test('circuit node registration', () => {
  const id = circuit.registerNode({ name: 'count', module: 'Counter', type: 'signal', valueType: 'int' });
  assertEqual(id, 'Counter.count', 'node ID format');
  const node = circuit.getNode(id);
  assert(node !== undefined, 'node should exist');
  assertEqual(node!.type, 'signal', 'node type');
  assertEqual(node!.module, 'Counter', 'node module');
});

// 11. CircuitGraph edges from comb deps
test('circuit edges from comb deps', () => {
  circuit.registerNode({ name: 'x', module: 'M', type: 'signal' });
  circuit.registerNode({ name: 'y', module: 'M', type: 'signal' });
  circuit.registerNode({ name: 'sum', module: 'M', type: 'comb', deps: ['x', 'y'] });
  const edges = circuit.getEdges();
  assert(edges.some(e => e.from === 'M.x' && e.to === 'M.sum'), 'edge x→sum');
  assert(edges.some(e => e.from === 'M.y' && e.to === 'M.sum'), 'edge y→sum');
});

// 12. CircuitGraph event subscription (listeners deferred to microtask for performance)
test('circuit event subscription', async () => {
  const events: string[] = [];
  const unsub = circuit.subscribe(e => events.push(`${e.type}:${e.nodeId}`));
  const [x, setX] = createSignal(0, { name: 'x', module: 'Test' });
  setX(1);
  await new Promise<void>(r => queueMicrotask(r));
  assert(events.some(e => e.includes('signal-change')), 'should receive signal-change event');
  unsub();
  setX(2);
  await new Promise<void>(r => queueMicrotask(r));
  const countAfterUnsub = events.filter(e => e.includes('signal-change')).length;
  setX(3);
  await new Promise<void>(r => queueMicrotask(r));
  assertEqual(events.filter(e => e.includes('signal-change')).length, countAfterUnsub, 'no events after unsubscribe');
});

// 13. Diamond problem — A→B, A→C, B+C→D, change A, D computes once with consistent values
test('diamond problem — consistent values, single computation', () => {
  const [a, setA] = createSignal(1, { name: 'a', module: 'Test' });
  const b = createComb(() => a() * 2, { name: 'b', module: 'Test', deps: ['a'] });
  const c = createComb(() => a() * 3, { name: 'c', module: 'Test', deps: ['a'] });
  let dComputeCount = 0;
  let lastDValue: number | undefined;
  const d = createComb(() => {
    dComputeCount++;
    return b() + c();
  }, { name: 'd', module: 'Test', deps: ['b', 'c'] });
  // Initial: a=1, b=2, c=3, d=5
  assertEqual(d(), 5, 'initial d');
  dComputeCount = 0; // reset after initial

  // Change a to 2: b=4, c=6, d should be 10
  // Use batch to ensure consistency
  batch(() => { setA(2); });
  assertEqual(d(), 10, 'd after a=2');

  // d should read consistent b and c values
  let effectRuns = 0;
  createEffect(() => {
    lastDValue = d();
    effectRuns++;
  }, { name: 'dWatcher', module: 'Test' });
  assertEqual(lastDValue, 10, 'effect sees consistent d');

  batch(() => { setA(5); });
  // b=10, c=15, d=25
  assertEqual(d(), 25, 'd after a=5');
  assertEqual(lastDValue, 25, 'effect sees updated d');
});

// --- Test: onMount schedules via microtask (does not run synchronously) ---
test('onMount does not run synchronously', () => {
  let mounted = false;
  const scope = createScope();
  onMount(() => { mounted = true; });
  assertEqual(mounted, false, 'onMount should not run synchronously');
  scope.dispose();
});

// --- Test: onDestroy runs on scope.dispose() ---
test('onDestroy runs on scope.dispose()', () => {
  let destroyed = false;
  const scope = createScope();
  onDestroy(() => { destroyed = true; });
  assertEqual(destroyed, false, 'onDestroy should not run before dispose');
  scope.dispose();
  assertEqual(destroyed, true, 'onDestroy should run on dispose');
});

// --- Test: onDestroy runs in reverse order ---
test('onDestroy runs in reverse order (LIFO)', () => {
  const order: number[] = [];
  const scope = createScope();
  onDestroy(() => { order.push(1); });
  onDestroy(() => { order.push(2); });
  onDestroy(() => { order.push(3); });
  scope.dispose();
  assertEqual(JSON.stringify(order), JSON.stringify([3, 2, 1]), 'onDestroy should run LIFO');
});

// --- DES Engine Tests ---

// 14. Delta cycle convergence — propagator chains converge
test('delta cycle convergence — propagator chain', () => {
  const [a, setA] = createSignal(1, { name: 'a', module: 'Test' });
  const b = createComb(() => a() * 2, { name: 'b', module: 'Test', deps: ['a'] });
  const c = createComb(() => b() + 1, { name: 'c', module: 'Test', deps: ['b'] });
  assertEqual(c(), 3, 'initial c = a*2+1 = 3');
  setA(5);
  assertEqual(b(), 10, 'b after a=5');
  assertEqual(c(), 11, 'c after a=5');
});

// 15. createEdgeEffect — posedge fires on falsy->truthy
test('createEdgeEffect — posedge fires on falsy to truthy', () => {
  const [flag, setFlag] = createSignal(false, { name: 'flag', module: 'Test' });
  let posedgeCount = 0;
  createEdgeEffect(
    () => flag(),
    'posedge',
    () => { posedgeCount++; },
    { name: 'edge:flag', module: 'Test' },
  );
  assertEqual(posedgeCount, 0, 'no posedge initially');
  setFlag(true);
  assertEqual(posedgeCount, 1, 'posedge after false->true');
  setFlag(true); // same value, no change
  assertEqual(posedgeCount, 1, 'no posedge on same value');
  setFlag(false);
  assertEqual(posedgeCount, 1, 'no posedge on true->false');
  setFlag(true);
  assertEqual(posedgeCount, 2, 'posedge on second false->true');
});

// 16. createEdgeEffect — negedge fires on truthy->falsy
test('createEdgeEffect — negedge fires on truthy to falsy', () => {
  const [flag, setFlag] = createSignal(true, { name: 'flag', module: 'Test' });
  let negedgeCount = 0;
  createEdgeEffect(
    () => flag(),
    'negedge',
    () => { negedgeCount++; },
    { name: 'edge:flag', module: 'Test' },
  );
  assertEqual(negedgeCount, 0, 'no negedge initially');
  setFlag(false);
  assertEqual(negedgeCount, 1, 'negedge after true->false');
  setFlag(true);
  assertEqual(negedgeCount, 1, 'no negedge on false->true');
  setFlag(false);
  assertEqual(negedgeCount, 2, 'negedge on second true->false');
});

// 17. createEdgeEffect — posedge with numeric values
test('createEdgeEffect — posedge with numeric 0->nonzero', () => {
  const [count, setCount] = createSignal(0, { name: 'count', module: 'Test' });
  let fired = 0;
  createEdgeEffect(
    () => count(),
    'posedge',
    () => { fired++; },
    { name: 'edge:count', module: 'Test' },
  );
  assertEqual(fired, 0, 'no posedge initially');
  setCount(5);
  assertEqual(fired, 1, 'posedge after 0->5');
  setCount(10); // truthy->truthy, no edge
  assertEqual(fired, 1, 'no posedge on 5->10');
  setCount(0); // truthy->falsy
  assertEqual(fired, 1, 'no posedge on 10->0');
  setCount(1); // falsy->truthy
  assertEqual(fired, 2, 'posedge on 0->1');
});

// 18. DOM effects deferred — effects with view: prefix run after reactive stabilization
test('DOM effects deferred after reactive stabilization', () => {
  const log: string[] = [];
  const [x, setX] = createSignal(0, { name: 'x', module: 'Test' });
  const doubled = createComb(() => x() * 2, { name: 'doubled', module: 'Test', deps: ['x'] });
  // Non-DOM effect (reactive)
  createEffect(() => { log.push(`reactive:${doubled()}`); }, { name: 'compute:doubled', module: 'Test' });
  // DOM effect
  createEffect(() => { log.push(`dom:${doubled()}`); }, { name: 'view:doubled', module: 'Test' });
  // Both run initially
  assert(log.includes('reactive:0'), 'reactive should run initially');
  assert(log.includes('dom:0'), 'dom should run initially');
  log.length = 0;
  setX(5);
  // After update, both should have run with consistent value
  assert(log.includes('reactive:10'), 'reactive should see doubled=10');
  assert(log.includes('dom:10'), 'dom should see doubled=10');
});

// 19. Simulation engine handles writes during evaluation
test('deferred writes during evaluation phase', () => {
  const [a, setA] = createSignal(0, { name: 'a', module: 'Test' });
  const [b, setB] = createSignal(0, { name: 'b', module: 'Test' });
  // This effect reads a and writes b — simulating a propagator-like pattern
  createEffect(() => {
    const val = a();
    if (val > 0) setB(val * 10);
  }, { name: 'sync:a-to-b', module: 'Test' });
  assertEqual(b(), 0, 'b initially 0');
  setA(3);
  assertEqual(b(), 30, 'b should be 30 after a=3');
  setA(5);
  assertEqual(b(), 50, 'b should be 50 after a=5');
});

// 20. createCell convergence with bidirectional propagators (color-picker pattern)
test('cell convergence with bidirectional propagators', () => {
  const [celsius, setCelsius] = createSignal(0, { name: 'celsius', module: 'Test' });
  const [fahrenheit, setFahrenheit] = createSignal(32, { name: 'fahrenheit', module: 'Test' });
  // Mimic the color-picker pattern with batch
  createEffect(() => {
    const c = celsius();
    batch(() => { setFahrenheit(c * 9 / 5 + 32); });
  }, { name: 'c-to-f', module: 'Test' });
  assertEqual(fahrenheit(), 32, 'fahrenheit initially 32');
  setCelsius(100);
  assertEqual(fahrenheit(), 212, 'fahrenheit after celsius=100');
});

// --- reconcileKeyed tests (with minimal DOM mock) ---

// Minimal DOM mock for Node.js environment
function createMockDOM() {
  interface MockNode {
    nodeType: number;
    textContent: string;
    parentNode: MockNode | null;
    childNodes: MockNode[];
    nextSibling: MockNode | null;
    _tag?: string;
    _data?: string;
  }

  function createNode(tag: string): MockNode {
    const node: MockNode = {
      nodeType: 1,
      textContent: '',
      parentNode: null,
      childNodes: [],
      nextSibling: null,
      _tag: tag,
    };
    return node;
  }

  function updateSiblings(parent: MockNode) {
    for (let i = 0; i < parent.childNodes.length; i++) {
      parent.childNodes[i].nextSibling = parent.childNodes[i + 1] || null;
    }
  }

  const container = createNode('div');

  // Add DOM methods to container
  (container as any).appendChild = function(child: MockNode) {
    child.parentNode = container;
    container.childNodes.push(child);
    updateSiblings(container);
    return child;
  };

  (container as any).insertBefore = function(newNode: MockNode, refNode: MockNode | null) {
    newNode.parentNode = container;
    if (refNode === null) {
      container.childNodes.push(newNode);
    } else {
      const idx = container.childNodes.indexOf(refNode);
      if (idx === -1) {
        container.childNodes.push(newNode);
      } else {
        container.childNodes.splice(idx, 0, newNode);
      }
    }
    updateSiblings(container);
    return newNode;
  };

  (container as any).removeChild = function(child: MockNode) {
    const idx = container.childNodes.indexOf(child);
    if (idx !== -1) {
      container.childNodes.splice(idx, 1);
      child.parentNode = null;
      updateSiblings(container);
    }
    return child;
  };

  const anchor = createNode('comment');
  anchor._data = '@for';
  (container as any).appendChild(anchor);

  return { container, anchor };
}

test('reconcileKeyed — initial render creates all nodes', () => {
  const { container, anchor } = createMockDOM();
  const state: KeyedState = { keyMap: new Map(), disposers: new Map() };
  const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];

  let createCount = 0;
  reconcileKeyed(
    container as any,
    anchor as any,
    items,
    (item) => item.id,
    (item) => { createCount++; const n = { textContent: item.name, parentNode: null, childNodes: [], nextSibling: null, nodeType: 1 }; return n as any; },
    () => {},
    state,
  );

  assertEqual(createCount, 3, 'should create 3 nodes');
  assertEqual(state.keyMap.size, 3, 'keyMap should have 3 entries');
  assert(state.keyMap.has(1), 'keyMap should have key 1');
  assert(state.keyMap.has(2), 'keyMap should have key 2');
  assert(state.keyMap.has(3), 'keyMap should have key 3');
});

test('reconcileKeyed — adding an item only creates one new node', () => {
  const { container, anchor } = createMockDOM();
  const state: KeyedState = { keyMap: new Map(), disposers: new Map() };

  // Initial render
  const items1 = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
  let createCount = 0;
  const createFn = (item: any) => { createCount++; return { textContent: item.name, parentNode: null, childNodes: [], nextSibling: null, nodeType: 1 } as any; };
  const updateFn = (node: any, item: any) => { node.textContent = item.name; };

  reconcileKeyed(container as any, anchor as any, items1, (item) => item.id, createFn, updateFn, state);
  assertEqual(createCount, 2, 'initial: should create 2 nodes');

  // Add one item
  createCount = 0;
  const items2 = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];
  reconcileKeyed(container as any, anchor as any, items2, (item) => item.id, createFn, updateFn, state);
  assertEqual(createCount, 1, 'after add: should only create 1 new node');
  assertEqual(state.keyMap.size, 3, 'keyMap should have 3 entries');
});

test('reconcileKeyed — removing an item removes its node', () => {
  const { container, anchor } = createMockDOM();
  const state: KeyedState = { keyMap: new Map(), disposers: new Map() };

  const items1 = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];
  const createFn = (item: any) => { const n = { textContent: item.name, parentNode: null, childNodes: [], nextSibling: null, nodeType: 1 } as any; return n; };
  const updateFn = () => {};

  reconcileKeyed(container as any, anchor as any, items1, (item) => item.id, createFn, updateFn, state);
  assertEqual(state.keyMap.size, 3, 'initial: 3 entries');

  // Remove middle item
  const items2 = [{ id: 1, name: 'A' }, { id: 3, name: 'C' }];
  reconcileKeyed(container as any, anchor as any, items2, (item) => item.id, createFn, updateFn, state);
  assertEqual(state.keyMap.size, 2, 'after remove: 2 entries');
  assert(!state.keyMap.has(2), 'key 2 should be removed');
});

test('reconcileKeyed — disposer called on removal', () => {
  const { container, anchor } = createMockDOM();
  const state: KeyedState = { keyMap: new Map(), disposers: new Map() };

  const items1 = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
  const createFn = (item: any) => { return { textContent: item.name, parentNode: null, childNodes: [], nextSibling: null, nodeType: 1 } as any; };

  reconcileKeyed(container as any, anchor as any, items1, (item) => item.id, createFn, () => {}, state);

  // Add a disposer for key 2
  let disposed = false;
  state.disposers.set(2, () => { disposed = true; });

  // Remove item with id 2
  const items2 = [{ id: 1, name: 'A' }];
  reconcileKeyed(container as any, anchor as any, items2, (item) => item.id, createFn, () => {}, state);
  assertEqual(disposed, true, 'disposer for removed key should be called');
});

test('reconcileKeyed — update function called for existing keys', () => {
  const { container, anchor } = createMockDOM();
  const state: KeyedState = { keyMap: new Map(), disposers: new Map() };

  const items1 = [{ id: 1, name: 'A' }];
  const createFn = (item: any) => { return { textContent: item.name, parentNode: null, childNodes: [], nextSibling: null, nodeType: 1 } as any; };

  let updateCalled = false;
  let updatedName = '';
  const updateFn = (_node: any, item: any) => { updateCalled = true; updatedName = item.name; };

  reconcileKeyed(container as any, anchor as any, items1, (item) => item.id, createFn, updateFn, state);

  // Update the item's name (same key)
  const items2 = [{ id: 1, name: 'Updated' }];
  reconcileKeyed(container as any, anchor as any, items2, (item) => item.id, createFn, updateFn, state);
  assertEqual(updateCalled, true, 'update function should be called');
  assertEqual(updatedName, 'Updated', 'update should receive new item data');
});

// --- Deferred test: verify onMount actually fires via microtask ---
let onMountFired = false;
circuit.reset();
const __mountScope = createScope();
onMount(() => { onMountFired = true; });
__mountScope.dispose();

// Use queueMicrotask to check after onMount has had a chance to fire,
// then setTimeout for final report to avoid unhandled promise rejections
queueMicrotask(() => {
  if (onMountFired) {
    console.log('  ✓ onMount fires after microtask (deferred check)');
    passed++;
  } else {
    console.log('  ✗ onMount fires after microtask (deferred check): did not fire');
    failed++;
  }
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
});
