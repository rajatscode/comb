# Comb Research — Interim Findings (Revised 2026-04-30)

Updated with corrections from systematic prior art research.

## 1. Bonsai (Jane Street) — Key Architecture

Two-phase architecture:
- **Phase 1: Graph Construction** — code builds a DAG of computations, not code that runs
  - `Value.t` = a node in the graph (like signals/combs)
  - `Computation.t` = a stateful incremental state machine
  - DAG fully constructed before any data flows
- **Phase 2: Runtime Execution** — data flows through pre-built graph, incremental recomputation (based on Umut Acar's self-adjusting computations)

Key insight: Bonsai components produce *arbitrary values*, not just views. More than half don't touch DOM — they're pure computation nodes.

Maps to Comb: compile step = graph construction, browser = runtime execution. Note: Bonsai is incremental computation (single-pass propagation). Comb's DES model targets multi-pass delta cycles — a fundamentally different execution strategy.

## 2. Sensitivity List Thesis

Three approaches to reactive dependencies exist:

| Approach | Framework | Problem |
|----------|-----------|---------|
| Manual declaration | React `useEffect([a, b])` | Error-prone, stale closures, lint bandaid |
| Auto-tracking | SolidJS, Vue `watchEffect` | Implicit, conditional reads create surprises |
| Compiler-inferred | Svelte 5 `$derived` | Better but invisible — can't see or verify deps |

**What Verilog does differently:**
- `always @(a, b)` — explicit, compiler-verified
- `always_comb` — auto-inferred but VISIBLE, synthesis warns on unexpected reads

**Comb combines both:**
- Explicit sensitivity: `always @(count, name) { }` — compiler VERIFIES only those signals are read
- Auto-inferred: `comb derived = count * 2 + offset` — compiler statically knows deps `[count, offset]`
- Dependencies are VISIBLE in the circuit diagram

**Revised assessment:** The "no existing framework does all four (explicit, verified, static, visible)" claim is weaker than originally stated. Svelte and Marko do compile-time dep analysis; Angular Signal Graph provides visibility. The sensitivity list verification IS valuable but it's not the primary differentiator. The **DES execution model** (delta cycles, edge sensitivity) is the real differentiator — see full-report.md.

## 3. Gap Analysis (Corrected)

### Genuinely novel gaps:
- **DES execution model** — no web framework uses discrete event simulation with delta cycles
- **Static `__graph` artifact** — nobody emits reactive dep graph as build artifact
- **Circuit topology diffing** — nobody diffs reactive wiring between versions

### Novel in formulation (mechanism exists, not as compiled DSL):
- **Edge-triggered sensitivity** — MobX `when()`, RxJS `pairwise()` exist; `@(posedge x)` as compiled syntax doesn't
- **Propagator networks from DSL** — dthompson/Spritely exists; compiled from DSL with static analysis doesn't

### ~~Previously claimed novel, now corrected:~~
- ~~Introspectable Reactive Graph~~ → Angular Signal Graph (runtime), SolidJS devtools
- ~~Compile-Time Dep Verification~~ → Svelte, React Compiler, Marko do forms of this
- ~~Waveform Debugging~~ → Redux DevTools with different skin
- ~~HDL Mental Model~~ → HipHop.js is academic precedent (control flow, not dataflow)

## 4. Recommendations (Updated)

Ranked by genuine novelty × impact:

1. **DES execution model** — the core thesis, the thing nobody else has
2. **Edge-triggered sensitivity** — small compiler change, large differentiation
3. **All demos through compiler** — credibility fix
4. **Constraint compilation end-to-end** — compile `constraint { }` to propagator networks
5. **Type checking** — enforce parsed annotations, add range types, X-state
6. **Temporal assertions** — SVA-lite syntax, cite Quickstrom as prior art

## 5. Codebase Analysis

- `signals.ts`: Clean push-pull. Standard SolidJS-style reactivity. Target: refactor to DES simulation loop.
- `circuit.ts`: Static/runtime graph unification. `loadStaticGraph()` + `verifyGraph()`. Solid engineering.
- `verify.ts`: Sensitivity list verification, circular dep detection. Working.
- `codegen.ts`: Emits readable JS with `__graph` export. Working.
