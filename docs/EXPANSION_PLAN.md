# Comb Expansion Plan

## Context

Comb is a working compiler + DES runtime. The question is whether to use it
directly for production apps instead of extracting to framework-agnostic
libraries (Veriscope).

The core motivation: LLMs produce broken reactive code. Comb's language
constraints make incorrect reactivity unrepresentable. The compiler enforces what
no amount of React lint rules can.

## Current State (What Actually Works)

- Full compiler pipeline: lexer → parser → verify → codegen → JS output
- DES runtime with real delta cycles, oscillation detection, convergence
- Edge-triggered effects (posedge/negedge)
- Temporal assertions (eventually, always, next) — tick-based
- Bidirectional propagators (cells + constraints)
- Static `__graph` artifact (compile-time dependency topology)
- Auto-test harness (state-space enumeration from graph)
- SSR (renderToString)
- Router (hash-based)
- 24+ example .comb files

## Current State (What Doesn't Work or Is Missing)

- **No async/data fetching story.** No equivalent to TanStack Query (caching,
  refetch, stale-while-revalidate, optimistic updates). You can write
  `always @(fetchTrigger) { ... }` with raw fetch but get no caching layer.

- **No component library ecosystem.** No equivalent to shadcn/ui, TanStack Table,
  react-leaflet, Recharts. Every UI widget must be hand-built in .comb.

- **No build integration with npm packages.** Can't `import { DataTable } from
  'some-npm-package'` — the codegen emits standalone JS that uses the Comb runtime,
  not React components.

- **One failing test** (posedge always block batch wrapping in codegen).

- **kiwi.js integration is manual** — constraints compile to propagator functions,
  not to automatic constraint-solver invocations.

- **No HMR/dev server story** for .comb files (Vite plugin, file watcher, etc.)

- **No TypeScript interop** — generated JS has no .d.ts, can't be consumed
  type-safely from TS.

- **View system is vanilla DOM** — no virtual DOM, no keyed list reconciliation,
  no portal/suspense patterns.

## The Decision: Comb vs Veriscope

### Use Comb directly when:
- You control the entire frontend (no third-party React components needed)
- The UI is data-display heavy (tables, maps, dashboards) where you'd build
  custom renderers anyway
- LLM generation quality matters more than ecosystem access
- The app is greenfield or you're willing to rewrite

### Use Veriscope (React adapter) when:
- You need TanStack Table, Leaflet, Recharts, shadcn/ui, etc.
- The app already exists in React
- You only want observability, not a new language
- Team members need to ramp without learning Comb syntax

### Hybrid: Comb compiling to React
- Write .comb for state logic and assertions
- Compiler emits React hooks instead of vanilla DOM
- Keep component library access
- Get static graph + compiler-enforced deps + ecosystem
- **This doesn't exist yet** — would require a new codegen backend

## Expansion Plan (If We Go With Comb Directly)

### Phase 1: Data Fetching Primitive

The biggest need for data-heavy apps: paginated, filtered, cached server queries.

Add a `query` primitive:

```sv
module DataPage {
  signal search: string = '';
  signal branch: string = '';
  signal page: int = 1;

  comb filterParams = { q: search, branch: branch };
  comb queryParams = { ...filterParams, page: page };

  query items = fetch('/api/items', queryParams) {
    cache: 30s;
    stale_while_revalidate: true;
    on_error: { phase <= 'error'; }
  }

  always @(search, branch) { page <= 1; }
}
```

Required behavior:
- Reactive: re-fetches when dep signals change
- Caching: deduplicates identical requests within TTL
- Loading state: exposes `items.loading`, `items.error`, `items.data`
  as signals (or equivalent)
- Cancellation: aborts in-flight requests on new dep change
- Not a full TanStack Query clone — just the 80% case for CRUD dashboards

### Phase 2: Foreign Component Interop

The ecosystem problem. Two options:

**Option A: Web Component bridge.** Comb emits DOM. Web Components are DOM.
Allow mounting any web component from within a .comb view:

```sv
view {
  <leaflet-map markers={mapMarkers} on:click={handleClick} />
  <data-table data={items} columns={columns} />
}
```

This requires the third-party component to be available as a web component
(or wrapped in one). Many React component libraries don't have WC wrappers.

**Option B: React codegen backend.** Compiler emits React instead of vanilla DOM.
Comb's reactive semantics map onto React hooks:
- `signal` → `useState` (with graph registration)
- `comb` → `useMemo` (with graph registration)
- `always @(event)` → event handler
- `always @(posedge x)` → `useEffect` with edge detection
- `view` → JSX return

This is more work but gives full React ecosystem access. The generated code
would look like the Veriscope checkout example — but generated from .comb source,
so the graph is guaranteed complete and deps are compiler-verified.

**Recommendation:** Option B. The point of Comb is compiler-verified reactivity.
The output format (vanilla DOM vs React hooks) is an implementation detail.
React output gives you the ecosystem without giving up the guarantees.

### Phase 3: List Reconciliation

Comb's view system currently uses raw DOM manipulation. For data-heavy apps
(tables with 1000+ rows), this needs:

- Keyed list diffing (add/remove/reorder without full re-render)
- Virtual scrolling (only render visible rows)
- Or: if using React codegen backend (Phase 2B), inherit React's reconciler

If staying with vanilla DOM output, implement a minimal keyed-children algorithm
(similar to Svelte's keyed each block or lit-html's repeat directive).

### Phase 4: Dev Tooling

- **Vite plugin:** File watcher for .comb → recompile on save, HMR via
  module replacement
- **VS Code extension:** Syntax highlighting, error diagnostics from verify pass,
  go-to-definition for signals/combs
- **Source maps:** Already partially implemented — ensure they work with browser
  DevTools breakpoints in .comb source

### Phase 5: Production Hardening

- **Error boundaries:** What happens when a comb throws? Currently unhandled.
- **Memory management:** Scope disposal for unmounted modules (partially working
  via `createScope`/`dispose`)
- **Bundle size:** Tree-shake unused runtime features (router, SSR, coverage)
  from production builds
- **TypeScript declarations:** Generate .d.ts for compiled modules so consuming
  TS code gets type safety

## Expansion Plan (If We Land Veriscope Instead)

See the Veriscope `docs/FIX-SPEC.md` for the implementation repair plan.
Key gaps:

1. CircuitGraph needs `propagate()` — topo-sort recompute of derived nodes
2. `explore()` must return real coverage (currently hardcoded zeros)
3. Headless test builders need compute functions on derived nodes
4. Mutation runner needs scenario replay, not just single-state assertion checks

Veriscope's fundamental limitation remains: it asks LLMs to use `useSignal`
instead of `useState` — same failure mode, different API. The graph is only
complete if every signal is registered. No enforcement mechanism exists.

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
- New codegen backend in `src/core/codegen.ts` (or a parallel `codegen-react.ts`)
- View blocks compile to JSX instead of createElement calls
- Runtime imports change from `../runtime/signals.js` to `@veriscope/react`
- The compiler's `verify.ts` dep extraction still works (it's AST-level)

Estimated effort: medium. The compiler already extracts deps and emits JS.
Changing the *shape* of emitted JS (hooks instead of createSignal) is codegen
work, not fundamental architecture.

## Example: Complex Page in Comb

A typical data-heavy page with 14 state variables, multiple queries, and
filter/pagination logic. In React this becomes useState spaghetti with manual
dep arrays. In Comb:

```sv
module DataExplorer {
  // State (explicit and bounded)
  signal viewMode: ViewMode = 'table';
  signal search: string = '';
  signal sourceType: string = '';
  signal branch: string = '';
  signal page: int = 1;
  signal bulkMode: bool = false;
  signal selectedId: string | null = null;
  signal hoveredId: string | null = null;

  // Derived (compiler extracts deps, no manual dep arrays)
  comb filterParams = { q: search, branch, source_type: sourceType };
  comb queryParams = { ...filterParams, page, sort, order };

  // Data fetching (reactive, cached)
  query items = fetch('/api/items', queryParams);
  query stats = fetch('/api/stats', filterParams);

  // Auto-reset page on filter change (compiler-verified sensitivity)
  always @(search, sourceType, branch) {
    page <= 1;
  }

  // Assertions
  assert always (bulkMode || selectedItems.length == 0);
  assert never (selectedId != null && filtersOpen);

  view { ... }
}
```

The compiler rejects:
- Reading `search` inside an `always @(branch)` block (undeclared sensitivity)
- Writing `page` outside an `always` block (no stale closure possible)
- Circular dependencies between combs

An LLM generating .comb can't produce the reactive bugs that plague typical
React pages because the grammar doesn't allow them.

## Decision Required

1. **Comb direct (vanilla DOM output)** — most correct, least ecosystem
2. **Veriscope only (React hooks)** — most ecosystem, least enforcement
3. **Hybrid (Comb → React codegen)** — best of both, requires new codegen backend

Pick one. The expansion plan for each is different.
