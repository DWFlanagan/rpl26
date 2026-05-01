# HP 50g Clean-Room Calculator Design

## Purpose

Build a clean-room, HP 50g-inspired calculator engine that behaves like a persistent personal calculator rather than a stateless math API. The first useful version should expose a strict HP-style RPN core through an MCP interface so a chat agent can operate the calculator on the user's behalf, inspect the stack, and explain the executed steps.

The project is not a ROM emulator. It will not execute HP firmware, reproduce the Saturn CPU, or claim complete HP 50g compatibility. Its goal is manual-compatible behavior for selected user-visible calculator features, starting with RPN stack arithmetic.

## User Experience

The user can describe a problem in chat. The assistant translates that problem into HP-style key presses or commands, sends them to the calculator engine, and reports the result along with the stack state and an optional trace. The calculator state persists across calls, so the stack belongs to the user across the conversation.

Later, a GUI or menu bar app can mirror the same calculator state. The GUI should be a client of the engine, not a separate implementation.

## First Milestone

Milestone 1 is a persistent RPN stack calculator with a small, well-tested command set:

- Real-number stack with HP-like stack levels.
- Stack operations: `DUP`, `DROP`, `SWAP`, `OVER`, `CLEAR`.
- Arithmetic operations: `+`, `-`, `*`, `/`, `NEG`, `INV`, `SQ`, `SQRT`.
- A strict command parser that accepts HP-style command names and numeric literals.
- Persistent session state that survives across tool calls while the MCP server is running.
- Command traces that record stack changes and errors.
- Golden tests derived from HP 50g manual examples where the manual gives explicit behavior.

This milestone intentionally excludes symbolic algebra, units, matrices, program execution, menus, plotting, exact-number arithmetic, and full UI emulation.

## Architecture

The project should separate the calculator into four units:

1. `core`: pure calculator state transitions. It owns the stack model, command implementations, mode flags, and error values. It should have no MCP, GUI, or natural-language dependencies.
2. `parser`: converts strict user input such as `2 3 +` or `DUP SQRT` into command tokens consumed by the core.
3. `conformance`: stores manual-derived examples as executable tests with source references and expected stack outcomes.
4. `mcp`: exposes the persistent calculator session through tools for chat-driven use.

The natural-language translation layer is outside the core. It may be handled by the assistant or by a later service that converts user intent into strict calculator commands. The core remains deterministic and testable.

## MCP Interface

The initial MCP server should expose these tools:

- `execute`: apply a strict command string to the persistent calculator session.
- `get_stack`: return the current stack, including stack level labels.
- `clear`: reset the stack and recent trace.
- `get_trace`: return the most recent execution trace.

The primary interaction model is stateful. Calls mutate one calculator session owned by the user. Later versions may add named sessions, but the first implementation should keep a single default session to avoid premature complexity.

Mode-changing tools are deferred from the initial MCP interface. Milestone 1 should use a fixed real-number mode until a specific command or manual-derived test requires an explicit mode flag.

## Data Flow

1. The chat agent receives a user problem.
2. The agent translates the problem into strict HP-style commands or key presses.
3. The MCP `execute` tool parses and runs the commands against the persistent session.
4. The engine returns the resulting stack, command trace, and any error.
5. The agent explains the result to the user, optionally showing the HP-style command sequence.

Direct command entry should also be supported. If the user says `execute 2 3 +`, the tool should run exactly that command string.

## Error Handling

Errors should be explicit and testable. Examples include stack underflow, division by zero, invalid command, and invalid numeric literal. A failing command should leave the stack in a predictable state. For the first milestone, operations should be atomic per command: if a command fails, it should not partially mutate the stack.

The trace should include successful commands and the failing command, with enough detail to support teaching and debugging.

## Testing Strategy

Development should be test-driven:

- Unit tests for each stack operation and arithmetic command.
- Parser tests for numeric literals, command names, whitespace, and invalid input.
- State persistence tests around repeated `execute` calls.
- MCP-level tests for tool behavior once the server exists.
- Conformance tests from manual examples, stored separately from implementation tests.

Manual-derived tests should include a source label such as manual name, chapter, section, and page when available. The manual is a strong source of examples but not a complete formal spec, so unclear behavior should be captured as project decisions rather than guessed silently.

## Implementation Constraints

The implementation should avoid HP ROM code, firmware dumps, or copied proprietary calculator internals. The project may reference public manuals as behavioral documentation, but code and tests should be written clean-room from observable behavior and documented examples.

The first version should optimize for clarity, determinism, and small testable pieces over UI polish or feature breadth.

## Deferred Work

Deferred features include:

- Native GUI or menu bar app.
- Full keyboard layout and soft-menu behavior.
- Algebraic entry and symbolic manipulation.
- Exact arithmetic and complex numbers.
- Units, matrices, lists, programs, plotting, and equation solving.
- Multiple calculator sessions.
- Automated manual ingestion and example extraction.

These features should be added only after the RPN core, tests, and MCP interface are stable.

## Success Criteria

The first project phase is successful when:

- A user can run strict HP-style RPN commands through an MCP tool.
- The stack persists across calls.
- The engine has focused unit tests and manual-derived conformance tests.
- The assistant can use the calculator as a teaching and productivity backend.
- The implementation is clean-room and does not depend on an HP ROM.
