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
| Waveform debugger | Yes (zoom/pan/filter) | No (no persist/export) | **Yes** |
| `__graph` static artifact | Yes | No (no CI) | **Yes** |
| Graph diffing | CLI works, human-readable output | No (no CI integration) | **Yes** |
| Temporal assertions | Yes | No (console.warn only) | Maybe |
| Propagator networks / cells | Yes | Basic | Research interest |
| Type system | Warnings only | No | Needs real type errors |
| SSR | Yes | Basic | Needs hydration |
| Source maps | Yes | Basic | Needs testing |
| Router | Yes | Hash-only | Needs history API |

---

## What's Genuinely Novel (Holds Up Under Scrutiny)

1. **DES as UI execution model.** No web framework uses formal delta cycles. The thesis is sound for simulation-class UIs. Now backed by empirical proof: the pipeline and ring counter demos show side-by-side comparisons where DES produces correct results and topological sort / naive JS does not.
2. **Static `__graph` as build artifact.** No framework emits the dependency graph as a diffable JSON artifact. Enables CI topology diffing, dead code detection, and static analysis.
3. **Auto-derived `__test()` from component definition.** No framework auto-generates a headless test harness from the component source.

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

### NOT real pain points (stop optimizing for these)

- **"Signal graph glitches."** Solved by batching in every modern framework. Nobody ships bugs because of topological sort vs. delta cycles.
- **"Effect ordering is non-deterministic."** Rarely causes bugs in practice. When it does, explicit dependency declaration fixes it without DES.
- **"I need formal temporal assertions in my component."** Nobody has this problem. It's a solution looking for a problem in web UI. (It's a real problem in hardware verification, but that's a different domain.)
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

## Open Questions for Further Investigation

- [ ] Can `__graph` diffing catch real regressions? Need to test with a non-trivial refactor.
- [ ] How does delta cycle performance compare to topological sort at scale? (1000+ signals)
- [ ] Could the `__test()` pattern work as a Svelte preprocessor?
- [ ] Is the propagator network implementation correct for non-trivial constraint systems? (Only tested with simple bidirectional conversions)
- [ ] Does the waveform debugger add value over console.log-based debugging in practice?
- [ ] What's the right integration point for temporal assertions — component-embedded or external testing tool?
- [ ] Is there a market for `__graph`-style topology diffing as a standalone tool? Who would pay for this?
- [ ] Could the DES runtime be offered as a Solid.js-compatible scheduler without changing the API surface?
