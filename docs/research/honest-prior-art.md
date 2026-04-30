# Honest Prior Art Assessment (Revised 2026-04-30)

Revised with systematic research. Every claim now has specific citations. If something exists, we say so and explain what we do differently.

## Prior Art by Feature

### DES Execution Model
| What we claim | Prior art | Novelty |
|---|---|---|
| Discrete event simulation kernel for UI rendering with delta cycles, simulation time, event scheduling | **None found for web UI.** DES libs (SIM.JS, SimScript, OESjs) are simulation tools. Jane Street Bonsai is incremental computation, not DES. Solid/Preact topological sort is single-pass, not multi-pass delta. | **9/10** |

### Static `__graph` Artifact
| What we claim | Prior art | Novelty |
|---|---|---|
| Compiler emits reactive dep graph as standalone JSON build artifact | **Marko** — cross-file reactive analysis at compile time, but internal only (not exposed). **Svelte** — internal dep graph for topological sort, not emitted. **Angular DevTools Signal Graph** — runtime, not compile-time. | **9/10** |

### Circuit Topology Diffing
| What we claim | Prior art | Novelty |
|---|---|---|
| Diff reactive wiring between code versions statically | Nothing found. Enabled by `__graph` artifact. | **8/10** |

### Edge-Triggered Sensitivity
| What we claim | Prior art | Novelty |
|---|---|---|
| `@(posedge x)` / `@(negedge x)` as compiled DSL construct | **MobX `when()`** — fires once when predicate becomes true, auto-disposes (~2016). **MobX `reaction()`** — `(oldVal, newVal)` for transition detection. **RxJS `pairwise()` + `filter()`** — canonical stream-based edge detection. **Vue `watch()`** — gives `(newVal, oldVal)` but level-triggered by default. **React `usePrevious()`** — manual via useRef + useEffect. | **7/10** — mechanism exists, DSL-level compiled syntax doesn't |

### Propagator Networks for UI
| What we claim | Prior art | Novelty |
|---|---|---|
| Constraint blocks compiled from DSL to propagator networks with static analysis | **dthompson / Spritely (FOSDEM 2026)** — working propagator-based FRP for web UI in Scheme/WASM. Handles cyclic deps. **Sussman & Radul (2009)** — theoretical foundation, includes UI example (RGB/HSV widget). **Cassowary.js** — layout-only constraint solver (linear arithmetic). **Propn, alltom/propagators** — JS propagator libraries, not frameworks. | **6/10** — concept exists (dthompson), compiled DSL doesn't |

### Temporal Assertions
| What we claim | Prior art | Novelty |
|---|---|---|
| SVA-style temporal properties embedded in component model as graph nodes | **Quickstrom (Wickstrom, PLDI 2022)** — LTL for web app testing. Custom spec language (Specstrom) with `next`, `always`, `until`. Generates test interactions, checks temporal properties. Published, peer-reviewed. **XState @xstate/test** — model-based testing via state machine path coverage. | **6/10** — Quickstrom does temporal logic for web; we differ by embedding in component model vs external testing |

### Unknown State (X-Value)
| What we claim | Prior art | Novelty |
|---|---|---|
| X-state for all signals with propagation semantics (X in → X out) | **Solid `createResource`** — `T | undefined` until resolved, with `unresolved/pending/ready/refreshing/errored` states. **Leptos** — `Option<T>` with exhaustive Rust matching. **React Suspense** — implicit loading (component throws promise). **egui Bind<T,E>** — `Idle/Pending/Finished/Failed`. | **5/10** — exists for async resources; novel if applied universally with propagation |

### Compile-Time Dep Verification
| What we claim | Prior art | Novelty |
|---|---|---|
| Compiler verifies dependency lists, catches undefined refs | **Svelte 3/4** — compiler analyzes reactive dependencies. **React Compiler** — auto-memoization from dep analysis. **Marko** — cross-file reactive analysis. **Leptos/Rust** — type system catches at compile time. | **2/10** — many frameworks do this |

### Reactive Graph Visualization
| What we claim | Prior art | Novelty |
|---|---|---|
| Circuit diagram of reactive dependencies | **Angular DevTools Signal Graph** (Angular 19+) — runtime visualization. **SolidJS devtools** — discussed/prototyped. **NoFlo** — flow-based programming IDE. **RxViz** — stream visualization. | **4/10** — exists in devtools; ours is from compile-time artifact |

### Directional Ports
| What we claim | Prior art | Novelty |
|---|---|---|
| `input` / `output` for module composition | **Angular `@Input`/`@Output`** — since 2016. **Elm ports** — predates Angular. **Web Components** — attributes + custom events. | **1/10** — do not claim this as novel |

### Waveform Debugging
| What we claim | Prior art | Novelty |
|---|---|---|
| Signal values plotted over time | **Redux DevTools** — action/state timeline (2015). **Reactime** — time-travel for React. **RxJS marble diagrams** — operator visualization. | **2/10** — Redux DevTools with a different skin |

## The Defensible Thesis

**The DES execution model is the primary differentiator.** No web framework runs a discrete event simulation kernel. Delta cycles, edge-triggered sensitivity as compiled syntax, and simulation-time semantics are genuinely new for UI.

**The `__graph` artifact is the secondary differentiator.** Nobody emits the reactive topology as a build artifact. This enables static diffing, CI integration, and tooling that runtime-only graphs can't support.

**The combination matters but the execution model must come first.** Without the DES kernel, Comb is SolidJS with a circuit diagram — that's not enough. With the DES kernel, the circuit diagram becomes a simulator view, the graph becomes a simulation netlist, and the whole metaphor becomes real.

## What to Stop Claiming

- Individual features (dep visualization, ports, waveforms) as novel — they aren't
- "First bidirectional constraints in UI" — dthompson/Spritely exists
- "First temporal logic for web" — Quickstrom (PLDI 2022) exists
- "First time-travel debugging" — Redux DevTools (2015)

## What to Lean Into

- DES execution model (genuinely unprecedented for UI)
- Static `__graph` artifact (genuinely unprecedented as build output)
- Edge-triggered sensitivity as language syntax (mechanism exists, DSL integration doesn't)
- The HDL paradigm as a real execution model, not just a metaphor

## Key Citations

| Reference | Relevance |
|---|---|
| Quickstrom — Wickstrom, PLDI 2022 ([arxiv](https://arxiv.org/abs/2203.11532)) | Direct prior art for temporal assertions in web apps |
| dthompson / Spritely — FOSDEM 2026 ([talk](https://fosdem.org/2026/schedule/event/9NQYKC-funcpropagators/), [blog](https://dthompson.us/posts/functional-reactive-user-interfaces-with-propagators.html)) | Direct prior art for propagator-based web UI |
| Sussman & Radul — Revised Report on the Propagator Model, 2009 ([paper](https://groups.csail.mit.edu/mac/users/gjs/propagators/)) | Theoretical foundation for propagator networks |
| MobX — `when()` and `reaction()` ([docs](https://mobx.js.org/reactions.html)) | Edge detection primitives in existing frameworks |
| Marko — eBay ([analysis](https://dev.to/ryansolid/marko-compiling-fine-grained-reactivity-4lk4)) | Closest to compile-time reactive graph analysis |
| Angular Signal Graph — Angular 19+ ([devtools](https://briantree.se/how-to-install-and-use-the-angular-signal-graph/)) | Runtime dep visualization (not compile-time) |
| Jane Street Bonsai ([github](https://github.com/janestreet/bonsai/)) | Sophisticated graph-based reactive UI (incremental, not DES) |
| Solid `createResource` ([docs](https://docs.solidjs.com/reference/basic-reactivity/create-resource)) | Async unknown state handling |
