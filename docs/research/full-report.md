# Comb Research Report — Full Synthesis (Revised 2026-04-30)

Revised to center the DES execution model thesis and incorporate systematic prior art research.

## 1. The Core Thesis: DES Execution Model

The original thesis was "compiler-verified sensitivity lists + introspectable graph." That's not enough — Svelte and Marko do forms of compile-time dep analysis, Angular and Solid have runtime graph devtools. The **defensible thesis** is:

**Comb's runtime is a discrete event simulation kernel.** Not a virtual DOM differ, not a microtask-based signal graph, but a simulator with formal time, delta cycles, and edge-triggered sensitivity. This is genuinely unprecedented for web UI.

What DES gives you that standard reactivity doesn't:
- **Delta cycles** — combinational logic settles before sequential logic applies, multi-pass until quiescent
- **Deterministic concurrent execution** — multiple always blocks execute "simultaneously" with defined ordering
- **Edge-triggered sensitivity** — fire on transitions (`@posedge`), not values
- **Non-blocking assignment semantics** — `<=` means "schedule for end of delta," not "set immediately"
- **Formal stabilization** — DOM commits only after full quiescence

The open research question: does multi-pass delta cycle stabilization give practical benefits over single-pass topological sorting (what Solid/Preact do)? If yes, Comb has a real execution model advantage. If no, Comb is an overengineered signals framework. We need to answer this with real benchmarks and real-world examples that demonstrate multi-pass settling.

## 2. Prior Art Landscape

### Frameworks (2024-2026)
- **SolidJS 2.0:** Converging on graph serialization. `@solidjs/signals` package. Fine-grained, push-pull. No compile-time graph artifact.
- **Svelte 5 Runes:** Moved toward runtime signals (`$state`, `$derived`, `$effect`). Dep tracking implicit.
- **Vue Vapor:** No VDOM, compiles templates to imperative DOM. Alien Signals core.
- **Angular 20.1:** Signal Graph in DevTools — **closest competitor to CircuitGraph visualization.** But runtime-only, not compile-time artifact.
- **Leptos (Rust):** Fine-grained signals in WASM. `Option<T>` for unknown state.
- **Preact Signals:** DOM bypass — pass signal directly to JSX, skip VDOM.
- **Marko (eBay):** Cross-file compile-time reactive dependency analysis. Used internally for optimization but **not exposed as artifact.** Closest to `__graph` concept.

### HDL-Inspired
- **HipHop.js:** Esterel-inspired synchronous reactive language for web. Focuses on control flow (concurrency, preemption), NOT dataflow. Complementary to Comb.
- **DigitalJS:** Digital logic simulator in browser. Proves visualization approach.
- **Chisel:** HDL in Scala. Shows HDL maps well to FP.

### Edge Detection
- **MobX `when()`:** Fires once when predicate becomes true, auto-disposes. Posedge for booleans. Since ~2016.
- **MobX `reaction()`:** `(oldValue, newValue)` for transition detection.
- **RxJS `pairwise()` + `filter()`:** Canonical stream-based edge detection.
- **Vue `watch()`:** `(newVal, oldVal)` params but level-triggered by default.

### Propagator Networks
- **dthompson / Spritely (FOSDEM 2026):** Working propagator-based FRP for web UI in Scheme/WASM. **Direct prior art.** Handles cyclic deps without glitches.
- **Sussman & Radul (2009):** Theoretical foundation. Includes UI example (RGB/HSV widget).
- **Cassowary.js:** Layout-only constraint solver (linear arithmetic).

### Temporal Logic for UI
- **Quickstrom (Wickstrom, PLDI 2022):** LTL for web app testing. Specstrom language with `next`, `always`, `until`. Published, peer-reviewed. **Direct prior art for temporal assertions.**
- **XState @xstate/test:** Model-based testing via state machine path coverage.

### Graph-Based Reactive Systems
- **Jane Street Bonsai:** Two-phase architecture (static graph construction + runtime execution via Incremental/SAC). Most sophisticated existing graph-based reactive UI engine. But incremental computation, not DES.
- **Academic (arXiv:2506.13815):** "Signal-First Architectures" — 62% faster dep resolution with compile-time analysis. Validates compile-time approach.

## 3. HDL → UI Concept Mapping

| HDL Concept | UI Analog | Comb | Status |
|---|---|---|---|
| signal/reg | Mutable state | `signal x: int = 0` | Implemented |
| wire/assign | Derived value | `comb y = x * 2` | Implemented |
| always_comb | Auto-tracked computation | `comb` declaration | Implemented |
| always_ff @(posedge clk) | Event handler | `always @(event)` | Implemented |
| <= non-blocking | Batched updates | `<=` operator + `batch()` | Implemented |
| Module instantiation | Components | `<Component />` | Implemented |
| Sensitivity lists | Dep declarations | `always @(sig1, sig2)` | Implemented |
| Assertions | Runtime invariants | `assert always (cond)` | Implemented |
| **posedge/negedge** | **Transition detection** | **`@(posedge x)` / `@(negedge x)`** | **Planned** |
| **Delta cycles** | **Multi-pass stabilization** | **DES runtime loop** | **Planned** |
| **Simulation time** | **Formal time model** | **Event scheduling** | **Planned** |
| **SVA temporal properties** | **Temporal UI assertions** | **`assert temporal`** | **Planned** |
| **Four-value logic (X)** | **Unknown signal state** | **`X \| Type`** | **Planned** |
| Propagator/constraint | Bidirectional dataflow | `cell` + `constraint` | Partial |

## 4. Gap Analysis (Research-Validated)

### Genuinely novel gaps (no prior art found):
1. **DES execution model for UI** — no framework uses delta cycles or simulation time for UI rendering
2. **Static `__graph` artifact** — no framework emits reactive dep graph as build output
3. **Circuit topology diffing** — no framework diffs reactive wiring between versions

### Novel in formulation (mechanism exists, DSL integration doesn't):
4. **Edge-triggered sensitivity as compiled syntax** — MobX/RxJS have the mechanism, nobody has `@(posedge x)` as a language construct
5. **Propagator networks compiled from DSL** — dthompson/Spritely has the concept, nobody compiles from DSL with static analysis
6. **Temporal assertions in component model** — Quickstrom has temporal logic for web, nobody embeds it in component definition

### Previously overclaimed (has prior art):
7. ~~First-class introspectable reactive graph~~ → Angular Signal Graph, SolidJS devtools
8. ~~Compile-time dependency verification~~ → Svelte, React Compiler, Marko
9. ~~Waveform debugging~~ → Redux DevTools with different UI
10. ~~Directional ports~~ → Angular @Input/@Output since 2016

## 5. Implementation Priority

Ordered by novelty × impact × feasibility:

1. **Edge-triggered sensitivity** — Small compiler change, huge differentiation. Add `@(posedge x)` / `@(negedge x)` to lexer, parser, codegen. Runtime tracks previous values.

2. **All demos through compiler** — Credibility fix. Hand-written runtime demos undermine the "compiler-first" claim.

3. **Constraint compilation end-to-end** — `constraint { }` blocks must compile through to propagator networks. Runtime works; compiler integration needs hardening.

4. **Type checking** — Enforce parsed type annotations. Start with signal types, port compatibility. Add range types and X-state later.

5. **Delta cycle execution model** — The big architectural change. Refactor runtime from microtask-based to simulation loop. Hardest but most important.

6. **Temporal assertions** — SVA-lite syntax. Runtime temporal logic evaluator. Assertion violations in circuit graph.

## 6. Bonsai Comparison (Updated)

Jane Street's Bonsai remains the most architecturally similar prior work:
- **Phase 1 (Graph Construction):** Code builds a static DAG. `Value.t` = reactive node, `Computation.t` = stateful machine.
- **Phase 2 (Runtime):** Data flows through pre-built graph via Incremental library (Umut Acar's SAC).

Comb mirrors this: compile step = Phase 1, browser = Phase 2. But Bonsai is incremental computation (single-pass propagation). Comb's DES model would add multi-pass delta cycles — a fundamentally different execution strategy.

## 7. The Synthesis-Simulation Analogy

From supplementary research: React's `useEffect` dependency array reproduces the synthesis-simulation mismatch bug class from HDL. In Verilog, you write `always @(a, b)` but forget `c` — synthesis infers a latch, simulation behaves differently. In React, you write `[a, b]` but read `c` inside the effect — stale closure, surprising behavior.

Hardware's solution was `always_comb` (auto-derive sensitivity from all reads). Comb's solution is the same: explicit sensitivity lists with compiler verification, or auto-derivation via `comb` declarations. This analogy is not just a marketing metaphor — it's a structural isomorphism.
