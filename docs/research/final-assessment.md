# Final Novelty Assessment (Revised 2026-04-30)

Revised after systematic prior art research. Previous assessment overclaimed on several fronts and underinvested in the execution model thesis. This version is research-backed with specific citations.

## Genuinely Novel (No Prior Art Found)

1. **DES execution model for UI** (9/10) — No web framework uses a formal discrete event simulation loop with delta cycles, simulation time, or event scheduling. DES libraries exist (SIM.JS, SimScript, OESjs) but for simulation workloads, not UI rendering. Jane Street's Bonsai is graph-structured incremental computation, not DES. Topological sorting in Solid/Preact is a single pass; delta cycles are multi-pass. **This is the core thesis and strongest claim.**

2. **Static `__graph` artifact as compile output** (9/10) — Nobody emits the reactive dependency graph as a standalone JSON build artifact. Marko does cross-file reactive analysis internally but doesn't expose it. Svelte's compiler builds an internal dep graph but doesn't emit it. Angular DevTools Signal Graph is runtime, not compile-time. **Strongest existing claim, now validated.**

3. **Circuit topology diffing** (8/10) — Enabled by `__graph`. No framework diffs reactive wiring between versions. Depends on (2) — novel because the artifact is novel.

## Novel in Formulation (Mechanism Exists, DSL Integration Doesn't)

4. **Edge-triggered sensitivity as language syntax** (7/10) — The mechanism exists: MobX `when()` fires once on predicate becoming true (since ~2016), RxJS `pairwise()` + `filter()` detects transitions, Vue `watch()` gives `(newValue, oldValue)`. React's `usePrevious()` pattern is manual. **What's novel:** `@(posedge x)` / `@(negedge x)` as a compiled DSL construct with compiler-verified sensitivity lists. The value is making it declarative and static, not inventing edge detection.

5. **Propagator networks compiled from DSL** (6/10) — David Thompson (Spritely project) built a working propagator-based FRP for web UI, presented at FOSDEM 2026. Sussman/Radul (2009) is the theoretical foundation. Cassowary.js handles layout constraints. **What's novel:** compiling `constraint { }` blocks from a DSL into propagator networks with static analysis, graph artifact integration, and compiler verification of well-formedness. Not the concept — the engineering into a practical compiled framework.

6. **Temporal assertions in component model** (6/10) — **Quickstrom (Wickstrom, PLDI 2022)** applies LTL to web app testing. It's published, peer-reviewed, and does exactly "temporal logic for web UI." **What's novel:** embedding temporal assertions inside the component as graph nodes running as dev-time invariants, not as an external testing tool observing the DOM. Think SVA (SystemVerilog Assertions) vs. formal verification — same math, different integration point.

7. **Universal X-state with propagation** (5/10) — Solid's `createResource` returns `T | undefined` until async resolution. Leptos uses `Option<T>` with exhaustive matching. React Suspense makes loading implicit. **What's novel (if implemented):** X-state applied to ALL signals (not just async resources) with propagation semantics (X in any input → X output). But this is a real departure from prior art only if the propagation semantics are enforced by the type system.

## Implemented but Not Novel

8. **Static→runtime graph unification** (5/10) — `loadStaticGraph()` + `verifyGraph()`. Interesting engineering but the technique (merging compile-time metadata with runtime values) is not conceptually new.

9. **Compiler-verified sensitivity lists** (4/10) — Svelte, React Compiler, and Marko all do forms of compile-time dependency analysis. Comb's version is more explicit (you declare the sensitivity list, compiler verifies it) which has pedagogical value but isn't unprecedented.

10. **Continuous assertions as graph nodes** (4/10) — Useful feature, but `assert` statements that run at runtime exist in many forms. The graph-node representation adds visibility, not capability.

## Has Direct Prior Art (Do Not Claim Novelty)

- **Fine-grained reactivity** — SolidJS, Preact Signals, Leptos, Angular Signals
- **Dep visualization** — Angular DevTools Signal Graph, SolidJS devtools, NoFlo, RxViz
- **Directional ports** — Angular `@Input`/`@Output` (2016), Elm ports, Web Components
- **Waveform debugging** — Redux DevTools, Reactime, Recoilize, RxJS marble diagrams
- **Bidirectional binding** — MobX writable computed, Vue `v-model` computed

## Research Sources

- Quickstrom: [arxiv.org/abs/2203.11532](https://arxiv.org/abs/2203.11532) (PLDI 2022)
- dthompson propagator FRP: [FOSDEM 2026 talk](https://fosdem.org/2026/schedule/event/9NQYKC-funcpropagators/), [blog post](https://dthompson.us/posts/functional-reactive-user-interfaces-with-propagators.html)
- Sussman/Radul propagators: [Revised Report on the Propagator Model](https://groups.csail.mit.edu/mac/users/gjs/propagators/)
- MobX reactions: [mobx.js.org/reactions.html](https://mobx.js.org/reactions.html)
- Marko compiler analysis: [Compiling Fine-Grained Reactivity](https://dev.to/ryansolid/marko-compiling-fine-grained-reactivity-4lk4)
- Angular Signal Graph: [Angular DevTools](https://briantree.se/how-to-install-and-use-the-angular-signal-graph/)
- Jane Street Bonsai: [github.com/janestreet/bonsai](https://github.com/janestreet/bonsai/)

## Lead With

The DES execution model. "The first UI framework built on a discrete event simulation kernel."

## Pitch As

An execution model, not a feature set. "What if your UI runtime was a circuit simulator?"

## Don't Claim

- "First dependency visualization" — Angular and Solid devtools do this
- "First time-travel debugging" — Redux DevTools (2015)
- "First bidirectional constraints in UI" — dthompson/Spritely (2024-2026)
- "First temporal logic for web apps" — Quickstrom (2022)

## Do Claim

- "First UI framework with a discrete event simulation execution model"
- "First to export reactive graph as compile artifact"
- "First to diff reactive topology between code versions"
- "First to offer edge-triggered sensitivity as compiled language syntax"
