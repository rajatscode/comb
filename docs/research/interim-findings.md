# Comb Research — Interim Findings

## 1. Bonsai (Jane Street) — Key Architecture

Two-phase architecture:
- **Phase 1: Graph Construction** — code builds a DAG of computations, not code that runs
  - `Value.t` = a node in the graph (like signals/combs)
  - `Computation.t` = a stateful incremental state machine
  - DAG fully constructed before any data flows
- **Phase 2: Runtime Execution** — data flows through pre-built graph, incremental recomputation (based on Umut Acar's self-adjusting computations)

Key insight: Bonsai components produce *arbitrary values*, not just views. More than half don't touch DOM — they're pure computation nodes.

Maps to Comb: compile step = graph construction, browser = runtime execution. We're already Bonsai-shaped.

## 2. Sensitivity List Thesis — The Core Differentiator

Three approaches to reactive dependencies exist:

| Approach | Framework | Problem |
|----------|-----------|---------|
| Manual declaration | React `useEffect([a, b])` | Error-prone, stale closures, lint bandaid |
| Auto-tracking | SolidJS, Vue `watchEffect` | Implicit, conditional reads create surprises |
| Compiler-inferred | Svelte 5 `$derived` | Better but invisible — can't see or verify deps |

**What Verilog does differently:**
- `always @(a, b)` — explicit, compiler-verified
- `always_comb` — auto-inferred but VISIBLE, synthesis warns on unexpected reads

**Comb opportunity — combine both:**
- Explicit sensitivity: `always @(count, name) { }` — compiler VERIFIES only those signals are read
- Auto-inferred: `comb derived = count * 2 + offset` — compiler statically knows deps `[count, offset]`
- Dependencies are VISIBLE in the circuit diagram

Why fundamentally superior:
1. Explicit > implicit
2. Compiler-verified > lint-enforced
3. Static > runtime
4. Visible > hidden

No existing framework does all four simultaneously.

## 3. Gap Analysis

- **Introspectable Reactive Graph**: Nobody has a first-class, queryable, subscribable graph as runtime data structure
- **Compile-Time Dependency Verification**: Nobody treats dependency mismatches as compile errors
- **Waveform/Time-Travel Debugging**: Nobody has VCD-style signal waveform viewer
- **HDL Mental Model for UI**: Zero prior art found

## 4. Early Recommendations (ranked by novelty x impact)

1. Compiler-verified sensitivity lists
2. Static graph extraction + visualization before runtime
3. Non-view computations as first-class (from Bonsai)
4. Clock domain crossing primitives
5. Formal property checking (`assert always (count >= 0)`)

## 5. Codebase Analysis

- `signals.ts`: Clean push-pull. Deps discovered at runtime (SolidJS-style), not declared. **This is the thing to change.**
- `circuit.ts`: CircuitGraph — gold. No other framework has this.
- `compiler.ts`: `extractGraphMetadata()` already 80% of compile-time dep verification
- `codegen.ts`: `isReactive()` = dependency analysis, needs to be first-class
- `fsm.ts`: First-class state machines — unique among web frameworks
- `clocks.ts`: Timing domains — unique. Missing: clock domain crossing
