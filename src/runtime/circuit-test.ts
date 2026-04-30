// circuit-test.ts — Tests for CircuitGraph loadStaticGraph, verifyGraph, diffGraphs
// Run: npx tsx src/runtime/circuit-test.ts

import { CircuitGraph } from './circuit.js';
import type { StaticGraph } from '../core/graph.js';

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

console.log('\nCircuitGraph Tests\n');

const counterGraph: StaticGraph = {
  nodes: [
    { id: 'count', name: 'count', type: 'signal' },
    { id: 'doubled', name: 'doubled', type: 'comb' },
    { id: 'event:increment', name: 'increment', type: 'event' },
    { id: 'view', name: 'view', type: 'view-binding' },
  ],
  edges: [
    { from: 'count', to: 'doubled', type: 'data' },
    { from: 'event:increment', to: 'count', type: 'write' },
    { from: 'doubled', to: 'view', type: 'data' },
  ],
};

// Test 1
test('loadStaticGraph populates nodes with staticOrigin=true', () => {
  const cg = new CircuitGraph();
  cg.loadStaticGraph(counterGraph);
  const nodes = cg.getNodes();
  assert(nodes.length === 4, `Expected 4 nodes, got ${nodes.length}`);
  for (const n of nodes) {
    assert(n.staticOrigin === true, `Node ${n.id} should have staticOrigin=true`);
    assert(n.runtimeAttached === false, `Node ${n.id} should have runtimeAttached=false`);
  }
});

// Test 2
test('loadStaticGraph populates edges', () => {
  const cg = new CircuitGraph();
  cg.loadStaticGraph(counterGraph);
  const edges = cg.getEdges();
  assert(edges.length === 3, `Expected 3 edges, got ${edges.length}`);
  assert(edges.some(e => e.from === 'count' && e.to === 'doubled'), 'Missing count→doubled edge');
  assert(edges.some(e => e.from === 'event:increment' && e.to === 'count'), 'Missing increment→count edge');
});

// Test 3
test('registerNode enriches static node (runtimeAttached=true)', () => {
  const cg = new CircuitGraph();
  cg.loadStaticGraph(counterGraph);
  const id = cg.registerNode({ name: 'count', module: 'Counter', type: 'signal', valueType: 'int' });
  assert(id === 'Counter.count', `Expected Counter.count, got ${id}`);
  const node = cg.getNode('Counter.count');
  assert(node !== undefined, 'Node should exist at Counter.count');
  assert(node!.staticOrigin === true, 'Should preserve staticOrigin');
  assert(node!.runtimeAttached === true, 'Should be runtimeAttached');
  assert(node!.valueType === 'int', 'Should have valueType from runtime');
  assert(node!.module === 'Counter', 'Should have module set');
  // Old bare ID should be gone
  assert(cg.getNode('count') === undefined, 'Bare ID should be removed');
});

// Test 4
test('registerNode creates new node with staticOrigin=false', () => {
  const cg = new CircuitGraph();
  cg.loadStaticGraph(counterGraph);
  const id = cg.registerNode({ name: 'extra', module: 'Counter', type: 'comb' });
  const node = cg.getNode(id);
  assert(node !== undefined, 'Node should exist');
  assert(node!.staticOrigin === false, 'Should have staticOrigin=false');
  assert(node!.runtimeAttached === true, 'Should have runtimeAttached=true');
});

// Test 5
test('no duplicate edges after registerNode', () => {
  const cg = new CircuitGraph();
  cg.loadStaticGraph(counterGraph);
  cg.registerNode({ name: 'count', module: 'Counter', type: 'signal' });
  cg.registerNode({ name: 'doubled', module: 'Counter', type: 'comb', deps: ['count'] });
  const edges = cg.getEdges();
  const countToDoubled = edges.filter(e => e.from === 'Counter.count' && e.to === 'Counter.doubled');
  assert(countToDoubled.length === 1, `Expected 1 count→doubled edge, got ${countToDoubled.length}`);
});

// Test 6
test('verifyGraph catches unregistered static nodes', () => {
  const cg = new CircuitGraph();
  cg.loadStaticGraph(counterGraph);
  cg.registerNode({ name: 'count', module: 'Counter', type: 'signal' });
  // doubled, event:increment, view are NOT registered
  const issues = cg.verifyGraph('Counter');
  const unregistered = issues.filter(i => i.type === 'unregistered');
  assert(unregistered.length >= 1, `Expected unregistered issues, got ${unregistered.length}`);
});

// Test 7
test('verifyGraph clean when all registered', () => {
  const cg = new CircuitGraph();
  const simpleGraph: StaticGraph = {
    nodes: [
      { id: 'x', name: 'x', type: 'signal' },
      { id: 'y', name: 'y', type: 'comb' },
    ],
    edges: [{ from: 'x', to: 'y', type: 'data' }],
  };
  cg.loadStaticGraph(simpleGraph);
  cg.registerNode({ name: 'x', module: 'M', type: 'signal' });
  cg.registerNode({ name: 'y', module: 'M', type: 'comb', deps: ['x'] });
  const issues = cg.verifyGraph('M');
  assert(issues.length === 0, `Expected 0 issues, got ${issues.length}: ${issues.map(i => i.message).join(', ')}`);
});

// Test 8
test('diffGraphs detects added nodes', () => {
  const a: StaticGraph = {
    nodes: [{ id: 'x', name: 'x', type: 'signal' }],
    edges: [],
  };
  const b: StaticGraph = {
    nodes: [
      { id: 'x', name: 'x', type: 'signal' },
      { id: 'y', name: 'y', type: 'comb' },
    ],
    edges: [],
  };
  const diff = CircuitGraph.diffGraphs(a, b);
  assert(diff.addedNodes.length === 1, `Expected 1 added, got ${diff.addedNodes.length}`);
  assert(diff.addedNodes[0].id === 'y', 'Added node should be y');
  assert(diff.removedNodes.length === 0, 'No removals');
});

// Test 9
test('diffGraphs detects removed nodes', () => {
  const a: StaticGraph = {
    nodes: [
      { id: 'x', name: 'x', type: 'signal' },
      { id: 'y', name: 'y', type: 'comb' },
    ],
    edges: [],
  };
  const b: StaticGraph = {
    nodes: [{ id: 'x', name: 'x', type: 'signal' }],
    edges: [],
  };
  const diff = CircuitGraph.diffGraphs(a, b);
  assert(diff.removedNodes.length === 1, `Expected 1 removed, got ${diff.removedNodes.length}`);
  assert(diff.removedNodes[0].id === 'y', 'Removed node should be y');
});

// Test 10
test('diffGraphs detects changed node types', () => {
  const a: StaticGraph = {
    nodes: [{ id: 'x', name: 'x', type: 'signal' }],
    edges: [],
  };
  const b: StaticGraph = {
    nodes: [{ id: 'x', name: 'x', type: 'comb' }],
    edges: [],
  };
  const diff = CircuitGraph.diffGraphs(a, b);
  assert(diff.changedNodes.length === 1, `Expected 1 changed, got ${diff.changedNodes.length}`);
  assert(diff.changedNodes[0].before.type === 'signal', 'Before type should be signal');
  assert(diff.changedNodes[0].after.type === 'comb', 'After type should be comb');
});

// Test 11
test('diffGraphs detects edge changes', () => {
  const a: StaticGraph = {
    nodes: [
      { id: 'x', name: 'x', type: 'signal' },
      { id: 'y', name: 'y', type: 'comb' },
    ],
    edges: [{ from: 'x', to: 'y', type: 'data' }],
  };
  const b: StaticGraph = {
    nodes: [
      { id: 'x', name: 'x', type: 'signal' },
      { id: 'y', name: 'y', type: 'comb' },
      { id: 'z', name: 'z', type: 'comb' },
    ],
    edges: [{ from: 'x', to: 'z', type: 'data' }],
  };
  const diff = CircuitGraph.diffGraphs(a, b);
  assert(diff.addedEdges.length === 1, `Expected 1 added edge, got ${diff.addedEdges.length}`);
  assert(diff.addedEdges[0].to === 'z', 'Added edge should go to z');
  assert(diff.removedEdges.length === 1, `Expected 1 removed edge, got ${diff.removedEdges.length}`);
  assert(diff.removedEdges[0].to === 'y', 'Removed edge should have gone to y');
});

// Test 12
test('getStaticGraph roundtrips', () => {
  const cg = new CircuitGraph();
  const graph: StaticGraph = {
    nodes: [
      { id: 'a', name: 'a', type: 'signal' },
      { id: 'b', name: 'b', type: 'comb' },
    ],
    edges: [{ from: 'a', to: 'b', type: 'data' }],
  };
  cg.loadStaticGraph(graph);
  cg.registerNode({ name: 'a', module: 'M', type: 'signal' });
  cg.registerNode({ name: 'b', module: 'M', type: 'comb', deps: ['a'] });

  const extracted = cg.getStaticGraph('M');
  assert(extracted.nodes.length === 2, `Expected 2 nodes, got ${extracted.nodes.length}`);
  assert(extracted.edges.length === 1, `Expected 1 edge, got ${extracted.edges.length}`);
  assert(extracted.nodes.some(n => n.id === 'a' && n.type === 'signal'), 'Should have signal a');
  assert(extracted.nodes.some(n => n.id === 'b' && n.type === 'comb'), 'Should have comb b');
  assert(extracted.edges[0].from === 'a' && extracted.edges[0].to === 'b', 'Edge a→b should exist');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
