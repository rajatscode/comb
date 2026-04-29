# Comb

**Write circuits. Ship apps.**

Comb is a SystemVerilog-inspired reactive web framework. You write `.comb` files using HDL-flavored syntax — signals, combinational logic, event-triggered state transitions, and view blocks — and compile them into working browser applications.

React asks: *what should the UI look like after state changes?*  
Comb asks: *what signals exist, what combinational logic derives from them, and what events clock state forward?*

It is not SystemVerilog compatibility. It is SystemVerilog vibes for deterministic browser UI.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 to see the demos. Open http://localhost:3001 for the live playground.

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
| `view { }` | Module ports / IO | DOM output — reactive, fine-grained updates |
| Module composition | Module instantiation | Reusable components wired via ports |

### What the Language Supports

- **Signals** with types: `signal name: int = 0;`
- **Combinational logic**: `comb derived = expr;`
- **Event handlers**: `always @(click) { signal <= value; }`
- **Enums**: `enum Phase { Red, Green, Yellow }`
- **View blocks** with JSX-like syntax and reactive interpolation `{expr}`
- **Directives**: `@if`, `@else`, `@for`, `@bind`
- **Module composition**: `<Cell value={grid[r][c]} @click=reveal(r,c) />`
- **Parameterized events**: `always @(reveal(r, c)) { ... }`

## Architecture

```
.comb file → Lexer → Parser → AST → CodeGen → JavaScript + GraphMetadata
                                                     ↓              ↓
                                              Runtime (signals,   Circuit Visualizer
                                              effects, DOM)       (SVG, live)
```

### Compiler (src/core/)

Pure TypeScript, zero dependencies, runs in the browser. The `compile()` function is `string → CompileResult` — no IO, no side effects. This enables the live playground where you type `.comb` code and see it compile instantly.

- **Lexer**: Hand-written tokenizer with JSX-mode switching for view blocks
- **Parser**: Recursive descent with Pratt expression parsing. Context-sensitive `<=` (assignment in statements, comparison in expressions — exactly like SystemVerilog)
- **CodeGen**: Emits readable JavaScript targeting the Comb runtime API

### Runtime (src/runtime/)

Fine-grained reactive runtime inspired by SolidJS, with a key difference: **the reactive graph is introspectable**.

- **Signals**: Push-pull reactivity with automatic dependency tracking
- **Combs**: Lazy, glitch-free derived values (topological ordering prevents diamond-problem glitches)
- **Effects**: Auto-tracking side effects for DOM updates
- **Batch**: Multiple signal writes → single atomic update (like non-blocking assignment)
- **CircuitGraph**: First-class data structure representing the entire reactive graph — queryable, subscribable, serializable

The CircuitGraph is what makes Comb unique. Every signal, comb, FSM, and clock registers itself. The visualizer subscribes to graph events and renders live circuit diagrams.

### Runtime Extras

- **FSM**: First-class state machines with guards, transitions, onEnter/onExit
- **Clocks**: Interval, animationFrame, and idle timing domains
- **DOM**: Fine-grained DOM helpers — no virtual DOM, effects directly patch nodes

## Demos

### Counter
Basic signals and combinational logic. Click buttons, watch signals flow through the circuit.

### Traffic Light
State machine cycling through Red → Green → Yellow. Demonstrates FSM as a language primitive, clock domains for timing, and emergency override (signal priority).

### Minesweeper
Full playable game: click to reveal, right-click to flag, flood-fill on zeros, win/lose detection. Proves arrays, module composition, and event propagation through a grid.

### Chat
Two-pane simulated chat with shared signal state. Messages appear in both panes. Shows dynamic lists, input binding, and the "signals over wires" metaphor.

## The Playground

The playground is a three-pane live editor:
- **Left**: Editable `.comb` source with syntax highlighting
- **Center**: Live running app (iframe sandbox, recompiles on keystroke)
- **Right**: Circuit visualizer showing the signal graph with animated wire pulses

The compiler runs entirely in the browser — no server round-trips.

## Project Structure

```
comb/
├── src/
│   ├── core/           # Browser-portable compiler (lexer, parser, ast, codegen)
│   ├── runtime/        # Reactive runtime (signals, circuit graph, DOM, FSM, clocks)
│   ├── demos/          # Interactive demo pages
│   ├── playground/     # Live editor app
│   ├── cli/            # Node.js CLI wrapper
│   ├── generated/      # Compiled .comb → .js output
│   ├── styles.css      # Dark theme design system
│   ├── main.ts         # Landing page
│   ├── highlight.ts    # .comb syntax highlighter
│   ├── visualizer.ts   # SVG circuit graph renderer
│   └── inspector.ts    # Live signal inspector panel
├── examples/           # .comb source files
│   ├── counter.comb
│   ├── traffic-light.comb
│   ├── minesweeper.comb
│   └── chat.comb
├── playground.html     # Playground entry point
├── index.html          # Demo entry point
└── LICENSE             # Barbarian States License v1.0
```

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (demos) |
| `npm run playground` | Start playground dev server |
| `npm run compile` | Compile a .comb file |
| `npm run compile:all` | Compile all examples |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | Production build |

## What Makes Comb Different

1. **The language maps to a real mental model.** Not "components with hooks" — circuits. Signals are wires. Modules are ICs. Events are clock edges.

2. **The reactive graph is introspectable.** Not hidden inside the framework — it's a first-class, queryable data structure. The circuit visualizer isn't bolted on; it falls out of the architecture for free.

3. **Static dependency analysis.** The compiler knows the full signal graph at compile time. The visualizer can render the circuit diagram from the AST alone — before the app even runs.

4. **Glitch-free by design.** Push-pull reactivity with topological ordering means derived values never see inconsistent intermediate states. Like a properly clocked circuit.

5. **Generated code is readable.** You can inspect exactly what your `.comb` compiles to. No magic, no hidden framework. Just signals and DOM operations.

## Theoretical Foundations

- **SolidJS**: Fine-grained signal primitives and dependency tracking
- **Bonsai (Jane Street)**: Two-phase architecture — static graph construction + runtime execution
- **Svelte 5**: Compiler-based reactivity — shift work to build time
- **Sussman's Propagators**: Cells + propagators = the theoretical foundation for reactive graphs
- **Esterel**: Proved the same synchronous reactive language can target both UI and hardware
- **SystemVerilog**: The syntax and mental model — signals, combinational logic, clocked state transitions

## What's Intentionally Limited (MVP)

- No type checking beyond parsing (types are syntactic only)
- No source maps
- No hot module replacement (full iframe reload in playground)
- List rendering in @for uses full re-render (no keyed reconciliation)
- No SSR / server-side rendering
- Clock domain crossing (`sample()`) not implemented

## License

Barbarian States License v1.0 — see [LICENSE](./LICENSE)
