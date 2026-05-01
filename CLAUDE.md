# Comb — Development Guide

## What is this?

Comb is a UI framework built on a discrete event simulation (DES) execution model. `.comb` files compile to JavaScript that uses a reactive runtime with an introspectable CircuitGraph. The core thesis: UI reactivity should work like a circuit simulator — with formal delta cycles, edge-triggered sensitivity, and a static dependency graph exported as a build artifact.

**Current state:** The compiler and runtime work. The DES execution model (delta cycles via `SimulationEngine`), edge-triggered sensitivity (`@(posedge x)` / `@(negedge x)`), type checking (warnings via `verify.ts`), and temporal assertions are all implemented. See docs/research/final-assessment.md for what's genuinely novel vs what has prior art.

## Quick Start

```bash
npm install
npm run dev          # Vite dev server on :3000
npm run compile      # Compile a .comb file
npm run compile:all  # Compile all examples
npm run typecheck    # TypeScript strict check
```

## Architecture

```
src/core/     — Browser-portable compiler (lexer → parser → AST → verify → codegen)
src/runtime/  — Reactive runtime (signals, circuit graph, cells, propagators)
src/demos/    — Interactive demo pages
src/cli/      — Node.js CLI wrapper for the compiler
examples/     — .comb source files
docs/         — Language reference + research docs
```

### Compiler (src/core/)

Pure functions, zero Node.js dependencies, runs in the browser. The `compile(source: string): CompileResult` function takes a `.comb` source string and returns `{ js, graphMetadata, errors }`.

- `lexer.ts` — Hand-written tokenizer with JSX-mode switching inside `view {}` blocks
- `parser.ts` — Recursive descent + Pratt expression parsing. `<=` is context-sensitive (assignment in statements, comparison in expressions)
- `verify.ts` — Symbol table, undefined ref detection, circular dep detection, sensitivity list validation, CDC async boundary analysis, bounded state space inference (guard analysis + write patterns)
- `codegen.ts` — Emits readable JS targeting the runtime API. Edge-triggered blocks use `deferredBatch` for correct non-blocking assignment semantics. Temporal assertions get descriptive names from their trigger/property expressions.
- `compiler.ts` — Pipeline orchestrator + graph metadata extraction

### Runtime (src/runtime/)

- `signals.ts` — Push-pull reactivity: `createSignal`, `createComb`, `createEffect`, `batch`, `deferredBatch`, `untrack`, `createCell`, `createPropagator`, `createChangeCounter`, `createTemporalAssert`
- `circuit.ts` — `CircuitGraph` class: static graph loading, runtime node registration, event recording (ring buffer), assertion lifecycle (armed/passed/failed), snapshot/diff/verify
- `coverage.ts` — Toggle, FSM transition, and cross coverage collection for auto-testing
- `SimulationEngine` fast path: single-computation batches skip deferred writes, collapsing feed-forward chains
- Re-entrancy guard: `running` flag prevents nested `runUntilQuiescent` calls
- Verilator-style oscillation reporting: when delta cycle limit is hit, reports which signals are oscillating with recent values

### Key Design Decisions

- **No virtual DOM** — effects directly patch DOM nodes
- **Push-pull reactivity** — signals push dirty flags, combs pull (lazy recompute) on read
- **CircuitGraph is first-class** — every primitive registers itself in a queryable graph
- **Compiler is browser-portable** — enables the live playground
- **Generated code is readable** — a feature, not a limitation
- **`__graph` is the keystone** — compiler emits it, visualizer reads it, differ compares two of them, runtime merges it with live values

### Implemented Architecture

The runtime uses a DES execution model:
1. **Delta cycles** — `SimulationEngine` in `signals.ts`: combinational logic settles before sequential logic applies, multi-pass until quiescent
2. **Edge-triggered sensitivity** — `@(posedge x)` / `@(negedge x)` fire on transitions, not values (lexer, parser, codegen, runtime)
3. **Constraint compilation** — `constraint { }` blocks compile end-to-end to propagator networks
4. **Type system** — `verify.ts` checks parsed type annotations and emits warnings (not errors) on mismatches
5. **Temporal assertions** — `assert temporal @(trigger) eventually/always/next(prop) within duration` compiles and runs
6. **`changeCount` builtin** — `changeCount(signal)` counts value changes (not just boolean edges); recognized by lexer, parser, verifier, and codegen

See docs/research/final-assessment.md for the full novelty assessment with prior art citations.

## Adding a New Demo

1. Write the `.comb` file in `examples/`
2. Compile it: `npx tsx src/cli/cli.ts examples/your-demo.comb`
3. Create `src/demos/your-demo.ts` — **must use compiled output, not hand-written runtime calls**
4. Add the demo card in `src/main.ts`

**Important:** All demos must go through the compiler. Hand-written runtime demos undermine the framework's credibility. If the compiler can't handle a demo's needs, fix the compiler.

## Testing

```bash
npm run typecheck              # TypeScript strict mode
npx tsx src/core/compiler-test.ts   # Compiler tests
npx tsx src/cli/cli.ts examples/counter.comb  # Test compilation
npx tsx src/cli/cli.ts diff examples/a.comb examples/b.comb  # Diff reactive topology
npm run dev                    # Visual testing in browser
```

### Demos & Benchmarks

- **Pipeline demo** — 4-stage pipeline proving delta cycle correctness with side-by-side DES vs naive comparison
- **Ring counter demo** — feedback loop proving delta cycles work for circular dependencies
- **Benchmark page** — interactive DES vs topological sort performance comparison
- **Waveform debugger** — zoom (wheel), pan (drag), signal filter (click to toggle)

## Known Limitations

- Type system emits warnings, not errors
- No npm package published yet
- Linear chain overhead: DES is 3-8x slower than topo sort for feed-forward chains (reactive system overhead, not delta cycles)
