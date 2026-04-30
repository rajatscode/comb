# Propagator Networks — Technical Spec (Revised 2026-04-30)

## Prior Art

This is not a novel concept. Acknowledge and cite:
- **Sussman & Radul (2009)** — "Revised Report on the Propagator Model." Theoretical foundation. Includes UI example (RGB/HSV color widget).
- **dthompson / Spritely (FOSDEM 2026)** — Working propagator-based FRP for web UI in Scheme/WASM. Handles cyclic deps without glitches. Direct prior art.
- **Cassowary.js** — Constraint solver for layout (linear arithmetic only, not general reactive).

**What Comb adds:** Compiling `constraint { }` blocks from a DSL with static analysis, `__graph` integration, and compiler verification of well-formedness. Not the concept — the engineering into a practical compiled framework.

## Two Primitives

### Cell — signal with merge semantics
Can be written by multiple sources. Merge function suppresses writes that don't change the value → convergence.
```typescript
createCell<T>(initial: T, meta: { name, module, merge? }): [() => T, (v: T) => void]
```

### Propagator — multi-directional effect
Watches cells, writes to cells. Both reads AND writes are declared.
```typescript
createPropagator(fn: () => void, meta: { name, module, deps, writes }): void
```

## Convergence
Integer arithmetic roundtrips exactly. `Object.is` catches no-change. Safety: propagation depth limit (100).

## .comb Syntax
```sv
cell r: int = 255;
constraint rgbHsv {
  (r, g, b) => { h <= rgbToHsv(r,g,b).h; ... }
  (h, s, v) => { r <= hsvToRgb(h,s,v).r; ... }
}
```

## Status
- Runtime (`createCell`, `createPropagator`): **Implemented and working.**
- Compiler syntax (`cell`, `constraint` keywords): **Parsed and partially compiled.**
- End-to-end compilation: **Being hardened.** The color picker demo currently uses the runtime API directly — it needs to compile from `color-picker.comb` through the compiler.

## Build Order
1. ~~Runtime: createCell + createPropagator + depth limit~~ Done
2. ~~Builtins: rgbToHsv, hsvToRgb, rgbToHex~~ Done
3. ~~Hand-written color picker demo~~ Done — but needs to be replaced with compiled version
4. ~~Compiler: cell/constraint syntax~~ Partial
5. **Next:** Compiled .comb version replaces hand-written demo
6. **Next:** Visualizer: constraint nodes as diamonds, bidirectional edges
