# Comb

**Write circuits. Ship apps.**

The first framework where compiler, runtime, devtools, and testing share one data structure — the circuit graph (`__graph`). You write `.comb` files, the compiler extracts a static dependency graph, and everything else — visualization, diffing, coverage testing, live debugging — falls out of that single artifact.

React asks: *what should the UI look like after state changes?*
Comb asks: *what signals exist, what logic derives from them, and what events clock state forward?*

## Quick Start

```bash
npm install
npm run dev        # Landing page + 5 demos at localhost:3000
```

Playground at [localhost:3000/playground.html](http://localhost:3000/playground.html).

## The Language

```sv
module Counter {
  signal count: int = 0;

  comb label = "Count: " + str(count);
  comb doubled = count * 2;

  always @(increment) {
    count <= count + 1;
  }

  always @(reset) {
    count <= 0;
  }

  view {
    <div class="counter">
      <h1>Comb Counter</h1>
      <p class="display">{label}</p>
      <p class="detail">doubled = {doubled}</p>
      <div class="controls">
        <button @click=increment>+</button>
        <button @click=reset>reset</button>
      </div>
    </div>
  }
}
```

### Key Concepts

| Comb | SystemVerilog | Meaning |
|------|---------------|---------|
| `signal` | `reg` | Mutable state that persists across events |
| `comb` | `always_comb` / `assign` | Derived value — pure function of signals, auto-recomputes |
| `always @(event)` | `always_ff @(posedge clk)` | Event-triggered state transition |
| `<=` | Non-blocking assignment | Signal assignment (batched, glitch-free) |
| `cell` | Latch | Merge-semantic reactive value for propagator networks |
| `constraint` | Bidirectional wire | Propagator clause: inputs → outputs |
| `view { }` | Module ports / IO | DOM output — reactive, fine-grained updates |
| `token` | Parameter | Design token → CSS custom property in the circuit graph |
| `input` / `output` | Port | Directional module composition ports |

## Features

- **Compiler-verified dependency lists** — wrong deps = compile error, not a subtle runtime bug
- **Static `__graph` artifact** — circuit schematic extracted at compile time, before runtime
- **Auto-derived testing** — combs ARE specs; `__test()` gives headless signal/comb access
- **Propagator networks** — bidirectional constraints via cells + propagators (RGB↔HSV in 6 lines)
- **Design tokens as signals** — CSS custom properties wired into the circuit graph
- **Module composition** — directional ports (`input`/`output`) with type-checked wiring
- **Scoped styles** — per-module CSS with auto-generated scope hashes
- **Assertions** — `assert valid: condition;` checked at runtime
- **Sensitivity-triggered blocks** — `always @(sig1, sig2) { ... }` for multi-signal effects
- **Constraint-based layout** — Kiwi.js Cassowary solver integration via cells

## The Pipeline

```
.comb → Compiler → __graph → Circuit Visualizer
                            → Waveform Debugger
                            → Circuit Diff
                            → Coverage Testing
                            → Runtime (signals, combs, effects, cells, propagators)
```

Other frameworks bolt devtools on separately. In Comb, the compiler emits the `__graph` alongside the runtime code, and every tool reads from the same structure. The visualizer doesn't scrape the DOM or instrument the runtime — it reads `__graph` directly.

## Demos

### 1. Dependency Debugger
Form validation with compiler-verified deps. Live circuit diagram shows signal flow. 16-cell coverage heatmap auto-tests 1000 random inputs and hits all boolean combinations in <1s.

### 2. Waveform Debugger
Stock ticker with moving average, threshold alerts, and signal traces plotted over time — like a hardware logic analyzer for your UI.

### 3. Circuit Diff
Side-by-side topology comparison across refactors. Highlights added, removed, and changed nodes/edges. Zero prior art in web frameworks.

### 4. Color Picker
Bidirectional RGB↔HSV via propagator networks. 6 cells, 2 constraints, compiled from `color-picker.comb`. Drag any slider — all others update through the constraint solver.

### 5. Constraint Layout
Resizable three-pane dashboard (sidebar + main + inspector) with Kiwi.js Cassowary solver enforcing min/max width constraints. Drag dividers — the solver maintains invariants.

## Comb vs. Everything Else

| | React | SolidJS | Svelte 5 | **Comb** |
|---|---|---|---|---|
| Dep tracking | Manual arrays | Auto (implicit) | Compiler (invisible) | **Compiler-verified (visible)** |
| Reactive graph | Hidden | Hidden | Hidden | **First-class `__graph` artifact** |
| Circuit visualization | No | DevTools addon | No | **Built-in, from compile-time** |
| Topology diffing | No | No | No | **Yes — diff two `__graph`s** |
| Auto-derived testing | No | No | No | **Yes — combs ARE specs** |
| Bidirectional constraints | No | No | No | **Propagator networks** |

## Architecture

### Compiler (`src/core/`)

Pure TypeScript, zero dependencies, runs in the browser. `compile(source) → { js, graph, errors }` — no IO, no side effects. This enables the live playground.

- **Lexer** — Hand-written tokenizer with JSX-mode switching for `view {}` blocks
- **Parser** — Recursive descent + Pratt expression parsing. Context-sensitive `<=` (assignment in statements, comparison in expressions)
- **Verify** — Builds symbol table, checks undefined references, validates constraint inputs are cells, detects circular deps
- **CodeGen** — Emits readable JS targeting the runtime API. Conditional imports (`createCell`, `createPropagator`, color utilities) only when used
- **Graph Builder** — Extracts `__graph` with fine-grained view-effect nodes, viewTarget metadata, and bidirectional constraint edges

### Runtime (`src/runtime/`)

Fine-grained reactive runtime with an introspectable circuit graph.

- **Signals** — Push-pull reactivity with automatic dependency tracking
- **Combs** — Lazy, glitch-free derived values (topological ordering prevents diamond-problem glitches)
- **Cells** — Merge-semantic values for propagator networks (converge via `Object.is`)
- **Propagators** — Directional constraint clauses that read cells and write cells
- **Effects** — Auto-tracking side effects for DOM updates
- **Batch** — Multiple signal writes → single atomic update (non-blocking assignment)
- **CircuitGraph** — First-class queryable data structure. Every signal, comb, cell, propagator, and view binding registers itself
- **FSM** — State machines with guards, transitions, onEnter/onExit
- **Clocks** — Interval, animationFrame, and idle timing domains
- **DOM** — Fine-grained DOM helpers — no virtual DOM, effects directly patch nodes
- **Color** — `rgbToHsv`, `hsvToRgb`, `rgbToHex` utilities for propagator demos

## The Playground

Three-pane live editor at `/playground.html`:
- **Left**: Editable `.comb` source (counter, registration form, color picker, blank template)
- **Center**: Live running app (iframe sandbox, recompiles on keystroke)
- **Right**: Circuit visualizer showing the `__graph` with animated wire pulses
- **Bottom**: Compiled JS output and error panel
- **Collapsible syntax reference** with all 15 language constructs

The compiler runs entirely in the browser — no server round-trips.

## Testing

```bash
npm run typecheck                                    # TypeScript strict mode
npx tsx src/core/compiler-test.ts                    # 31 compiler tests
npx tsx src/cli/cli.ts examples/color-picker.comb    # Compile a .comb file
npm run dev                                          # Visual testing in browser
```

The `__test()` export gives headless access to signals and combs:

```js
const t = __test();
t.signals.username.set("alice");
assert(t.combs.usernameValid() === true);
t.dispose();
```

## Project Structure

```
comb/
├── src/
│   ├── core/           # Browser-portable compiler (lexer, parser, verify, codegen)
│   ├── runtime/        # Reactive runtime (signals, cells, propagators, circuit, DOM, FSM, clocks)
│   ├── demos/          # 5 interactive demos (stock-ticker, circuit-diff, color-picker, resizable-layout)
│   ├── playground/     # Live editor app
│   ├── cli/            # Node.js CLI wrapper
│   ├── generated/      # Compiled .comb → .js output (counter, registration, color-picker)
│   ├── styles.css      # Design system with CSS custom properties
│   ├── main.ts         # Landing page + demo router + HMR
│   ├── visualizer.ts   # Canvas circuit graph renderer with pulse animations
│   ├── waveform.ts     # Signal waveform debugger
│   └── demo-shell.ts   # Shared layout shell (split/stacked)
├── examples/           # .comb source files
│   ├── counter.comb
│   ├── registration.comb
│   └── color-picker.comb
├── playground.html     # Playground entry point
├── index.html          # App entry point
└── vite.config.ts      # Vite + HMR plugin for .comb files
```

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server with .comb HMR |
| `npm run compile` | Compile a single .comb file |
| `npm run compile:all` | Compile all examples |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | Production build |

## What Makes Comb Different

Not individual features — the unified pipeline.

1. **One data structure powers everything.** The compiler emits `__graph`. The visualizer reads it. The differ compares two of them. The test harness walks it. The runtime executes it. They're all the same thing.

2. **The compiler catches real bugs.** Misspell a dependency? Reference a signal that doesn't exist? Write to a comb? The compiler tells you at build time, not at 2am in production.

3. **Propagators are first-class.** Not a library pattern — a language construct. `constraint { (r,g,b) => { h <= f(r,g,b).h; } }` compiles to a convergent propagator network.

4. **Generated code is readable.** You can inspect exactly what your `.comb` compiles to. No magic transforms, no hidden framework internals.

5. **The mental model is a circuit.** Signals are wires. Combs are gates. Events are clock edges. Constraints are bidirectional buses. This isn't a metaphor — it's the architecture.

## Theoretical Foundations

- **SolidJS** — Fine-grained signal primitives and dependency tracking
- **Bonsai (Jane Street)** — Two-phase architecture: static graph construction + runtime execution
- **Svelte 5** — Compiler-based reactivity: shift work to build time
- **Sussman's Propagators** — Cells + propagators = the theoretical foundation for bidirectional constraints
- **Esterel** — Proved the same synchronous reactive language can target both UI and hardware
- **SystemVerilog** — The syntax and mental model: signals, combinational logic, clocked state transitions

## Known Limitations

- No type checking beyond parsing (types are syntactic only)
- No source maps
- List rendering in `@for` uses full re-render (no keyed reconciliation)
- No SSR / server-side rendering

## License

Barbarian States License v1.0 — see [LICENSE](./LICENSE)
