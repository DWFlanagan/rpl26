# User RPL Function Roadmap Stub

## Purpose

This document is a placeholder for a future User RPL/core function roadmap. The product roadmap describes user-visible milestones for `rpl26`; this function roadmap should describe how HP 48G User RPL words are classified, audited, implemented, deferred, or intentionally left out.

The roadmap should stay focused on User RPL and core calculator behavior. It should not become a full HP command-table import.

## Scope

Included:

- Core stack, variable, program, control-flow, object, and real-number words.
- Small command families that make stack programming useful without changing the project into a CAS or ROM-compatibility effort.
- Manual-backed notes for behavior that affects runtime semantics, stack effects, calculator modes, or object types.

Out of scope for this roadmap:

- CAS and symbolic algebra.
- System RPL and ROM behavior.
- Binary HP object formats.
- Broad plotting, matrices, and other large subsystems unless a future product roadmap explicitly moves them into scope.

## Roadmap Shape

Each future command family should eventually get a short entry with:

- Command family.
- Manual source anchors.
- Supported object types.
- Required calculator modes or state.
- Implementation scope.
- Known HP divergences.
- Test fixture plan.
- Status: `supported`, `planned`, `deferred`, `excluded`, or `unknown`.

## Initial Buckets

### Already Started

- Stack manipulation and stack inspection words.
- Basic real arithmetic.
- Variables, quoted names, programs, `EVAL`, and local variables.
- Structured control flow.
- Lists, strings, tagged objects, and command help.

### Near-Term Core Math

- Real-number functions such as trigonometric, inverse trigonometric, logarithmic, exponential, power, and constant words.
- Calculator mode words needed for those functions, especially angle modes such as `DEG`, `RAD`, and `GRAD`.

### Later Core Families

- Practical non-CAS numeric helpers where manual behavior is clear and small enough for source-checked implementation.
- Additional object operations for supported object types when they fit the existing object model.

### Explicitly Deferred Here

- Units remain a product-roadmap milestone because they require a distinct object model.
- Complex numbers, matrices, plotting, exact algebra, and symbolic transformations remain outside this User RPL/core function roadmap until the product roadmap changes.

## Clean-Room Rule

Implementation plans that add HP-like behavior must refer to clean-room notes under `docs/superpowers/specs/`, not copied manual text. Those notes should name the command or behavior, cite the HP 48G Series User's Guide and local extraction line range or section, summarize behavior in original words, and call out implementation consequences and uncertainties.
