# Numeric Backend Strategy

## Decision

Keep `rpl26` implemented in TypeScript for the core runtime, and use JavaScript `number` values for early real-number behavior.

Do not switch the project to Python or NumPy now. The current center of gravity is a User RPL runtime: parsing, stack semantics, programs, variables, command dispatch, REPL ergonomics, MCP access, and later GUI integration. TypeScript fits that shape better than Python, and NumPy does not solve the language-runtime problems that matter most in the early milestones.

## Why TypeScript Stays Primary

JavaScript `number` is IEEE-754 double precision, which is a reasonable initial match for calculator-style real arithmetic. It is enough for scalar arithmetic, comparisons, stack programming, program control flow, formatting experiments, and most manual-derived examples that do not depend on advanced numeric subsystems.

TypeScript also keeps the runtime easy to embed in a CLI, REPL, MCP server, editor integration, and menu bar GUI without crossing process boundaries for every stack operation.

## Boundary

The core runtime should not become a direct wrapper around a math library. RPL objects, evaluation, stack effects, errors, and command metadata remain owned by `rpl26`.

Math libraries may be introduced later behind a small internal interface when a concrete command family requires them. Candidate triggers include complex numbers, statistical functions, matrices, numerical solvers, or special functions.

CAS, symbolic simplification, exact algebra, and HP ROM compatibility remain out of scope unless explicitly moved out of the deferred bucket in a future roadmap revision.

## Numeric Object Model

Early commands may store reals directly as JavaScript numbers inside the existing RPL object model.

Before adding complex numbers, matrices, exact values, or broad numerical libraries, introduce an explicit numeric boundary so command implementations do not depend on raw JavaScript arithmetic everywhere. The boundary should preserve RPL-level behavior first: object type checks, stack effects, error names, display formatting, and manual-derived examples.

One likely shape is:

```ts
type RplNumber =
  | { kind: "real"; value: number }
  | { kind: "complex"; re: number; im: number };
```

This shape is illustrative, not a commitment to complex numbers in the near roadmap.

## Future Backend Options

When richer numeric behavior becomes necessary, evaluate the smallest backend that supports the required command family:

- Use plain TypeScript and JavaScript `number` for scalar real arithmetic.
- Use a focused JavaScript math library for moderate statistics, complex numbers, or matrix operations.
- Use a WASM-backed numerical library if performance or LAPACK-style algorithms become important.
- Use a Python sidecar only if a future integration specifically benefits from Python's scientific ecosystem and the process boundary is worth the complexity.

NumPy remains a possible future sidecar, not the main runtime foundation.

## Manual Extraction Relationship

Manual extraction should classify commands by behavior and scope, not by implementation backend. A structured HP 48 manual artifact can label commands as core, deferred non-CAS, CAS, system, UI, or unknown without deciding whether future math is implemented with plain TypeScript, a JavaScript library, WASM, or Python.

This keeps the manual work useful immediately while avoiding premature dependency choices.
