# Comb Roadmap

## Completed
1. ~~Compiler with verification pass~~ — 9 tests
2. ~~Codegen with __graph export~~ — 5 tests
3. ~~Runtime with CircuitGraph~~ — 13 tests

## Completed
4. ~~View/DOM wiring (counter in browser)~~
5. ~~CircuitGraph Visualizer (DOM nodes + canvas edges, pulse animations)~~
6. ~~Demo 1: Dependency Debugger (registration form + live circuit + compiler errors)~~

## In Progress
7. Demo 2: Waveform Debugger (stock ticker + canvas waveform traces)

## Upcoming
8. loadStaticGraph unification (static→runtime graph, drift detection)
9. Sensitivity-triggered always blocks (closes thesis gap)
10. Demo 3: Circuit Diff (topology comparison across refactors)
11. Propagator Networks (bidirectional constraints, RGB/HSV color picker)
12. Full framework features: HMR, module composition, lifecycle hooks, scoped styles, event modifiers

## Novelty Scorecard (from researcher)
- Static graph export (__graph): 10/10 — no framework does this
- Compiler-verified comb deps: 10/10 — no framework does this
- Sensitivity-triggered always blocks: not yet implemented (closes 8/10 → 10/10 gap)
- View binding graph nodes: not yet implemented (fine-grained DOM→signal mapping)
- Propagator networks: not yet attempted (genuinely new territory)
