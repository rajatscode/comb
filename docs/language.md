# Comb Language Reference

Comb is a SystemVerilog-inspired reactive UI framework. `.comb` files declare signals, derived values, state transitions, and views in a single module — the compiler extracts a static dependency graph (`__graph`), verifies it, and emits readable JavaScript. The key insight: if the compiler can see your entire reactive topology, it can verify, visualize, diff, and test it.

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

Fires when the named event is triggered (e.g. from a button `@click`). Writes use `<=` (non-blocking assignment). Multiple writes in one block are atomic — all commit together via `batch()`.

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

Compile-time and runtime invariants. The test harness auto-evaluates assertions across generated input combinations.

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

Bidirectional constraints using cells and propagators:

```sv
cell r: int = 255;
cell g: int = 0;
cell b: int = 128;
cell hex: string = "#ff0080";
```

Cells are like signals but support merge semantics — multiple writers converge rather than conflict. The `createPropagator` runtime API enables constraint propagation (e.g. RGB ↔ HSL ↔ Hex). Full compiler syntax (`constraint` keyword) is on the roadmap.

---

## Enums

```sv
enum Phase { Red, Green, Yellow }
```

Used for FSM states. Enum values are available as `Phase.Red`, `Phase.Green`, etc.

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

This single data structure powers:

- **Circuit Visualization** — render the reactive topology as a live diagram
- **Waveform Debugging** — record signal traces over time, like a hardware logic analyzer
- **Circuit Diff** — compare `__graph` across two versions to detect topology changes
- **Auto-derived Testing** — combs are pure functions of their deps, so they ARE testable specs

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
