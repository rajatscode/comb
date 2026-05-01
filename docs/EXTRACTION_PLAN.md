# Comb Extraction Plan

How to slice Comb's working pieces into a framework-agnostic TypeScript library that provides HDL-grade observability, testing, and debugging for reactive UI code.

## Why Now

Three things converging:

1. **TC39 Signals proposal** (Stage 1) will standardize `Signal.State` and `Signal.Computed` across Angular, Solid, Vue, Svelte, Preact, Qwik, MobX. When this lands (~2027), every framework's reactivity reduces to the same graph structure. A tool targeting that abstraction works everywhere. In the meantime, framework adapters bridge the gap.

2. **The vibe coding problem is quantified.** LLM-generated code has 1.7x more issues than human code (CodeRabbit, Dec 2025). 86% XSS failure rate (Veracode). 45% of developers say debugging AI code takes longer than writing it themselves. Stale closures and missing dependencies are the #1 LLM failure mode in React. The target user — generates 70%-working code, can't debug the last 30% — is well-documented and growing.

3. **Nobody combines dep graph + coverage + state-trace visualization.** SonarQube catches syntax/style. fast-check-frontend does property-based interaction testing. React DevTools shows the current tree. Nobody connects the reactive dependency graph to test generation, coverage measurement, or temporal debugging. The pieces exist separately; integration is the gap.

## What Comb Has That Actually Works (Audit Results)

170/171 tests pass. These features are real and extractable:

| Feature | Status | How It Works in Comb |
|---|---|---|
| Signal/comb/effect primitives | Working | `createSignal`, `createComb`, `createEffect` in `src/runtime/signals.ts` |
| Circuit graph (auto-built) | Working | Nodes register as signals/combs are created. Edges from deps. `src/runtime/circuit.ts` |
| Coverage (toggle + FSM transition) | Working | Runtime hooks in signal write/update paths. `src/runtime/coverage.ts` |
| Waveform recording | Working | `circuit.startRecording()` records signal values over time with timestamps |
| Waveform viewer | Working (basic) | Zoom/pan/markers/compound search. `src/waveform/` |
| Graph diffing | Working | `CircuitGraph.diffGraphs(a, b)` detects added/removed/changed nodes and edges |
| Edge-triggered effects | Working | `createEdgeEffect(valueFn, 'posedge'/'negedge', action)` |
| Temporal assertions | Working | `createTemporalAssert(trigger, operator, property, {duration})` |
| Auto-test (graph-directed) | Working (shallow) | Reads `__graph`, finds bounded signals, drives through state space |
| CDC async boundary analysis | Working (pattern-level) | Transitive taint through comb chains. `src/core/verify.ts` |
| SSR | Working | `renderToString()` with DOM shim. 12/12 tests pass |

## What Comb Claims But Doesn't Deliver

| Claim | Reality |
|---|---|
| "3 coverage types" | Toggle works. FSM transition + cross coverage are dead APIs with zero automated callers |
| "CDC-style analysis" | Pattern matching with transitive taint. No CFG, misses nested async, no data-dependent narrowing |
| "GTKWave-grade waveform" | No cross-signal correlation, no persistence, no keyboard shortcuts, no time-range selection |
| "Graph-directed auto-testing" | Single-variable enumeration, not combinatorial state space exploration |
| "Fair benchmarks" | Batched-topo baseline is a 50-line minimal recreation, not actual SolidJS/Preact code |
| "VS Tetris proves DES" | Game logic is in JS mount file. Comb runtime provides observability, not the game semantics |

## The Product: Three Packages

### Package 1: `@comb/graph` — Reactive Dependency Graph

**What it is:** A lightweight layer that wraps any reactive primitive (React useState, Solid createSignal, Svelte $state, or vanilla signals) and builds an introspectable dependency graph as a side effect.

**What you get:**
- Typed node registration with metadata (name, module, type, deps)
- Edge tracking (which signal feeds which derived value)
- Graph snapshot as serializable JSON (the `__graph` concept)
- Graph diffing between two snapshots (`diffGraphs`)
- Event stream (signal-change, comb-recompute, effect-run, assertion-failed)
- Waveform recording (timestamped signal value history)

**Source to extract from Comb:**
- `src/runtime/circuit.ts` — `CircuitGraph` class (the graph data structure)
- The `registerNode`, `setNodeValue`, `notifyChange`, `getWaveformData`, `diffGraphs` methods
- The event buffer and listener system

**Framework adapters (thin wrappers):**

```ts
// React adapter
import { useState } from 'react'
import { graph } from '@comb/graph'

function useTrackedState<T>(initial: T, name: string) {
  const [value, setValue] = useState(initial)
  const nodeId = graph.registerNode({ name, type: 'signal' })
  // Track changes, record to waveform, update graph
  const trackedSet = (next: T) => {
    const old = value
    setValue(next)
    graph.notifyChange(nodeId, old, next)
  }
  return [value, trackedSet] as const
}
```

```ts
// Solid adapter
import { createSignal } from 'solid-js'
import { graph } from '@comb/graph'

function createTrackedSignal<T>(initial: T, name: string) {
  const [get, set] = createSignal(initial)
  const nodeId = graph.registerNode({ name, type: 'signal' })
  const trackedSet = (next: T) => {
    const old = get()
    set(next)
    graph.notifyChange(nodeId, old, next)
  }
  return [get, trackedSet] as const
}
```

```ts
// Vanilla / TC39 Signals adapter (future)
import { Signal } from 'signal-polyfill'
import { graph } from '@comb/graph'

function createTrackedSignal<T>(initial: T, name: string) {
  const signal = new Signal.State(initial)
  const nodeId = graph.registerNode({ name, type: 'signal' })
  // Proxy writes to record changes
  // ...
}
```

**Size estimate:** ~400 lines core + ~50 lines per adapter. Comb's `circuit.ts` is 430 lines.

**Zero dependencies.** Framework adapters are peer-deps on the target framework.

### Package 2: `@comb/coverage` — Reactive State Coverage

**What it is:** Coverage metrics that no existing tool provides. Plugs into `@comb/graph`.

**Coverage types:**

1. **Toggle coverage:** Has every boolean signal been both true and false? Catches `isLoading` that's set to true but never back to false (bug) or never set to true (dead feature). Currently works in Comb for boolean signals via runtime hooks.

2. **FSM transition coverage:** For enum/bounded signals, which state transitions have been exercised? "Of the 12 possible transitions in the checkout flow, 4 have never been tested." Currently a dead API in Comb — needs callers wired up.

3. **Cross coverage:** For groups of boolean signals, which combinations have been observed? "Has {loading=true, error=true} ever occurred?" Currently boolean-only and manual in Comb.

4. **Assertion coverage:** Of all temporal assertions, how many have actually been triggered? An untriggered assertion provides zero verification value. Partially exists in Comb.

**Source to extract from Comb:**
- `src/runtime/coverage.ts` — `CoverageCollector` class
- The `recordToggle`, `recordTransition`, `recordCross` methods
- The `getReport` summary

**What needs to be built (not in Comb):**
- Reporter that formats coverage as JSON/HTML for CI
- Vitest/Jest integration (coverage plugin)
- Threshold/pass-fail mechanism
- Cross-coverage for non-boolean signals (enum values, numeric ranges)
- Coverage merging across test runs

**Size estimate:** ~200 lines core (Comb's coverage.ts is 181 lines). ~100 lines for reporter. ~50 lines for test framework integration.

### Package 3: `@comb/devtools` — HDL-Grade Debugging

**What it is:** A browser panel (embeddable or Chrome extension) that provides waveform viewing, graph visualization, and temporal assertion monitoring.

**Components:**

1. **Waveform viewer** — Canvas-based signal timeline. Zoom/pan, markers with delta measurement, compound search (AND/OR/WITHIN). Source: `src/waveform/` (690 lines across 6 files).

2. **Circuit graph visualizer** — Canvas rendering of the dependency graph with typed nodes and edges. Source: `src/visualizer.ts` (330 lines).

3. **Coverage panel** — Shows toggle/FSM/cross coverage with heatmaps.

4. **Assertion monitor** — Shows active temporal assertions and their pass/fail status.

**What needs to be built (not in Comb or incomplete):**
- Cross-signal correlation in waveform search (the killer feature — find where signal A transitions within N ms of signal B)
- Keyboard shortcuts (zoom +/-, pan arrows, Home/End for fit)
- Persistence (save/load view state, export waveform data)
- Marker snap-to-edge
- Chrome extension wrapper
- Embeddable panel mode (for Storybook, custom devtools)

**Size estimate:** ~1500 lines total (Comb's waveform + visualizer are ~1020 lines already).

### Optional: `@comb/test` — Graph-Directed Test Generation

**What it is:** Reads the graph from `@comb/graph` and generates test inputs that exercise the state space.

**What it does:**
- Discovers bounded signals (booleans, enums, bounded ints) from graph metadata
- Identifies root signals (zero incoming edges) as test inputs
- Drives each root through its state space while recording downstream coverage
- Reports which states were never reached

**Source to extract from Comb:**
- `src/runtime/autotest.ts` — `runAutoTest()` function (188 lines)

**What needs to be built:**
- Combinatorial exploration (current implementation is single-variable only)
- Integration with Vitest/Playwright
- Property inference from TypeScript types (a signal typed `boolean` has states `[true, false]`)
- Fast-check integration for constrained random generation targeting uncovered states

**This is the most experimental package.** Ship last, iterate based on feedback.

## What NOT to Extract

- The `.comb` DSL, compiler, parser, lexer, codegen — the language is the wrong vehicle
- The DES/delta-cycle engine — the correctness gap is too narrow for general use
- The view system — frameworks already have views
- The router — frameworks already have routers
- The SSR system — frameworks already have SSR
- The propagator networks / cells — too niche

## Extraction Priority

### Phase 1: `@comb/graph` (most portable, most useful)

The graph is the foundation everything else depends on. Ship it first.

**Minimum viable:**
- `CircuitGraph` class extracted from circuit.ts
- Waveform recording (timestamp + value per signal change)
- `diffGraphs()` for comparing two snapshots
- React adapter (`useTrackedState`, `useTrackedMemo`, `useTrackedEffect`)
- Solid adapter
- Vanilla adapter

**Ship gate:** Works with a real React app. Can record signal changes, build graph, diff two snapshots, export as JSON.

### Phase 2: `@comb/devtools` (most visual, most impressive)

The waveform viewer is the feature that makes people say "I want that."

**Minimum viable:**
- Embeddable panel (not Chrome extension — lower friction)
- Waveform viewer with zoom/pan/markers
- Graph visualizer
- Reads from `@comb/graph` instance

**Ship gate:** Embed in a Storybook story. See signals over time. Place markers. Measure delta between two events.

### Phase 3: `@comb/coverage` (most novel, hardest to get right)

Toggle and FSM coverage are genuinely new metrics. But they need to be wired end-to-end (collect → report → CI) to be useful.

**Minimum viable:**
- Toggle coverage for boolean signals
- FSM transition coverage for enum signals
- JSON report compatible with Vitest coverage reporters
- Threshold/pass-fail for CI

**Ship gate:** Run a Vitest test suite, get a reactive coverage report alongside Istanbul's line coverage. See "signal `isLoading` was never set to false during tests."

### Phase 4: `@comb/test` (highest leverage — zero-test-case UI verification)

The dream: **you write temporal assertions, not test cases.** The tool explores the state space, and assertions are the pass/fail criteria. No Playwright scripts. No manual test scenarios. You declare what should always/eventually/never be true, and the machine finds violations or proves coverage.

**Why this is the highest-leverage piece:**

No existing tool does this. Bombadil fuzzes randomly with no graph awareness. fast-check-frontend generates random interactions but doesn't know the state space. XState's @xstate/graph generates paths but requires manual state machine modeling. The synthesis — graph-aware exploration + coverage-driven steering + temporal assertions as spec — is genuinely novel.

**The architecture (three layers):**

**Layer 1: State space discovery** (exists in Comb, needs expansion)
- Read `@comb/graph` to discover bounded signals (booleans, enums, bounded ints)
- Identify root signals (zero incoming edges) as test inputs
- Identify clock/trigger signals (posedge/negedge sensitivity nodes)
- Infer state bounds from TypeScript types where possible (`isLoading: boolean` → `[true, false]`)
- Source: `src/runtime/autotest.ts` — `runAutoTest()`, but needs combinatorial expansion

**Layer 2: Coverage-driven exploration** (needs to be built)
- Generate random input combinations (fast-check integration for constrained random)
- After each exploration batch, measure reactive coverage (toggle, FSM transition, cross)
- Identify uncovered states/transitions
- Bias next generation toward uncovered regions (the HDL CRV feedback loop)
- Stop when coverage target met or budget exhausted
- This is the piece nobody has built: fast-check's random generation + @comb/coverage's state-space metrics in a feedback loop

**Layer 3: Temporal assertions as the spec** (exists in Comb, needs integration)
- `assert temporal @(posedge submit) eventually(success || error) within 5s` — if exploration finds an input sequence that violates this, that's the bug report
- `assert always (score >= 0)` — invariant checked at every state during exploration
- When a violation is found: produce the minimal reproducing input sequence (fast-check's shrinking)
- When exploration exhausts reachable states without violations: report coverage achieved as confidence metric
- Source: `createTemporalAssert` in signals.ts, but needs to work in headless exploration mode (not just runtime monitoring)

**Integration with interaction-level testing:**
- For real UI testing, the explorer needs to drive *interactions* (click, type, navigate), not just raw signal writes
- Bridge to Playwright/Testing Library: map graph roots to interaction affordances ("signal `isOpen` is toggled by clicking `button.menu-toggle`")
- This mapping could be manual (annotation) or inferred (observe which interactions change which signals during a recording session)

**What this replaces:**
- Hand-written Playwright E2E scripts → temporal assertions + exploration
- Hand-written Vitest component tests → auto-derived from graph + assertions
- Manual test case enumeration → coverage-driven state space search
- "Did I test enough?" → quantified reactive coverage metrics

**What this does NOT replace:**
- Visual regression testing (Chromatic/Percy) — this tests behavior, not appearance
- API contract testing — this tests the UI layer only
- Performance testing — this tests correctness, not speed

**Minimum viable:**
- Headless exploration mode: drive root signals through state space, check assertions, report violations with reproducing sequence
- Coverage report: which signals/transitions were exercised, which weren't
- Integration with Vitest: `import { explore } from '@comb/test'; explore(graph, assertions, { budget: 1000 })`

**Full vision:**
- Coverage-driven steering (fast-check + coverage feedback loop)
- Interaction-level exploration (Playwright bridge)
- Assertion inference from TypeScript types ("this signal is `number` and only set in a handler that increments — assert it never decreases")
- CI mode: fail if reactive coverage drops below threshold or any temporal assertion is violated

**Ship gate:** Run `explore()` against a React component with 5 tracked signals and 3 temporal assertions. Get a coverage report + any violation traces. Zero hand-written test cases.

## Target Users

1. **The vibe coder** who generates 70%-working React/Svelte code with LLMs and can't debug the last 30%. They need: "show me what changed in my dependency graph" and "show me the exact moment this signal went wrong" (waveform).

2. **The senior dev maintaining a complex reactive codebase** who refactors shared state and needs to know: "did my refactor change the dependency topology?" (graph diffing in CI).

3. **The testing-conscious team** that has line coverage but no *reactive* coverage. They need: "which signal states have our tests never exercised?" (toggle/FSM coverage).

## What Makes This Different From Existing Tools

| Tool | What It Does | What It Doesn't Do |
|---|---|---|
| React DevTools | Shows component tree + current props/state | No dependency graph, no history, no coverage |
| SolidJS devtools | Shows reactive graph (immature) | Runtime only, no diffing, no coverage, no waveform |
| Angular Signal Graph | Shows signal dependencies (debug mode) | Runtime only, no CI diffing, no coverage |
| Redux DevTools | Action log + state timeline | Redux only, not signal-based, no graph structure |
| fast-check-frontend | Property-based interaction testing | No graph awareness, no coverage-driven steering |
| Bombadil | LTL-based UI property testing | No graph awareness, fuzzes randomly |
| Istanbul/c8 | Line/branch/function coverage | No reactive state coverage (toggle, FSM, cross) |
| Storybook Test Codegen | Records interactions as tests | Doesn't derive tests from graph structure |

**The gap we fill:** Connect the reactive dependency graph to debugging (waveform), testing (auto-test), and coverage (toggle/FSM) — in one integrated toolkit.

## Risks

1. **TC39 Signals timeline.** If Signals land faster than expected, framework adapters become unnecessary. If they stall, we maintain adapters for 4+ frameworks indefinitely. Mitigation: design the core graph API to be signal-implementation-agnostic.

2. **Adoption friction.** Even a thin wrapper around `useState` is a wrapper. Developers need to opt in per-signal. Mitigation: provide a codemod/babel plugin that auto-wraps existing hooks.

3. **Performance overhead.** Recording every signal change has cost. Mitigation: dev-mode-only by default (like React DevTools). Tree-shake in production.

4. **Framework adapters are maintenance.** React, Solid, Svelte, Vue all have different reactivity APIs. Mitigation: target the minimal intersection (read/write/subscribe) and keep adapters thin (<50 lines each).

5. **The "nice to have" problem.** Developer tooling competes with "just use console.log." Mitigation: the waveform viewer needs to be visibly better than console.log on the first use. Cross-signal correlation is the feature that proves this — you can't do "show me every time isLoading went true within 100ms of fetchError going truthy" with console.log.
