# Codegen Specification

## Output Format
ES modules. Two exports per .comb file:
- `__graph` — static topology (JSON-serializable, no functions)
- `ModuleName(root)` — factory function that mounts into a DOM element

## Runtime API Target
```typescript
createSignal<T>(initial: T, meta: { name: string, module: string, type?: string }): [() => T, (v: T) => void]
createComb<T>(fn: () => T, meta: { name: string, module: string, deps: string[] }): () => T
createEffect(fn: () => void | (() => void), meta: { name: string, module: string }): void
batch(fn: () => void): void
```

## Key Decisions
- Module = factory function, not class
- Signals read via function call: count() not count.value
- Events are plain functions, @click=increment → addEventListener
- View compiles to imperative DOM, no VDOM
- Text interpolation splits into Text nodes, bound via effects
- __graph is static, JSON-serializable, diffable
- @if/@for use comment anchors + container spans, full re-render
- @bind is two-way: effect for read, addEventListener for write

See architect's full spec for examples of each view compilation pattern.
