# Comb Architecture Plan (Revised 2026-04-30)

## Core Paradigm
UI is a discrete event simulation. The runtime is a DES kernel with delta cycles, edge-triggered sensitivity, and formal stabilization. Dependencies are explicit and compiler-verified. The reactive graph is first-class and inspectable — emitted as a static `__graph` artifact at compile time.

## Primitives
1. **signal** — mutable state, typed, named, registered in CircuitGraph
2. **comb** — compiler-verified derived value, static union semantics (all branches tracked)
3. **always @(event)** — event-triggered state transition, batched via non-blocking `<=`
4. **always @(signal, ...)** — sensitivity-triggered block, compiler-verified dep list
5. **always @(posedge/negedge)** — edge-triggered block, fires on transitions not values
6. **cell** — merge-semantic value for propagator networks
7. **constraint** — propagator clause, bidirectional dataflow
8. **view** — reactive DOM output, fine-grained, no VDOM
9. **assert** — runtime invariant, registered as graph node
10. **assert temporal** — SVA-style temporal property over time (eventually, always, next)

## DES Execution Model

The runtime uses a `SimulationEngine` with delta cycles (implemented in `src/runtime/signals.ts`).

```
Event → Delta 0: combinational (combs) settle
      → Delta 1: non-blocking (<=) apply
      → Delta 2: if new combinational changes, re-settle
      → ...until quiescent...
      → DOM commit
```

Key difference from topological sorting (Solid/Preact): topo sort is single-pass. Delta cycles are multi-pass -- sequential logic can create new combinational dependencies that need another settle pass.

## CircuitGraph
Compiler produces the schematic (static topology: nodes + edges as `__graph` JSON artifact). Runtime hydrates from compile-time artifact and overlays live values. No other framework emits this as a build artifact (see honest-prior-art.md).

## Verification Pass
For each comb: walk AST → collect all signal/comb identifier reads → store as verified deps → wrong deps = compile error.
Static union for conditionals: walk ALL branches, union deps. Conservative but correct.
Cycle detection via topological sort.
Sensitivity list verification: reads inside always @(...) blocks must match declared list.

## Type System
Type annotations are parsed and checked by `verify.ts`, producing **warnings** (not errors) on type mismatches. The checker uses `inferExprType` and `typeCompatible` to validate signal assignments.

Planned extensions:
1. Port compatibility (input/output types across modules)
2. Range types: `signal x: int(0..255)`
3. X-state: `signal data: X | User` with propagation semantics
4. Exhaustive enum matching

## Implementation Status
Completed:
1. All demos compile from `.comb` (stock ticker, color picker, resizable layout)
2. Edge-triggered sensitivity: `@(posedge x)` / `@(negedge x)` in lexer/parser/codegen/runtime
3. Delta cycle execution model: `SimulationEngine` with real delta cycles
4. Constraint compilation: `.comb` constraint blocks compile end-to-end with constraint hardening
5. Type system: type checking with warnings via `verify.ts`
6. Temporal assertions: SVA-lite syntax with `eventually`, `always`, `next` operators

Remaining:
- Range types, X-state, port compatibility, exhaustive enum matching
- Source maps

## Scope Cuts
No router, SSR, VDOM, plugin system, TS integration, ecosystem.
