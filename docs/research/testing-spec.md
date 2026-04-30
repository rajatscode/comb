# Circuit-Aware Testing — Research Findings

## Novelty: 8/10 (Genuinely Novel)

### Key Insight
Comb definitions ARE executable specifications. `comb canSubmit = usernameValid && emailValid && passwordStrong` automatically gives you the assertion `assert canSubmit == (usernameValid && emailValid && passwordStrong)`. The circuit graph enables auto-deriving tests, invariants, and coverage metrics.

## What's Novel (No Prior Art)
| Concept | Novelty |
|---------|---------|
| Constrained random for UI signals | 9/10 |
| Auto-deriving tests FROM circuit graph | 9/10 |
| Signal-level coverage metrics | 9/10 |
| UVM testbench architecture for web | 8/10 |
| Fuzzing reactive state layer | 8/10 |

## What's Not Novel
- Property-based testing mechanism (fast-check, QuickCheck — decades old)
- State machine test generation (XState)
- Constraint solving (SMT solvers)

## The Circuit Graph Enables
1. Auto-derive WHAT to test (signals, types, valid ranges from __graph)
2. Auto-derive WHAT to verify (comb definitions = invariants)
3. Signal-level coverage (toggle, range, path, cross coverage)
4. Coverage-driven feedback loop (bias toward uncovered states)

## Testbench Concept
```
testbench RegistrationTest for RegistrationForm {
  driver { randomize(username, { len: [0..20] }); }
  monitor { observe(canSubmit, usernameValid, emailValid); }
  scoreboard { assert canSubmit == (usernameValid && emailValid && passwordStrong && passwordsMatch); }
  coverage { cross usernameValid, emailValid, passwordStrong, passwordsMatch; }
}
```

## Key Enabler
Most frameworks don't expose their reactive graph. Comb's __graph + CircuitGraph makes this structurally possible.
