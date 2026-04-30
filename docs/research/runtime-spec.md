# Runtime Specification

## Architecture
- Compiler deps = verification + visualization layer (CircuitGraph topology)
- Runtime auto-tracking = execution engine (SolidJS-style)
- Dev-mode cross-check: assert runtime deps subset of compiler deps
- CircuitGraph: separate class, singleton, full event subscription
- Effect disposal via createScope() / dispose()

## Files
- signals.ts — createSignal, createComb, createEffect, batch, untrack, createScope
- circuit.ts — CircuitGraph class, singleton
- index.ts — re-exports

## Node IDs: Module.name (e.g. Counter.count)

## Key designs
- Combs: lazy (pull-based), memoized, mark dirty on dep change, recompute on read
- Effects: eager (push-based), run immediately, re-run on dep change, support cleanup
- Batch: depth counting, flush when outermost exits
- Scope: tracks computations, dispose tears down all effects + unsubscribes

## 13 test cases specified (see architect's full spec)
