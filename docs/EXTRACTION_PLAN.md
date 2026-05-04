# Veriscope Extraction Plan

**Veriscope** — HDL-grade observability for reactive UI. Named from *verification* + *oscilloscope*. The concept: your UI is the **device under test (DUT)**, and Veriscope is the tooling that probes, visualizes, and verifies it.

How to slice Comb's working pieces into `@veriscope/*` — a framework-agnostic TypeScript library that provides HDL-grade observability, testing, and debugging for reactive UI code.

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
| Temporal assertions | Working | `createTemporalAssert(trigger, operator, property, {duration})` — duration is tick-based (simulation ticks, not wall-clock) |
| Auto-test (graph-directed) | Working (shallow) | Reads `__graph`, finds bounded signals, drives through state space |
| CDC async boundary analysis | Working (pattern-level) | Transitive taint through comb chains. `src/core/verify.ts` |
| SSR | Working | `renderToString()` with DOM shim. 12/12 tests pass |

## What Veriscope Builds Beyond Comb

Comb proved the concepts. Veriscope productizes them for the broader ecosystem:

| Comb | Veriscope |
|---|---|
| `.comb` DSL required | Works with React/Solid/Vue/vanilla JS via Signal<T> wrappers |
| Forward-only auto-test (drive and observe) | Backward graph solving (trace from assertions to inputs) + observational truth tables + fn.toString() parsing |
| Coverage exists but partially wired | Coverage fully integrated: toggle, FSM, cross — with reporters, CI thresholds, Vitest plugin |
| Waveform viewer (basic) | Full waveform with cross-signal correlation, persistence, export, keyboard shortcuts |
| No mutation testing | Graph-level mutation testing validates assertion sufficiency |
| Temporal assertions use tick counts | Same — tick-based, deterministic, no wall-clock dependency |

## The Product: Six Packages

### Package 1: `@veriscope/graph` — Reactive Dependency Graph

**What it is:** The foundation layer. Builds an introspectable dependency graph from any reactive framework's primitives — signals become nodes, dep arrays become edges, effects become leaf nodes. The graph records all state changes over time (waveform data), supports diffing between snapshots, and emits a typed event stream.

**What you get:**
- Typed node registration with metadata (name, module, type, deps, value bounds)
- Edge tracking (which signal feeds which derived value, which effect depends on which signals)
- Graph snapshot as serializable JSON (the `__graph` concept) — exportable, diffable, CI-checkable
- Graph diffing between two snapshots (`diffGraphs`) — "your refactor removed the edge from userProfile to dashboardTitle"
- Event stream (signal-change, comb-recompute, effect-run, assertion-failed) with subscriber API
- Waveform recording (timestamped signal value history with configurable buffer size)
- Graph queries: find all upstream dependencies of a node, find all downstream consumers, find roots (zero in-edges), find leaves (zero out-edges)

**Source to extract from Comb:**
- `src/runtime/circuit.ts` — `CircuitGraph` class (430 lines, the graph data structure)
- The `registerNode`, `setNodeValue`, `notifyChange`, `getWaveformData`, `diffGraphs` methods
- The event buffer and listener system
- The `verifyGraph` method (detect static nodes not registered at runtime)

**The discipline model: explicit declaration, no magic.**

Veriscope rewards writing disciplined code. You use tracked hooks instead of bare hooks. You declare your signals, your derived values, your assertions. The tooling works because you gave it structure — same as hardware engineers writing proper signal declarations with proper sensitivity lists. There is no auto-instrumentation, no Babel plugin, no magic inference. The discipline IS the product.

This means Veriscope is for new code (or intentional rewrites), not for sprinkling onto existing messy codebases. That's fine — the value proposition is "write your next component with Veriscope hooks, and never write a test case for it."

**The Signal object API:**

All framework adapters return `Signal<T>` objects — `.val` to read, `.set()` to write. This is the same pattern as SolidJS signals, Vue `ref()`, and the TC39 Signals proposal. Signal objects in dep arrays enable automatic edge tracing — no string-based dep names, no redundancy, type-safe, refactoring-safe.

```ts
// React adapter
import { useSignal, useDerived, useTrackedEffect, useEdgeEffect } from '@veriscope/react'

// Signals: .val to read, .set() to write
const loading = useSignal(false, 'loading')
const error = useSignal<string | null>(null, 'error')
const phase = useSignal('idle', 'phase', { states: ['idle', 'loading', 'error', 'success'] })

// Derived values: signal objects in dep array → edges traced automatically
const canSubmit = useDerived(
  () => !loading.val && phase.val === 'idle',
  [loading, phase],   // Signal objects, not values — Veriscope reads .nodeId for graph edges
  'canSubmit'
)

// Effects: same pattern
useTrackedEffect(
  () => { if (loading.val) analytics.track('load-start') },
  [loading],
  'analytics-effect'
)

// Edge-triggered effects
useEdgeEffect(loading, 'negedge', () => showToast('Done!'), 'loading-complete')

// JSX: .val to read, .set() to write
return (
  <button onClick={() => phase.set('loading')} disabled={!canSubmit.val}>
    {loading.val ? 'Submitting...' : 'Submit'}
  </button>
)
```

```ts
// Solid adapter — same Signal<T> object, wired to Solid's reactivity
import { useSignal, useDerived } from '@veriscope/solid'

const count = useSignal(0, 'count')
const doubled = useDerived(() => count.val * 2, [count], 'doubled')
```

```ts
// Vanilla JS — same Signal<T>, standalone reactivity
import { createSignal, createDerived } from '@veriscope/graph'

const count = createSignal(0, 'count')
const doubled = createDerived(() => count.val * 2, [count], 'doubled')
count.set(5)  // doubled.val is now 10
```

```ts
// TC39 Signals (future) — same Signal<T> wrapping the standard primitive
import { trackSignal } from '@veriscope/tc39'

const count = trackSignal(new Signal.State(0), 'count')
```

**How the Signal<T> type works internally:**

```ts
interface ReadonlySignal<T> {
  readonly val: T           // current value (getter)
  readonly nodeId: string   // graph node identifier
  readonly name: string     // declared name
}

interface Signal<T> extends ReadonlySignal<T> {
  set(next: T): void        // update value (setter)
}
```

`useSignal` returns `Signal<T>` (readable + writable). `useDerived` returns `ReadonlySignal<T>` (readable only — calling `.set()` on a derived value would bypass the dependency graph, so it's not exposed). TypeScript enforces this at compile time.

**React adapter implementation detail — stale closure avoidance:**

In React, `useSignal` internally uses `useState`. The Signal object is created once (via `useMemo`) but `.val` must return the CURRENT render's value, not the stale closure from the first render. The adapter uses a ref to bridge:

```ts
function useSignal<T>(initial: T, name: string, opts?: SignalOpts): Signal<T> {
  const [value, setValue] = useState(initial)
  const valueRef = useRef(value)
  valueRef.current = value  // updated every render
  
  const nodeId = useRef(graph.registerNode({ name, type: 'signal', ...opts })).current
  
  const signal = useMemo(() => ({
    get val() { return valueRef.current },  // always reads current render value
    set: (next: T) => {
      const old = valueRef.current
      graph.openTick()
      setValue(typeof next === 'function' ? next : () => next)
      graph.notifyChange(nodeId, old, next)
    },
    nodeId,
    name,
  }), [])
  
  useEffect(() => () => graph.disposeNode(nodeId), [])  // cleanup on unmount
  
  return signal
}
```

**React adapter implementation detail — `useDerived` bridges two worlds:**

`useDerived` receives Signal objects in the dep array. It uses them for TWO purposes:
1. Read `.nodeId` to register graph edges (done once on mount)
2. Read `.val` to extract current values for React's `useMemo` comparison (done every render)

React's `useMemo` needs VALUES (not signal objects) in its dep array for shallow comparison. Signal objects are reference-stable and would never trigger recomputation. So the adapter extracts values:

```ts
function useDerived<T>(fn: () => T, deps: Signal<any>[], name: string): ReadonlySignal<T> {
  const nodeId = useRef(graph.registerNode({ name, type: 'derived' })).current
  const resultRef = useRef<T>(undefined as T)
  const prevRef = useRef<T>(undefined as T)
  
  // Register graph edges (once)
  useEffect(() => {
    deps.forEach(d => graph.addEdge(d.nodeId, nodeId))
    return () => graph.disposeNode(nodeId)
  }, [])
  
  // Extract current values for React's comparison
  const values = deps.map(d => d.val)
  const newResult = useMemo(fn, values)
  if (!Object.is(newResult, resultRef.current)) {
    prevRef.current = resultRef.current
    resultRef.current = newResult
    graph.notifyChange(nodeId, prevRef.current, newResult)
  }
  
  return useMemo(() => ({
    get val() { return resultRef.current },
    nodeId,
    name,
  }), [])
}
```

The dep array serves both purposes: Signal objects for graph edges, `.val` extraction for React reactivity. The user passes signal objects once; the adapter handles both needs internally.

**Framework adapter matrix:**

| Framework | Adapter | Edge extraction |
|---|---|---|
| **React** | `useSignal`, `useDerived`, `useTrackedEffect`, `useEdgeEffect` | Signal objects in dep array → `.nodeId` read for edges |
| **Solid** | Same API names, wired to `createSignal`/`createMemo` | Same — Solid also auto-tracks reads, so edges are doubly confirmed |
| **Vue 3** | `useSignal` wraps `ref()`, `useDerived` wraps `computed()` | Signal objects in dep array |
| **Svelte 5** | `useSignal` wraps `$state` runes (requires preprocessor) or `writable()` stores (Svelte 4 compat) | Signal objects in dep array |
| **Vanilla JS** | `createSignal`, `createDerived` from core `@veriscope/graph` | Signal objects in dep array |
| **TC39 Signals** | `trackSignal` wraps `Signal.State`/`Signal.Computed` | Signal objects in dep array |

**Component lifecycle and cleanup:**

When a React component unmounts, all signals and assertions created within it must be disposed. The `useSignal` implementation shown above already handles this — the `useEffect` cleanup on line 177 calls `graph.disposeNode(nodeId)` on unmount.

`graph.disposeNode()`:
- Removes the node and its edges from the graph
- Marks the waveform trace with an "end" marker (the viewer shows the signal's lifetime)
- Cancels any pending temporal assertions that reference this signal (status → "disposed", not "violated")
- Frees the signal from the coverage collector

For re-mounting (e.g., conditional rendering), a new signal with the same name gets a fresh node. The waveform shows both lifetimes as separate traces.

**Multiple component instances:**

When the same component renders multiple times, signal names collide. The adapter disambiguates with an auto-incrementing instance suffix:

```tsx
// First <CheckoutForm> → signals: CheckoutForm.loading, CheckoutForm.error
// Second <CheckoutForm> → signals: CheckoutForm:2.loading, CheckoutForm:2.error
```

The adapter tracks instance counts per component name using a module-level counter. Alternatively, the user can provide an explicit scope:

```tsx
function CheckoutForm({ id }: { id: string }) {
  const loading = useSignal(false, 'loading', { scope: `checkout-${id}` })
  // → node name: checkout-abc.loading
}
```

Explicit scope overrides the auto-suffix. The graph, waveform, and explorer all use the scoped name.

**The "tick" model:**

A **tick** = one settling cycle: one or more signal changes → all downstream derived values recompute → all triggered effects run → system is quiescent. Multiple signal changes in the same synchronous handler are ONE tick.

The graph tracks ticks via explicit bracketing:

```ts
// Inside the adapter's signal setter:
signal.set = (next: T) => {
  graph.openTick()          // starts a tick if one isn't already open
  // ... update value, notify graph ...
}

// The tick auto-closes on the next microtask:
graph.openTick = () => {
  if (!this.tickOpen) {
    this.tickOpen = true
    this.currentTick++
    queueMicrotask(() => {
      this.tickOpen = false
      this.flushTickEnd()   // notify assertions, record tick boundary in waveform
    })
  }
}
```

This means: all signal changes in the same synchronous call stack (same event handler, same `batch()`) share one tick number. When the microtask queue drains (React has flushed its batch), the tick closes. Derived values that update during the settling are part of the same tick.

Framework mapping:
- **React:** `onClick` handler calls `loading.set(true)` and `submitted.set(true)` → both are tick N. React batches the render. Effects run. Microtask drains → tick N closes.
- **Solid:** Same — synchronous propagation happens within the tick. Tick closes on microtask.
- **Promise resolution:** `fetch().then(response => { loading.set(false); data.set(response) })` — the `.then` callback runs in a new microtask → new tick (N+1). This is how `eventually` assertions detect async boundaries: the trigger was tick N, the resolution is tick N+M.

**Two modes:**

- **Runtime mode** (default): `openTick()` uses `queueMicrotask()` to auto-close. Correct for normal app execution where multiple `signal.set()` calls in the same event handler should be one tick.
- **Test mode**: `graph.enterTestMode()` disables microtask auto-closing. Ticks are opened and closed explicitly. The explorer calls `graph.openTick()` before driving signals and `graph.closeTick()` after each step. Framework adapters provide a `flush()` function — React's wraps `act()`, Solid's is synchronous (no-op), Svelte's calls `tick()`. This makes exploration fully deterministic — no microtask timing, no wall-clock dependency.

All assertions count **ticks**, not wall-clock time. `eventually` with `{ withinTicks: 5 }` means "the property must become true within 5 tick closings." Same inputs → same tick count → same pass/fail on any machine at any speed.

The ONLY place wall-clock time appears is the optional `devWatchdogMs` on temporal assertions — a dev-mode-only UX hint ("this spinner has been up too long") that has no effect in test/explore mode.

```ts
// Inside explore():
for (const step of explorationSteps) {
  await act(() => {
    step.signal.set(step.value)  // drives the signal
  })
  // Tick is now closed. All derived values updated. All effects ran.
  graph.checkAssertions()        // check immediately/always/never assertions
  graph.recordCoverage()         // update toggle/FSM/cross coverage
}
```

Every tick gets an incrementing sequence number. Assertions and coverage reference ticks, not wall-clock time. This makes everything deterministic.

**Graph persistence and CI diffing:**

```ts
// Export graph snapshot to JSON (in a test or build script):
import { graph } from '@veriscope/graph'
fs.writeFileSync('graph.json', JSON.stringify(graph.snapshot()))
```

```bash
# Diff two snapshots in CI:
npx veriscope diff graph-main.json graph-pr.json
# Output:
#   Removed edge: userProfile → dashboardTitle
#   Added node: newFeatureFlag (signal, boolean)
#   Changed node: cartTotal (comb → signal) ← was derived, now manual
```

This is the `__graph` CI diffing concept. A GitHub Action could comment on PRs with topology changes, same way codecov comments with coverage changes.

**Edge-triggered effects (posedge/negedge):**

Extracted from Comb's `createEdgeEffect`. Fires a callback on signal transitions, not on every change. Eliminates the 5-line `useRef` + `useEffect` + previous-value-tracking boilerplate:

```ts
import { useEdgeEffect } from '@veriscope/react'

// Fire when loading transitions from true → false (negedge)
useEdgeEffect(loading, 'negedge', () => {
  showToast('Loading complete')
}, 'loading-complete')

// Fire when error transitions from null → non-null (posedge)
useEdgeEffect(error, 'posedge', () => {
  logError(error)
}, 'error-occurred')
```

**Assertion discovery:**

Assertions register as graph nodes, just like signals and derived values. When the user calls `assertAlways(checkFn, 'name')`, the assertion:
1. Registers a node in the graph: `graph.registerNode({ name, type: 'assertion', kind: 'always' })`
2. Runs `checkFn()` once in a tracking context to discover dependencies (same auto-tracking as derived values)
3. Stores the check function on the node: `graph.setAssertionFn(nodeId, checkFn)`
4. Edges are created from dependencies to the assertion node

The explorer discovers assertions via `graph.getAssertions()` — returns all assertion nodes with their check functions, dependency edges, and metadata (kind, trigger signal for temporal assertions). For each assertion, the explorer traces backward through edges to find which root signals affect it, then drives those inputs adversarially.

This is the same mechanism Comb uses: `createTemporalAssert` registers as an `'effect'` node with edges from its trigger and property dependencies.

**CDC async boundary warnings (runtime):**

Ported from Comb's `verify.ts` analysis, running at runtime instead of compile time. When a derived value (useDerived) recomputes and reads a signal that was last set from an async context (Promise callback, setTimeout, etc.), and the derived value doesn't also read a guard signal (like `loading`), emit a dev-mode warning:

> "derived value 'display' reads 'data' which was set asynchronously — consider guarding with a loading check"

The graph tracks which signals were last set in a sync vs. async context (detected from the JavaScript execution context at the time of the setter call). Derived values that read async-set signals without also reading a sync guard signal are flagged.

Less precise than Comb's static analysis but catches the common case and requires zero compiler infrastructure. Warnings show in the devtools assertion panel.

**Size estimate:** ~500 lines core graph + ~100 lines per adapter + ~50 lines edge effects + ~100 lines CDC warnings + ~150 lines CLI.

### Package 2: `@veriscope/coverage` — Reactive State Coverage

**What it is:** Coverage metrics that no existing tool provides. Plugs into `@veriscope/graph`.

**Coverage types:**

1. **Toggle coverage:** Has every boolean signal been both true and false? Catches `isLoading` that's set to true but never back to false (bug) or never set to true (dead feature). Runtime hooks on signal/comb/cell write paths call `recordToggle()` automatically.

2. **FSM transition coverage:** For enum/bounded signals, which state transitions have been exercised? "Of the 12 possible transitions in the checkout flow, 4 have never been tested." Runtime hooks on signal write paths call `recordTransition()` for enum-typed signals automatically.

3. **Cross coverage:** For groups of signals, which value combinations have been observed? "Has {loading=true, error=true} ever occurred?" Supports boolean and enum signals. The explorer registers cross groups from the graph and records observations each tick.

4. **Assertion coverage:** Of all temporal assertions, how many have actually been triggered? An untriggered assertion provides zero verification value. The assertion lifecycle (armed/passed/failed) is tracked per assertion node.

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

### Package 3: `@veriscope/devtools` — HDL-Grade Debugging

**What it is:** A Chrome DevTools panel (like React DevTools — separate tab, doesn't interfere with the app) that provides waveform viewing, graph visualization, assertion monitoring, and coverage display. Also supports a standalone pop-out window for deep debugging sessions.

**Form factor:** Chrome extension that adds a "Veriscope" tab to Chrome DevTools. Communicates with the app via the Chrome DevTools protocol (same as React DevTools). The app includes a tiny bridge script (`@veriscope/devtools/bridge`) that exposes the graph instance to the extension.

Pop-out mode: a button in the DevTools panel opens a full browser tab for the waveform viewer (cramped DevTools panels are insufficient for serious multi-signal debugging with 20+ signals).

**Component 1: Waveform Viewer**

Canvas-based signal timeline. The primary debugging tool — this is what makes a developer say "I can SEE what happened."

Required features (from GTKWave/Surfer research):
- Zoom (mouse wheel with anchor at cursor), pan (click-drag), vertical scroll
- Signal hierarchy grouped by component/module, collapsible groups
- Dual markers (A and B) with delta measurement — "450ms between submit and toast"
- Marker snap-to-nearest-edge — click near a signal transition, marker lands exactly on it
- Compound search: `loading rises AND error == null` (AND/OR/WITHIN operators)
- **Cross-signal correlation:** "find every time `loading` goes false within 2 ticks of `error` going truthy" — this is the killer feature, the thing you can't do with console.log
- Keyboard shortcuts: +/- zoom, arrow keys pan, Home/End fit, N/P next/prev match
- Analog rendering for numeric signals (line chart), digital for booleans (filled rectangles), labeled blocks for enums
- Per-signal value display at cursor position (not just tooltip — inline in the label column)
- Assertion timeline overlay: show assertion armed/passed/failed as colored regions on the waveform
- Coverage heatmap overlay: signals with low toggle coverage highlighted

Export:
- JSON (full waveform data, reimportable)
- PNG/SVG screenshot
- VCD format (standard waveform format — interoperable with GTKWave/Surfer for power users)

Persistence:
- Save/load view state (zoom level, marker positions, signal visibility, signal ordering) to localStorage
- Remember which signals were visible across page reloads

Source: `src/waveform/` (690 lines) — needs cross-signal correlation, keyboard shortcuts, persistence, export, snap-to-edge. Approximately 2x current code for full feature set.

**Component 2: Circuit Graph Visualizer**

Interactive rendering of the dependency graph. Nodes are signals/combs/effects, edges are dependencies.

Required features:
- Auto-layout (dagre or elk.js for directed graph layout)
- Color coding by node type (signal=blue, comb=green, effect=orange, assertion=red)
- Live value display on nodes (current signal values update in real-time)
- Click a node to highlight its upstream cone (everything it depends on) and downstream cone (everything that depends on it)
- Edge highlighting on hover — trace a dependency chain visually
- Search/filter by signal name
- Coverage overlay: nodes with low coverage dimmed/highlighted
- Diff mode: load two graph snapshots side-by-side, highlight added/removed/changed nodes and edges

Source: `src/visualizer.ts` (330 lines) — needs auto-layout library, live values, cone-of-influence highlighting. Approximately 2x current code.

**Component 3: Assertion Monitor**

Live display of all declared assertions and their status.

Required features:
- List of all `assertAlways`, `assertNever`, `assertAfter` with current status (passing/pending/violated)
- For temporal assertions: show trigger status, tick count since trigger, whether resolution property has been met
- For violated assertions: the signal values at the moment of violation, linkable to the waveform timeline (click to jump to that point in the waveform)
- CDC warnings: show async boundary warnings (from the runtime CDC detection) alongside assertions
- Assertion coverage: which assertions have been triggered vs. never triggered (untriggered assertions provide zero verification value)

**Component 4: Coverage Panel**

Visual display of reactive state coverage.

Required features:
- Toggle coverage: per-signal boolean true/false coverage, displayed as a simple matrix
- FSM transition coverage: state machine diagram with visited transitions highlighted, unvisited transitions dimmed
- Cross coverage: matrix of signal combinations with hit/miss cells
- Summary: overall coverage percentage with breakdown by type
- Integration with waveform: click an uncovered transition to search the waveform for the nearest time that transition ALMOST happened

**Size estimate:** ~3000-4000 lines total across all four components. The waveform viewer alone is ~1500 (current 690 + cross-correlation + keyboard + persistence + export). This is a real UI project.

### Package 4: `@veriscope/test` — Backward Graph Solving for Zero-Test-Case Verification

**What it is:** Reads the dependency graph from `@veriscope/graph`, solves it backwards from derived values and assertions to discover which input combinations matter, generates those combinations, drives them, checks assertions, and reports coverage. The user writes assertions, not test cases.

**The core insight: solve the graph backwards.**

This is backward cone-of-influence analysis — the same technique hardware formal verification uses. Start from the outputs (derived values, assertions), trace back through the graph to find which inputs matter, generate the input combinations that exercise all meaningful states.

**How it works:**

**Step 1: Identify what matters.** Read the graph to find:
- Derived values (combs/memos): `display = loading ? '...' : data`
- Assertions: `assertAlways(() => !(loading.val && error.val))`
- These are the "outputs" — the things whose behavior we want to verify.

**Step 2: Trace backwards to find inputs.** For each output, walk the graph edges backwards:
- `display` depends on `loading` and `data` → these are the inputs that matter for `display`
- The assertion `!(loading.val && error.val)` depends on `loading` and `error` → these are the inputs that matter for this assertion
- Keep tracing: if `loading` is itself derived from other signals, trace further back until you hit root signals (zero incoming edges)
- This naturally scopes exploration: each assertion only cares about its upstream roots (typically 3-10 signals), not the entire graph. A component with 50 signals but where each assertion depends on 5 roots → 2^5 = 32 combos per assertion, not 2^50

**Step 3: Determine meaningful input states.**

Two complementary techniques:

- **Observational (primary):** For boolean inputs, enumerate all 2^N combinations (N≤12 is trivial). Drive each combo, observe the output. The truth table reveals exactly which inputs matter and how. For `canSubmit` with 3 boolean deps → 8 combinations, try all 8. No parsing needed.
- **fn.toString() + Acorn (refinement):** Parse the compute function's source to extract expression structure. For `score.val > threshold.val`, this reveals the comparison operator and identifies boundary values to try (threshold±1). For ternaries, identifies which branch depends on which signal. Falls back to observational if parsing fails.
- **Read tracing:** Run the compute function with Proxy-wrapped signals that log `.val` accesses. If `loading=true` short-circuits and `validated` is never read, the tracer reveals the branch structure. Combined with truth tables, this identifies dead inputs per combo.
- **Adversarial mode:** For assertions like `assertAlways(() => !(loading.val && error.val))`, the explorer specifically tries to BREAK them — drive inputs toward the violation state (`loading=true, error=truthy`).

**Step 4: Generate and drive.** For each meaningful input combination:
- Set the root signals to those values
- Let the graph settle (all derived values recompute)
- Check all assertions
- Record coverage (which signal states were reached, which transitions fired)

**Step 5: Handle async boundaries.** When the explorer encounters a pending `eventually` assertion:
- The `eventually` tells the explorer: "there's an async boundary here — I need to drive a resolution"
- The assertion's property function depends on specific signals (traced via graph edges from the assertion node back to its inputs)
- The explorer resolves the assertion: first attempts fn.toString() + Acorn parsing of the property function to determine what signal values satisfy it; falls back to observational enumeration of upstream signal states
- The assertions + invariants constrain which combinations are valid

**Step 6: Coverage-driven iteration.** After the initial backward-solved pass:
- Check coverage: which signal states were never reached? Which transitions never fired?
- For uncovered states: trace backwards from the uncovered state to find which input combinations would reach it
- Drive those combinations
- Repeat until coverage target met or budget exhausted

**The user's discipline scales the tool's intelligence:**

| User declares | Explorer does |
|---|---|
| Nothing (just tracked signals) | Fuzz root signals with type-appropriate values. Booleans get true/false. Numbers get 0, 1, -1, boundary values. Report what happened. |
| State spaces (`{ states: ['idle', 'loading', 'error'] }`) | Targeted exploration of all declared states. Coverage reports which were reached. |
| Assertions (`assertAlways`, `assertAfter`) | Adversarial exploration — try to break assertions. Backward cone-of-influence from each assertion to find which inputs matter. |
| State spaces + assertions | Full backward graph solving. Combinatorial exploration of input states that exercise all derived value branches. Temporal chain navigation. Complete state space coverage. |

The user is never blocked by "you didn't declare enough." They just get less precise results. We are not in the business of solving the oracle problem — that's the user's job via assertions. We provide the machinery to explore their declared state space and check their declared properties.

**What this replaces:**
- Hand-written Playwright E2E scripts → temporal assertions + exploration
- Hand-written Vitest component tests → auto-derived from backward graph solving
- Manual test case enumeration → combinatorial state space exploration
- "Did I test enough?" → quantified reactive coverage metrics (toggle, FSM, cross)

**What this does NOT replace:**
- Visual regression testing (Chromatic/Percy) — this tests behavior, not appearance
- API contract testing — this tests the UI layer only
- Performance testing — this tests correctness, not speed

**Source to extract from Comb:**
- `src/runtime/autotest.ts` — `runAutoTest()` (188 lines, forward exploration — needs to be extended with backward solving)
- `src/runtime/coverage.ts` — coverage collection infrastructure
- `src/runtime/circuit.ts` — graph traversal (upstream/downstream queries)

**What needs to be built:**

- Backward cone-of-influence analysis: trace from outputs/assertions to inputs via graph edges. For each assertion, identify the set of upstream root signals that can affect it.
- Topology-based input generation: boolean signals → exhaustive (2^N for small N). Declared state spaces → exhaustive combinations. Undeclared non-boolean signals → type-appropriate fuzzing (boundary values for numbers, empty/non-empty for strings/arrays, null/non-null for nullable) steered by coverage toward uncovered states.
- Combinatorial input driver: full combinations for small input sets (≤ ~12 booleans = 4096 combos), coverage-steered sampling for larger sets.
- Assertion adversarial mode: specifically try to reach states where each assertion would fail.
- Eventually-resolution driver: when `eventually` assertion is pending, resolve it in two steps. First, attempt fn.toString() + Acorn parsing of the property function — for `eventually(!loading.val)`, parsing reveals `loading` must become `false`, so set it directly. For `eventually(showSuccess.val || showError.val)`, parsing reveals two disjuncts — try each independently. If parsing fails (complex closure, external function call), fall back to observational: try setting each upstream signal to each possible value until the property is satisfied.
- React `act()` integration: the explorer wraps each signal-driving step in `act()` to ensure React renders and effects settle before checking assertions. Framework adapters provide a `flush()` function — React's is `act()`, Solid's is synchronous (no-op), Svelte's is `tick()`.
- Sequence shrinking: when a violation is found, minimize the input SEQUENCE (not just values). Remove steps from the sequence one at a time and re-check — if the violation still reproduces, the step was unnecessary. Produces the minimal reproducing sequence. This is sequence-level shrinking (like fast-check's stateful testing), not just value-level shrinking.
- Side effect sandboxing: the explorer runs in a test environment. The plan assumes standard test mocking (MSW for fetch, vi.fn() for analytics, etc.). The explorer does not sandbox side effects itself — that's the test environment's job.
- Vitest integration: `explore()` function that returns violations + coverage.

**Solving the JavaScript closure opacity problem:**

JavaScript closures are opaque — you can't inspect the expression structure of `() => !loading.val && validated.val` at runtime via reflection. Four techniques address this, in order of increasing power:

| Technique | How it works | What it reveals | When to use |
|---|---|---|---|
| **Observational (truth tables)** | Drive all input combinations, observe output | Full input→output mapping | Primary strategy. 2^N for N≤12 booleans (4096 combos, trivial). Graph tells us WHICH inputs; truth table tells us HOW they combine. Works with ANY closure including external function calls. |
| **Read tracing** | Intercept `.val` property access during compute fn execution | Which signals were actually read for each input combo (reveals short-circuit branches) | Run alongside truth tables. If `loading=true` short-circuits and `validated` is never read, the tracer reveals that branch structure without parsing. |
| **fn.toString() + Acorn** | ES2018 mandates `fn.toString()` returns exact source. Parse with Acorn at runtime (~50KB, microsecond parse time). Walk AST for `.val` MemberExpression nodes. | Full expression structure: AND/OR/NOT/ternary/comparison operators, which signals in which branches | Refinement for numeric signals: find comparison boundaries (`score.val > threshold.val` → try threshold±1). Also identifies dead branches to prune search space. Only works on non-minified code (dev/test mode only — fine). |
| **Babel plugin metadata** | Transform at compile time. Babel sees the full AST of the compute function. Emit structural metadata alongside: `__DUT_META__.canSubmit = { structure: 'AND(NOT(loading), validated)' }` | Richest analysis. Survives minification. Same approach React Compiler uses (classifies expressions as Static/Reactive/Derived). | Optional build-time integration. Most powerful but requires opt-in. |

The observational approach is the **primary strategy** because it requires zero parsing infrastructure and works with any JavaScript — even closures that call external functions, access object properties, or use complex logic. The graph gives us the dep array (which signals to drive), and the truth table gives us the behavior (which combos produce which outputs). Combined with read tracing (which reveals short-circuit paths), this covers ~90% of real-world derived values.

fn.toString() + Acorn is the **refinement** for cases where we need expression structure — primarily for numeric comparison boundaries and for generating more targeted inputs than exhaustive enumeration.

The Babel plugin is the **power user** path for teams that want richest analysis and integration with their build pipeline.

**Integration with interaction-level testing:**

Signal-level exploration (drive signals directly) is the primary mode — headless, fast, finds logic bugs in the reactive graph.

Interaction-level exploration (click buttons, type text) is the secondary mode for integration testing:
- The graph knows which signals are roots (external inputs)
- The user can optionally annotate how to trigger a root: `useSignal(false, 'submitted', { trigger: { element: 'button[type=submit]', action: 'click' } })`
- Or the explorer discovers it: drive a random interaction, observe which signals change, build the mapping
- Once the mapping exists, the explorer can drive interactions instead of raw signal writes
- This runs in Vitest browser mode or Playwright

Both modes compose: interaction-level finds the interaction→signal mapping, signal-level does deep combinatorial exploration of the discovered state space.

**Example:**

```ts
// checkout.test.ts
import { explore } from '@veriscope/test'
import { graph } from '@veriscope/graph'

test('checkout flow is correct', async () => {
  render(<CheckoutForm />)

  const result = explore(graph, {
    budget: 1000,
    // No test cases. Assertions declared in the component ARE the spec.
    // The explorer solves the graph backwards to find which inputs matter.
  })

  // Did any assertion get violated?
  expect(result.violations).toHaveLength(0)

  // Did we exercise enough of the state space?
  expect(result.coverage.toggle).toBeGreaterThan(0.9)
  expect(result.coverage.transitions).toBeGreaterThan(0.8)
  expect(result.coverage.cross).toBeGreaterThan(0.7)

  // If a violation was found, result.violations[0] contains:
  // - which assertion failed
  // - the exact sequence of signal changes that triggered it
  // - minimal reproducing sequence (shrunk)
  // - the full waveform trace leading to the violation
})
```

### Assertion API Reference

Three assertion functions. Unambiguous signatures. No overloads.

**`assertAlways(checkFn, name)` — Invariant. Checked every tick.**

```ts
assertAlways(() => score.val >= 0, 'score-non-negative')
assertAlways(() => !(loading.val && error.val), 'loading-error-mutex')
```

Checked after every tick settles. If `checkFn()` returns false, the assertion is violated. Violation includes: tick number, signal values at violation time, name.

**`assertNever(checkFn, name)` — Forbidden state. Checked every tick.**

```ts
assertNever(() => phase.val === 'submitted' && !validated.val, 'no-unvalidated-submit')
```

Syntactic sugar for `assertAlways(() => !checkFn())`. Reads better for "this should never happen" properties.

**`assertAfter(signal, edge, operator, checkFn, options)` — Temporal. Triggered by a signal edge.**

```ts
// First arg: a Signal object (not a function)
// Second arg: 'posedge' | 'negedge' (which transition to watch)
// Third arg: 'immediately' | 'eventually' | { withinTicks: N }
// Fourth arg: the property to check after the trigger fires

// "When submitted goes true, loading must be true in the SAME tick"
assertAfter(submitted, 'posedge', 'immediately', () => loading.val, {
  name: 'submit-starts-loading'
})

// "When loading goes true, it must EVENTUALLY go false (async boundary)"
assertAfter(loading, 'posedge', 'eventually', () => !loading.val, {
  name: 'loading-resolves'
})

// "When loading goes false, toast must appear in the same tick"
assertAfter(loading, 'negedge', 'immediately', () => toastVisible.val, {
  name: 'response-shows-toast'
})

// "When phase becomes 'error', error message must appear within 2 ticks"
assertAfter(phase, 'posedge', { withinTicks: 2 }, () => errorVisible.val, {
  name: 'error-shows-message',
  edgeValue: 'error'  // only trigger when phase transitions TO 'error', not any posedge
})
```

**Why signal + edge, not function trigger:**
- Unambiguous: the system watches ONE signal for ONE transition type. No "whose edge?" confusion.
- The explorer knows exactly which signal to drive to trigger the assertion.
- Maps directly to Comb's `always @(posedge signal)` and HDL's `$rose(signal)`.

**For compound triggers** (e.g., "when score exceeds 100"), create a derived signal:

```ts
const highScore = useDerived(() => score.val > 100, [score], 'highScore')
assertAfter(highScore, 'posedge', 'eventually', () => congratsVisible.val, {
  name: 'high-score-congrats'
})
```

This is explicit and traceable — the graph has an edge from `score` to `highScore`, and the assertion watches `highScore`. The explorer traces back through the graph: to trigger `highScore` posedge, it needs `score > 100`.

**Temporal operators:**

| Operator | Meaning | Use case |
|---|---|---|
| `'immediately'` | Property must be true in the SAME tick as the trigger | Synchronous consequences (submit → loading) |
| `{ withinTicks: N }` | Property must become true within N ticks of the trigger | Known propagation depth |
| `'eventually'` | Property must become true at SOME point after the trigger, no bound | Async boundaries (loading → eventually !loading). The explorer drives resolutions. In dev mode, a configurable watchdog warns after prolonged pending (e.g., 30s wall-clock) but this is a UX hint, not the assertion semantics. |

**No `setTimeout` anywhere in the assertion system.** Ticks are deterministic — same inputs → same tick count → same pass/fail regardless of machine speed.

**Wall-clock mode** is available ONLY for dev-mode monitoring (not testing):
```ts
assertAfter(loading, 'posedge', 'eventually', () => !loading.val, {
  name: 'loading-resolves',
  devWatchdogMs: 10000  // in dev mode only: warn if still pending after 10s wall-clock
})
```

`devWatchdogMs` has no effect in test/explore mode. It's purely a dev UX hint for "this spinner has been up too long."

**What to extract from Comb:** `createTemporalAssert` in `signals.ts` supports tick-based assertions (added in commit 1a776cd). The extracted version renames to `assertAfter` with the signal+edge signature. `assertAlways`/`assertNever` extract from Comb's `assert` declaration codegen.

---

## How This Actually Gets Published

### npm package structure

```
@veriscope/graph          # core: CircuitGraph, waveform recording, diffing, assertions
@veriscope/react          # adapter: useSignal, useDerived, useTrackedEffect, useEdgeEffect
@veriscope/solid          # adapter: same API, wired to Solid's reactivity
@veriscope/devtools       # waveform viewer, graph visualizer, coverage display
@veriscope/coverage       # toggle/FSM/cross coverage collector + reporters
@veriscope/test           # graph-directed exploration, assertion-based verification
@veriscope/mutate         # graph-level mutation testing for assertion validation
```

### How to publish

```bash
# Each package is a directory with its own package.json
# Use tsup (simplest TS→JS bundler) for compilation
# npm workspaces for monorepo management

veriscope/
├── packages/
│   ├── graph/          # @veriscope/graph
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── react/          # @veriscope/react
│   ├── solid/          # @veriscope/solid
│   ├── devtools/       # @veriscope/devtools
│   ├── coverage/       # @veriscope/coverage
│   ├── test/           # @veriscope/test
│   └── mutate/         # @veriscope/mutate
├── package.json        # workspace root
└── tsconfig.base.json

# Build all packages:  npm run build (calls tsup in each)
# Publish all:          npm publish --workspaces
# Users install:        npm install @veriscope/graph @veriscope/react
```

Each package compiles TS → JS + `.d.ts` type declarations. Zero runtime dependencies in core. Framework adapters peer-depend on the target framework.

### Framework compatibility

| Framework | Adapter difficulty | How it hooks in |
|---|---|---|
| **React** | Easy | Custom hooks wrapping `useState`/`useMemo`/`useEffect` |
| **Solid** | Easy | Functions wrapping `createSignal`/`createMemo`/`createEffect` |
| **Vue 3** | Medium | Functions wrapping `ref()`/`computed()`/`watch()` |
| **Svelte 5** | Hard | Runes (`$state`) are compiler directives — need preprocessor or use `writable()` stores |
| **Vanilla JS** | None needed | Use `@veriscope/graph` directly |
| **TC39 Signals** | Easy (future) | Wrap `Signal.State`/`Signal.Computed` when standard lands |

Start with React + vanilla. Add Solid and Vue once core is stable. Svelte last (requires compiler integration work).

---

## What the User Actually Experiences

### Step 1: Install (30 seconds)

```bash
npm install @veriscope/graph @veriscope/react @veriscope/devtools
```

### Step 2: Write new components with Veriscope signals (5 minutes)

```tsx
// Before (normal React):
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
const [data, setData] = useState(null)
const display = useMemo(() => loading ? 'Loading...' : data, [loading, data])

// After (Veriscope signals):
import { useSignal, useDerived } from '@veriscope/react'

const loading = useSignal(false, 'loading')
const error = useSignal<string | null>(null, 'error')
const data = useSignal(null, 'data')
const display = useDerived(() => loading.val ? 'Loading...' : data.val, [loading, data], 'display')

// JSX: .val to read, .set() to write
<button onClick={() => loading.set(true)}>{loading.val ? '...' : 'Submit'}</button>
```

Veriscope signals are for new code or intentional rewrites. The discipline of using `.val`/`.set()` is what gives you the graph, the waveform, the coverage, the assertions. No discipline → no tooling. That's the deal.

### Step 3: Install Chrome extension (30 seconds)

Install `@veriscope/devtools` Chrome extension from the Chrome Web Store. Add the bridge to your app:

```tsx
import '@veriscope/devtools/bridge'  // exposes graph instance to Chrome DevTools
```

Open Chrome DevTools → click "Veriscope" tab. You see:
- **Graph tab:** dependency graph of all tracked signals, visualized as a circuit diagram
- **Waveform tab:** signal values over time — interact with your app and watch signals change in real-time
- **Assertions tab:** any temporal assertions and their live status
- **Coverage tab:** which signal states have been exercised

### Step 4: Add assertions instead of test cases (10 minutes)

```tsx
import { assertAlways, assertNever, assertAfter } from '@veriscope/graph'

// Invariants — checked on every tick, zero flakiness
assertAlways(() => !(loading.val && error.val), 'loading-error-mutex')
assertAlways(() => score.val >= 0, 'score-non-negative')
assertNever(() => phase.val === 'submitted' && !validated.val, 'no-unvalidated-submit')

// Temporal — signal + edge + operator, tick-based, deterministic
assertAfter(submitted, 'posedge', 'immediately', () => loading.val, {
  name: 'submit-starts-loading'
})

assertAfter(loading, 'posedge', 'eventually', () => !loading.val, {
  name: 'loading-resolves'
})

assertAfter(loading, 'negedge', 'immediately', () => toastVisible.val, {
  name: 'response-shows-toast'
})
```

These run in dev mode as live monitors (assertion panel shows pass/fail). In test mode, the explorer uses them as the spec AND as navigation hints:
- `'immediately'` → synchronous consequence, check in same tick
- `'eventually'` → async boundary, the explorer needs to drive a resolution
- The trigger signal + edge tells the explorer exactly which signal to drive and which transition to target

### Step 5: Auto-test with zero test cases (the dream)

```ts
// checkout.test.ts
import { explore } from '@veriscope/test'
import { graph } from '@veriscope/graph'

test('checkout flow is correct', async () => {
  render(<CheckoutForm />)

  const result = explore(graph, {
    budget: 1000,
    // No test cases. No Playwright scripts. No manual scenarios.
    // The explorer solves the graph backwards:
    //   1. Reads assertions + derived values to find what matters
    //   2. Traces backward through edges to find which inputs affect them
    //   3. Generates input combinations that exercise all branches
    //   4. Drives them, checks assertions, records coverage
    //   5. When `eventually` assertions are pending, drives resolutions
    //      (simulates async responses with various outcomes)
    //   6. Tries to adversarially break each assertion
  })

  // Did any assertion get violated?
  expect(result.violations).toHaveLength(0)
  
  // Did we exercise enough of the state space?
  expect(result.coverage.toggle).toBeGreaterThan(0.9)     // 90% toggle
  expect(result.coverage.transitions).toBeGreaterThan(0.8) // 80% FSM transitions
  expect(result.coverage.cross).toBeGreaterThan(0.7)       // 70% cross-signal combinations
  
  // If a violation was found, result.violations[0] contains:
  // - which assertion failed
  // - the exact sequence of signal changes that triggered it
  // - minimal reproducing sequence (shrunk)
  // - full waveform trace viewable in @veriscope/devtools
})
```

### Production: zero overhead

```ts
// vite.config.ts — standard production build
export default defineConfig({
  define: { 'import.meta.env.DEV': 'false' }
})
// All @veriscope/* code is gated behind import.meta.env.DEV
// Tree-shaking removes it entirely from production bundle
```

---

## What NOT to Extract

- The `.comb` DSL, compiler, parser, lexer, codegen — the language is the wrong vehicle
- The DES/delta-cycle engine — the correctness gap is too narrow for general use
- The view system — frameworks already have views
- The router — frameworks already have routers
- The SSR system — frameworks already have SSR
- The propagator networks / cells — too niche

## Extraction Priority

All six packages ship. The ordering is about dependencies, not importance.

### Phase 1: `@veriscope/graph` + `@veriscope/react`

The graph is the foundation everything else reads from. React adapter is the first framework target.

**What ships:**
- `CircuitGraph` class with node registration, edge tracking, waveform recording, graph diffing, event stream
- `useSignal`, `useDerived`, `useTrackedEffect`, `useEdgeEffect` hooks for React (Signal object API: `.val` / `.set()`)
- `assertAlways`, `assertNever`, `assertAfter` assertion API with tick-based semantics
- Runtime CDC async boundary warnings
- `veriscope diff` CLI for graph snapshot comparison
- `veriscope snapshot` CLI for capturing graph from a running app
- Vanilla JS adapter (direct `graph.registerNode` API)

**Ship gate:** A real React component (e.g., a checkout form with 5-10 tracked signals, 3 assertions) builds a complete dependency graph, records waveform data, detects an async boundary warning, and the CLI diffs two graph snapshots correctly.

### Phase 2: `@veriscope/devtools`

The debugging UI. Chrome DevTools panel + pop-out window.

**What ships:**
- Chrome extension with "Veriscope" tab in DevTools
- Waveform viewer with zoom/pan/markers/compound search/cross-signal correlation/keyboard shortcuts
- Circuit graph visualizer with live values and cone-of-influence highlighting
- Assertion monitor with live status and violation details
- Bridge script for app ↔ extension communication

**Ship gate:** Open Chrome DevTools on a React app using @veriscope/react. See the dependency graph. See signals changing in the waveform as you interact with the app. Place markers. Search for "loading rises AND error != null". Click a violated assertion and jump to that point in the waveform.

### Phase 3: `@veriscope/coverage`

Reactive state coverage metrics — the thing no other tool provides.

**What ships:**
- Toggle coverage (boolean signals: was it both true and false?)
- FSM transition coverage (enum signals: which state→state transitions were exercised?)
- Cross coverage (signal combinations: which joint states were observed?)
- Assertion coverage (which assertions were actually triggered?)
- JSON/HTML reporter for CI
- Vitest integration (coverage plugin that runs alongside Istanbul)
- Threshold/pass-fail configuration
- Coverage merging across test runs
- Coverage overlay in devtools (waveform heatmap, graph node dimming)

**Ship gate:** Run a Vitest suite against a component with 8 tracked signals. Get a reactive coverage report: "toggle: 87% (isError was never true), transitions: 60% (4 of 10 phase transitions never fired), cross: 45% (loading=true + error=truthy never observed)". CI fails if coverage drops below configured threshold.

### Phase 4: `@veriscope/test`

See Package 4 above for the full backward graph solving design, opacity solutions, and assertion API.

**What ships:**
- Backward cone-of-influence analysis + observational truth tables + fn.toString() parsing + read tracing
- Combinatorial input driver with coverage-steered sampling
- Adversarial assertion testing + eventually-resolution driver
- Sequence shrinking (minimal reproducing input sequence)
- Vitest integration: `explore()` function
- Optional interaction-level exploration (Playwright bridge)

**Ship gate:** `explore()` against a React component with 5 tracked signals and 3 temporal assertions. Zero hand-written test cases. Explorer finds a real bug, produces a minimal reproducing sequence, reports 85%+ reactive coverage, completes in under 10 seconds.

### Phase 5: `@veriscope/mutate` (validates assertions catch bugs)

Ships after `@veriscope/test`. Uses the explorer as a subroutine.

**What ships:**
- Graph-level mutation operators (sever edge, negate boolean, constant-fold, swap edge, skip effect, invert comparison, remove assertion, delay effect)
- Mutation orchestrator: generate mutations from graph structure, apply each, re-explore, report killed/survived
- Actionable feedback: each survived mutation describes the missing assertion
- Vitest integration: `mutate()` function that returns mutation score
- CI mode: fail if mutation score drops below threshold

**Ship gate:** Run `mutate()` against a checkout form with 5 tracked signals, 3 assertions. Generate 50+ mutations. Kill rate >80%. Each survived mutation has an actionable description. Full run completes in under 10 seconds.

### Package 5: `@veriscope/mutate` — Graph-Level Mutation Testing

**What it is:** Validates that your assertions actually catch bugs. Introduces mutations into the reactive graph at runtime, re-runs the explorer, and reports which mutations survived (no assertion caught them). Survived mutations = blind spots in your assertion coverage.

**Why graph-level mutation is different from Stryker:**

Traditional mutation testing (Stryker) mutates source code AST nodes → recompiles → reruns all tests. Slow (minutes to hours for a real codebase). Veriscope has the reactive graph at runtime — mutations are **graph modifications**, not source code changes. No recompilation. Each mutation is a signal/compute wrapper applied and removed in milliseconds.

**Mutation operators (graph-level):**

| Mutation | What it simulates | Implementation |
|---|---|---|
| **Sever edge** | "What if `canSubmit` stopped depending on `validated`?" | Shadow one signal read with a constant inside the compute function. Intercept the `.val` getter to return a fixed value instead of the real one. |
| **Negate boolean** | "What if `loading` was stuck `true`?" | Wrap signal's `.val` getter to return `!value`. |
| **Constant-fold derived** | "What if `displayScore` was always 0?" | Replace compute fn with `() => 0` (or `true`/`false`/`''` depending on type). |
| **Swap edge** | "What if `total` read `subtotal` instead of `grandTotal`?" | Redirect one signal's `.val` to return another signal's value. |
| **Skip effect** | "What if the loading-complete toast never fired?" | Wrap an edge-triggered effect's action with a no-op. |
| **Invert comparison** | "What if `score > threshold` became `score <= threshold`?" | Wrap compute fn: `() => !originalFn()` for boolean-returning functions. |
| **Remove assertion** | "Does anything ELSE catch what this assertion checks?" | Disable one assertion, re-explore, see if other assertions or coverage gaps reveal the problem. |
| **Delay effect** | "What if an effect fired one tick late?" | Queue the effect action to the next tick instead of current. |

**How it works:**

```ts
import { mutate } from '@veriscope/mutate'

const result = mutate(
  () => { render(<MyComponent />); return graph },  // factory: fresh instance per mutation
  { budget: 500, operators: 'all' }
)

// result:
// {
//   total: 87,           // 87 mutations generated from the graph
//   killed: 76,          // 76 caught by assertions
//   survived: 11,        // 11 NOT caught — blind spots
//   score: 87.4,         // mutation score (%)
//   survived: [
//     { mutation: 'sever-edge: userProfile → dashboardTitle',
//       description: 'No assertion covers the dependency from userProfile to dashboardTitle' },
//     { mutation: 'negate: isAdmin',
//       description: 'No assertion checks admin-only UI state' },
//     ...
//   ]
// }
```

**Each survived mutation is actionable.** It tells you exactly which assertion is missing:

- "sever edge: `userProfile → dashboardTitle`" → add `assertAlways(() => dashboardTitle.val.includes(userProfile.val.name), 'title-shows-user')`
- "negate: `isAdmin`" → add `assertAlways(() => isAdmin.val || !adminPanel.val, 'admin-gate')`

**Mutation count is proportional to graph size, not source size.** A typical component has 10-30 graph nodes and 20-50 edges → 50-150 mutations. Each mutation = apply wrapper + re-explore + remove wrapper. If exploration takes 100ms per mutation, full mutation testing takes ~15 seconds. Fast enough for CI.

**State isolation:** `mutate()` takes a factory function that creates a fresh component instance for each mutation. Each mutation gets a fresh render → fresh graph → fresh signals. No state leakage between mutations:

```ts
const result = mutate(
  () => { render(<CheckoutForm />); return graph },  // factory: fresh instance per mutation
  { budget: 500 }
)
```

This is the same pattern Vitest uses for test isolation. The factory re-renders the component, which re-creates all signals and assertions from scratch. The mutation wrapper is applied to the fresh graph, the explorer runs, and the graph is discarded.

**Why this is better than Stryker for reactive code:**

| Dimension | Stryker | @veriscope/mutate |
|---|---|---|
| Mutation target | Source code AST | Reactive graph (runtime) |
| Recompilation | Required per mutation | None — runtime wrappers |
| Speed | Minutes-hours | Seconds |
| Mutation relevance | All AST mutations (many irrelevant) | Only graph-structural mutations (every mutation tests a reactive dependency) |
| Feedback | "Mutation survived" | "Mutation survived — and here's the specific assertion you're missing" |
| Works with | Any test suite | Veriscope assertions specifically |

**Integration with `@veriscope/test`:**

```ts
import { explore } from '@veriscope/test'
import { mutate } from '@veriscope/mutate'

test('checkout flow is well-asserted', async () => {
  render(<CheckoutForm />)

  // Step 1: explore — check assertions pass on correct code
  const exploration = explore(graph, { budget: 1000 })
  expect(exploration.violations).toHaveLength(0)

  // Step 2: mutate — check assertions would catch bugs
  const mutations = mutate(
    () => { render(<CheckoutForm />); return graph },
    { budget: 500 }
  )
  expect(mutations.score).toBeGreaterThan(0.85)  // 85%+ mutation kill rate

  // Step 3: the surviving mutations tell you what to assert next
  if (mutations.survived.length > 0) {
    console.log('Blind spots:', mutations.survived.map(m => m.description))
  }
})
```

**The full verification pyramid:**

```
         ┌─────────────┐
         │   mutate()   │  "Do my assertions catch bugs?"
         │  mutation    │  Mutation score: 87%
         │   score      │
         ├─────────────┤
         │  explore()   │  "Do my assertions pass on correct code?"
         │  assertion   │  Coverage: 95%, 0 violations
         │  checking    │
         ├─────────────┤
         │  coverage    │  "Did I exercise the state space?"
         │  toggle/FSM  │  Toggle: 92%, FSM: 80%, Cross: 70%
         │  /cross      │
         ├─────────────┤
         │   graph      │  "What depends on what?"
         │   diffing    │  Topology unchanged ✓
         └─────────────┘
```

Each layer validates the one above it:
- Graph diffing catches topology changes
- Coverage tells you what was exercised
- Exploration tells you if assertions hold
- Mutation testing tells you if assertions are sufficient

**Source:** No direct Comb source to extract — this is new. But the infrastructure is all there: `@veriscope/graph` provides graph traversal and signal access, `@veriscope/test` provides the explorer, and mutations are just runtime wrappers on Signal<T> objects.

**Size estimate:** ~400-600 lines. Mutation operator implementations (~200 lines), orchestrator (~150 lines), reporter (~100 lines), Vitest integration (~50 lines).

**Ship gate:** Run `mutate()` against a checkout form with 5 tracked signals, 3 assertions. Generate 50+ mutations. Kill rate >80%. Each survived mutation has an actionable description. Full run completes in under 10 seconds.

---

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
