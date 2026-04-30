# Comb Roadmap

## Completed
1. ~~Compiler with verification pass~~ — 9 tests
2. ~~Codegen with __graph export~~ — 5 tests
3. ~~Runtime with CircuitGraph~~ — 13 tests

## In Progress
4. View/DOM wiring (counter in browser)

## Upcoming
5. CircuitGraph Visualizer (SVG from __graph, view binding nodes)
6. Demo 1: Dependency Debugger (form validation + live circuit + compiler error showcase)
7. Sensitivity-triggered always blocks (closes thesis gap: always @(count, name) with compiler-verified reads)
8. Demo 2: Waveform Debugger (signal history + time-series traces + assertions)
9. Demo 3: Circuit Diff (topology comparison across refactors)
10. Propagator Networks (bidirectional constraints, RGB/HSV color picker demo)

## Novelty Scorecard (from researcher)
- Static graph export (__graph): 10/10 — no framework does this
- Compiler-verified comb deps: 10/10 — no framework does this
- Sensitivity-triggered always blocks: not yet implemented (closes 8/10 → 10/10 gap)
- View binding graph nodes: not yet implemented (fine-grained DOM→signal mapping)
- Propagator networks: not yet attempted (genuinely new territory)
