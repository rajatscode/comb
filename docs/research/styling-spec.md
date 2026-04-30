# Comb Styling Architecture

## Layer 1: Classless CSS Base
Opt-in CSS file (`import 'comb/styles/base.css'`). Semantic HTML looks good by default. Not auto-injected. Inspired by Pico.css / Water.css — clean defaults for headings, buttons, inputs, forms.

## Layer 2: Design Tokens (`token` declarations)
First-class `token` declaration — a signal + CSS custom property in one:
```sv
module App {
  token primary: color = "#0052CC";
  token radius: length = "8px";
  token font: string = "Inter, sans-serif";
}
```

Compiles to:
```javascript
const [primary, setPrimary] = createSignal("#0052CC", { name: 'primary', module: $m, type: 'color', isToken: true });
createEffect(() => { document.documentElement.style.setProperty('--primary', primary()); }, { name: 'token:primary', module: $m });
```

- Token appears as a distinct node type in CircuitGraph (with `isToken: true`)
- Visualizer renders with color swatch for `color` type tokens
- Theme propagation visible in circuit diagram — change a token, watch it flow
- HDL analog: parameter ports on SystemVerilog modules

Also supports inline binding syntax for non-token signals:
```sv
<div style:--theme-primary={primary}>
```

## Layer 3: Scoped Style Blocks
```sv
module Button {
  style { .btn { padding: 8px; background: var(--primary); } }
  view { <button class="btn">Click</button> }
}
```
Compiler rewrites class names with hash suffix (moduleName + className). Emits `<style>` injection in generated code. Cleanup on dispose. Styles can reference token-backed CSS variables.

## Layer 4: Constraint-Based Layout (after propagator networks)
Layout constraints via propagator primitive. Same bidirectional dataflow model. Constraints resolve bidirectionally, layout values are signals in the circuit graph.
```sv
constraint { button.right == input.left - 8px; }
```
Depends on propagator network implementation. On the roadmap after propagators, not deferred indefinitely.
