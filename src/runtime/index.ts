// index.ts — Runtime re-exports

export { createSignal, createComb, createEffect, batch, untrack, createScope } from './signals.js';
export { circuit, CircuitGraph } from './circuit.js';
export type { GraphNode, GraphEdge, GraphEvent, NodeType, VerifyIssue, GraphDiff } from './circuit.js';
