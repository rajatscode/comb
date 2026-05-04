# Comb Expansion Plan

## Context

Comb is a working compiler + DES runtime. The question is whether to use it
directly for production apps instead of extracting to framework-agnostic
libraries (Veriscope).

The core motivation: LLMs produce broken reactive code. Comb's language
constraints make incorrect reactivity unrepresentable. The compiler enforces what
no amount of React lint rules can.

## Current State: Verified Working

These features have been tested beyond "tests pass" — actually executed
headlessly, outputs inspected, edge cases driven:

- **Compiler pipeline** — 18/22 .comb examples compile clean. Real
  lexer → parser → verify → codegen chain. Produces readable JS + static
  `__graph` topology artifact.

- **Runtime signal propagation** — `createSignal` + `createComb` work.
  Driving a signal through `batch(() => setPhase('green'))` propagates to
  all downstream combs immediately. Verified headlessly.

- **Delta cycles** — `deferredBatch` genuinely reads pre-update values.
  A 4-stage pipeline (A→B→C→D) on posedge clock shifts data one stage per
  tick, not all at once. This is the core DES claim and it passes.

- **Edge effects** (posedge/negedge) — fire correctly on transitions.
  `createEdgeEffect(() => tick(), 'posedge', handler)` fires once on
  false→true, not on every evaluation.

- **Circuit graph setValue propagation** — `circuit.getNode(id).setValue(val)`
  calls the signal setter, which triggers reactive propagation through combs.
  The runtime IS the propagation engine — no separate execution step needed.

- **Scoped CSS** — hash-based class name scoping in compiled output.

- **SSR** — `renderToString()` with DOM shim. 12/12 tests pass.

- **Static `__graph`** — emitted with every compilation, correct topology
  with node types, edge types, and expression metadata.

## Current State: Broken or Disconnected

- **Auto-test returns 0% coverage on every real module.** Two bugs:
  1. The root signal filter (`autotest.ts:57`) excludes any signal with
     incoming edges. But every interesting signal has incoming `write` edges
     from event nodes (`event:increment -> count`). Fix: treat signals whose
     only incoming edges are `write` from `event` nodes as drivable inputs.
  2. The driver does single-variable sweeps, not combinations. It tries
     `phase=red`, then `phase=green`, then `walk_requested=true` — never
     `phase=red AND walk_requested=true AND emergency=false` together.
     Combinatorial enumeration is needed for bounded signals.

  The underlying capability works: `circuit.getNode(id).setValue(val)`
  propagates through combs correctly. The autotest just never calls it
  because it can't identify drivable signals. The fix is ~20 lines of
  filter logic + combination enumeration.

- **4/22 examples don't compile.** `chat.comb` (undefined reference
  `format_time`), `minesweeper.comb` (undefined reference `revealed`),
  `todo-v1.comb` and `todo-v2.comb` (parse errors — `input` is a reserved
  word in the parser).

- **Temporal assertions have no end-to-end test.** `createTemporalAssert`
  exists, has correct arm/tick/fire state machine logic (~100 lines), and
  generates real code from `assert temporal` syntax. But no test exercises
  the full cycle: arm on posedge → count ticks → succeed or fail. The
  compiler tests only verify codegen output shape. The runtime tests don't
  cover temporal assertions at all.

- **Coverage collector works but has no callers.** Toggle, FSM transition,
  and cross coverage all work in isolation (unit tests pass). But autotest
  never drives signals, so coverage is never recorded during exploration.
  Once autotest works, coverage follows — the runtime already calls
  `coverage.recordToggle()` on every signal change when enabled.

- **VS Tetris game logic is 625 lines of JS, not .comb.** The .comb file
  declares signals and one `always @(posedge tick)` block for garbage
  exchange. All actual game mechanics (piece rotation, collision detection,
  line clearing, AI) are hand-written JS in the mount file that calls
  `setSignal()` directly.

- **Type checking is warnings-only.** The verifier catches undefined
  references (real errors) but type mismatches are non-blocking warnings.
  You can assign a string to an int signal and the compiler shrugs.

- **No assertion has ever halted execution.** `circuit.assertionFailed`
  logs to console — there's no mechanism to fail a test, throw, or surface
  violations outside the waveform UI.

## Current State: Missing Entirely

- **No async/data fetching story.** No caching, refetch, stale-while-
  revalidate. Raw fetch in `always @(trigger)` blocks only.

- **No component library ecosystem.** No third-party UI widgets.

- **No npm package interop.** Generated JS uses the Comb runtime — can't
  import React components or npm packages into views.

- **No HMR/dev server** for .comb files.

- **No TypeScript interop** — generated JS has no .d.ts.

- **View system is vanilla DOM** — no keyed list reconciliation, no virtual
  scroll, no portals.

## Why the Auto-Test Architecture Is Sound

The previous concern about "JS closure opacity" applies to Veriscope (where
the graph is a passive data structure with no execution engine), not to Comb.

In Comb, the runtime IS the propagation engine. When autotest calls
`circuit.getNode('TL.phase').setValue('green')`, the signal setter fires,
all downstream combs recompute via the reactive tracking system, and
assertions evaluate against the new state. The autotest doesn't need to
predict what combs compute — it drives inputs, lets the runtime propagate,
and checks outputs. Same as a hardware test bench.

For bounded signals (booleans, enums with declared states), exhaustive
combinatorial enumeration is tractable. For N boolean signals, 2^N
combinations. For small state spaces (< ~15 bounded signals), this
completes in milliseconds.

For unbounded signals (int counters, strings), the autotest needs
heuristics: boundary values (0, 1, -1), values extracted from assertion
comparisons (`count >= 0` → try -1), and coverage-steered random. The
compiler's `verify.ts` already extracts comparison expressions from
assertions — this data just needs to flow to the autotest.

## The Decision: Comb vs Veriscope

### Use Comb directly when:
- You control the entire frontend (no third-party React components needed)
- The UI is data-display heavy where you'd build custom renderers anyway
- LLM generation quality matters more than ecosystem access
- The app is greenfield or you're willing to rewrite

### Use Veriscope (React adapter) when:
- You need TanStack Table, Leaflet, Recharts, shadcn/ui, etc.
- The app already exists in React
- You only want observability, not a new language

### Hybrid: Comb compiling to React
- Write .comb for state logic and assertions
- Compiler emits React hooks instead of vanilla DOM
- Keep component library access
- Get static graph + compiler-enforced deps + ecosystem
- **This doesn't exist yet** — would require a new codegen backend

## Expansion Plan (If We Go With Comb Directly)

### Phase 0: Fix What's Broken

Before expanding, the existing features need to actually work:

1. **Fix autotest root signal filter.** Signals whose only incoming edges
   are `write` from `event` nodes are user-drivable inputs. Change the
   filter in `autotest.ts:57` to allow these.

2. **Add combinatorial enumeration to autotest.** For N bounded signals,
   drive all combinations (or coverage-steered sampling for large N).
   Currently does single-variable sweeps which miss all multi-signal bugs.

3. **Wire coverage into autotest.** Call `coverage.enable()` before
   driving, read `coverage.getReport()` after. The runtime already records
   toggle/transition data on signal changes when enabled.

4. **Make assertion failures observable.** `circuit.assertionFailed` should
   collect violations into a result object, not just console.log. The
   autotest should return violations alongside coverage.

5. **Add temporal assertion end-to-end test.** Drive a trigger signal,
   tick N times, verify the assertion passes or fails as expected. The
   code is there — it just needs a test proving it works.

6. **Fix the 4 broken examples.** `chat.comb`, `minesweeper.comb`,
   `todo-v1.comb`, `todo-v2.comb`.

### Phase 1: Data Fetching Primitive

Add a `query` primitive for reactive cached server requests:

```sv
module DataPage {
  signal search: string = '';
  signal page: int = 1;

  comb queryParams = { q: search, page: page };

  query items = fetch('/api/items', queryParams) {
    cache: 30s;
    stale_while_revalidate: true;
    on_error: { phase <= 'error'; }
  }

  always @(search) { page <= 1; }
}
```

Required behavior:
- Reactive: re-fetches when dep signals change
- Caching: deduplicates identical requests within TTL
- Loading state: exposes `items.loading`, `items.error`, `items.data`
- Cancellation: aborts in-flight requests on dep change

### Phase 2: Foreign Component Interop

**Option A: Web Component bridge.** Mount web components from .comb views.
Limited by what's available as web components.

**Option B: React codegen backend (recommended).** Compiler emits React
hooks instead of vanilla DOM:
- `signal` → `useState` (with graph registration)
- `comb` → `useMemo` (with graph registration)
- `always @(event)` → event handler
- `always @(posedge x)` → `useEffect` with edge detection
- `view` → JSX return

This preserves compiler-verified deps while giving full React ecosystem
access. The generated code is a normal React component that happens to
have a guaranteed-complete graph.

### Phase 3: List Reconciliation

For vanilla DOM output path:
- Keyed list diffing (add/remove/reorder)
- Virtual scrolling for large lists

If using React codegen backend (Phase 2B), inherit React's reconciler.

### Phase 4: Dev Tooling

- **Vite plugin:** .comb file watcher, recompile on save, HMR
- **VS Code extension:** Syntax highlighting, error diagnostics from
  verify pass, go-to-definition
- **Source maps:** Ensure browser DevTools breakpoints work in .comb source

### Phase 5: Production Hardening

- Error boundaries for comb evaluation failures
- Scope disposal for unmounted modules
- Tree-shaking unused runtime features
- .d.ts generation for consuming TS code

## Expansion Plan (If We Land Veriscope Instead)

See the Veriscope `docs/FIX-SPEC.md` for the implementation repair plan.
Key gaps:

1. CircuitGraph needs `propagate()` — topo-sort recompute of derived nodes
2. `explore()` must return real coverage (currently hardcoded zeros)
3. Headless test builders need compute functions on derived nodes
4. Mutation runner needs scenario replay, not just single-state checks

Veriscope's fundamental limitation: it asks LLMs to use `useSignal` instead
of `useState` — same failure mode, different API. The graph is only complete
if every signal is registered. No enforcement mechanism exists.

## The Hybrid Path (Recommended)

**Use Comb's compiler for state logic. Emit React for rendering.**

```
.comb source → compiler → React component with:
  - Veriscope hooks (useSignal, useDerived) for graph registration
  - Static __graph as compile artifact (guaranteed complete)
  - Assertions inlined
  - Standard JSX for view (keeps component library access)
```

This gives you:
- Compiler-verified dependencies (LLMs can't produce stale closures)
- Static graph (no runtime assembly required)
- React ecosystem (TanStack Table, Leaflet, shadcn, etc.)
- Veriscope tooling works against guaranteed-complete graphs
- explore() + mutation testing are meaningful because the graph is real

What it requires:
- New codegen backend (`codegen-react.ts`)
- View blocks compile to JSX instead of createElement calls
- Runtime imports change from `../runtime/signals.js` to `@veriscope/react`
- The compiler's `verify.ts` dep extraction still works (it's AST-level)

## Example: Complex Page in Comb

A typical data-heavy page with 14 state variables, multiple queries, and
filter/pagination logic. In React this becomes useState spaghetti with
manual dep arrays. In Comb:

```sv
module DataExplorer {
  signal viewMode: ViewMode = 'table';
  signal search: string = '';
  signal sourceType: string = '';
  signal branch: string = '';
  signal page: int = 1;
  signal bulkMode: bool = false;
  signal selectedId: string | null = null;
  signal hoveredId: string | null = null;

  comb filterParams = { q: search, branch, source_type: sourceType };
  comb queryParams = { ...filterParams, page, sort, order };

  query items = fetch('/api/items', queryParams);
  query stats = fetch('/api/stats', filterParams);

  always @(search, sourceType, branch) {
    page <= 1;
  }

  assert always (bulkMode || selectedItems.length == 0);
  assert never (selectedId != null && filtersOpen);

  view { ... }
}
```

The compiler rejects:
- Reading `search` inside an `always @(branch)` block (undeclared sensitivity)
- Writing `page` outside an `always` block (no stale closure possible)
- Circular dependencies between combs

## Decision Required

1. **Comb direct (vanilla DOM output)** — most correct, least ecosystem
2. **Veriscope only (React hooks)** — most ecosystem, least enforcement
3. **Hybrid (Comb → React codegen)** — best of both, requires new codegen backend

Pick one. The expansion plan for each is different.
