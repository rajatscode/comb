# Supplementary Research Findings

## TC39 Signals Proposal (Stage 1)
Proposal to add signals to JavaScript itself. Design input from Angular, Preact, Solid, Svelte, Vue, MobX, Qwik, Ember authors. 2-3 years from native browser availability. Validates signals as THE consensus reactive primitive.

## Synthesis-Simulation Mismatch — The Exact Analog
In old Verilog, incomplete sensitivity lists caused synthesis-simulation mismatch — code that simulated correctly but produced broken silicon. React's `useEffect` dependency array reproduces this exact bug class. The `exhaustive-deps` lint rule is the equivalent of a synthesis tool warning — helpful but not enforced. Hardware's solution was `always_comb` — compiler-inferred, verified sensitivity lists.

## Conditional Dependencies Design Decision
For conditional reads in comb expressions:
- **Option A — Static union** (like `always_comb`): deps = union of ALL reads in ALL branches. Conservative, never misses an update. What hardware does. Cannot conditionally disconnect a wire.
- **Option B — Dynamic tracking** (like SolidJS): only track active branch. More efficient but requires runtime tracking.
- **Recommendation: Option A.** More predictable, analyzable. Compiler can do it trivially — walk all AST branches.

## SolidJS Gotchas That Comb Eliminates
1. **Conditional tracking**: `if (x()) { y() }` — y only tracked when x is true. Comb static union: both always in dep list.
2. **Destructuring trap**: `const { name } = props` breaks reactivity. Comb signals always accessed via getter calls — non-issue.
3. **Tracking scope boundary**: calling function outside tracking scope loses reactivity. Comb deps are compile-time — no tracking scope to fall out of.

## Preact Signals DOM Bypass
Pass signal directly into JSX → binds to DOM Text node, bypasses VDOM. ~100ns text updates. Comb could do similar: when comb feeds directly into text interpolation, skip effect wrapper and bind signal directly.

## HipHop.js — PLDI 2020 Paper
Berry & Serrano, INRIA. Academic credibility but 6 years without web adoption. Focuses on temporal control flow, NOT dataflow reactivity. Comb fills the complementary gap.

## Bluespec Guarded Atomic Actions
Atomic transactions eliminating race conditions by construction. UI analog: atomic state transactions with rollback on assertion failure. Stronger than our batch().

## Signal (IRISA) Multi-Clock with Clock Relations
Formally-verified operators for safely relating signals across clock domains. Directly relevant to clock domain crossing design.

## Lustre → SCADE → Safety-Critical Systems
Lustre basis for SCADE (DO-178C avionics, ISO 26262 automotive). Guaranteed efficient sequential code, no runtime scheduler. Same principles can make UI state provably correct.

## Propagator Networks: Bidirectional Color Picker
RGB ↔ HSV bidirectional without explicit cycle management. Solid theoretical backing for bidirectional constraints.

## Four Untapped Advanced HDL→UI Mappings
1. Pipeline stages as first-class composition (form wizards, data chains)
2. Formal arbiters for priority-based event resolution
3. FIFOs with backpressure for inter-component communication
4. Synthesis constraints as performance budgets ("complete within 16ms")

## Industry Convergence
Every framework converging on: signals + fine-grained DOM + compiler. Comb already there. Differentiators: CircuitGraph, compiler-verified sensitivity lists, waveform debugging, HDL mental model.
