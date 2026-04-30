# Comb Architecture Plan (Revised 2026-04-30)

## Core Paradigm
UI is a discrete event simulation. The runtime is a DES kernel with delta cycles, edge-triggered sensitivity, and formal stabilization. Dependencies are explicit and compiler-verified. The reactive graph is first-class and inspectable — emitted as a static `__graph` artifact at compile time.

## Primitives
1. **signal** — mutable state, typed, named, registered in CircuitGraph
2. **comb** — compiler-verified derived value, static union semantics (all branches tracked)
3. **always @(event)** — event-triggered state transition, batched via non-blocking `<=`
4. **always @(signal, ...)** — sensitivity-triggered block, compiler-verified dep list
5. **always @(posedge/negedge)** *(planned)* — edge-triggered block, fires on transitions not values
6. **cell** — merge-semantic value for propagator networks
7. **constraint** — propagator clause, bidirectional dataflow
8. **view** — reactive DOM output, fine-grained, no VDOM
9. **assert** — runtime invariant, registered as graph node
10. **assert temporal** *(planned)* — SVA-style temporal property over time

## DES Execution Model *(target architecture)*

Current runtime: microtask-based signal propagation (standard, like SolidJS).
Target: discrete event simulation kernel.

```
Event → Delta 0: combinational (combs) settle
      → Delta 1: non-blocking (<=) apply
      → Delta 2: if new combinational changes, re-settle
      → ...until quiescent...
      → DOM commit
```

Key difference from topological sorting (Solid/Preact): topo sort is single-pass. Delta cycles are multi-pass — sequential logic can create new combinational dependencies that need another settle pass.

## CircuitGraph
Compiler produces the schematic (static topology: nodes + edges as `__graph` JSON artifact). Runtime hydrates from compile-time artifact and overlays live values. No other framework emits this as a build artifact (see honest-prior-art.md).

## Verification Pass
For each comb: walk AST → collect all signal/comb identifier reads → store as verified deps → wrong deps = compile error.
Static union for conditionals: walk ALL branches, union deps. Conservative but correct.
Cycle detection via topological sort.
Sensitivity list verification: reads inside always @(...) blocks must match declared list.

## Type System *(planned)*
Currently: annotations parsed but not checked.
Target:
1. Enforce parsed types (signal type mismatches)
2. Port compatibility (input/output types across modules)
3. Range types: `signal x: int(0..255)`
4. X-state: `signal data: X | User` with propagation semantics
5. Exhaustive enum matching

## Implementation Priorities
1. Fix foundation: all demos through compiler, constraint end-to-end, type-check parsed annotations
2. Edge-triggered sensitivity: `@(posedge x)` / `@(negedge x)` in lexer/parser/codegen/runtime
3. Delta cycle execution model: refactor runtime from microtask to simulation loop
4. Constraint compilation: `.comb` constraint blocks → propagator networks with static analysis
5. Type system: enforce parsed types, range types, X-state, port compatibility
6. Temporal assertions: SVA-lite syntax, runtime temporal logic evaluator

## Scope Cuts
No router, SSR, VDOM, plugin system, TS integration, ecosystem.
