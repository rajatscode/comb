# Comb Language Reference

Comb is a UI framework built on a discrete event simulation execution model. `.comb` files declare signals, derived values, state transitions, and views — the compiler extracts a static dependency graph (`__graph`), verifies it, and emits readable JavaScript.

---

## Primitives

### signal — mutable state

```sv
signal count: int = 0;
signal name: string = "";
signal active: bool = true;
signal price: float = 9.99;
```

Types: `int`, `string`, `bool`, `float`. Signals are the only mutable primitive. They can only be written inside `always` blocks using the `<=` operator.

### comb — derived value

```sv
comb doubled = count * 2;
comb label = "Count: " + str(count);
comb isValid = len(name) >= 3 && contains(email, "@");
```

Combs are pure derivations. The compiler statically extracts all dependencies and verifies they exist. All branches are tracked (static union semantics) — even inside ternaries, both sides are registered as deps.

### always @(event) — event-triggered block

```sv
always @(increment) {
  count <= count + 1;
}

always @(reset) {
  count <= 0;
  name <= "";
}
```

Fires when the named event is triggered (e.g. from a button `@click`). Writes use `<=` (non-blocking assignment — scheduled for end of current delta). Multiple writes in one block are atomic via `batch()`.

### always @(signal, ...) — sensitivity-triggered block

```sv
always @(celsius) {
  fahrenheit <= celsius * 9 / 5 + 32;
}

always @(width, height) {
  area <= width * height;
}
```

Auto-fires when any declared signal changes. The compiler **verifies** the sensitivity list: every signal read inside the block must be declared in the `@(...)` list. An undeclared read is a compile error. Self-triggering writes (writing to a signal you're sensitive to) are also caught.

### always @(posedge/negedge) — edge-triggered block

```sv
// Fires ONCE when loading transitions false → true
always @(posedge loading) {
  showSpinner();
}

// Fires ONCE when loading transitions true → false
always @(negedge loading) {
  fadeInContent();
}

// Fires when error count transitions from 0 to >0
always @(posedge len(errors) > 0) {
  showToast("Errors detected");
}
```

Edge-triggered sensitivity fires on *transitions*, not values. `@(posedge x)` fires when `x` becomes true (rising edge). `@(negedge x)` fires when `x` becomes false (falling edge). This is a common UI need ("do something when X *becomes* true") that's awkward with standard reactivity — React's `useEffect` is level-triggered, requiring manual `usePrevious` patterns.

Edge-triggered blocks compile end-to-end through the lexer, parser, codegen, and runtime. The mechanism exists in other frameworks (MobX `when()`, RxJS `pairwise()`), but not as a compiled, compiler-verified language construct.

### view — reactive DOM

```sv
view {
  <div class="counter">
    <h1>{label}</h1>
    <p class={isValid ? "valid" : "invalid"}>{message}</p>
    <button @click=increment>+</button>
    <input @bind=name />
    @if (count > 10) { <p>High!</p> }
    @for item in items { <li>{item}</li> }
  </div>
}
```

`{expr}` — reactive text interpolation. `@click=event` — event binding. `@bind=signal` — two-way input binding. `@if`/`@for` — conditional and list rendering. `class={expr}` — dynamic attributes. No virtual DOM — effects directly patch DOM nodes.

---

## Assertions

```sv
assert always (count >= 0);
assert canSubmit == (usernameValid && emailValid);
```

Runtime invariants registered as nodes in the `__graph`. The test harness auto-evaluates assertions across generated input combinations.

### Temporal assertions

Inspired by SystemVerilog Assertions (SVA). Prior art: Quickstrom (PLDI 2022) applies LTL to web app testing externally; Comb's temporal assertions are embedded in the component model as graph nodes, with three operators: `eventually`, `always`, and `next`.

```sv
// "whenever submit fires, loading must eventually become false"
assert temporal @(posedge submitted)
  eventually(!loading) within 10s;

// "form submission must lead to success or error"
assert temporal @(posedge submitted)
  eventually(showSuccess || showError) within 5s;

// "no navigation while form is dirty without confirmation"
assert temporal @(navigateAway) !formDirty || confirmed;
```

---

## Module Composition

```sv
module Child {
  input label: string = "hello";
  output clicks: int = 0;

  always @(click) {
    clicks <= clicks + 1;
  }

  view {
    <button @click=click>{label} ({clicks})</button>
  }
}

module App {
  signal childClicks: int = 0;

  view {
    <Child label="Click me" clicks:={childClicks} />
    <p>Total: {childClicks}</p>
  }
}
```

`input` — read-only inside the child, set by the parent via attributes. `output` — writable by the child, readable by the parent. `:=` binds an output back to a parent signal (bidirectional wiring). Multiple modules compile together — the compiler builds a cross-module registry for verification.

Note: directional ports have prior art (Angular `@Input`/`@Output` since 2016, Elm ports). The value here is the integration with the `__graph` artifact for static analysis, not the ports themselves.

---

## Design Tokens

```sv
token primary: color = "#0052CC";
token radius: length = "8px";
```

A token is simultaneously a reactive signal and a CSS custom property (`--primary`, `--radius`). Changing the signal value at runtime updates the custom property. Use in styles via `var(--primary)`.

---

## Scoped Styles

```sv
style {
  .btn { background: var(--primary); padding: 8px; border-radius: var(--radius); }
  .label { font-weight: 600; }
}
```

Class names are auto-scoped per module using a deterministic hash (e.g. `.btn` becomes `.btn_a1b2c`). Styles are injected as a `<style>` element at mount time.

---

## Propagator Networks

Bidirectional constraints using cells and propagators.

### Cells

```sv
cell r: int = 255;
cell g: int = 0;
cell b: int = 128;
cell hex: string = "#ff0080";
```

Cells are like signals but support merge semantics — multiple writers converge rather than conflict.

### Constraints *(partially implemented)*

> The `constraint` keyword parses and compiles, but end-to-end compilation is being hardened. The runtime API (`createCell`, `createPropagator`) is fully functional.

```sv
constraint rgbToHex {
  (r, g, b) => { hex <= rgbToHex(r, g, b); }
  (hex) => { r <= hexToR(hex); g <= hexToG(hex); b <= hexToB(hex); }
}
```

Information flows in any direction — edit RGB, hex updates; edit hex, RGB updates. The propagator network resolves without infinite loops.

Prior art: Sussman & Radul (2009) is the theoretical foundation. dthompson/Spritely (FOSDEM 2026) built a working propagator-based FRP for web UI in Scheme/WASM. Comb's contribution is compiling constraint blocks from a DSL with static analysis and `__graph` integration.

---

## Enums

```sv
enum Phase { Red, Green, Yellow }
```

Used for FSM states. Enum values are available as `Phase.Red`, `Phase.Green`, etc.

---

## Type System

Type annotations are parsed and checked by `verify.ts`. Type mismatches produce **warnings** (not errors), allowing incremental adoption. The checker infers expression types (`inferExprType`) and validates compatibility (`typeCompatible`).

```sv
// Basic type annotations — checked at compile time (warnings on mismatch)
signal count: int = 0;
signal name: string = "";
signal active: bool = true;
signal price: float = 9.99;
```

### Planned type system extensions

The following extensions are domain-specific and not yet implemented:

```sv
// Range types
signal opacity: float(0.0..1.0) = 1.0;
signal temperature: int(-40..125) = 20;

// Unknown state (HDL-inspired X-value)
signal data: X | User;  // starts unresolved, compiler forces handling

// Exhaustive enum matching
match phase {
  Phase.Red => { ... }
  Phase.Green => { ... }
  Phase.Yellow => { ... }
  // compile error if not exhaustive
}
```

Prior art for unknown state: Solid's `createResource` handles async `T | undefined`, Leptos uses `Option<T>`. What's different: X-state applied to all signals with propagation semantics (X in any input → X output).

---

## Built-in Functions

| Function | Description |
|---|---|
| `str(x)` | Convert to string |
| `int(x)` | Convert to integer |
| `len(x)` | Length of string or array |
| `contains(s, sub)` | Check if string contains substring |
| `append(arr, item)` | Append item to array |

---

## The `__graph` Artifact

Every `.comb` file compiles to JavaScript that exports `__graph` — a JSON-serializable static dependency graph containing every node (signal, comb, event, view binding, assertion) and every edge (data flow, trigger, write).

No other framework emits this as a build artifact (see docs/research/honest-prior-art.md for details).

This single data structure powers:

- **Circuit Visualization** — render the reactive topology as a live diagram
- **Circuit Diff** — compare `__graph` across two versions to detect topology changes
- **Auto-derived Testing** — combs are pure functions of their deps, so they ARE testable specs
- **Runtime Overlay** — static graph merged with live signal values via `loadStaticGraph()`

---

## The DES Execution Model

The runtime uses a `SimulationEngine` with delta cycles (implemented in `src/runtime/signals.ts`).

```
Event enters → Delta 0: combinational logic (combs) settles
             → Delta 1: non-blocking assignments (<=) applied
             → Delta 2: new combinational changes settle
             → ...repeat until quiescent...
             → DOM commit: only after full stabilization
```

Delta cycles give formal guarantees: combs always see consistent state, concurrent always blocks execute deterministically, DOM updates only after stabilization. Standard topological sorting (Solid, Preact) is a single pass; delta cycles are multi-pass.

---

## Testing

```bash
npx tsx src/cli/test.ts examples/registration.comb
```

The test harness:
1. Instantiates the module headlessly (no DOM)
2. Generates random inputs for all signals
3. Evaluates all `assert` declarations
4. Reports boolean coverage (how many true/false combinations of combs were hit)
5. Returns pass/fail with coverage percentage
