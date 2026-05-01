# rpn50

`rpn50` is a clean-room User RPL-inspired calculator engine with a persistent object stack and an MCP interface.

It is not an HP ROM emulator and does not execute HP firmware. The goal is to build a small Reverse Polish Lisp-style runtime with typed objects, executable programs, variables, and traceable stack evaluation.

## Commands

- `npm test`: run tests.
- `npm run typecheck`: run TypeScript checks.
- `npm run build`: compile TypeScript.
- `npm run mcp`: run the MCP stdio server after building.

## Milestone 1 Scope

- RPL objects: real numbers, bare names, quoted names, programs, lists, and strings.
- Stack commands: `DUP`, `DROP`, `SWAP`, `OVER`, `CLEAR`.
- Arithmetic commands: `+`, `-`, `*`, `/`, `NEG`, `INV`, `SQ`, `SQRT`.
- Program evaluation through `EVAL`.
- Global variables through `STO`.
- Persistent calculator session.
- MCP tools: `execute`, `get_stack`, `get_variables`, `clear`, `get_trace`.

## Clean-Room Rule

Use public manuals and observable behavior as references. Do not copy HP ROM code, firmware internals, System RPL memory behavior, or proprietary emulator implementation details.
