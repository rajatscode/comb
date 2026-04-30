# Honest Prior Art Assessment

## Summary: What's Actually Novel vs What Exists

| Claim | Prior Art | Novelty |
|-------|-----------|---------|
| Compile-time dep verification | Svelte 3/4, React Compiler, Marko, typed-language frameworks | 2/10 |
| Static reactive graph as artifact | Nobody exports binding-level dep graph as JSON in compiled output | **8/10** |
| Circuit diagram visualization | SolidJS devtools, Angular Signal Graph, Jotai, NoFlo, RxViz | 4/10 |
| Waveform debugging | Redux DevTools, Reactime, Recoilize, RxJS marble diagrams | 2/10 |
| Directional ports | Angular @Input/@Output since 2016, Elm ports, Web Components | 1/10 |

## The Defensible Thesis

**The COMBINATION is novel, not any individual piece.** No single framework does all of:
1. Compiler extracts reactive dep graph → produces errors (like Svelte/Marko)
2. Exports that graph as an inspectable JSON artifact (**nobody does this**)
3. Uses that artifact for visualization (like Angular/SolidJS devtools)
4. Runtime overlays live values on the static graph

**The static graph artifact (`__graph`) is the keystone.** Only genuinely unprecedented piece.

**The HDL mental model is the differentiator, not the technology.** Applying the paradigm (static netlist → simulation → waveform) as a unified framework design philosophy is novel.

## What to Stop Claiming
- Individual features as novel (they aren't)
- Directional ports as novel (Angular has had this since 2016)
- Waveform debugging as novel (Redux DevTools with different skin)

## What to Lean Into
- The static graph export as compile-time artifact
- The unified pipeline: compile → static graph → runtime overlay → visualization
- The HDL mental model as paradigm, not feature set
