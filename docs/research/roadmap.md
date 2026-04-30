# Comb Roadmap — Status

## Phase 1: Foundation (Complete)

1. ~~Compiler with verification pass~~ ✅ (31 tests)
2. ~~Codegen with __graph export~~ ✅
3. ~~Runtime with CircuitGraph~~ ✅ (17 tests)
4. ~~View/DOM wiring~~ ✅
5. ~~CircuitGraph Visualizer~~ ✅
6. ~~Demo 1: Dependency Debugger~~ ✅ (coverage heatmap + auto-test)
7. ~~Demo 2: Waveform Debugger~~ ✅
8. ~~loadStaticGraph unification~~ ✅ (12 tests)
9. ~~Sensitivity-triggered always blocks~~ ✅
10. ~~Demo 3: Circuit Diff~~ ✅
11. ~~Propagator Networks~~ ✅ (color picker demo)
12. ~~Assert blocks + __test export~~ ✅
13. ~~Token declarations~~ ✅
14. ~~Scoped style blocks~~ ✅
15. ~~Module composition with directional ports~~ ✅
16. ~~Event modifiers~~ ✅
17. ~~Lifecycle hooks~~ ✅
18. ~~Cell/constraint compiler syntax~~ ✅
19. ~~View binding graph nodes~~ ✅
20. ~~HMR with state preservation~~ ✅
21. ~~Constraint-based layout (Kiwi)~~ ✅
22. ~~Demo 5: Constraint Layout~~ ✅
23. ~~Landing page~~ ✅
24. ~~Online playground~~ ✅ (7 examples)
25. ~~Language docs (HTML)~~ ✅
26. ~~README update~~ ✅
27. ~~Color picker compiled from .comb~~ ✅
28. ~~UI cleanup pass~~ ✅
29. ~~Practical value prop~~ ✅

## Phase 2: Fix Foundation (Complete)

30. ~~All demos compile from `.comb`~~ ✅ (stock ticker, color picker, resizable layout)
31. ~~`constraint` blocks compile end-to-end through the compiler~~ ✅ (with constraint hardening)
32. ~~Type-check parsed annotations~~ ✅ (warnings via `verify.ts`)

## Phase 3: DES Execution Model (Complete)

33. ~~Edge-triggered sensitivity: `@(posedge x)` / `@(negedge x)` in lexer/parser/codegen/runtime~~ ✅
34. ~~Delta cycle execution model: `SimulationEngine` with real delta cycles~~ ✅
35. ~~Non-blocking assignment gets real scheduling semantics (end of delta)~~ ✅

## Phase 4: Type System (Partial)

36. ~~Type checking with warnings on mismatches~~ ✅ (warnings, not errors)
37. Port compatibility checking across modules
38. Range types: `signal x: int(0..255)`
39. X-value / unknown signal state with propagation semantics
40. Exhaustive enum matching

## Phase 5: Temporal Assertions (Complete)

41. ~~SVA-lite syntax: `assert temporal @(event) eventually/always/next(condition) within duration`~~ ✅
42. ~~Runtime temporal logic evaluator over event stream~~ ✅
43. ~~Temporal assertion nodes in `__graph`~~ ✅

## Phase 1 Stats
- 45 commits since clean rewrite
- ~15,000 lines added
- 60 tests (31 compiler + 17 runtime + 12 circuit)
- 5 demos, all QA verified
- 7 playground examples
- Proper HTML docs with sidebar nav
