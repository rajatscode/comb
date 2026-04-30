# Final Novelty Assessment

## Genuinely Novel (Defensible)
1. **Static __graph artifact** (9/10) — no framework exports reactive dep graph as compile artifact
2. **Circuit diff between versions** (9/10) — nobody diffs reactive wiring between code versions
3. **Static→runtime graph unification** (8/10) — loadStaticGraph + verifyGraph for drift detection
4. **Compiler-verified constraint blocks** (7/10) — sensitivity verification on propagator clauses
5. **Continuous assertions as graph nodes** (7/10) — HDL-style assert always, visible in circuit
6. **Unified pipeline** (8/10) — source → compiler → static graph → runtime → viz/waveform/diff/testing

## Overstated (Has Prior Art)
- Compile-time dep verification → Svelte, React Compiler, Marko
- Directional ports → Angular @Input/@Output since 2016
- Reactive graph visualization → SolidJS/Angular devtools, NoFlo
- Waveform debugging → Redux DevTools with different skin
- Bidirectional binding → MobX/Vue writable computed

## Lead With
Circuit diff. "First framework to diff reactive wiring between code versions."

## Pitch As
Paradigm, not framework. "What if UI development worked like chip design?"

## Don't Claim
"First dependency visualization" or "first time-travel debugging" — you'll get called out.

## Do Claim
"First to export reactive graph as compile artifact" and "first to diff reactive wiring between versions."
