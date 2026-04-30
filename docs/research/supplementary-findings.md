# Supplementary Research Findings (Revised 2026-04-30)

Updated to incorporate systematic prior art research and correct overclaimed novelty.

## TC39 Signals Proposal (Stage 1)
Proposal to add signals to JavaScript itself. Design input from Angular, Preact, Solid, Svelte, Vue, MobX, Qwik, Ember authors. 2-3 years from native browser availability. Validates signals as THE consensus reactive primitive. Comb's signals are standard — the differentiator is the execution model (DES), not the signal primitive itself.

## Synthesis-Simulation Mismatch — The Structural Isomorphism
In old Verilog, incomplete sensitivity lists caused synthesis-simulation mismatch — code that simulated correctly but produced broken silicon. React's `useEffect` dependency array reproduces this exact bug class. The `exhaustive-deps` lint rule is the equivalent of a synthesis tool warning — helpful but not enforced. Hardware's solution was `always_comb` — compiler-inferred, verified sensitivity lists.

**This is the best argument for why the HDL analogy is structural, not superficial.** The same bug class exists in both domains. The same solution (compiler-verified sensitivity lists) applies. This validates the DES thesis — it's not a metaphor, it's a pattern match.

Note: Svelte and React Compiler also do forms of compile-time dep analysis (see honest-prior-art.md). Comb's version is more explicit — you declare the sensitivity list, compiler verifies it — but the mechanism isn't unique. The DES execution model (delta cycles, edge sensitivity) IS unique.

## Conditional Dependencies Design Decision
For conditional reads in comb expressions:
- **Option A — Static union** (like `always_comb`): deps = union of ALL reads in ALL branches. Conservative, never misses an update.
- **Option B — Dynamic tracking** (like SolidJS): only track active branch. More efficient but requires runtime tracking.
- **Recommendation: Option A.** More predictable, analyzable. Compiler can do it trivially — walk all AST branches. Adopted.

## SolidJS Gotchas That Comb Eliminates
1. **Conditional tracking**: `if (x()) { y() }` — y only tracked when x is true. Comb static union: both always in dep list.
2. **Destructuring trap**: `const { name } = props` breaks reactivity. Comb signals always accessed via getter calls — non-issue.
3. **Tracking scope boundary**: calling function outside tracking scope loses reactivity. Comb deps are compile-time — no tracking scope to fall out of.

## Edge Detection Prior Art
**Important correction:** Edge detection is not novel as a mechanism.
- **MobX `when()`** — fires once when predicate becomes true, auto-disposes. Since ~2016.
- **MobX `reaction()`** — provides `(oldValue, newValue)` for transition detection.
- **RxJS `pairwise()` + `filter()`** — canonical stream-based edge detection.
- **Vue `watch()`** — `(newVal, oldVal)` but level-triggered by default.

What IS novel: `@(posedge x)` / `@(negedge x)` as a compiled, compiler-verified language construct (not a library function).

## Propagator Networks Prior Art
**Important correction:** Prior art exists for propagator-based web UI.
- **dthompson / Spritely (FOSDEM 2026)** — working prototype in Scheme/WASM. Handles cyclic deps without glitches.
- **Sussman & Radul (2009)** — theoretical foundation with UI example (RGB/HSV widget).

What IS novel: compiling `constraint { }` blocks from a DSL with static analysis and `__graph` integration.

## Temporal Assertions Prior Art
**Important correction:** Prior art exists for temporal logic applied to web apps.
- **Quickstrom (Wickstrom, PLDI 2022)** — LTL for web app testing. Specstrom language with `next`, `always`, `until`. Published, peer-reviewed.

What IS novel: embedding temporal assertions in the component model as graph nodes, not as external testing.

## HipHop.js — PLDI 2020 Paper
Berry & Serrano, INRIA. Academic credibility but 6 years without web adoption. Focuses on temporal control flow, NOT dataflow reactivity. Comb fills the complementary gap — dataflow (signals, combs, constraints) vs control flow (concurrency, preemption).

## Advanced HDL→UI Mappings
1. **Bluespec guarded atomic actions** — atomic transactions with rollback on assertion failure. Stronger than batch().
2. **Signal (IRISA) multi-clock** — formally-verified operators for safely relating signals across clock domains.
3. **Lustre → SCADE** — basis for safety-critical systems. Guaranteed efficient sequential code, no runtime scheduler. Same principles can make UI state provably correct.
4. Pipeline stages as first-class composition (form wizards, data chains)
5. Formal arbiters for priority-based event resolution
6. FIFOs with backpressure for inter-component communication
7. Synthesis constraints as performance budgets ("complete within 16ms")

## Industry Convergence
Every framework converging on: signals + fine-grained DOM + compiler. Comb already there — but so is everyone else. The differentiators are:
1. **DES execution model** (genuinely novel — no prior art)
2. **Static `__graph` artifact** (genuinely novel — nobody emits this)
3. **Edge-triggered sensitivity as syntax** (novel formulation of existing mechanism)

Previously listed "differentiators" that are actually standard: CircuitGraph visualization (Angular Signal Graph does this), compiler-verified deps (Svelte/Marko do this), waveform debugging (Redux DevTools variant).
