# Comb — Development Guide

## What is this?

Comb is a SystemVerilog-inspired reactive web framework. `.comb` files compile to JavaScript that uses a fine-grained reactive runtime. The key differentiator is the introspectable CircuitGraph — every signal, derived value, FSM, and clock registers itself in a queryable graph that powers live circuit visualization.

## Quick Start

```bash
npm install
npm run dev          # Vite dev server on :3000
npm run compile      # Compile a .comb file
npm run compile:all  # Compile all examples
npm run typecheck    # TypeScript strict check
```

## Architecture

```
src/core/     — Browser-portable compiler (lexer → parser → AST → codegen)
src/runtime/  — Reactive runtime (signals, circuit graph, DOM, FSM, clocks)
src/demos/    — Interactive demo pages (counter, traffic-light, minesweeper, chat)
src/cli/      — Node.js CLI wrapper for the compiler
examples/     — .comb source files
```

### Compiler (src/core/)

Pure functions, zero Node.js dependencies, runs in the browser. The `compile(source: string): CompileResult` function takes a `.comb` source string and returns `{ js, graphMetadata, errors }`.

- `lexer.ts` — Hand-written tokenizer with JSX-mode switching inside `view {}` blocks
- `parser.ts` — Recursive descent + Pratt expression parsing. `<=` is context-sensitive (assignment in statements, comparison in expressions)
- `codegen.ts` — Emits readable JS targeting the runtime API
- `compiler.ts` — Pipeline orchestrator + graph metadata extraction

### Runtime (src/runtime/)

- `signals.ts` — Push-pull reactivity: `createSignal`, `createComb`, `createEffect`, `batch`, `untrack`
- `circuit.ts` — `CircuitGraph` class: node/wire registration, event subscription, snapshot serialization
- `fsm.ts` — `createFSM` with guards, transitions, onEnter/onExit
- `clocks.ts` — `createClock` (interval, animationFrame, idle) + `stopAllClocks`
- `dom.ts` — Fine-grained DOM: `bindText`, `bindAttr`, `renderList`, `renderConditional`, `bindInput`

### Key Design Decisions

- **No virtual DOM** — effects directly patch DOM nodes
- **Push-pull reactivity** — signals push dirty flags, combs pull (lazy recompute) on read
- **CircuitGraph is first-class** — not an afterthought. Every primitive registers itself.
- **Compiler is browser-portable** — enables the live playground
- **Generated code is readable** — a feature, not a limitation

## Adding a New Demo

1. Write the `.comb` file in `examples/`
2. Compile it: `npx tsx src/cli/cli.ts examples/your-demo.comb`
3. Create `src/demos/your-demo.ts` using `createDemoLayout` from `../demo-layout`
4. Add the demo card in `src/main.ts`

## Testing

```bash
npm run typecheck              # TypeScript strict mode
npx tsx src/cli/cli.ts examples/counter.comb  # Test compiler
npm run dev                    # Visual testing in browser
```

## Known Limitations

- Generated code for minesweeper/chat references helper functions not emitted by codegen (hand-written demos work fine)
- No source maps
- List rendering without `key` uses full re-render; use `@for item in items key=item.id { ... }` for keyed reconciliation
- No SSR support
