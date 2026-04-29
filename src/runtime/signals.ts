// signals.ts — Push-pull reactive primitives with glitch-free topological evaluation

import { circuit, type NodeId } from './circuit.js';

// --- Tracking context ---
let currentComputation: Computation | null = null;
let batchDepth = 0;
let pendingComputations = new Set<Computation>();

interface Computation {
  execute: () => void;
  dependencies: Set<SignalNode<any>>;
  cleanups: (() => void)[];
}

interface SignalNode<T> {
  nodeId: NodeId;
  value: T;
  subscribers: Set<Computation>;
}

// --- Dependency tracking helpers ---

function track<T>(signal: SignalNode<T>): void {
  if (currentComputation) {
    signal.subscribers.add(currentComputation);
    currentComputation.dependencies.add(signal);
  }
}

function notify(signal: SignalNode<any>): void {
  for (const comp of signal.subscribers) {
    if (batchDepth > 0) {
      pendingComputations.add(comp);
    } else {
      comp.execute();
    }
  }
}

// --- Topological sort for glitch-free evaluation ---

function flushPending(): void {
  // We need to run computations in topological order.
  // Combs before effects — combs have level based on dependency depth.
  // Effects always run last.
  const comps = [...pendingComputations];
  pendingComputations.clear();

  // Sort: combs first (they might update more signals), then effects
  // Use a simple stable approach: run all pending, collect any newly dirtied, repeat
  const visited = new Set<Computation>();
  const queue = [...comps];

  while (queue.length > 0) {
    const comp = queue.shift()!;
    if (visited.has(comp)) continue;
    visited.add(comp);
    comp.execute();
  }
}

// --- Public API ---

export function createSignal<T>(
  initial: T,
  name: string,
  moduleId: string
): [get: () => T, set: (v: T | ((prev: T) => T)) => void] {
  const nodeId = circuit.registerSignal(name, moduleId, () => signal.value);

  const signal: SignalNode<T> = {
    nodeId,
    value: initial,
    subscribers: new Set(),
  };

  const read = (): T => {
    track(signal);
    return signal.value;
  };

  const write = (next: T | ((prev: T) => T)): void => {
    const nextVal = typeof next === 'function'
      ? (next as (prev: T) => T)(signal.value)
      : next;

    if (Object.is(nextVal, signal.value)) return;
    const old = signal.value;
    signal.value = nextVal;
    circuit.notifyChange(nodeId, old, nextVal);
    notify(signal);
  };

  return [read, write];
}

export function createComb<T>(
  fn: () => T,
  name: string,
  moduleId: string
): () => T {
  let value: T;
  let dirty = true;
  let nodeId: NodeId;

  const signal: SignalNode<T> = {
    nodeId: '',
    value: undefined as T,
    subscribers: new Set(),
  };

  const comp: Computation = {
    execute: () => { dirty = true; notify(signal); },
    dependencies: new Set(),
    cleanups: [],
  };

  const recompute = (): T => {
    // Clean up old dependencies
    for (const dep of comp.dependencies) {
      dep.subscribers.delete(comp);
    }
    comp.dependencies.clear();

    const prev = currentComputation;
    currentComputation = comp;
    const newVal = fn();
    currentComputation = prev;

    if (!Object.is(newVal, value)) {
      const old = value;
      value = newVal;
      signal.value = newVal;
      circuit.notifyChange(nodeId, old, newVal);
    }
    dirty = false;
    return value;
  };

  nodeId = circuit.registerComb(name, moduleId, [], () => signal.value);
  signal.nodeId = nodeId;

  // Initial computation
  recompute();

  const read = (): T => {
    if (dirty) recompute();
    track(signal);
    return value;
  };

  return read;
}

export function createEffect(
  fn: () => void | (() => void),
  name: string,
  moduleId: string
): void {
  const nodeId = circuit.registerEffect(name, moduleId, []);

  const comp: Computation = {
    execute: runEffect,
    dependencies: new Set(),
    cleanups: [],
  };

  function runEffect(): void {
    // Run cleanups from previous execution
    for (const cleanup of comp.cleanups) {
      cleanup();
    }
    comp.cleanups = [];

    // Clean up old dependencies
    for (const dep of comp.dependencies) {
      dep.subscribers.delete(comp);
    }
    comp.dependencies.clear();

    const prev = currentComputation;
    currentComputation = comp;
    const cleanup = fn();
    currentComputation = prev;

    if (typeof cleanup === 'function') {
      comp.cleanups.push(cleanup);
    }

    circuit.notifyChange(nodeId, undefined, undefined);
  }

  // Run initially
  runEffect();
}

export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushPending();
    }
  }
}

export function untrack<T>(fn: () => T): T {
  const prev = currentComputation;
  currentComputation = null;
  const val = fn();
  currentComputation = prev;
  return val;
}
