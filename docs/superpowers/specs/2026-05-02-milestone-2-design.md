# rpl26 Milestone 2 Design

## Reference Baseline

Milestone 2 should be audited against HP 48 User RPL behavior before the command set is treated as stable. The HP 48G Series User's Guide and HP 48G Series Advanced User's Reference are the preferred sources. HP 49/50 material is secondary and should not introduce CAS-era assumptions.

The current Milestone 2 implementation is a useful provisional runtime slice. Any command whose semantics differ from HP 48 User RPL should be corrected, documented as an intentional divergence, or moved out of the compatibility path.

Milestone 3 corrected the conditional model to HP-style `IF test-clause THEN ... END` syntax. The Milestone 2 conditional notes below describe the provisional implementation that existed before the HP 48G control-flow audit.

## Purpose

Milestone 2 grows `rpl26` from an RPL identity slice into a small everyday stack-programming environment. It adds practical stack words, basic list operations, comparison words that produce truth values, and a first conditional form.

CAS, symbolic algebra, exact arithmetic, units, matrices, plotting, and full HP compatibility remain out of scope.

## Scope

Milestone 2 includes:

- Stack utilities: `DUP2`, `DROP2`, `ROT`, `PICK`.
- List utilities: `->LIST`, `LIST->`, `SIZE`, `GET`.
- Truth values represented as real `1` and real `0`.
- Comparison words: `==`, `<>`, `<`, `>`, `<=`, `>=`.
- Boolean literals: `TRUE`, `FALSE`.
- Conditional form inside programs: `condition IF THEN ... ELSE ... END`, with `ELSE` optional.
- REPL autocomplete and README examples for the new words.

Milestone 2 does not include loops, list arithmetic, list mapping, algebraics, CAS commands, matrices, units, or UI behavior.

## Semantics

### Stack Utilities

- `DUP2`: duplicate levels 2 and 1, preserving order.
- `DROP2`: drop levels 2 and 1.
- `ROT`: rotate level 3 to level 1: `a b c ROT` -> `b c a`.
- `PICK`: consume a positive integer `n` from level 1 and copy current level `n` from the remaining stack.

### Lists

- `n ->LIST`: consume a non-negative integer `n` from level 1 and the `n` objects beneath it, producing one list object in the same order.
- `LIST->`: consume a list and push its items followed by the item count.
- `SIZE`: return list length.
- `GET`: consume a list and a one-based integer index, then push the selected item.

### Booleans And Comparisons

Truth values use real objects:

- true: `{ kind: "real", value: 1 }`
- false: `{ kind: "real", value: 0 }`

`TRUE` and `FALSE` push those values.

`==` and `<>` compare RPL objects structurally while ignoring `source` metadata. Ordering comparisons operate on real objects only.

### Conditionals

Inside a program, the evaluator recognizes:

```rpl
condition IF THEN true-body ELSE false-body END
```

`condition` must leave a real truth value on level 1. Non-zero is true. `IF` consumes the condition. If true, it evaluates `true-body`; if false, it evaluates `false-body` when present. `ELSE` is optional.

Conditionals are program syntax, not top-level parser syntax. `IF`, `THEN`, `ELSE`, and `END` outside a valid program conditional are invalid commands or undefined names.

## Testing

Tests should cover:

- Each stack utility, including underflow and invalid `PICK` counts.
- List construction, decomposition, `SIZE`, `GET`, and atomic errors.
- Comparison truth values and type mismatch.
- Conditional true branch, false branch, omitted `ELSE`, and atomic error behavior.
- CLI/REPL visibility through autocomplete and conformance examples.

## Manual Audit

Before adding more commands, create or import a structured HP 48 manual extraction artifact and label each relevant command as `core`, `cas`, `deferred-non-cas`, `system`, `ui`, or `unknown`.

The first audit pass should check Milestone 2 assumptions for `DUP2`, `DROP2`, `ROT`, `PICK`, `->LIST`, `LIST->`, `SIZE`, `GET`, truth values, comparisons, and `IF THEN ELSE END`.
