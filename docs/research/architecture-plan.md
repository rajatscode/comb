# Comb Architecture Plan

## Core Paradigm
UI is a circuit. Dependencies are explicit and compiler-verified. The reactive graph is first-class and inspectable. Wrong deps = compile error, not lint warning.

## 4 Primitives
1. **signal** — mutable state, typed, named, registered in CircuitGraph
2. **comb** — compiler-verified derived value, static union semantics (all branches tracked)
3. **always @(event)** — atomic state transition, batched writes via <=
4. **view** — reactive DOM output, fine-grained, no VDOM

## CircuitGraph
Compiler produces the schematic (static topology: nodes + edges). Runtime animates it (topology + live values + event stream). Runtime hydrates from compile-time artifact.

## Verification Pass
For each comb: walk AST → collect all signal/comb identifier reads → store as verified deps → wrong deps = compile error.
Static union for conditionals: walk ALL branches, union deps. Conservative but correct.
Cycle detection via topological sort.

## What to Steal from Existing Code
- Lexer JSX mode-switching pattern
- Parser Pratt expression parsing
- Context-sensitive <= handling
- Discriminated union AST types
- Push-pull reactivity with currentComputation tracking
- batch() with depth counting

## What to Throw Away
- codegen.ts (no dep metadata)
- compiler.ts (no verification)
- circuit.ts (runtime-only, not compile-time hydrated)
- dom.ts (fragile, leaks)
- fsm.ts / clocks.ts (scope cut)

## Implementation Steps
1. Compiler with verification pass — parse, verify deps, emit errors/static graph
2. Codegen using verified deps — emit with dep arrays + __graph export
3. Runtime with compile-time graph — signals/combs/effects register with CircuitGraph from compiler metadata
4. View rendering + DOM — reactive bindings, @if/@for/@bind, event wiring
5. CircuitGraph visualizer — SVG from graph, wire animation, value display
6. Demo: Dependency Debugger — form validation + live circuit + compiler errors
7. Demo: Waveform Debugger — per-signal history + time-series traces
8. Demo: Circuit Diff — compile two sources, diff topologies

## Clarifications
- Compile-time graph = static topology (nodes + edges, no values). Runtime graph = live (topology + values + events). Two structures, runtime hydrates from compile-time.
- Per-signal ring buffers needed for waveform viewer (not just 256-event global buffer).
- Static union means combs may re-evaluate when conditionally-irrelevant deps change, but memoization prevents downstream propagation. Document as deliberate.

## Scope Cuts
No router, SSR, VDOM, plugin system, TS integration, ecosystem, bidirectional constraints, clock domain crossing, FSMs, clocks.
