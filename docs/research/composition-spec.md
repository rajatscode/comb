# Module Composition — Directional Ports

## Port Types
| Port | Direction | Compiler enforces |
|------|-----------|-------------------|
| `input` | Parent → child | Parent must provide (unless default). Child cannot write. |
| `output` | Child → parent | Child must write. Parent can read. |
| `#(PARAM)` | Compile-time constant | Must be literal/const. Cannot change at runtime. |

## Syntax
```sv
module Counter #(MAX: int = 100) {
  input initial: int = 0;
  output count: int = 0;
  comb atMax = count >= MAX;
  always @(increment) { count <= atMax ? count : count + 1; }
  view { <span>{count}</span> <button @click=increment>+</button> }
}

module App {
  signal start: int = 0;
  signal counterValue: int = 0;
  view {
    <Counter #MAX=50 initial={start} count:={counterValue} />
    <p>Counter is at: {counterValue}</p>
  }
}
```

## Binding Syntax
| Syntax | Meaning |
|--------|---------|
| `initial={start}` | Wire input: parent signal → child |
| `count:={counterValue}` | Wire output: child → parent signal |
| `#MAX=50` | Set parameter (compile-time constant) |
| `initial=42` | Static input value |

## Compiler Verification
1. Required inputs connected (missing = error)
2. Inputs not written by child (error)
3. Outputs written by child (warning if undriven)
4. Output bindings target mutable signals (error if wired to comb)
5. Parameters are const (error if dynamic)

## CircuitGraph
Ports appear as nodes at module boundaries. Input ports have incoming edges from outside, output ports have outgoing edges. Modules render as grouped boxes in the visualizer.

## __graph Extension
```javascript
{ ports: [{ name, direction, type, default }], params: [{ name, type, default }] }
```

## Codegen
Output binding = effect calling parent's setter when child signal changes.
Bulk connect (`.*`) deferred to v2.
