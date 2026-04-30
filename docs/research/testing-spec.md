# Circuit-Aware Testing — Research Findings (Revised 2026-04-30)

## Novelty: 6/10 (revised down from 8/10)

Revised after discovering Quickstrom (PLDI 2022) which applies LTL to web app testing, and after acknowledging that property-based testing and constrained random are established techniques. The *mechanism* of testing reactive UI is well-studied. What's novel is auto-deriving tests from the `__graph` artifact.

## Prior Art

| Technique | Prior Art | How close? |
|---|---|---|
| Temporal logic for web apps | **Quickstrom (PLDI 2022)** — LTL with Specstrom language | Direct prior art |
| Property-based testing | QuickCheck (1999), fast-check, Hypothesis | Decades old |
| State machine test generation | **XState @xstate/test** — path coverage via Dijkstra | Established |
| Constraint solving for test gen | SMT solvers (Z3, CVC5) | Mature |
| Fuzzing | AFL, libFuzzer, web fuzzing tools | Mature |

## What's Genuinely Novel

The **`__graph` artifact enables auto-derivation** — the system knows what signals exist, what types they have, what combs derive from them, and what assertions constrain them. This is structural information no other framework exposes.

| Concept | Novelty | Why |
|---|---|---|
| Auto-deriving test targets FROM `__graph` | 7/10 | Nobody else has the artifact to derive from |
| Signal-level coverage metrics | 6/10 | Toggle/range coverage is standard in HDL, novel for web |
| Combs as executable specs | 6/10 | Interesting framing but `computed` values in any framework are also derivable specs — the difference is compile-time static knowledge |

## Key Insight
Comb definitions ARE executable specifications. `comb canSubmit = usernameValid && emailValid && passwordStrong` automatically gives you the assertion `assert canSubmit == (usernameValid && emailValid && passwordStrong)`. The circuit graph tells you what to test and what to verify — without the developer writing test cases manually.

## The Circuit Graph Enables
1. Auto-derive WHAT to test (signals, types, valid ranges from `__graph`)
2. Auto-derive WHAT to verify (comb definitions = invariants)
3. Signal-level coverage (toggle, range, path, cross coverage)
4. Coverage-driven feedback loop (bias toward uncovered states)

## Testbench Concept (UVM-inspired)
```
testbench RegistrationTest for RegistrationForm {
  driver { randomize(username, { len: [0..20] }); }
  monitor { observe(canSubmit, usernameValid, emailValid); }
  scoreboard { assert canSubmit == (usernameValid && emailValid && passwordStrong && passwordsMatch); }
  coverage { cross usernameValid, emailValid, passwordStrong, passwordsMatch; }
}
```

## Temporal Testing (Planned)
Embedding temporal assertions in the component (not external, like Quickstrom):
```sv
assert temporal @(posedge submitted) eventually(!loading) within 10s;
```
The difference from Quickstrom: assertions live inside the component as graph nodes, running at dev time, not as a separate testing harness observing the DOM.

## Key Enabler
Most frameworks don't expose their reactive graph. Comb's `__graph` makes this structurally possible. The novelty is not in testing techniques (all established) but in having the compile-time artifact that enables auto-derivation.
