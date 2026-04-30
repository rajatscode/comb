# Comb Styling Architecture

## Layer 1: Classless CSS Base
Opt-in CSS file (`import 'comb/styles/base.css'`). Semantic HTML looks good by default. Not auto-injected.

## Layer 2: Design Tokens as Signals
Use `style:--prop={signal}` binding syntax in views. No new signal types.
```sv
<div style:--theme-primary={primary}>
```
Compiles to: `createEffect(() => { el.style.setProperty('--theme-primary', primary()); })`
Signal appears in CircuitGraph like any other signal. Theme propagation visible in visualizer.

## Layer 3: Scoped Style Blocks
```sv
module Button {
  style { .btn { padding: 8px; } }
  view { <button class="btn">Click</button> }
}
```
Compiler rewrites class names with hash suffix (moduleName + className). Emits `<style>` injection in generated code. Cleanup on dispose.

## Layer 4: Constraint-Based Layout
Deferred indefinitely. Kiwi solver + propagator networks — research project, not a feature.
