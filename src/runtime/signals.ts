// signals.ts — DES (Discrete Event Simulation) reactive runtime
// Replaces microtask-based reactivity with a proper delta-cycle simulation engine.

import { circuit } from './circuit.js';

// --- Internal types ---

interface Computation {
  execute: () => void;
  dependencies: Set<SignalNode<any>>;
  cleanups: (() => void)[];
  disposed: boolean;
  isDom: boolean;
}

interface SignalNode<T> {
  value: T;
  subscribers: Set<Computation>;
}

interface PendingUpdate<T> {
  signal: SignalNode<T>;
  nodeId: string;
  value: T;
  oldValue: T;
}

// --- Simulation Engine ---

class SimulationEngine {
  evaluating = false;
  pendingUpdates: PendingUpdate<any>[] = [];
  pendingComputations = new Set<Computation>();
  private deltaCount = 0;
  private maxDeltaCycles = 1000;
  private domEffects: (() => void)[] = [];
  batchDepth = 0;

  scheduleUpdate<T>(signal: SignalNode<T>, nodeId: string, value: T, oldValue: T): void {
    this.pendingUpdates.push({ signal, nodeId, value, oldValue });
  }

  scheduleComputation(comp: Computation): void {
    if (comp.disposed) return;
    if (comp.isDom) {
      // DOM effects are deferred until after quiescence
      this.scheduleDomEffect(() => {
        if (!comp.disposed) comp.execute();
      });
    } else {
      this.pendingComputations.add(comp);
    }
  }

  runUntilQuiescent(): void {
    this.deltaCount = 0;

    while (this.pendingComputations.size > 0 || this.pendingUpdates.length > 0) {
      this.deltaCount++;
      if (this.deltaCount > this.maxDeltaCycles) {
        console.error('[Comb] Delta cycle limit exceeded (' + this.maxDeltaCycles + ' iterations). Breaking potential infinite loop.');
        this.pendingComputations.clear();
        this.pendingUpdates.length = 0;
        break;
      }

      // EVALUATE phase: run all pending computations
      this.evaluating = true;
      const batch = [...this.pendingComputations];
      this.pendingComputations.clear();
      for (const comp of batch) {
        if (!comp.disposed) comp.execute();
      }
      this.evaluating = false;

      // UPDATE phase: apply deferred signal writes
      const updates = this.pendingUpdates.splice(0);
      for (const u of updates) {
        if (!Object.is(u.value, u.signal.value)) {
          applyUpdate(u.signal, u.nodeId, u.value, u.oldValue);
        }
      }
    }

    // After quiescence: flush DOM effects
    this.flushDomEffects();
  }

  scheduleDomEffect(fn: () => void): void {
    this.domEffects.push(fn);
  }

  private flushDomEffects(): void {
    const effects = this.domEffects.splice(0);
    for (const fn of effects) fn();
  }

  enterBatch(): void {
    this.batchDepth++;
  }

  exitBatch(): void {
    this.batchDepth--;
    if (this.batchDepth === 0) {
      this.runUntilQuiescent();
    }
  }
}

const engine = new SimulationEngine();

// --- Internal state ---

let currentComputation: Computation | null = null;
let currentScope: Scope | null = null;

// --- Internal helpers ---

function isDomEffectName(name: string): boolean {
  return name.startsWith('view:') || name.startsWith('bind:') || name.startsWith('token:');
}

function track<T>(signal: SignalNode<T>): void {
  if (currentComputation && !currentComputation.disposed) {
    signal.subscribers.add(currentComputation);
    currentComputation.dependencies.add(signal);
  }
}

function notify(signal: SignalNode<any>): void {
  const subs = [...signal.subscribers];
  for (const comp of subs) {
    if (comp.disposed) continue;
    engine.scheduleComputation(comp);
  }
}

function applyUpdate<T>(signal: SignalNode<T>, nodeId: string, value: T, oldValue: T): void {
  const old = signal.value;
  signal.value = value;
  circuit.notifyChange(nodeId, old, value);
  notify(signal);
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

    if (engine.evaluating) {
      // Inside evaluation phase: defer to pendingUpdates (apply next delta)
      engine.scheduleUpdate(signal, nodeId, nextVal, old);
    } else {
      // Outside evaluation: apply immediately
      signal.value = nextVal;
      circuit.notifyChange(nodeId, old, nextVal);
      notify(signal);
      // Run simulation to quiescence if not in batch
      if (engine.batchDepth === 0) {
        engine.runUntilQuiescent();
      }
    }
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
    isDom: false,
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
      // Notify subscribers through the engine
      notify(signal);
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
  meta: { name: string; module: string; [key: string]: any },
): void {
  const nodeId = circuit.registerNode({ name: meta.name, module: meta.module, type: 'effect' });

  const isDom = isDomEffectName(meta.name);

  const comp: Computation = {
    execute: runEffect,
    dependencies: new Set(),
    cleanups: [],
    disposed: false,
    isDom,
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
  engine.enterBatch();
  try {
    fn();
  } finally {
    engine.exitBatch();
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

    if (engine.evaluating) {
      // Inside evaluation phase: defer update
      engine.scheduleUpdate(signal, nodeId, merged, old);
    } else {
      signal.value = merged;
      circuit.notifyChange(nodeId, old, merged);
      notify(signal);
      if (engine.batchDepth === 0) {
        engine.runUntilQuiescent();
      }
    }
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
    isDom: false,
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

// --- Edge-triggered effects ---

export function createEdgeEffect(
  valueFn: () => any,
  edge: 'posedge' | 'negedge',
  action: () => void,
  meta: { name: string; module: string },
): void {
  const nodeId = circuit.registerNode({ name: meta.name, module: meta.module, type: 'effect' });

  let previousValue: any = undefined;
  let initialized = false;

  const comp: Computation = {
    execute: runEdgeEffect,
    dependencies: new Set(),
    cleanups: [],
    disposed: false,
    isDom: false,
  };

  if (currentScope) currentScope.track(comp);

  function runEdgeEffect(): void {
    if (comp.disposed) return;

    // Clear old tracking
    for (const dep of comp.dependencies) dep.subscribers.delete(comp);
    comp.dependencies.clear();

    const prev = currentComputation;
    currentComputation = comp;
    const currentValue = valueFn();
    currentComputation = prev;

    if (initialized) {
      const wasTruthy = !!previousValue;
      const isTruthy = !!currentValue;

      if (edge === 'posedge' && !wasTruthy && isTruthy) {
        action();
      } else if (edge === 'negedge' && wasTruthy && !isTruthy) {
        action();
      }
    }

    previousValue = currentValue;
    initialized = true;
    circuit.notifyEffect(nodeId);
  }

  // Run initially to capture baseline
  runEdgeEffect();
}

// --- Temporal assertions ---

export function createTemporalAssert(
  triggerFn: () => boolean,
  operator: 'eventually' | 'always' | 'next',
  propertyFn: () => boolean,
  meta: { name: string; module: string; duration: number },
): void {
  const nodeId = circuit.registerNode({ name: meta.name, module: meta.module, type: 'effect' });

  let previousTrigger = false;
  let triggerInitialized = false;

  // State for active assertions
  let armed = false;
  let alwaysTimer: ReturnType<typeof setTimeout> | null = null;
  let eventuallyTimer: ReturnType<typeof setTimeout> | null = null;
  let nextCyclePending = false;

  const triggerComp: Computation = {
    execute: checkTrigger,
    dependencies: new Set(),
    cleanups: [],
    disposed: false,
    isDom: false,
  };

  if (currentScope) currentScope.track(triggerComp);

  function checkTrigger(): void {
    if (triggerComp.disposed) return;

    // Clear old tracking
    for (const dep of triggerComp.dependencies) dep.subscribers.delete(triggerComp);
    triggerComp.dependencies.clear();

    const prev = currentComputation;
    currentComputation = triggerComp;
    const currentTrigger = !!triggerFn();
    currentComputation = prev;

    // Detect posedge on trigger
    if (triggerInitialized && !previousTrigger && currentTrigger) {
      armAssertion();
    }

    previousTrigger = currentTrigger;
    triggerInitialized = true;
    circuit.notifyEffect(nodeId);
  }

  function armAssertion(): void {
    armed = true;

    if (operator === 'eventually') {
      // Check immediately
      if (propertyFn()) {
        armed = false;
        return;
      }
      // Set deadline
      eventuallyTimer = setTimeout(() => {
        if (armed && !propertyFn()) {
          circuit.assertionFailed(meta.name, {
            expr: `eventually within ${meta.duration}ms`,
            module: meta.module,
            values: { property: propertyFn() },
          });
        }
        armed = false;
      }, meta.duration);

      // Also monitor on each change via a property watcher
      const propComp: Computation = {
        execute: () => {
          if (!armed || propComp.disposed) return;
          // Clear old tracking
          for (const dep of propComp.dependencies) dep.subscribers.delete(propComp);
          propComp.dependencies.clear();

          const prev = currentComputation;
          currentComputation = propComp;
          const result = propertyFn();
          currentComputation = prev;

          if (result) {
            armed = false;
            if (eventuallyTimer) { clearTimeout(eventuallyTimer); eventuallyTimer = null; }
            propComp.disposed = true;
          }
        },
        dependencies: new Set(),
        cleanups: [],
        disposed: false,
        isDom: false,
      };
      if (currentScope) currentScope.track(propComp);
      // Run once to set up tracking
      propComp.execute();

    } else if (operator === 'always') {
      // Property must remain true for duration ms
      if (!propertyFn()) {
        circuit.assertionFailed(meta.name, {
          expr: `always for ${meta.duration}ms`,
          module: meta.module,
          values: { property: false },
        });
        armed = false;
        return;
      }

      // Monitor property changes
      const propComp: Computation = {
        execute: () => {
          if (!armed || propComp.disposed) return;
          for (const dep of propComp.dependencies) dep.subscribers.delete(propComp);
          propComp.dependencies.clear();

          const prev = currentComputation;
          currentComputation = propComp;
          const result = propertyFn();
          currentComputation = prev;

          if (!result) {
            circuit.assertionFailed(meta.name, {
              expr: `always for ${meta.duration}ms`,
              module: meta.module,
              values: { property: false },
            });
            armed = false;
            if (alwaysTimer) { clearTimeout(alwaysTimer); alwaysTimer = null; }
            propComp.disposed = true;
          }
        },
        dependencies: new Set(),
        cleanups: [],
        disposed: false,
        isDom: false,
      };
      if (currentScope) currentScope.track(propComp);
      propComp.execute();

      // Success after duration
      alwaysTimer = setTimeout(() => {
        armed = false;
        propComp.disposed = true;
      }, meta.duration);

    } else if (operator === 'next') {
      // Property must be true after the next delta cycle completes
      nextCyclePending = true;
      // Schedule a check after current simulation quiesces
      // We use a microtask to check after the current batch/simulation finishes
      queueMicrotask(() => {
        if (nextCyclePending && armed) {
          if (!propertyFn()) {
            circuit.assertionFailed(meta.name, {
              expr: `next delta cycle`,
              module: meta.module,
              values: { property: propertyFn() },
            });
          }
          armed = false;
          nextCyclePending = false;
        }
      });
    }
  }

  // Run initially to capture baseline trigger value
  checkTrigger();
}

export function onMount(fn: () => void): void {
  queueMicrotask(fn);
}

export function onDestroy(fn: () => void): void {
  if (currentScope) {
    currentScope.addCleanup(fn);
  }
}

// For test use -- lets tests end the scope after synchronous factory code
export function endScope(): void {
  if (currentScope) {
    const parent = (currentScope as any).parent;
    currentScope = parent;
  }
}
