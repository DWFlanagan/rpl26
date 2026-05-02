# rpn50

`rpn50` is a clean-room User RPL-inspired calculator engine with a persistent object stack and an MCP interface.

It is not an HP ROM emulator and does not execute HP firmware. The goal is to build a small Reverse Polish Lisp-style runtime with typed objects, executable programs, variables, and traceable stack evaluation.

## Commands

- `npm test`: run tests.
- `npm run typecheck`: run TypeScript checks.
- `npm run build`: compile TypeScript.
- `npm run calc -- "2 3 +"`: execute one command line and print the stack.
- `npm run calc -- --json "2 3 +"`: execute one command line and print the full JSON result.
- `npm run repl`: start a persistent interactive session.
- `npm run mcp`: run the MCP stdio server after building.

The REPL supports `.stack`, `.vars`, `.trace`, `.clear`, and `.exit`.

## Milestone 1 Scope

- RPL objects: real numbers, bare names, quoted names, programs, lists, and strings.
- Stack commands: `DUP`, `DROP`, `SWAP`, `OVER`, `CLEAR`.
- Arithmetic commands: `+`, `-`, `*`, `/`, `NEG`, `INV`, `SQ`, `SQRT`.
- Program evaluation through `EVAL`.
- Global variables through `STO`.
- Local variables through `->`, such as `5 << -> x << x x * >> >> EVAL`.
- Everyday stack programming words: `DUP2`, `DROP2`, `ROT`, `PICK`, `->LIST`, `LIST->`, `SIZE`, `GET`, comparisons, and `IF THEN ELSE END`.
- Persistent calculator session.
- MCP tools: `execute`, `get_stack`, `get_variables`, `clear`, `get_trace`.

## Examples

```rpl
2 3 +
<< 1 + >> 'INC' STO 41 INC
5 << -> x << x x * >> >> EVAL
2 3 << -> x y << x y + >> >> EVAL
1 2 DUP2
1 2 3 3 ->LIST
2 3 <
<< 2 3 < IF THEN 10 ELSE 20 END >> EVAL
```

## Clean-Room Rule

Use public manuals and observable behavior as references. Do not copy HP ROM code, firmware internals, System RPL memory behavior, or proprietary emulator implementation details.
