# rpl26 Milestone 3 Design

## Reference Baseline

Milestone 3 should follow HP 48 User RPL control-flow behavior where that behavior is available from public manuals or structured manual extraction. HP 49/50 material remains secondary and must not introduce CAS-era assumptions.

The manual extraction does not need to be perfect before Milestone 3 starts. Instead, each control-flow form should be implemented from a small source-labeled behavior note, test fixture, or manually checked excerpt. Forms whose details are not yet confirmed should stay deferred or provisional.

## Purpose

Milestone 3 turns `rpl26` from a useful stack-command evaluator into a small programming environment. It adds repeated execution, loop-local names, nested control-flow handling, and clearer traces/errors for programs that do more than a straight-line calculation.

This milestone is about User RPL language shape, not broad HP command coverage. CAS, symbolic algebra, exact arithmetic, units, matrices, plotting, menus, flags, directories, and HP ROM compatibility remain out of scope.

## Scope

Milestone 3 includes:

- HP-style conditional syntax with `IF test-clause THEN ... END` and `IF test-clause THEN ... ELSE ... END`.
- Definite loops with `START ... NEXT`.
- Stepped definite loops with `START ... STEP`.
- Named definite loops with `FOR name ... NEXT`.
- Named stepped loops with `FOR name ... STEP`.
- Pre-test indefinite loops with `WHILE ... REPEAT ... END`.
- Post-test indefinite loops with `DO ... UNTIL ... END`.
- Nested control-flow parsing for `IF`, `START`, `FOR`, `WHILE`, and `DO` blocks.
- Loop-local bindings that compose with existing `->` local variables.
- Runtime errors that identify the failing control-flow form and missing delimiter.
- Trace entries that remain readable for nested program execution.
- REPL autocomplete for new control-flow words.
- Source-labeled conformance notes for each implemented form.

Milestone 3 does not include:

- `CASE ... END`, unless conditional coverage expands after the loop forms are stable.
- List mapping, higher-order program combinators, algebraics, CAS commands, matrices, units, graphics, menus, directories, or flags.

## Semantics

### `IF ... THEN ... ELSE ... END`

Milestone 3 should correct conditionals to HP-style program syntax:

```rpl
IF test-clause THEN true-clause END
IF test-clause THEN true-clause ELSE false-clause END
```

`IF` begins the test clause. `THEN` consumes the real truth value produced by that clause. A non-zero value executes the true clause; zero skips it or executes the false clause when `ELSE` is present.

The current Milestone 2 form, `condition IF THEN ... END`, is provisional and does not match the HP 48 User's Guide. Milestone 3 should either remove that form or keep it temporarily as a documented compatibility gap.

### `START ... NEXT`

`START` is a program-only control-flow form. It consumes a start value and an end value from the stack, then evaluates its body once for each integer counter value in the inclusive range.

The loop counter is hidden for `START`; the body does not receive an automatic named variable. This makes `START` useful for repeated side effects on the stack.

The HP 48 User's Guide says the loop clause always executes at least once. `NEXT` increments the hidden counter by `1` after the body runs, then repeats while the new counter value is less than or equal to the finish value. Reversed bounds therefore still execute once with `NEXT`.

Example shape:

```rpl
1 3 START 10 + NEXT
```

### `START ... STEP`

`START ... STEP` is the stepped form of anonymous definite loops. The body leaves an increment value for `STEP`; `STEP` consumes that value, updates the hidden counter, and decides whether to repeat.

Positive increments repeat while the counter is less than or equal to the finish value. Negative increments repeat while the counter is greater than or equal to the finish value. A zero increment should be rejected or guarded to avoid a non-terminating loop.

### `FOR name ... NEXT`

`FOR` is a program-only control-flow form. It consumes a start value and an end value from the stack, binds the loop counter to `name`, and evaluates the body once for each integer counter value in the inclusive range.

The loop variable is local to the loop body. If a global or outer local name has the same spelling, the loop binding shadows it only inside the loop. After the loop finishes, the previous binding is restored.

The HP 48 User's Guide says the loop clause always executes at least once. `NEXT` increments the named counter by `1` after the body runs, then repeats while the new counter value is less than or equal to the finish value. When the loop exits, the loop counter is purged.

Example shape:

```rpl
1 3 FOR i i NEXT
```

### `FOR name ... STEP`

`FOR name ... STEP` is the stepped form of named definite loops. The body leaves an increment value for `STEP`; `STEP` consumes that value, updates the named counter, and decides whether to repeat using the same positive-or-negative comparison rules as `START ... STEP`.

When the loop exits, the loop counter binding is removed and any outer binding is restored.

### `WHILE ... REPEAT ... END`

`WHILE` is a program-only control-flow form with separate test and body clauses.

The evaluator runs the test clause, consumes the real truth value left on level 1, and evaluates the body only when the truth value is non-zero. A false value exits the loop. Non-real truth values are type errors.

Example shape:

```rpl
WHILE condition-program REPEAT body-program END
```

`WHILE` loops need an execution guard so accidental infinite loops fail with a clear runtime error instead of hanging the REPL, MCP server, or future GUI.

### `DO ... UNTIL ... END`

`DO` is a program-only post-test loop form.

The evaluator runs the body clause first, then runs the test clause after `UNTIL`. `END` consumes the real truth value produced by the test clause. A zero value repeats the body; a non-zero value exits the loop.

Because the test runs after the body, the body always executes at least once.

### Nesting

Milestone 3 should replace one-off delimiter scanning with a shared control-flow block scanner. The scanner should understand nested `IF ... THEN ... ELSE ... END`, `START ... NEXT`, `START ... STEP`, `FOR ... NEXT`, `FOR ... STEP`, `WHILE ... REPEAT ... END`, and `DO ... UNTIL ... END` blocks so branch and loop bodies are selected by structure rather than by the first matching word.

Control-flow words outside a valid program form remain ordinary names and should fail as undefined names or invalid operations according to the surrounding evaluator behavior.

### Local Variables

Loop-local bindings should reuse the existing local-binding mechanism used by `->`. Loop variables should shadow outer local variables and globals only in the same way existing `->` locals do.

Milestone 3 should not silently change the evaluator's name-resolution order. If the HP 48 manual audit shows that User RPL locals must shadow builtins differently from the current evaluator, that should become its own explicit compatibility change with tests.

Local program values remain inert unless explicitly evaluated, matching the existing local-variable behavior.

## Errors

Milestone 3 should add or reuse clear errors for:

- missing `NEXT` after `START`;
- missing `STEP` increment or invalid `STEP` placement;
- missing loop variable name after `FOR`;
- missing `NEXT` after `FOR`;
- missing `REPEAT` or `END` after `WHILE`;
- missing `UNTIL` or `END` after `DO`;
- non-real loop bounds;
- non-real step increment;
- non-real `WHILE` condition;
- non-real `DO ... UNTIL` condition;
- loop iteration limit exceeded.

Errors should leave state unchanged when the failing form has not begun executing its body. If an error occurs during a later loop iteration, already completed body effects may remain unless the evaluator already has a transaction model. That behavior should be documented in tests.

## Trace

Trace output should stay useful without pretending to be a debugger.

Milestone 3 should preserve existing per-object trace entries for evaluated body objects, and add enough source context that a failing object inside a loop can be understood. If the current trace model becomes noisy or ambiguous, introduce lightweight fields such as `context` or `depth` rather than a large tracing subsystem.

## Testing

Tests should cover:

- `START ... NEXT` executes the expected number of times.
- `START ... NEXT` executes once for reversed bounds, matching HP 48 post-body testing.
- `START ... STEP` supports positive and negative increments.
- `FOR name ... NEXT` exposes the loop variable and restores shadowed names afterward.
- `FOR name ... NEXT` executes once for reversed bounds, matching HP 48 post-body testing.
- `FOR name ... STEP` supports positive and negative increments.
- `FOR` composes with existing `->` locals.
- `WHILE ... REPEAT ... END` exits on false and consumes real truth values.
- `WHILE` rejects non-real conditions.
- `DO ... UNTIL ... END` runs at least once and exits on non-zero truth values.
- `DO` rejects non-real conditions.
- nested `IF` inside loops and loops inside `IF`;
- nested loops of the same and different kinds;
- delimiter errors for each form;
- loop guard failure for an intentionally non-terminating `WHILE`;
- REPL autocomplete includes the new words.

## Manual Audit

Before implementation, create small source-labeled notes for:

- `START ... NEXT`;
- `START ... STEP`;
- `FOR name ... NEXT`;
- `FOR name ... STEP`;
- `WHILE ... REPEAT ... END`;
- `DO ... UNTIL ... END`;
- HP-style `IF test-clause THEN ... END`.

The notes can be extracted manually from the HP 48 documentation while the larger structured manual artifact is still in progress.
