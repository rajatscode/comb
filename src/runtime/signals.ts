// signals.ts — Push-pull reactive primitives with auto-tracking

import { circuit } from './circuit.js';

// --- Internal state ---

interface Computation {
  execute: () => void;
  dependencies: Set<SignalNode<any>>;
  cleanups: (() => void)[];
  disposed: boolean;
}

interface SignalNode<T> {
  value: T;
  subscribers: Set<Computation>;
}

let currentComputation: Computation | null = null;
let batchDepth = 0;
const pendingComputations = new Set<Computation>();
let currentScope: Scope | null = null;

// --- Internal helpers ---

function track<T>(signal: SignalNode<T>): void {
  if (currentComputation && !currentComputation.disposed) {
    signal.subscribers.add(currentComputation);
    currentComputation.dependencies.add(signal);
  }
}

function notify(signal: SignalNode<any>): void {
  // Snapshot subscribers to avoid infinite re-iteration when a comp re-tracks itself
  const subs = [...signal.subscribers];
  for (const comp of subs) {
    if (comp.disposed) continue;
    if (batchDepth > 0) {
      pendingComputations.add(comp);
    } else {
      comp.execute();
    }
  }
}

function flushPending(): void {
  // Iterate until stable — a comp may dirty another comp
  let depth = 0;
  while (pendingComputations.size > 0) {
    if (++depth > 100) {
      console.error('[Comb] Propagation depth limit exceeded (100 iterations). Breaking potential infinite loop.');
      pendingComputations.clear();
      break;
    }
    const batch = [...pendingComputations];
    pendingComputations.clear();
    for (const comp of batch) {
      if (!comp.disposed) comp.execute();
    }
  }
}

function cleanupComputation(comp: Computation): void {
  for (const cleanup of comp.cleanups) cleanup();
  comp.cleanups = [];
  for (const dep of comp.dependencies) dep.subscribers.delete(comp);
  comp.dependencies.clear();
}

// --- Scope ---

class Scope {
  private computations: Computation[] = [];
  private children: (() => void)[] = [];
  private destroyCallbacks: (() => void)[] = [];
  private parent: Scope | null;

  constructor() {
    this.parent = currentScope;
  }

  track(comp: Computation): void {
    this.computations.push(comp);
  }

  addChild(disposeFn: () => void): void {
    this.children.push(disposeFn);
  }

  addCleanup(fn: () => void): void {
    this.destroyCallbacks.push(fn);
  }

  dispose(): void {
    // Run destroy callbacks in reverse order (LIFO)
    for (let i = this.destroyCallbacks.length - 1; i >= 0; i--) {
      this.destroyCallbacks[i]();
    }
    this.destroyCallbacks = [];
    // Dispose children (bottom-up)
    for (const child of this.children) child();
    this.children = [];
    for (const comp of this.computations) {
      comp.disposed = true;
      cleanupComputation(comp);
    }
    this.computations = [];
  }
}

// --- Public API ---

export function createSignal<T>(
  initial: T,
  meta: { name: string; module: string; type?: string },
): [get: () => T, set: (v: T | ((prev: T) => T)) => void] {
  const nodeId = circuit.registerNode({ name: meta.name, module: meta.module, type: 'signal', valueType: meta.type });

  const signal: SignalNode<T> = { value: initial, subscribers: new Set() };

  circuit.setNodeValue(nodeId, () => signal.value);

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

  circuit.setNodeSetter(nodeId, (v: any) => write(v));

  return [read, write];
}

export function createComb<T>(
  fn: () => T,
  meta: { name: string; module: string; deps: string[] },
): () => T {
  const nodeId = circuit.registerNode({ name: meta.name, module: meta.module, type: 'comb', deps: meta.deps });

  let value: T;
  let dirty = true;

  const signal: SignalNode<T> = { value: undefined as T, subscribers: new Set() };

  const comp: Computation = {
    execute: () => {
      // Mark dirty and eagerly recompute. Only notify downstream if value changed.
      dirty = true;
      recompute();
    },
    dependencies: new Set(),
    cleanups: [],
    disposed: false,
  };

  if (currentScope) currentScope.track(comp);

  function recompute(): T {
    // Clear old tracking
    for (const dep of comp.dependencies) dep.subscribers.delete(comp);
    comp.dependencies.clear();

    const prev = currentComputation;
    currentComputation = comp;
    const newVal = fn();
    currentComputation = prev;

    dirty = false;

    if (!Object.is(newVal, value)) {
      const old = value;
      value = newVal;
      signal.value = newVal;
      circuit.notifyChange(nodeId, old, newVal);
      notify(signal); // only propagate if value actually changed
    }
    return value;
  }

  circuit.setNodeValue(nodeId, () => signal.value);

  // Initial computation
  recompute();

  return (): T => {
    if (dirty) recompute();
    track(signal);
    return value;
  };
}

export function createEffect(
  fn: () => void | (() => void),
  meta: { name: string; module: string },
): void {
  const nodeId = circuit.registerNode({ name: meta.name, module: meta.module, type: 'effect' });

  const comp: Computation = {
    execute: runEffect,
    dependencies: new Set(),
    cleanups: [],
    disposed: false,
  };

  if (currentScope) currentScope.track(comp);

  function runEffect(): void {
    if (comp.disposed) return;

    // Run cleanups from previous execution
    for (const cleanup of comp.cleanups) cleanup();
    comp.cleanups = [];

    // Clear old tracking
    for (const dep of comp.dependencies) dep.subscribers.delete(comp);
    comp.dependencies.clear();

    const prev = currentComputation;
    currentComputation = comp;
    const cleanup = fn();
    currentComputation = prev;

    if (typeof cleanup === 'function') comp.cleanups.push(cleanup);

    circuit.notifyEffect(nodeId);
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
    if (batchDepth === 0) flushPending();
  }
}

export function untrack<T>(fn: () => T): T {
  const prev = currentComputation;
  currentComputation = null;
  const val = fn();
  currentComputation = prev;
  return val;
}

export function createScope(): { dispose: () => void } {
  const scope = new Scope();
  const prevScope = currentScope;
  currentScope = scope;
  // The caller will create signals/combs/effects while this scope is active.
  // We need to restore parent scope later — but since module factories run synchronously,
  // we restore on the microtask. Actually, let's just provide an enter/exit pattern
  // by returning the scope and relying on the caller to manage it.
  // For the codegen pattern (synchronous factory), we return dispose and keep
  // the scope active until the factory function returns.

  return {
    dispose: () => {
      scope.dispose();
      currentScope = prevScope;
    },
  };
}

export function createCell<T>(
  initial: T,
  meta: { name: string; module: string; type?: string; merge?: (current: T, incoming: T) => T },
): [get: () => T, set: (v: T) => void] {
  const merge = meta.merge ?? ((_: T, incoming: T) => incoming);
  const nodeId = circuit.registerNode({ name: meta.name, module: meta.module, type: 'cell', valueType: meta.type });

  const signal: SignalNode<T> = { value: initial, subscribers: new Set() };
  circuit.setNodeValue(nodeId, () => signal.value);

  const get = (): T => {
    track(signal);
    return signal.value;
  };

  const set = (incoming: T): void => {
    const merged = merge(signal.value, incoming);
    if (Object.is(merged, signal.value)) return;
    const old = signal.value;
    signal.value = merged;
    circuit.notifyChange(nodeId, old, merged);
    notify(signal);
  };

  circuit.setNodeSetter(nodeId, (v: any) => set(v));

  return [get, set];
}

export function createPropagator(
  fn: () => void,
  meta: { name: string; module: string; deps?: string[]; writes?: string[] },
): void {
  // Register as propagator node with explicit edges
  const nodeId = circuit.registerNode({ name: meta.name, module: meta.module, type: 'propagator', deps: meta.deps });
  if (meta.writes) {
    for (const w of meta.writes) {
      const targetId = `${meta.module}.${w}`;
      const exists = circuit.getEdges().some(e => e.from === nodeId && e.to === targetId);
      if (!exists) circuit['edges'].push({ from: nodeId, to: targetId });
    }
  }

  // Use raw effect machinery (not createEffect, which would register a second node)
  const comp: Computation = {
    execute: runPropagator,
    dependencies: new Set(),
    cleanups: [],
    disposed: false,
  };

  if (currentScope) currentScope.track(comp);

  function runPropagator(): void {
    if (comp.disposed) return;
    for (const cleanup of comp.cleanups) cleanup();
    comp.cleanups = [];
    for (const dep of comp.dependencies) dep.subscribers.delete(comp);
    comp.dependencies.clear();

    const prev = currentComputation;
    currentComputation = comp;
    batch(() => { fn(); });
    currentComputation = prev;

    circuit.notifyEffect(nodeId);
  }

  runPropagator();
}

export function onMount(fn: () => void): void {
  queueMicrotask(fn);
}

export function onDestroy(fn: () => void): void {
  if (currentScope) {
    currentScope.addCleanup(fn);
  }
}

// For test use — lets tests end the scope after synchronous factory code
export function endScope(): void {
  if (currentScope) {
    const parent = (currentScope as any).parent;
    currentScope = parent;
  }
}
