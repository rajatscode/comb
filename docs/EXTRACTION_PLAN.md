# DUT Extraction Plan

**DUT: Device Under Test.** The name hardware engineers give to the thing they're verifying.

How to slice Comb's working pieces into `@dut/*` — a framework-agnostic TypeScript library that provides HDL-grade observability, testing, and debugging for reactive UI code. Your UI is the device under test.

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
| Temporal assertions | Working | `createTemporalAssert(trigger, operator, property, {duration})` — duration is wall-clock ms |
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

## The Product: Five Packages

### Package 1: `@dut/graph` — Reactive Dependency Graph

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

DUT rewards writing disciplined code. You use tracked hooks instead of bare hooks. You declare your signals, your derived values, your assertions. The tooling works because you gave it structure — same as hardware engineers writing proper signal declarations with proper sensitivity lists. There is no auto-instrumentation, no Babel plugin, no magic inference. The discipline IS the product.

This means DUT is for new code (or intentional rewrites), not for sprinkling onto existing messy codebases. That's fine — the value proposition is "write your next component with DUT hooks, and never write a test case for it."

**Framework adapters (explicit hooks):**

```ts
// React manual adapter
import { useTrackedState, useTrackedMemo } from '@dut/react'

const [loading, setLoading] = useTrackedState(false, 'loading')
const display = useTrackedMemo(() => loading ? '...' : 'Ready', [loading], 'display')
```

```ts
// Solid adapter
import { createTrackedSignal, createTrackedMemo } from '@dut/solid'

const [count, setCount] = createTrackedSignal(0, 'count')
const doubled = createTrackedMemo(() => count() * 2, 'doubled')
```

```ts
// Vanilla / any framework
import { graph } from '@dut/graph'

const nodeId = graph.registerNode({ name: 'count', module: 'Counter', type: 'signal' })
graph.setNodeValue(nodeId, () => currentCount)
// On change:
graph.notifyChange(nodeId, oldValue, newValue)
```

```ts
// TC39 Signals (future)
import { Signal } from 'signal-polyfill'
import { trackSignal } from '@dut/signals'

const count = trackSignal(new Signal.State(0), 'count')
```

**Framework adapter matrix:**

| Framework | Auto (plugin) | Manual (hooks) | Edge extraction |
|---|---|---|---|
| React | Babel plugin reads dep arrays | `useTrackedState/Memo/Effect` | From `useMemo`/`useEffect` dep arrays |
| Solid | Vite plugin wraps signal calls | `createTrackedSignal/Memo` | Auto-tracked (Solid tracks deps at runtime — we intercept) |
| Vue 3 | Vite plugin wraps ref/computed | `trackedRef`, `trackedComputed` | From `computed` getter reads + `watch` sources |
| Svelte 5 | Svelte preprocessor instruments runes | Use `writable()` stores with manual tracking | Compiler-derived (Svelte knows deps at compile time) |
| Vanilla JS | N/A | Direct `graph.registerNode` API | Manual edge declaration |
| TC39 Signals | Wrap `Signal.State`/`Signal.Computed` | `trackSignal` | Auto-tracked via `Signal.Computed` reads |

**The "tick" model:**

The graph defines a **tick** as one settling cycle: a signal changes → all downstream derived values recompute → all triggered effects run → system is quiescent. This maps to:
- React: one `setState` batch → re-render → effects run (within `act()` in tests)
- Solid: one signal write → synchronous propagation → effects run
- Svelte: one `$state` mutation → compiler-scheduled update → `tick()` resolves

Every tick gets an incrementing sequence number. Assertions and coverage reference ticks, not wall-clock time. This makes everything deterministic.

**Graph persistence and CI diffing:**

```bash
# Export graph snapshot to JSON (in a test or build script):
import { graph } from '@dut/graph'
fs.writeFileSync('graph.json', JSON.stringify(graph.snapshot()))

# Diff two snapshots in CI:
npx dut diff graph-main.json graph-pr.json
# Output:
#   Removed edge: userProfile → dashboardTitle
#   Added node: newFeatureFlag (signal, boolean)
#   Changed node: cartTotal (comb → signal) ← was derived, now manual
```

This is the `__graph` CI diffing concept. A GitHub Action could comment on PRs with topology changes, same way codecov comments with coverage changes.

**Edge-triggered effects (posedge/negedge):**

Extracted from Comb's `createEdgeEffect`. Fires a callback on signal transitions, not on every change. Eliminates the 5-line `useRef` + `useEffect` + previous-value-tracking boilerplate:

```ts
import { useEdgeEffect } from '@dut/react'

// Fire when loading transitions from true → false (negedge)
useEdgeEffect(loading, 'negedge', () => {
  showToast('Loading complete')
}, 'loading-complete')

// Fire when error transitions from null → non-null (posedge)
useEdgeEffect(error, 'posedge', () => {
  logError(error)
}, 'error-occurred')
```

**CDC async boundary warnings (runtime):**

Ported from Comb's `verify.ts` analysis, running at runtime instead of compile time. When a derived value (useTrackedMemo) recomputes and reads a signal that was last set from an async context (Promise callback, setTimeout, etc.), and the derived value doesn't also read a guard signal (like `loading`), emit a dev-mode warning:

> "derived value 'display' reads 'data' which was set asynchronously — consider guarding with a loading check"

The graph tracks which signals were last set in a sync vs. async context (detected from the JavaScript execution context at the time of the setter call). Derived values that read async-set signals without also reading a sync guard signal are flagged.

Less precise than Comb's static analysis but catches the common case and requires zero compiler infrastructure. Warnings show in the devtools assertion panel.

**CI graph diffing CLI:**

```bash
# Export graph snapshot to JSON (in a test or build script):
dut snapshot --output graph.json   # renders app, captures graph, exits

# Diff two snapshots:
dut diff graph-main.json graph-pr.json
# Output:
#   Removed edge: userProfile → dashboardTitle
#   Added node: newFeatureFlag (signal, boolean)
#   Changed node: cartTotal (comb → signal) ← was derived, now manual

# GitHub Action comments on PRs with topology changes
# (like codecov but for reactive topology)
```

The `diffGraphs` algorithm is already implemented and tested in Comb's `circuit.ts`. Package as a standalone CLI.

**Size estimate:** ~500 lines core graph + ~100 lines per adapter + ~50 lines edge effects + ~100 lines CDC warnings + ~150 lines CLI.

### Package 2: `@dut/coverage` — Reactive State Coverage

**What it is:** Coverage metrics that no existing tool provides. Plugs into `@dut/graph`.

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

### Package 3: `@dut/devtools` — HDL-Grade Debugging

**What it is:** A Chrome DevTools panel (like React DevTools — separate tab, doesn't interfere with the app) that provides waveform viewing, graph visualization, assertion monitoring, and coverage display. Also supports a standalone pop-out window for deep debugging sessions.

**Form factor:** Chrome extension that adds a "DUT" tab to Chrome DevTools. Communicates with the app via the Chrome DevTools protocol (same as React DevTools). The app includes a tiny bridge script (`@dut/devtools/bridge`) that exposes the graph instance to the extension.

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
- List of all `assertAlways`, `assertNever`, `assertTemporal` with current status (passing/pending/violated)
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

### Package 4: `@dut/test` — Backward Graph Solving for Zero-Test-Case Verification

**What it is:** Reads the dependency graph from `@dut/graph`, solves it backwards from derived values and assertions to discover which input combinations matter, generates those combinations, drives them, checks assertions, and reports coverage. The user writes assertions, not test cases.

**The core insight: solve the graph backwards.**

This is backward cone-of-influence analysis — the same technique hardware formal verification uses. Start from the outputs (derived values, assertions), trace back through the graph to find which inputs matter, generate the input combinations that exercise all meaningful states.

**How it works:**

**Step 1: Identify what matters.** Read the graph to find:
- Derived values (combs/memos): `display = loading ? '...' : data`
- Assertions: `assertAlways(() => !(loading && error))`
- These are the "outputs" — the things whose behavior we want to verify.

**Step 2: Trace backwards to find inputs.** For each output, walk the graph edges backwards:
- `display` depends on `loading` and `data` → these are the inputs that matter for `display`
- The assertion `!(loading && error)` depends on `loading` and `error` → these are the inputs that matter for this assertion
- Keep tracing: if `loading` is itself derived from other signals, trace further back until you hit root signals (zero incoming edges)

**Step 3: Determine meaningful input states from the graph structure.**
- `display = loading ? '...' : data` has a ternary on `loading` → loading has 2 meaningful states (true/false). When `loading=false`, `data` matters — try its declared states or fuzz.
- `assertAlways(() => !(loading && error))` → the explorer specifically tries `loading=true, error=truthy` to see if the assertion holds. This is adversarial — it's trying to BREAK the assertion.
- `canSubmit = !loading && validated && !submitted` → 3 boolean inputs → 8 combinations. Try all 8.
- For combs with comparisons (`score > threshold`) → the explorer tries values on both sides of the boundary (threshold-1, threshold, threshold+1).

**Step 4: Generate and drive.** For each meaningful input combination:
- Set the root signals to those values
- Let the graph settle (all derived values recompute)
- Check all assertions
- Record coverage (which signal states were reached, which transitions fired)

**Step 5: Handle async boundaries.** When the explorer encounters a pending `eventually` assertion:
- The `eventually` tells the explorer: "there's an async boundary here — I need to drive a resolution"
- The graph tells the explorer which signals are downstream of the pending assertion
- The explorer drives those signals through their states to simulate various resolutions (success, error, timeout)
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
| Assertions (`assertAlways`, `assertTemporal`) | Adversarial exploration — try to break assertions. Backward cone-of-influence from each assertion to find which inputs matter. |
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
- Backward cone-of-influence analysis (trace from outputs/assertions to inputs)
- Branch-aware input generation (read ternaries/comparisons in comb expressions to determine meaningful input states)
- Combinatorial input driver (not single-variable — full combinations for small input sets, coverage-steered sampling for large ones)
- Assertion adversarial mode (specifically try to break each assertion)
- Eventually-resolution driver (when `eventually` assertion is pending, drive downstream signals)
- Vitest integration: `explore()` function that returns violations + coverage
- Shrinking: when a violation is found, minimize the input sequence (fast-check's shrinking algorithm)

**Integration with interaction-level testing:**

Signal-level exploration (drive signals directly) is the primary mode — headless, fast, finds logic bugs in the reactive graph.

Interaction-level exploration (click buttons, type text) is the secondary mode for integration testing:
- The graph knows which signals are roots (external inputs)
- The user can optionally annotate how to trigger a root: `useTrackedState(false, 'submitted', { trigger: { element: 'button[type=submit]', action: 'click' } })`
- Or the explorer discovers it: drive a random interaction, observe which signals change, build the mapping
- Once the mapping exists, the explorer can drive interactions instead of raw signal writes
- This runs in Vitest browser mode or Playwright

Both modes compose: interaction-level finds the interaction→signal mapping, signal-level does deep combinatorial exploration of the discovered state space.

**Example:**

```ts
// checkout.test.ts
import { explore } from '@dut/test'
import { graph } from '@dut/graph'

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

### Temporal Assertions: Tick-Based, Not Time-Based

Comb's current temporal assertions use wall-clock `setTimeout` durations (`within 5s`). This is the wrong model for testing — time-based assertions are inherently flaky (CI machines are slow, animation frames vary, network latency differs).

**The extracted library should support tick/event-based assertions as the primary mode:**

```ts
// BAD: time-based (flaky in CI, slow in tests, unreliable)
assertTemporal(submitted, 'eventually', () => !loading, { within: 5000 })

// GOOD: tick-based (deterministic, fast, reliable)
assertTemporal(submitted, 'eventually', () => !loading, { withinTicks: 3 })

// GOOD: event-based (fires on the Nth signal change, not after N ms)
assertTemporal(submitted, 'eventually', () => successVisible || errorVisible, {
  withinEvents: 5,  // within 5 signal-change events after trigger
})

// GOOD: transition-based (after N state transitions of a specific signal)
assertTemporal(
  () => phase === 'submitting',
  'eventually',
  () => phase === 'success' || phase === 'error',
  { withinTransitions: 'phase', count: 2 }  // within 2 transitions of `phase`
)

// Invariants: no duration needed, checked on every signal change
assertAlways(() => score >= 0)
assertAlways(() => !(loading && error))  // can't be loading AND errored
assertNever(() => phase === 'submitted' && !validated)  // can't submit without validation
```

**How ticks work:** The graph already records every signal change as an event. A "tick" is one event-processing cycle (all signals settle after an input change). The assertion counts ticks/events, not milliseconds. This makes assertions:
- **Deterministic:** same inputs → same tick count → same pass/fail, regardless of machine speed
- **Fast:** no need for `setTimeout` or `waitFor` — assertions resolve synchronously during exploration
- **Composable:** "within 3 ticks of X" means "within 3 reactive settling cycles after X triggers"

**Wall-clock mode still available** for runtime monitoring in dev (e.g., "warn me if this loading spinner has been up for 10 real seconds"). But the test/exploration mode should be purely tick-based.

**What to extract from Comb:** `createTemporalAssert` in `signals.ts` already supports a tick-based `duration` mode (added in commit 1a776cd). The extracted version needs both modes explicitly named (`{ withinTicks: N }` vs `{ withinMs: N }`), with tick-based as the default for testing.

---

## How This Actually Gets Published

### npm package structure

```
@dut/graph          # core: CircuitGraph, waveform recording, diffing, assertions
@dut/react          # adapter: useTrackedState, useTrackedMemo, useTrackedEffect  
@dut/solid          # adapter: createTrackedSignal, createTrackedMemo
@dut/devtools       # browser panel: waveform viewer, graph visualizer, coverage display
@dut/coverage       # toggle/FSM/cross coverage collector + reporters
@dut/test           # graph-directed exploration, assertion-based verification
```

### How to publish

```bash
# Each package is a directory with its own package.json
# Use tsup (simplest TS→JS bundler) for compilation
# npm workspaces for monorepo management

dut/
├── packages/
│   ├── graph/          # @dut/graph
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── react/          # @dut/react
│   ├── solid/          # @dut/solid
│   ├── devtools/       # @dut/devtools
│   ├── coverage/       # @dut/coverage
│   └── test/           # @dut/test
├── package.json        # workspace root
└── tsconfig.base.json

# Build all packages:  npm run build (calls tsup in each)
# Publish all:          npm publish --workspaces
# Users install:        npm install @dut/graph @dut/react
```

Each package compiles TS → JS + `.d.ts` type declarations. Zero runtime dependencies in core. Framework adapters peer-depend on the target framework.

### Framework compatibility

| Framework | Adapter difficulty | How it hooks in |
|---|---|---|
| **React** | Easy | Custom hooks wrapping `useState`/`useMemo`/`useEffect` |
| **Solid** | Easy | Functions wrapping `createSignal`/`createMemo`/`createEffect` |
| **Vue 3** | Medium | Functions wrapping `ref()`/`computed()`/`watch()` |
| **Svelte 5** | Hard | Runes (`$state`) are compiler directives — need preprocessor or use `writable()` stores |
| **Vanilla JS** | None needed | Use `@dut/graph` directly |
| **TC39 Signals** | Easy (future) | Wrap `Signal.State`/`Signal.Computed` when standard lands |

Start with React + vanilla. Add Solid and Vue once core is stable. Svelte last (requires compiler integration work).

---

## What the User Actually Experiences

### Step 1: Install (30 seconds)

```bash
npm install @dut/graph @dut/react @dut/devtools
```

### Step 2: Wrap signals you care about (5 minutes)

```tsx
// Before (normal React):
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
const [data, setData] = useState(null)

// After (tracked):
import { useTrackedState, useTrackedMemo } from '@dut/react'

const [loading, setLoading] = useTrackedState(false, 'loading')
const [error, setError] = useTrackedState<string | null>(null, 'error')
const [data, setData] = useTrackedState(null, 'data')
const display = useTrackedMemo(() => loading ? 'Loading...' : data, [loading, data], 'display')
```

Everything else — JSX, event handlers, effects — stays exactly the same. The tracked hooks are drop-in replacements.

### Step 3: Install Chrome extension (30 seconds)

Install `@dut/devtools` Chrome extension from the Chrome Web Store. Add the bridge to your app:

```tsx
import '@dut/devtools/bridge'  // exposes graph instance to Chrome DevTools
```

Open Chrome DevTools → click "DUT" tab. You see:
- **Graph tab:** dependency graph of all tracked signals, visualized as a circuit diagram
- **Waveform tab:** signal values over time — interact with your app and watch signals change in real-time
- **Assertions tab:** any temporal assertions and their live status
- **Coverage tab:** which signal states have been exercised

### Step 4: Add assertions instead of test cases (10 minutes)

```tsx
import { assertAlways, assertTemporal, assertNever } from '@dut/graph'

// Invariants — checked on every signal change, zero flakiness
assertAlways(() => !(loading && error), 'loading-error-mutex')
assertAlways(() => score >= 0, 'score-non-negative')
assertNever(() => phase === 'submitted' && !validated, 'no-unvalidated-submit')

// Temporal — tick-based, deterministic
assertTemporal(
  () => submitted,           // when this becomes true...
  'eventually',
  () => !loading,            // ...this must eventually become true
  { withinTicks: 5, name: 'submit-completes' }
)
```

These run in dev mode as live monitors (assertion panel shows pass/fail). In test mode, the explorer uses them as the spec.

### Step 5: Auto-test with zero test cases (the dream)

```ts
// checkout.test.ts
import { explore } from '@dut/test'
import { graph } from '@dut/graph'

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
  // - full waveform trace viewable in @dut/devtools
})
```

### Production: zero overhead

```ts
// vite.config.ts — standard production build
export default defineConfig({
  define: { 'import.meta.env.DEV': 'false' }
})
// All @dut/* code is gated behind import.meta.env.DEV
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

All five packages ship. The ordering is about dependencies, not importance.

### Phase 1: `@dut/graph` + `@dut/react`

The graph is the foundation everything else reads from. React adapter is the first framework target.

**What ships:**
- `CircuitGraph` class with node registration, edge tracking, waveform recording, graph diffing, event stream
- `useTrackedState`, `useTrackedMemo`, `useTrackedEffect`, `useEdgeEffect` hooks for React
- `assertAlways`, `assertNever`, `assertTemporal` assertion API with tick-based semantics
- Runtime CDC async boundary warnings
- `dut diff` CLI for graph snapshot comparison
- `dut snapshot` CLI for capturing graph from a running app
- Vanilla JS adapter (direct `graph.registerNode` API)

**Ship gate:** A real React component (e.g., a checkout form with 5-10 tracked signals, 3 assertions) builds a complete dependency graph, records waveform data, detects an async boundary warning, and the CLI diffs two graph snapshots correctly.

### Phase 2: `@dut/devtools`

The debugging UI. Chrome DevTools panel + pop-out window.

**What ships:**
- Chrome extension with "DUT" tab in DevTools
- Waveform viewer with zoom/pan/markers/compound search/cross-signal correlation/keyboard shortcuts
- Circuit graph visualizer with live values and cone-of-influence highlighting
- Assertion monitor with live status and violation details
- Bridge script for app ↔ extension communication

**Ship gate:** Open Chrome DevTools on a React app using @dut/react. See the dependency graph. See signals changing in the waveform as you interact with the app. Place markers. Search for "loading rises AND error != null". Click a violated assertion and jump to that point in the waveform.

### Phase 3: `@dut/coverage`

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

### Phase 4: `@dut/test`

The zero-test-case verification engine. Backward graph solving + exploration + assertion checking.

**What ships:**
- Backward cone-of-influence analysis (trace from outputs/assertions to inputs)
- Branch-aware input generation (read comb expressions to determine meaningful input states)
- Combinatorial input driver with coverage-steered sampling
- Adversarial assertion testing (specifically try to break each assertion)
- Eventually-resolution driver (drive async boundaries when `eventually` assertions are pending)
- Violation shrinking (minimal reproducing input sequence)
- Vitest integration: `explore()` function
- Optional interaction-level exploration (annotated triggers or random DOM interaction via Playwright)
- Full waveform trace attached to each violation report

**Ship gate:** `explore(graph, { budget: 1000 })` against a checkout form component with 8 tracked signals and 5 assertions. Zero hand-written test cases. The explorer finds a real bug (e.g., double-submit race condition), produces a minimal reproducing sequence, reports 85%+ reactive coverage, and the full exploration completes in under 10 seconds.

### Phase 4: `@dut/test` (highest leverage — zero-test-case UI verification)

The dream: **you write temporal assertions, not test cases.** The tool explores the state space, and assertions are the pass/fail criteria. No Playwright scripts. No manual test scenarios. You declare what should always/eventually/never be true, and the machine finds violations or proves coverage.

**Why this is the highest-leverage piece:**

No existing tool does this. Bombadil fuzzes randomly with no graph awareness. fast-check-frontend generates random interactions but doesn't know the state space. XState's @xstate/graph generates paths but requires manual state machine modeling. The synthesis — graph-aware exploration + coverage-driven steering + temporal assertions as spec — is genuinely novel.

**The architecture (three layers):**

**Layer 1: State space discovery** (exists in Comb, needs expansion)
- Read `@dut/graph` to discover bounded signals (booleans, enums, bounded ints)
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
- This is the piece nobody has built: fast-check's random generation + @dut/coverage's state-space metrics in a feedback loop

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
- Integration with Vitest: `import { explore } from '@dut/test'; explore(graph, assertions, { budget: 1000 })`

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
