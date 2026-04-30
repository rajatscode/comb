# Propagator Networks — Technical Spec

## Two New Primitives

### Cell — signal with merge semantics
Can be written by multiple sources. Merge function suppresses writes that don't change the value → convergence.
```typescript
createCell<T>(initial: T, meta: { name, module, merge? }): [() => T, (v: T) => void]
```

### Propagator — multi-directional effect
Watches cells, writes to cells. Both reads AND writes.
```typescript
createPropagator(fn: () => void, meta: { name, module, deps, writes }): void
```

## Convergence
Integer arithmetic roundtrips exactly. Object.is catches no-change. Safety: propagation depth limit (100).

## .comb Syntax
```sv
cell r: int = 255;
constraint rgbHsv {
  (r, g, b) => { h <= rgbToHsv(r,g,b).h; ... }
  (h, s, v) => { r <= hsvToRgb(h,s,v).r; ... }
}
```

## Build Order
1. Runtime: createCell + createPropagator + depth limit (~30 lines)
2. Builtins: rgbToHsv, hsvToRgb, rgbToHex (~40 lines)
3. Hand-written color picker demo (~150 lines) — prove runtime works
4. Compiler: cell/constraint syntax (~100 lines)
5. Compiled .comb version
6. Visualizer: constraint nodes as diamonds, bidirectional edges (~30 lines)
