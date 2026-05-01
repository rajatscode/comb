# Comb — Honest Technical Review

Self-assessment of what's real, what's not, and what's worth pursuing.

## The Delta Cycle Gap: When Does It Actually Matter?

The `SimulationEngine` (`src/runtime/signals.ts`) implements a real DES loop:

```
while (pendingComputations or pendingUpdates) {
  EVALUATE: run all pending computations (read old values)
  UPDATE:   apply deferred writes (<=) simultaneously
  repeat until quiescent
}
```

The non-blocking assignment (`<=`) is the structural difference from topological-sort frameworks (SolidJS, Preact Signals). Both `always` blocks in this example see the pre-update values, and both writes apply atomically after:

```sv
always @(step) {
  a <= b;       // reads OLD b
  b <= a + 1;   // reads OLD a
}
```

With topological sort, this is either a circular dependency error or execution-order-dependent. With delta cycles, it's deterministic.

### Where the gap is real

- **State machines with cross-dependencies.** Multiple pieces of state read each other's "old" values and transition simultaneously. The traffic light demo is the canonical case. Real in simulation UIs, game logic, protocol visualizers.
- **Feed-forward pipelines.** A 4-stage pipeline where instructions advance one stage per tick. With DES, each stage reads the previous stage's old value — instructions move correctly through the pipeline. With topological sort, writes propagate instantly and instructions "teleport" to the end. The pipeline demo shows this side-by-side.
- **Feedback loops.** A ring counter where a token rotates through stages. With DES, the token moves one position per tick. With naive JS, the token vanishes because all stages see the updated (zero) value simultaneously. The ring counter demo shows this side-by-side.
- **Constraint propagation.** Bidirectional conversions (celsius/fahrenheit, RGB/HSV) where information flows in any direction need multi-pass convergence. Topological sort is single-pass by definition.
- **Effect-writes-signal chains.** An effect reading signal A and writing signal B. The engine defers B's write during the evaluation phase, preventing read-during-write inconsistency. SolidJS handles this too, but with ad-hoc batching rather than formal phase separation.

### Where the gap is zero

For 95%+ of web UIs — forms, dashboards, CRUD apps, data tables — the gap is zero. React/Solid/Svelte are equivalent. The "glitch-free" guarantee from delta cycles is nice in theory, but the "half-updated signal graph" problem is largely solved in modern frameworks via batching and topological sort.

**Performance note:** Benchmarking shows pipeline cross-dependency performance is ~1:1 with topological sort, while producing correct results where topo sort produces wrong results. Linear chain overhead is 3-8x (reactive system overhead, not delta cycles). A single-computation fast path optimization collapses feed-forward chains.

### Bottom line

If your UI is "a thing with buttons and tables," React/Solid/Svelte are equivalent. If your UI is "a thing modeling a process with formal state transitions," the DES model is structurally cleaner.

---

## Edge-Triggered Sensitivity

`@(posedge x)` / `@(negedge x)` compiles and runs end-to-end via `createEdgeEffect` in the runtime. The mechanism is real.

But it's syntax sugar. MobX's `when()`, RxJS's `distinctUntilChanged().filter()`, and Vue's `watch(old, new)` all do this without a new language. The value is in making edge detection declarative and compiler-verified, not in inventing edge detection.

---

## Tooling Ideas: Assessment

### `__test()` Auto-Derived Testing

**Status: Implemented, useful, incomplete.**

The codegen emits a `__test()` export for every module. It instantiates all signals/combs/cells/constraints/assertions headlessly (no DOM, no view), returns:

```js
{ signals: { count: { get, set } }, combs: { doubled }, dispose }
```

This is genuinely better than what React/Vue/Svelte give you out of the box. Programmatic signal access without mounting a component or setting up a DOM.

**What's missing:**
- `always @(event)` blocks are NOT included — you can't trigger events from `__test()`
- No test runner, no assertion library, no coverage
- No snapshot testing, no CI integration

**Worth pursuing?** Yes. The idea of auto-derived component test harnesses is portable to any compiled framework. Nobody does this yet.

### Waveform Debugger

**Status: Implemented, renders, very basic.**

`waveform.ts` is ~200 lines of canvas code. Records signal values over time via `circuit.startRecording()`, plots booleans as filled rectangles and numbers as line charts, has cursor tooltip.

**What's missing:**
- ~~No zoom, scroll, or pan~~ Zoom (mouse wheel), pan (drag), and auto-scroll are now implemented
- No persistence (in-memory, lost on reload)
- No export (can't save/share waveforms)
- ~~No time range selection or signal filtering~~ Signal filtering (click to toggle) is now implemented
- Redraws on 500ms `setInterval`, not event-driven

**Worth pursuing?** Yes, for state machine debugging. The waveform metaphor maps naturally to "what happened to my signals over time" and is more intuitive than Redux DevTools' action log for complex reactive flows.

### Static `__graph` Artifact + Diffing

**Status: Most interesting idea. Algorithm works, no tooling around it.**

Every compiled `.comb` file exports `__graph` as JSON with typed nodes and edges. `CircuitGraph.diffGraphs()` is implemented and tested (12 tests in `circuit-test.ts`) — detects added/removed/changed nodes and edges. `verifyGraph()` detects static nodes that never registered at runtime (dead code detection).

**What's missing:**
- ~~No CLI command to diff graphs~~ `comb diff <a.comb> <b.comb>` now exists
- No CI integration (no GitHub Action, no lint rule)
- ~~No human-readable diff output~~ CLI produces human-readable output showing added/removed/changed nodes and edges
- No side-by-side visualization of two graph versions

**Worth pursuing?** Strongly yes. "Did my refactor change the dependency topology?" is a question no framework answers today. Svelte and Marko do cross-file reactive analysis internally but don't expose the graph. Angular's Signal Graph is runtime-only. The `__graph` as a build artifact enables static analysis that runtime-only graphs can't.

### Temporal Assertions

**Status: Implemented, minimal output.**

`createTemporalAssert` supports `eventually`, `always`, and `next` operators. Uses real `setTimeout` for duration-based assertions. Monitors property changes reactively.

**What's missing:**
- Output is just `console.warn` — no dev panel, no structured reporting
- No way to query active/passed/failed assertions programmatically
- No integration with waveform viewer (natural fit: show assertion windows on timeline)

**Worth pursuing?** Maybe. Quickstrom (Wickstrom, PLDI 2022) does this better as an external testing tool that works with any framework. The advantage of embedding assertions in the component is tighter integration; the disadvantage is lock-in.

---

## Feature Completeness Matrix

| Feature | Implemented? | Production-ready? | Idea worth stealing? |
|---|---|---|---|
| DES / delta cycles | Yes | For narrow use cases | Only for simulation UIs |
| Edge-triggered sensitivity | Yes | Yes (simple) | Sugar, not essential |
| `__test()` headless harness | Yes | No (no events, no runner) | **Yes** |
| Waveform debugger | Yes (zoom/pan/markers/search) | No (no cross-signal, no persist, no keyboard shortcuts) | **Yes** |
| `__graph` static artifact | Yes | No (no CI) | **Yes** |
| Graph diffing | CLI + visual diff demo | No (no CI integration) | **Yes** |
| Temporal assertions | Yes (armed/passed/failed lifecycle) | No | **Yes** |
| CDC async boundary analysis | 3 pattern checks | No (pattern matching, not data flow — no transitive taint, no CFG) | **Yes (concept)** |
| Propagator networks / cells | Yes | Basic | Research interest |
| Type system | Warnings only | No | Needs real type errors |
| SSR | Yes | Basic | Needs hydration |
| Source maps | Yes | Basic | Needs testing |
| Router | Yes | Hash-only | Needs history API |
| Toggle coverage | Partially wired (boolean signals only) | No (misses combs, cells, non-booleans) | **Yes (concept)** |
| FSM/cross coverage | Data structures exist | No (dead API — compiler emits zero instrumentation, test runner ignores it) | **Yes (concept)** |
| Graph-directed auto-testing | State space inference (heuristic) | No (zero dedicated tests) | Maybe |
| `deferredBatch` (non-blocking assignment) | Yes (engine-level fix) | Yes | Core DES correctness |
| Bounded state inference | Yes (guard analysis + write patterns) | Yes | **Yes** |

---

## What's Genuinely Novel (Holds Up Under Scrutiny)

1. **DES as UI execution model.** No web framework uses formal delta cycles. The thesis is sound for simulation-class UIs. Now backed by empirical proof: pipeline, ring counter, unit converter (diamond constraint propagation), and bus protocol (3 cross-dependent FSMs) demos all show side-by-side comparisons where DES produces correct results and naive JS does not.
2. **Static `__graph` as build artifact.** No framework emits the dependency graph as a diffable JSON artifact. Enables CI topology diffing, dead code detection, and static analysis. Dashboard diff demo proves the tool catches silent regressions that compile clean but break behavior.
3. **Auto-derived `__test()` from component definition.** No framework auto-generates a headless test harness from the component source.
4. **CDC-style async boundary analysis for UI.** Static analysis that classifies signal writes into sync vs async domains and detects unsynchronized crossings, race conditions, and missing error handling. No web framework or linting tool performs systematic async boundary analysis analogous to hardware CDC checks (Spyglass CDC).
5. **HDL-grade observability suite for reactive UI.** Waveform viewer with signal hierarchy, dual cursors, pattern search, analog/digital rendering modes, and assertion lifecycle overlays (armed/passed/failed). Combined with toggle/FSM/cross coverage tracking. No web framework offers GTKWave-style signal debugging.
6. **Static state space inference from dependency graph.** The compiler analyzes write expressions and guard conditions (`if (x >= N)`) to infer bounded state spaces for ALL signals — not just enums. Bool signals get {true, false}, enum signals get their variants, and bounded int signals get their range inferred from the code structure. The `__graph` carries this metadata as `states` arrays on each node. No other framework computes the finite state space of reactive signals at compile time.
7. **Graph-directed coverage-driven auto-testing.** The auto-test reads `__graph` to discover: (a) which signals have finite state spaces, (b) which signals are clock drivers (feed into posedge sensitivity blocks), (c) the complete target state space. It drives inputs identified by the graph, tracks coverage against the compile-time-known state space, and stops when 100% is achieved or coverage plateaus. Unreachable cross-coverage combinations are flagged after the test completes. No web framework has coverage-driven test generation from a static reactive dependency graph.

## What's Not Novel (Stop Claiming These)

- Fine-grained reactivity (SolidJS, Preact Signals)
- Compiler-verified dependencies (Svelte, React Compiler, Marko)
- Reactive graph visualization (Angular DevTools, SolidJS devtools)
- Directional ports (Angular `@Input`/`@Output` since 2016, Elm ports)

---

## Ecosystem Costs of a New Language

A new `.comb` DSL means:

- No IDE support (syntax highlighting, autocomplete, go-to-definition)
- No AI code completion (Copilot/Cursor/Claude don't know `.comb`)
- No npm component ecosystem
- No Stack Overflow answers
- No hiring pool
- No linting or formatting tools
- No TypeScript interop story

These costs are categorical, not incremental. They make Comb unsuitable for production use regardless of the runtime's quality.

### Implication for future work

The most valuable ideas (`__graph`, `__test()`, waveform debugging) are portable. They could be implemented as:
- A Svelte/Solid compiler plugin that emits `__graph`
- A Vite plugin that auto-generates test harnesses
- A devtools extension that records signal waveforms

The ideas don't require the language. The language is the wrong vehicle for the ideas.

---

## Real Pain Points in Frontend Development (and Which Comb Ideas Address Them)

The question isn't "is this technically interesting?" — it's "does anyone actually have this problem?"

### Pain point 1: "What depends on what?" is invisible

**The problem:** In React/Svelte/Solid, when you refactor a shared signal or rename a store key, you have no way to know what downstream computations and effects you broke until runtime. The dependency graph is implicit — buried in closures and auto-tracking. Svelte's compiler knows the graph internally but throws it away after codegen. TypeScript catches type errors but not topology errors ("this effect used to depend on X, now it doesn't — was that intentional?").

Large reactive codebases become "change something, pray nothing breaks."

**Comb's answer:** The `__graph` static artifact. A JSON file emitted at compile time with every node and edge in the dependency topology. Diffable in CI.

**Verdict: Real pain, real answer.** This is the strongest idea in Comb. Nobody else does this. A CI check that says "your refactor removed the edge from `userProfile` to `dashboardTitle` — was that intentional?" would catch real bugs.

### Pain point 2: Testing reactive logic requires mounting the whole component

**The problem:** In React, testing "when signal A changes, derived value B should update" requires `render()` + `act()` + DOM queries. In Svelte, you need `mount()` + component accessors. The reactive logic is welded to the view. You shouldn't need a DOM to test `doubled = count * 2`.

**Comb's answer:** The `__test()` auto-derived harness. Headless instantiation of signals, combs, and assertions without any DOM.

**Verdict: Real pain, partial answer.** The idea is right. The implementation is incomplete — `always @(event)` blocks aren't exposed in `__test()`, so you can't test event handlers. But the concept of auto-extracting a headless reactive harness from a component is genuinely better than what exists.

### Pain point 3: "What happened?" debugging is bad for reactive flows

**The problem:** When a value is wrong in a reactive app, you need to trace backwards: what set this signal? what triggered that effect? what was the value 3 seconds ago? Redux DevTools solves this for Redux-style stores but not for fine-grained signals. SolidJS devtools shows the current graph but not the history.

**Comb's answer:** The waveform debugger — canvas-based signal value timeline with cursor inspection.

**Verdict: Real pain, growing answer.** The waveform metaphor is right for this problem. Zoom, pan, signal filtering, and auto-scroll are now implemented. Still missing persistence and cause-chain tracing. Getting closer to beating `console.log` for complex reactive flows, but not there yet.

### Pain point 4: Edge detection is boilerplate

**The problem:** "Do something when loading transitions from true to false" is a real pattern (show toast on completion, animate in content, fire analytics). Every framework handles it with `watch(old, new)` or `useEffect` + `useRef` tracking previous values. It's ~5 lines of boilerplate every time.

**Comb's answer:** `@(posedge x)` / `@(negedge x)` — one line.

**Verdict: Real annoyance, marginal improvement.** The boilerplate is real but minor. ~5 lines → 1 line is nice DX but doesn't justify a new language.

### Correction: Glitches and effect ordering ARE real problems

The initial review dismissed these. The research says otherwise.

**SolidJS has documented, production-affecting glitch issues:**
- solidjs/solid#1199: Effect execution order changed silently in 1.5 upgrade. Code depending on effect ordering broke with no documentation.
- solidjs/solid#879: Within `batch()`, setting a signal and immediately reading it returns the *old* value. By design, but causes real bugs.
- solidjs/solid Discussion #2420: "How do I guarantee the order of some effects?" Answer: you cannot.
- solidjs/solid#1843: `createEffect` fires in dev mode but not in production builds.

**Svelte 5's `$effect` has circular dependency problems:**
- sveltejs/svelte#9944: "$effect is unusable (produces circular dependencies and endless updates)." Hundreds of upvotes.
- sveltejs/svelte#13207: Request for manual dependency specification — indicating automatic tracking is insufficient.

**Angular signals fail silently on conditional dependencies:**
- angular/angular#54859: `computed()` displays initial value but never refreshes.
- angular/angular#54050: Computed inside observable pipe runs once, never recalculates.
- Conditional dependency loss: if `computed()` reads signal A only when signal B is true, and B becomes false, A drops from the dep set. When A changes, the computed doesn't update. No error thrown.

**The TC39 Signals proposal (Stage 1) explicitly acknowledges glitch-free computation as a design goal** — a tacit admission from the standards body that existing frameworks solve this inconsistently.

**Revised verdict:** Delta cycles don't solve a theoretical problem — they solve a real one that existing frameworks handle with ad-hoc batching, undocumented ordering, and silent failures. The question is whether the DES formalism is the right fix, or whether better tooling around existing models is sufficient.

### NOT real pain points (stop optimizing for these)

- **"I need formal temporal assertions in my component."** Nobody has this problem in daily web dev. It's real in hardware verification, but the UI analog is better served by external testing tools (Bombadil).
- **"I need propagator networks for bidirectional constraints."** Extremely niche. Layout engines and possibly complex form validation, but CSS and existing constraint libraries handle this.

---

## What to Actually Build Next

> **Note:** The project maintainer has decided to keep all work within the Comb language and repo. The recommendations below to port to other frameworks have been explicitly rejected in favor of proving the core DES thesis within Comb itself.

If the goal is to build things people would use, the highest-value work is extracting the portable ideas into tools that work with existing frameworks — not deepening the Comb language itself.

### Tier 1: High confidence, clear path

1. **`__graph` as a Svelte/Solid compiler plugin.** Emit dependency topology as JSON alongside compiled output. Write a `comb graph-diff` CLI that compares two versions. Ship a GitHub Action that comments on PRs with topology changes. This could get real users without anyone adopting a new language.

2. **Auto-test harness generator as a Vite plugin.** Parse Svelte/Solid components, extract reactive declarations, emit a headless test fixture. `import { signals, combs } from './Counter.test-harness'`. This is the `__test()` idea made portable.

### Tier 2: Worth exploring, needs more design

3. **Signal waveform devtools extension.** Works with SolidJS/Preact Signals. Records signal history, renders timeline, supports zoom/filter/export. Browser extension or embedded panel. The waveform metaphor is right; the current implementation just needs to be 10x richer.

4. **Edge-triggered hooks library.** `useEdge(signal, 'posedge', callback)` for React/Solid/Svelte. Tiny library, no new language needed. Solves the boilerplate problem directly.

### Tier 3: Research interest, unclear demand

5. **Temporal assertions as a testing library.** External tool (like Quickstrom) that works with any framework: `assertEventually(() => screen.getByText('Success'), { within: '5s', after: () => userEvent.click(submitButton) })`. Doesn't need to be embedded in the component.

6. **DES runtime as an alternative Solid-compatible renderer.** Keep Solid's API, swap the scheduler for delta cycles. Would let people opt into DES semantics without a new language. Unclear if anyone would want this.

### What NOT to build

- More language features for `.comb` (the DSL is the wrong vehicle)
- A package manager or component ecosystem for Comb
- Production build optimization for Comb (optimizing for zero users)
- IDE extensions for `.comb` syntax (investing in a dead end)

---

---

## Literature Review: HDL Concepts Applied to UI

Deep research into academic papers, shipped tools, and the actual state of the art. The question: which HDL concepts solve real UI problems that nobody else is solving?

### Prior Art: Synchronous Reactive Languages for Web UI

This has been explored more than expected. The French synchronous languages community has done serious work here:

- **HipHop.js** (Berry & Serrano, PLDI 2020) — Gerard Berry (creator of Esterel) and Manuel Serrano built a synchronous reactive language that compiles to JavaScript and runs in unmodified browsers. Their key argument: "the synchronous model is very appealing for programming the asynchronous patterns of Web applications because it makes synchronization trivially explicit and deterministic." The synchronous hypothesis holds *within* a reaction; asynchrony exists *between* reactions — which maps directly to delta-cycle semantics.
  - Paper: https://dl.acm.org/doi/abs/10.1145/3385412.3385984

- **Pendulum** (Zorg, REBLS 2016) — OCaml syntax extension for synchronous-reactive web client programming. Enforces static guarantees of determinism, coherency, and causality.
  - Paper: https://dl.acm.org/doi/10.1145/3001929.3001931

- **Ceu** (ACM TECS 2017) — Synchronous reactive language following Esterel's lineage. Compile-time detection of conflicting concurrent statements.

- **SCADE** — Industrial-grade synchronous design environment (Lustre + Esterel), qualified to DO-178C Level A. Used in Airbus A380 flight controls. Proves synchronous reactive can scale to safety-critical systems.

**Assessment:** The synchronous reactive model for web UI has been *researched* but never *adopted*. HipHop.js is the most complete realization. The ideas are validated; the vehicle (a new language) killed adoption every time. Same lesson as Comb.

### Prior Art: Reactive Dependency Graphs

- **Nico Ritschel's Master's thesis (UBC)** — "A Meta Representation for Reactive Dependency Graphs." The single most relevant academic work. Proposes an external meta-representation for reactive programs, making the structure and semantics of the data-flow accessible as a first-class artifact. This is exactly the `__graph` idea, formalized academically.
  - PDF: https://www.cs.ubc.ca/~ritschel/files/masterthesis.pdf

- **Reactive Inspector** (Salvaneschi & Mezini, ICSE 2016) — Eclipse plugin that visualizes the reactive dependency graph, profiles node recomputation efficiency (detecting nodes recomputed many times without producing new values), and allows graph navigation/search.
  - Paper: https://programming-group.com/assets/pdf/papers/2016_Debugging-for-Reactive-Programming.pdf

- **RxFiddle** (Banken, Meijer, Gousios, ICSE 2018) — Visualization tool for RxJS dependency flows with dynamic marble diagrams. Evaluated with 111 developers; showed faster debugging task completion.

- **IceDust** (Harkes & Visser, ECOOP 2016) — DSL for data modeling with derived values. Uses path-based abstract interpretation for static dependency analysis. Extended in IceDust 2 (ECOOP 2017) with bidirectional relations.

### Prior Art: LTL/Temporal Logic for Web Testing

- **Quickstrom** (Wickstrom & O'Connor, PLDI 2022) — Property-based acceptance testing using Linear Temporal Logic (LTL). Custom DSL (Specstrom). Found bugs in almost half of TodoMVC implementations. Never gained adoption because "nobody wanted to learn a new language just to write tests."

- **Bombadil** (Wickstrom at Antithesis, January 2026) — Quickstrom rebuilt with TypeScript instead of a custom DSL. LTL operators: `always()`, `eventually()` (with timeouts), `.implies()`. Open source: github.com/antithesishq/bombadil. This is the current state of the art for temporal UI testing.

- **Web-TLR** — Uses Linear Temporal Logic of Rewriting (LTLR) with the Maude model checker to verify web applications.

**Assessment of Comb's temporal assertions vs. prior art:** Comb's `assert temporal` is less expressive than Quickstrom/Bombadil's LTL operators, and less expressive than SVA sequences. The embedded-in-component approach is novel but the operator set is too limited to compete.

### Prior Art: Closest Framework Comparisons

- **Jane Street's Bonsai** — Incremental computation (Umut Acar's self-adjusting computation model), not DES. `stabilize` operation is analogous to "process delta cycles until quiescence" but without explicit simulation time. Most sophisticated production reactive UI system.

- **Signia (tldraw)** — Uses a global logical clock (single integer incremented on every state update) for cache invalidation. Structurally similar to simulation time in DES.

- **SolidJS 2.0 roadmap** — Mentions "reactive graph serialization" for hydration, which would be the first time a mainstream framework treats the graph as a transferable artifact.

- **TC39 Signals Proposal** (Stage 1) — Native `Signal.State` and `Signal.Computed` for JavaScript. Input from Angular, Solid, Vue, Svelte, Preact, Qwik, MobX maintainers. Standardizes the reactive primitive that is structurally analogous to HDL signals.

### What Nobody Has Done (Genuinely Novel Territory)

Based on the full literature survey, these ideas have **no prior art**:

1. **Emitting the reactive dependency graph as a serializable build artifact and diffing it in CI.** Ritschel's thesis proposes this theoretically. React Compiler, Svelte, and Marko all build the graph internally and discard it. Angular's `getSignalGraph()` is runtime-only and debug-only. Nobody serializes it. Nobody diffs it. Nobody runs it in CI.

2. **Systematic CDC-style async boundary analysis for UI.** Hardware has mature static analysis (Spyglass CDC) that finds every clock domain crossing and verifies proper synchronization. The UI analog — finding every place where async-originated data flows into synchronous rendering state and verifying that race conditions are impossible — does not exist. `exhaustive-deps` catches stale closures but not concurrent-fetch races, Web Worker boundaries, or state machine timing conflicts.

3. **SVA-style sequence assertions mapped to UI interaction patterns.** SVA sequences (`req |-> ##[1:3] ack`) with bounded delays, repetition (`[*n]`), and composition (`intersect`, `within`, `throughout`) are more expressive than Quickstrom/Bombadil's LTL operators. Nobody has mapped SVA's sequence language to UI testing.

4. **Functional coverage (HDL-style) for UI testing.** Hardware engineers declaratively specify what scenarios must be verified (coverpoints, bins, cross coverage) and measure completion. Web has code coverage (Istanbul/c8) but no framework for "which user-visible scenarios have been tested?"

5. **Toggle coverage for reactive state.** "Has every Boolean signal been both true and false during the test suite?" Would catch `isLoading` variables that are set to `true` but never back to `false` (bug), or never set to `true` at all (dead feature). No tool measures this.

---

## HDL Tooling Gap Analysis

What hardware engineers have that web developers don't, ranked by severity of the gap.

### Gap 1: Waveform Viewer — ENORMOUS

Hardware engineers see every signal in their design over time, hierarchically grouped, with measurement tools. Web developers get `console.log` and Redux DevTools.

**What GTKWave/Surfer have that a UI waveform viewer needs:**
- Signal hierarchy browser (mirrors component tree)
- Dual markers with delta measurement ("how long between click and loading=false?")
- Pattern search ("find next time `isAuth` goes false while `route` is not `/login`")
- Analog vs. digital rendering (numeric signals as line charts, booleans as filled rectangles)
- Protocol decode (raw fetch/XHR decoded into labeled request/response pairs)
- Cross-signal correlation — the killer feature. See that `isLoading` went true at T=1200ms, `fetchError` went truthy at T=1450ms, but `isLoading` never went back to false. Bug spotted visually.

**Surfer** (Rust, CAV 2025 paper) is particularly relevant — it has a VSCode extension, runs in the browser, has a command palette with fuzzy search, and a JSON-based remote control protocol (WCP). These are exactly the integration patterns a UI waveform tool would need.

**What exists today:** Redux DevTools (Redux only, action log, not signal-level), Angular 21 Signal Graph (current state only, no history), solid-devtools (immature, the README says "most packages are not much more than just ideas and experiments"), Preact signals devtools (open feature request, preactjs/signals#384).

### Gap 2: Async Boundary Analysis (CDC Equivalent) — ENORMOUS

In hardware, Clock Domain Crossing (CDC) analysis is a static structural analysis that finds every place where data crosses a clock domain boundary and verifies that proper synchronization exists. Spyglass CDC checks for: missing synchronizer flip-flops, multi-bit signals crossing domains without gray coding, reset signals crossing domains without proper de-assertion.

**The UI analog:** Every place where async-originated data (fetch response, setTimeout callback, Web Worker message, event listener) flows into synchronous rendering state. Problems include:
- Concurrent fetches writing the same state (race condition)
- Signal reads after `await` silently losing reactive context (Angular signals, documented in angular/angular issues)
- Stale closures capturing old values across async boundaries (React's #1 complaint, facebook/react#15865 with 600+ comments)

**What exists:** `react-hooks/exhaustive-deps` catches stale closures (the direct analog of incomplete sensitivity lists). Nothing catches concurrent-fetch races or async context loss systematically.

**This is the single most impactful idea to port from HDL.** A static analysis tool that finds every async boundary in a reactive codebase and verifies correct synchronization would catch entire classes of bugs that no existing tool addresses.

### Gap 3: Functional Coverage — LARGE

**Hardware:** Declarative specification of what scenarios must be verified. Coverpoints, bins, cross coverage. "I want every combination of {opcode} x {data_size} to be exercised." The coverage database is a first-class artifact that persists across runs.

**Web:** Istanbul/c8 measures code coverage (which lines executed). Nobody measures "which user-visible scenarios have been tested." No framework for declaring "here are the scenarios that matter" and measuring whether tests have covered them.

**Specific missing coverage types:**
- Toggle coverage: has every Boolean state been both true and false?
- FSM transition coverage: of the 12 possible transitions in the checkout flow, which have been tested? (XState can do this for declared machines, but most UI state is ad-hoc)
- Cross coverage: has every combination of {0 rows, 1 row, many rows} x {no filter, active filter} x {sorted, unsorted} been tested?
- Assertion coverage: of all the assertions I wrote, how many have actually been triggered? An untriggered assertion provides zero verification value.

### Gap 4: Temporal Property Specification — LARGE

**Hardware:** SVA sequences with bounded delays, implication operators, repetition, composition. `assert property(@(posedge clk) $rose(req) |-> ##[1:3] $rose(ack))` — "after request rises, acknowledge within 1-3 cycles." Solvers prove this for ALL possible inputs.

**Web:** Bombadil provides `always()`, `eventually()`, `.implies()` in TypeScript. But SVA's sequence language is significantly more expressive — `##[1:3]` delays, `[*n]` repetition, `intersect`, `within`, `throughout`, `first_match`. Nobody has mapped this full expressiveness to UI interaction patterns.

**What would this look like?** "After the user clicks Submit, within 500ms either a success toast or an error message must appear, AND the submit button must be disabled for the entire duration." In SVA-style: `@(click(submit)) |-> disable(submit) throughout ##[0:500ms] (toast || error)`.

### Gap 5: Structured Test Architecture (UVM) — LARGE (Architectural)

**Hardware UVM separates concerns:**
- Driver: applies stimulus (translates "click login" → actual DOM events)
- Monitor: observes state changes and produces typed transactions
- Scoreboard: compares actual vs. expected behavior using a reference model
- Coverage collector: measures what's been exercised

**Web testing mixes all of these** into monolithic test functions. There is no "LoginAgent" with a reusable driver/monitor/scoreboard that different tests compose with different sequences.

This is an architectural/cultural gap rather than a tooling gap. But the UVM pattern — stimulus generation separate from observation separate from checking separate from coverage — would dramatically improve test reuse and composability.

### Gap 6: Coverage-Driven Constrained Random Testing — MEDIUM

**Hardware CRV:** Declare random variables with constraints, call `randomize()`, SAT solver generates values satisfying all constraints. Combined with coverage: measure coverage → identify holes → add constraints → re-randomize.

**Web:** fast-check provides property-based testing with shrinking. fast-check-frontend extends to random user interactions. But the coverage-driven steering loop (measure coverage, automatically steer generation toward uncovered regions) doesn't exist.

### Gap 7: Formal Verification of State Machines — MEDIUM

**Hardware:** SymbiYosys/JasperGold prove properties over ALL reachable states. Bounded model checking, unbounded verification, counterexample generation.

**Web:** XState's `@xstate/graph` generates test paths by graph traversal. But no temporal property checking ("the payment form can never reach 'submitted' without passing through 'validated'"), no deadlock/livelock detection, no invariant checking over all reachable states. Academic work exists (WAVer, Web-TLR) but none integrated into JS tools.

### Gap 8: Static Critical Path Analysis — MEDIUM

**Hardware STA:** Analyzes ALL signal paths structurally to find the longest propagation delay.

**Web analog:** Static analysis of data-fetch dependency chains to find the longest sequential chain. "This component depends on 3 sequential API calls totaling 800ms. Call 3 doesn't depend on call 1's result — parallelizing them would reduce the critical path from 800ms to 550ms." Lighthouse measures timing dynamically but doesn't analyze the dependency graph structurally.

---

## What Frameworks Are Building Internally (and Don't Expose)

Key finding: the major frameworks already build reactive dependency graphs at compile time. They just throw them away.

| Framework | Internal Graph? | Exposed? | Notes |
|---|---|---|---|
| **React Compiler** | Yes — HIR, SSA, reactive scope inference | No (visible in playground only) | Most sophisticated static analysis. ReactiveIR PR (#31974) suggests movement toward explicit graph. |
| **Svelte** | Yes — topologically-sorted dep graph of reactive declarations | No (AST marked unstable) | `svelte.compile()` returns `vars` with dependencies but full graph is internal. |
| **Marko** | Yes — cross-file reactive analysis, analyze stage | No (metadata on `.extra` AST properties) | Closest to serializable graph. Enables cross-template hydration pruning. |
| **Angular** | Runtime only — `getSignalGraph(injector)` debug API | Partially (debug mode only, Angular 19+) | Returns `DebugSignalGraph` with `nodes` and `edges`. Runtime, not static. |
| **SolidJS** | Runtime only | No | 2.0 roadmap mentions "reactive graph serialization" for hydration. |

**The opportunity:** Intercept any of these internal graphs and serialize them. A Babel plugin wrapping React Compiler's reactive scope output. A Svelte preprocessor extracting the dep graph. A Marko plugin serializing the analyze stage. The infrastructure is *already built* — it just isn't exposed.

---

## Revised: What to Actually Build Next

Updated based on the full literature review and gap analysis.

### Tier 1: Genuine frontier — real pain, no solution, HDL concept maps cleanly

1. **Static reactive dependency graph as build artifact + CI diffing.**
   - Pain: dependency tracking failures across all frameworks (React stale closures, Angular conditional dep loss, Svelte $effect cycles)
   - HDL analog: synthesis tools analyze full circuit graph at compile time
   - Prior art: Ritschel thesis (theoretical), nobody ships this
   - Implementation path: compiler plugin for Svelte or Solid that emits `__graph` JSON, CLI differ using Graphtage-style structural diffing, GitHub Action that comments on PRs
   - Why Comb proves the concept: the `__graph` pipeline and `CircuitGraph.diffGraphs()` already work end-to-end

2. **Async boundary analysis (CDC analog).**
   - Pain: concurrent fetches writing shared state, async context loss, stale closures — the #1 complaint across React, Angular, Vue
   - HDL analog: Spyglass CDC finds every clock domain crossing
   - Prior art: nothing systematic exists
   - Implementation path: ESLint plugin or standalone static analyzer that treats sync rendering and async callbacks as different "clock domains," flags every crossing point, verifies proper synchronization patterns (AbortController, race condition guards, state batching)
   - Why this is huge: would catch entire classes of bugs no existing tool addresses

3. **Signal waveform devtools with GTKWave-grade features.**
   - Pain: "what happened?" debugging has no good tools for fine-grained signals
   - HDL analog: GTKWave/Surfer — hierarchical signal browsing, dual markers, pattern search, cross-signal correlation
   - Prior art: Redux DevTools (Redux only), solid-devtools (immature), Reactive Inspector (academic, Eclipse-only, 2016)
   - Implementation path: Chrome extension + embedded panel, works with SolidJS/Preact Signals/TC39 Signals. Record all signal changes with timestamps. Render as waveforms with hierarchy, markers, measurement, and pattern search.
   - Key feature to prioritize: cross-signal correlation. Seeing two signals side-by-side, time-aligned, with markers showing "loading went true here, error appeared here, loading never went false" — this is how hardware engineers find bugs visually.

### Tier 2: Strong potential, partial solutions exist

4. **SVA-style sequence assertions for UI testing.**
   - Prior art: Bombadil provides basic LTL operators in TypeScript. SVA sequences are significantly more expressive.
   - What to build: extend Bombadil's model with SVA-style bounded-delay sequences, `throughout` (property holds for entire duration), `first_match`, implication with delay ranges. TypeScript API, not a DSL.

5. **Functional coverage framework for UI.**
   - What to build: declarative coverage spec (coverpoints, bins, cross coverage) that integrates with Playwright/Cypress. "Define the scenarios that matter, measure whether your tests hit them, identify holes."
   - Key concept to port: coverage merging across test suites.

6. **Toggle/FSM coverage for reactive state.**
   - What to build: instrument signals to track value transitions during test runs. Report: "signal `isLoading` was true 47 times but never went false→true→false within a single test" or "state machine has 12 transitions, 4 never exercised."

### Tier 3: Research interest, worth prototyping

7. **Formal verification for XState machines.** Bounded model checking with counterexample generation. "Prove that the checkout flow can never reach 'shipped' without passing through 'payment_confirmed'." Generate a minimal interaction sequence that violates the property.

8. **UVM-style test architecture patterns for UI.** Not a tool but a methodology: reusable Agent (driver + monitor), Scoreboard (reference model comparison), Coverage (declarative scenario specification). Would work with Playwright.

### What NOT to build (confirmed by research)

- **More Comb language features.** HipHop.js, Pendulum, and Ceu prove that synchronous reactive languages for web UI are academically validated and universally ignored. The language is always the wrong vehicle.
- **Temporal assertions embedded in components.** Bombadil does this better as an external tool with TypeScript, learning from Quickstrom's failure (nobody wants a new DSL for testing).
- **DES runtime as a standalone scheduler.** The delta cycle gap is real but too narrow to justify a new runtime. Better to push for the TC39 Signals proposal to incorporate formal stabilization guarantees.

---

## Key References

### Academic Papers
- Berry & Serrano, "HipHop.js: (A)Synchronous Reactive Web Programming," PLDI 2020
- Wickstrom & O'Connor, "Quickstrom: Property-based acceptance testing with LTL specifications," PLDI 2022
- Salvaneschi & Mezini, "Debugging for Reactive Programming," ICSE 2016
- Banken, Meijer, Gousios, "Debugging Data Flows in Reactive Programs" (RxFiddle), ICSE 2018
- Harkes & Visser, "IceDust: Incremental and Eventual Computation of Derived Values," ECOOP 2016
- Ritschel, "A Meta Representation for Reactive Dependency Graphs," UBC Master's thesis
- Surfer waveform viewer, CAV 2025

### Tools and Frameworks
- Bombadil (Wickstrom/Antithesis): github.com/antithesishq/bombadil
- Surfer waveform viewer: github.com/surfer-project/surfer
- ng-reactive-lint: arxiv.org/abs/2512.00250
- Graphtage (Trail of Bits): github.com/trailofbits/graphtage
- oasdiff (OpenAPI diffing): oasdiff.com
- fast-check-frontend: github.com/mdubourg001/fast-check-frontend
- Signia (tldraw): signia.tldraw.dev

### Relevant GitHub Issues (Evidence of Pain)
- facebook/react#15865 — useEffect dependency confusion (600+ comments)
- solidjs/solid#1199 — effect ordering breakage in 1.5
- solidjs/solid#879 — batch() read-after-write inconsistency
- sveltejs/svelte#9944 — "$effect is unusable"
- sveltejs/svelte#10244 — unit testing $derived fails
- angular/angular#54859 — computed() never refreshes
- preactjs/signals#384 — "Devtools for debug" (open)
- React Compiler silent bailouts: facebook/react#35644, acusti.ca analysis

---

---

## Re-Review: Post-Hackathon Updates (commits 8e977de..49b322a)

~8,000 lines added across 2 major commits. Four areas to evaluate: waveform viewer refactor, coverage system, CDC-style analysis in verify.ts, and new demos/benchmarks.

### Waveform Viewer — Real Progress, Core Features Still Missing

The 200-line monolith was refactored into 6 files (~690 lines total) in `src/waveform/`. What improved:

| Feature | Before | After | Grade |
|---|---|---|---|
| Zoom/Pan/Scroll | None | Mouse wheel zoom (anchor at cursor), click-drag pan, vertical scroll | A |
| Signal Hierarchy | None | Flat grouping by dotted prefix, collapsible groups, per-signal visibility toggle | B- |
| Dual Markers | None | Alt+click sets A, Shift sets B, shows delta (dt = Xms) | B |
| Pattern Search | None | Single-signal predicates (`signal > value`, `signal rises`), match navigation | B- |

**What's still missing (the features that make GTKWave indispensable):**

- **Cross-signal correlation** — completely absent. No compound predicates (`clk rises AND data > 5`), no temporal correlation ("find where A transitions within 10ms of B falling"). This is the killer feature for debugging complex reactive flows and it's not here.
- **Persistence/export** — completely absent. No save/load of view state, no VCD/JSON export, no screenshot. The `WaveformState` type in `types.ts` defines the right shape but nothing reads or writes it — dead type.
- **Keyboard shortcuts** — zero. No +/- for zoom, no arrow keys for pan, no Home/End for fit. These are daily-use essentials.
- **Time range selection** — no rubber-band drag-to-zoom.
- **Marker snap-to-edge** — markers land at arbitrary time points, don't snap to nearest signal transition.
- **Event-driven updates** — still on 500ms `setInterval` polling. No subscription to circuit state changes.
- **Memory leak** — `index.ts` adds `mouseup` listener to `window` but never removes it in `dispose()`.

**Verdict:** Solid refactor with clean file separation. The zoom/pan and markers are real. But "GTKWave-grade" is still a stretch — the three features that make waveform debugging actually powerful (cross-signal correlation, compound triggers, save/restore) are all absent.

### Coverage System — Well-Typed Skeleton, Zero Integration

`src/runtime/coverage.ts` (181 lines) implements a `CoverageCollector` class with three coverage types. Critical finding: **the compiler emits zero coverage instrumentation, the CLI test runner ignores the module entirely, and the flagship bus-protocol demo bypasses it.**

**Toggle coverage:** Partially wired — `signals.ts` calls `coverage.recordToggle()` for boolean `createSignal` writes. But combs, cells, and non-boolean signals are invisible. The most common case for toggle coverage — comb-derived booleans like `cpuHigh`, `emailValid` — is not tracked.

**FSM transition coverage:** Dead API. `recordTransition()` exists but nothing calls it. The compiler emits zero instrumentation. The bus-protocol demo (`bus-protocol-mount.ts` line 1029) manually tracks transitions using `coverage.setPreviousValue()` as a key-value store, completely bypassing `recordTransition()` and the rest of the coverage API.

**Cross coverage:** Boolean-only, manual-only. `recordCross()` is never called automatically. The bus-protocol demo rolls its own `Set<string>` at line 984 instead of using the collector.

**Reporting:** `getReport()` returns raw data. No formatter, no threshold/pass-fail, no CI integration. Transitions are explicitly excluded from the coverage percentage.

**The test runner (`src/cli/test.ts`) implements its own ad-hoc boolean coverage tracking** (lines 122-177) by reading comb getter values and collecting distinct outputs. It never calls `coverage.enable()` or `coverage.getReport()`.

**Verdict:** The data structures are correct but the system has no callers. To make this real: the compiler needs to emit `coverage.recordTransition()` calls in always blocks that write enum/state signals, `coverage.recordCross()` in cross-coverage groups, and the test runner needs to use the collector instead of rolling its own.

### CDC-Style Async Boundary Analysis — Pattern Matching, Not Static Analysis

`verify.ts` grew by ~272 lines. The `analyzeAsyncBoundaries` function adds three new warnings:

1. **Unsynchronized async write** — if a comb reads a signal written inside an `async {}` block
2. **Race condition** — if two async blocks write the same signal
3. **Missing catch** — if an async block writes signals without error handling

These catch real patterns. But calling it "CDC-style" oversells it:

- **Only finds top-level async blocks.** An async block nested inside an `if` branch is invisible — the loop iterates `decl.body` top-level statements only.
- **No transitive taint.** If signal A is async-written and signal B reads A in a sensitivity block and comb C reads B — the analysis doesn't flag it. Only direct comb-reads-async-signal is caught.
- **No data flow analysis.** No CFG, no reaching definitions, no abstract interpretation. It's set-based: "does any async block anywhere write this signal?"
- **False positives on guarded patterns.** `comb display = loading ? "..." : data` where `loading` is set synchronously before the async block will be flagged, even though it's correctly guarded.

**State space inference** (~120 lines) was added to annotate graph nodes with `valueType` and `states[]`. It's heuristic (recognizes `if (signal >= N)` guard patterns but not `===`, `switch`, or modulo) and has **zero dedicated tests**.

**Still missing (and straightforward to add):**
- Undriven signal detection (signal never written, no initializer)
- Multi-driven synchronous net detection (multiple always blocks writing same signal)
- Dead signal/comb detection (declared but never read)
- View reads of async-written signals (same bug class, not flagged)

**Verdict:** Useful first step. Catches the three most obvious async anti-patterns. But it's grep-level pattern matching, not the data-flow analysis that would make it a real CDC analog.

### New Demos — Mixed Results

**Bus protocol (`bus-protocol.comb`, 167 lines):** Labeled "SPI" but isn't SPI — it's a generic request/grant bus arbitration protocol. That said, it genuinely exercises the DES thesis: three concurrent `always @(posedge clk)` blocks reading each other's outputs. The framework comparison (React/Solid/Svelte equivalents as string literals in `bus-protocol-mount.ts`) is the strongest argument in the demo suite — the React version requires a 13-element dependency array and manual value snapshots. **But the comparison code isn't runnable**, so nobody can verify behavioral equivalence.

**Dashboard diff (`dashboard-v1.comb` + `dashboard-v2.comb`):** Best-executed demo. Deliberately structured to show three regression patterns (dependency severed, check removed, node deleted). `CircuitGraph.diffGraphs()` highlights them. **This is the most practically relevant demo** because it demonstrates topology-level regression detection without a test suite.

**async-unsafe.comb:** A 31-line stub. Not a demo. It declares signals and async blocks but demonstrates nothing about boundary detection.

**Unit converter:** Legitimate propagator network demo with `cell` + `constraint` constructs. Shows multi-directional dataflow that React/Solid can't do natively. Convergence check is shallow (everything is `round()`'d).

### Benchmarks — Structurally Unfair

The "topo" baseline in `benchmark.ts` is intentionally naive:
- **Pipeline benchmark** compares raw array loops, not reactive systems. The "correctness" check calls topo "wrong" because immediate writes propagate instantly — but a real framework (SolidJS `batch()`, React `startTransition()`) would handle this correctly.
- **Diamond benchmark** uses a naive topo that fires the leaf node once per intermediate, causing O(width^2) recomputation. A real framework with batching would coalesce to one recomputation.
- **The explainer text admits 2-6x overhead** and handwaves it as "imperceptible at UI timescales" without proving it.

The honest framing would be: "DES provides correctness guarantees *by default* that frameworks require opt-in primitives (`batch()`, `startTransition()`) to achieve." That's still a real argument, but weaker than "frameworks can't do this."

The **fast-path optimization** in `signals.ts` (lines 87-95) is smart — when there's only one pending computation and no deferred writes, it skips delta cycle machinery. This collapses linear chains from O(N) delta cycles to O(1). Good engineering.

### What Actually Improved (Summary)

| Area | Before Review | After | Real? |
|---|---|---|---|
| Waveform zoom/pan/scroll | Absent | Works well | Yes |
| Waveform markers with delta | Absent | Dual markers, delta display | Yes |
| Waveform pattern search | Absent | Single-signal predicates | Partial |
| Graph diff CLI | Absent | `comb diff` works | Yes |
| Dashboard diff demo | Absent | Best demo in the suite | Yes |
| CDC async warnings | Absent | 3 warning types | Partial (shallow) |
| Coverage collector | Absent | Data structures exist | No (dead API) |
| Bus protocol demo | Absent | Legitimate DES showcase | Yes (mislabeled) |
| Fast-path optimization | Absent | Single-computation bypass | Yes |
| Benchmarks | Absent | 5 categories | Misleading (unfair baselines) |

### What's Still Missing (Ranked by Impact)

1. **Coverage compiler instrumentation.** The coverage system cannot work until the compiler emits `recordTransition()` / `recordCross()` calls. This is the #1 gap between "skeleton" and "working system."
2. **Cross-signal correlation in waveform viewer.** The feature that would make waveform debugging actually better than `console.log` for complex flows.
3. **Transitive async taint in CDC analysis.** Without data-flow tracking, the async boundary warnings are grep-level, not analysis-level.
4. **Runnable framework comparisons.** The bus-protocol React/Solid/Svelte code is string literals. Nobody can verify the behavioral claims. Running all four side-by-side would be the most compelling proof of the DES thesis.
5. **Fair benchmarks.** Use SolidJS's actual `batch()` as the topo baseline, not a naive immediate-write loop.
6. **Dead code detection / undriven signals.** Low-hanging fruit given the existing infrastructure.

---

## Open Questions for Further Investigation

- [x] Can `__graph` diffing catch real regressions? **Yes — dashboard-v1/v2 demo proves this works.**
- [ ] What's the minimal viable CDC-style analyzer? Current pattern matching is a start but needs transitive taint and CFG.
- [ ] Could we intercept React Compiler's reactive scope output via a Babel plugin to emit `__graph`?
- [ ] Surfer's WCP (Waveform Control Protocol) — could we adapt this for a UI signal waveform viewer?
- [ ] SVA sequence operators mapped to UI interactions — what's the right TypeScript API surface?
- [ ] Is there a market for `__graph`-style topology diffing as a standalone tool? Who would pay for this?
- [ ] Can we prototype toggle coverage as a SolidJS devtools plugin?
- [ ] fast-check + coverage-driven steering: what would the integration look like?
- [ ] Can the coverage compiler emit instrumentation without bloating the generated code?
- [ ] Would running the bus-protocol demo in React/Solid alongside Comb prove behavioral equivalence?
