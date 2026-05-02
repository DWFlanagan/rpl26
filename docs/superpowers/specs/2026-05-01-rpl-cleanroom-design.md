# rpl26 Clean-Room RPL Design

## Project Name

The working project name is `rpl26`. Older repository paths and package metadata may still say `rpn50` until a separate rename pass updates code, scripts, and docs together.

## Purpose

Build a clean-room, HP 48 User RPL-inspired calculator engine that behaves like a persistent object stack and tiny Reverse Polish Lisp runtime, not like a stateless math API and not like an HP ROM emulator.

The first useful version should expose strict RPL-style input through an MCP interface so a chat agent can operate the stack, evaluate program objects, store named values or programs, inspect state, and explain the executed steps.

The HP 48G Series User's Guide and HP 48G Series Advanced User's Reference are the preferred behavioral references because the HP 48 line centers the non-CAS User RPL model that `rpl26` is trying to capture. HP 49/50 material may be used later as secondary clarification only when the behavior is clearly shared and does not pull CAS-era assumptions into the core.

The project may use public manuals and observable calculator behavior as references, but it must not copy HP ROM code, firmware internals, object encodings, System RPL implementation details, or emulator internals.

## User Experience

The user can give a strict command line such as `2 3 +`, `<< 2 3 + >> EVAL`, `{ 1 2 3 } DUP`, or `<< 1 + >> 'INC' STO 41 INC`. The calculator parses the line into RPL objects and executable names, mutates one persistent stack, and returns the stack plus a trace.

The assistant may translate natural language into strict command lines, but that translation is outside the core. The core remains deterministic and testable.

## First Milestone

Milestone 1 is a small "RPL identity slice." It should demonstrate:

- A dynamic stack with level 1 as the top of stack.
- A typed object model with real numbers, bare names, quoted names, program objects, list objects, and strings.
- Program objects delimited by `<< ... >>` or `« ... »` that are pushed inertly and executed only by `EVAL` or by evaluating a global name that stores a program.
- Global variables through `object 'NAME' STO`.
- Name evaluation through built-in command lookup first, then global variable lookup.
- Real-number arithmetic and basic stack manipulation.
- List and string objects as inert first-class values.
- Persistent session state and recent trace through MCP tools.

Milestone 1 intentionally excludes HP calculator compatibility as a blanket promise. It is inspired by HP 48 User RPL's object stack and evaluation model, not by binary object formats, menus, flags, directories, CAS behavior, or System RPL.

## RPL Semantics For Milestone 1

### Objects

The core object union should include:

- `real`: JavaScript number-backed real value.
- `name`: bare executable name parsed from input, such as `DUP`, `x`, or `INC`.
- `quotedName`: literal name object parsed from input such as `'INC'`.
- `program`: ordered body of RPL objects, parsed from `<< ... >>` or `« ... »`.
- `list`: ordered inert collection parsed from `{ ... }`.
- `string`: inert text parsed from `"..."`.

Objects are immutable by convention. Core operations should return cloned or fresh state objects so tests can assert atomic behavior.

### Stack

Internally the stack may be an array with the top at the end. Display functions must return stack entries in HP-style level order: deepest visible entry first, level 1 last. For stack `[2, 3, 5]`, display should be levels 3, 2, 1.

Stack commands:

- `DUP`: duplicate level 1.
- `DROP`: remove level 1.
- `SWAP`: exchange levels 1 and 2.
- `OVER`: copy level 2 to level 1.
- `CLEAR`: clear the stack.

### Evaluation

Parsing constructs objects. Evaluation decides what to do with each object.

Top-level `execute(input)` should parse the input and evaluate each parsed object left to right using command-line semantics:

- `real`, `quotedName`, `program`, `list`, and `string` are pushed.
- `name` is evaluated.

Evaluating a `name` should:

1. Execute a built-in command if the name matches one.
2. Otherwise look up a global variable.
3. If the global value is a `program`, execute its body.
4. If the global value is any other object, push that object.
5. If no command or variable exists, return `UndefinedName`.

Evaluating a `program` through `EVAL` should execute its body left to right with the same object rules. A nested program object encountered inside a running program is pushed, not automatically executed.

### Arithmetic

Arithmetic commands operate only on `real` objects:

- Binary: `+`, `-`, `*`, `/`.
- Unary: `NEG`, `INV`, `SQ`, `SQRT`.

Type mismatch, stack underflow, division by zero, and square root of a negative real should be explicit errors. Failing commands must not partially mutate the stack or global variables.

### Variables

`STO` consumes level 2 as the value and level 1 as a `quotedName`. It stores the value in a session-global map and removes both inputs from the stack.

Examples:

- `5 'A' STO A` leaves `5`.
- `<< 1 + >> 'INC' STO 41 INC` leaves `42`.

Variables are global only in Milestone 1. Directories, purging, local variables, and soft-menu behavior are deferred.

### Lists And Strings

Lists and strings are inert objects in Milestone 1. They can be pushed, duplicated, dropped, stored in variables, and returned through MCP. No list arithmetic, mapping, decomposition commands, or string processing commands are required yet.

### Trace

Each evaluated top-level object or program-body object should produce a trace entry with:

- Source label: the original input fragment when available.
- Before stack.
- After stack.
- Whether it succeeded.
- Error value when it failed.

Trace does not need to emulate HP display formatting. It should be practical for debugging and teaching.

## Parser

The parser should be strict and recursive.

Supported syntax:

- Real literals: `14`, `14.75`, `-123.4`, `1.23E2`, `1.23e-2`.
- Bare names: non-whitespace atoms that are not delimiters, strings, quoted names, or numbers.
- Quoted simple names: `'A'`, `'inc_1'`.
- Programs: `<< ... >>` and `« ... »`, normalized internally to `program`.
- Lists: `{ ... }`.
- Strings: `"..."` with minimal escapes for `\"` and `\\`.

Rejected in Milestone 1:

- Algebraics such as `'A+B'`.
- Complex numbers.
- Arrays.
- Units.
- Binary integers.
- Comments.
- Locale decimal commas.
- Optional closing quote shortcuts.
- Full HP character-set behavior.

## MCP Interface

The initial MCP server should expose one persistent default session:

- `execute`: parse and evaluate a strict command string.
- `get_stack`: return stack entries with level labels.
- `clear`: reset stack, variables, and recent trace.
- `get_trace`: return recent trace entries.
- `get_variables`: return global variable names and values.

Later versions may add named sessions, but Milestone 1 should avoid that complexity.

## Testing Strategy

Development should be test-driven:

- Parser tests for recursive object syntax and syntax errors.
- Core tests for stack commands, arithmetic, atomic errors, and immutable state.
- Evaluator tests for programs, `EVAL`, `STO`, global name lookup, and stored programs.
- Session tests for persistence and trace.
- MCP tests for the exported tool handlers and registered server behavior.
- Conformance tests for the small RPL identity examples in this spec.

## Deferred Work

Deferred features include:

- HP UI, keyboard, menus, flags, directories, and display formatting.
- CAS, algebraic simplification, symbolic manipulation, exact arithmetic, units, complex numbers, matrices, arrays, and graphics objects.
- Local variables, loops, conditionals, error trapping, and program debugging.
- System RPL, `SYSEVAL`, `LIBEVAL`, ROM behavior, and firmware compatibility.
- Automated manual ingestion.
- GUI or menu bar app.

## Success Criteria

Milestone 1 is successful when a user can run these through MCP and get persistent, traceable results:

- `2 3 +` -> stack contains `5`.
- `<< 2 3 + >> EVAL` -> stack contains `5`.
- `{ 1 2 3 } DUP` -> stack contains two equal list objects.
- `5 'A' STO A` -> stack contains `5`.
- `<< 1 + >> 'INC' STO 41 INC` -> stack contains `42`.

The implementation should be clear, deterministic, clean-room, and small enough to extend without rewrites.
