# Comb Research Report — Full Synthesis

## 1. Bonsai (Jane Street)

Two-phase architecture:
- **Phase 1 (Graph Construction):** Code builds a static DAG. `Value.t` = reactive node, `Computation.t` = stateful machine. DAG fully constructed before data flows. `phase1_witness` type enforces phase distinction.
- **Phase 2 (Runtime):** Data flows through pre-built graph via Incremental library (Umut Acar's SAC). Only changed nodes recompute. `Incr_map` enables O(log n) incremental ops.

Key insight: >50% of Bonsai components don't produce views — pure computation nodes. Framework separates state, incrementality, and rendering as composable primitives.

Maps to Comb: compile step = Phase 1, browser = Phase 2. We're already Bonsai-shaped.

## 2. SOTA Frameworks (2024-2026)

- **SolidJS 2.0:** Converging on graph serialization. `@solidjs/signals` package.
- **Svelte 5 Runes:** Moved TOWARD runtime signals (`$state`, `$derived`, `$effect`). Industry converging on signals. Dep tracking still implicit.
- **Vue Vapor:** No VDOM, compiles templates to imperative DOM. Alien Signals core.
- **Angular 20.1:** Signal Graph in DevTools — closest competitor to CircuitGraph visualization. But bolted-on extension, not runtime data structure.
- **Leptos (Rust):** Fine-grained signals in WASM.
- **Preact Signals:** DOM bypass — pass signal directly to JSX, skip VDOM.
- **Academic (arXiv:2506.13815):** "Signal-First Architectures" — 62% faster dep resolution with compile-time analysis. Validates our approach.

## 3. HDL Concepts → UI Mapping

### Prior Art
- **HipHop.js:** Esterel-inspired synchronous reactive language for web. Focuses on control flow (concurrency, preemption), NOT dataflow. Complementary to Comb.
- **DigitalJS:** Digital logic simulator in browser. Proves visualization approach.
- **Chisel:** HDL in Scala. Shows HDL maps well to FP.

### Concept Table
| HDL | UI Analog | Comb | Status |
|-----|-----------|------|--------|
| signal/reg | Mutable state | createSignal | Done |
| wire/assign | Derived value | createComb | Done |
| always_comb | Auto-tracked computation | comb x = expr | Done |
| always_ff @(posedge clk) | Event handler | always @(event) | Done |
| <= non-blocking | Batched updates | batch() | Done |
| Module instantiation | Components | <Component /> | Done |
| Clock domains | Timing sources | createClock | Done |
| FSM | State machines | createFSM | Done |
| **Sensitivity lists** | **Dep declarations** | **Compiler verification** | NEW |
| **Clock domain crossing** | **Async boundaries** | **sample()** | NEW |
| **Assertions** | **Runtime invariants** | **assert blocks** | NEW |

### Propagator Networks (Sussman)
More general than signals — bidirectional dataflow, constraint satisfaction, merge ops. `comb` is unidirectional; propagators enable bidirectional constraints.

## 4. Sensitivity List Thesis — The Core Differentiator

| Property | React | SolidJS | Svelte 5 | **Comb** |
|----------|-------|---------|----------|----------|
| Dep declaration | Manual array | Auto-tracked | Compiler-inferred | **Explicit OR auto** |
| Verification | Lint warning | None | None | **Compile error** |
| Conditional tracking bugs | Stale closures | Surprising un-tracking | Possible | **Impossible** |
| Dep visibility | Hidden | Hidden | Hidden | **CircuitGraph** |
| Static analysis | ESLint only | None | Limited | **Full AST** |

No existing framework does all four: explicit, verified, static, visible.

## 5. Gap Analysis

1. **First-class introspectable reactive graph** — nobody has queryable/subscribable graph as runtime data structure
2. **Compile-time dependency verification** — nobody treats dep mismatches as compile errors
3. **Waveform debugging** — nobody has signal-level time-travel
4. **HDL mental model** — nobody has tried structurally (HipHop.js is control flow, not dataflow)
5. **Static + runtime graph unification** — nobody combines compile-time schematic with runtime animation

## 6. Top 5 Recommendations

1. **Compiler-verified sensitivity lists** — compile error on wrong deps. 80% infrastructure exists.
2. **Static graph visualization** — render circuit from AST alone, before code runs. Metadata extraction exists.
3. **Clock domain crossing — sample()** — safely read across timing boundaries.
4. **Runtime assertions** — `assert always (count >= 0)`, violations in CircuitGraph.
5. **Bidirectional constraints** — propagator-inspired, genuinely paradigm-defining but complex.

## 7. Implementation Notes

Sensitivity list verification — existing `collectIdentifiers()` and `collectWrites()` in compiler.ts. Need `collectReads()` + verification pass comparing reads against declared triggers.

Static graph — enhance `GraphMetadata` with dependency edges. Visualizer can render without runtime.
