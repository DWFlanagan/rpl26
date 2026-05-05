# rpl26

`rpl26` is a clean-room HP 48 User RPL-inspired calculator engine with a persistent object stack and an MCP interface.

It is not an HP ROM emulator and does not execute HP firmware. The goal is to build a small Reverse Polish Lisp-style runtime with typed objects, executable programs, variables, and traceable stack evaluation.

## Commands

- `npm test`: run tests.
- `npm run typecheck`: run TypeScript checks.
- `npm run build`: compile TypeScript.
- `npm run calc -- "2 3 +"`: execute one command line and print the stack.
- `npm run calc -- --json "2 3 +"`: execute one command line and print the full JSON result.
- `npm run repl`: start a persistent interactive session.
- `npm run tui`: start the keyboard-first terminal UI after building.
- `npm run mcp`: run the MCP stdio server after building.

The REPL supports `.stack`, `.stack --verbose`, `.vars`, `.vars --verbose`, `.trace`, `.trace --verbose`, `.words`, `.find QUERY`, `.help WORD`, `.status`, `.save PATH`, `.load PATH`, `.clear`, and `.exit`.

## Milestone 1 Scope

- RPL objects: real numbers, bare names, quoted names, programs, lists, and strings.
- Stack commands: `DUP`, `DROP`, `SWAP`, `OVER`, `CLEAR`.
- Arithmetic commands: `+`, `-`, `*`, `/`, `NEG`, `INV`, `SQ`, `SQRT`.
- Program evaluation through `EVAL`.
- Global variables through `STO`.
- Local variables through `->`, such as `5 << -> x << x x * >> >> EVAL`.
- Everyday stack programming words: `DUP2`, `DROP2`, `ROT`, `PICK`, `->LIST`, `LIST->`, `SIZE`, `GET`, and comparisons.
- HP-style program control flow: `IF THEN ELSE END`, `START NEXT`, `START STEP`, `FOR NEXT`, `FOR STEP`, `WHILE REPEAT END`, and `DO UNTIL END`.
- Practical object words: `HEAD`, `TRIL`, `SUB`, `POS`, `CHR`, `NUM`, `->STR`, and `->TAG`.
- Word discovery through `.words` and `.help WORD` in the REPL.
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
<< IF 2 3 < THEN 10 ELSE 20 END >> EVAL
<< 0 1 3 START 1 + NEXT >> EVAL
<< 1 3 FOR i i NEXT >> EVAL
<< 3 WHILE DUP 0 > REPEAT 1 - END >> EVAL
"abc" HEAD
"abc" TRIL
"abcd" 2 3 SUB
42 "answer" ->TAG
```

In the REPL:

```rpl
.words
.find list
.help HEAD
```

Session snapshots:

```rpl
42 'A' STO
.save examples/session.json
.clear
.load examples/session.json
.status
```

## Terminal UI

Build first, then launch the TUI:

```bash
npm run build
npm run tui
```

The TUI is separate from `npm run repl`. It keeps stack and variable inspection visible, lets you switch panes with the keyboard, searches words, shows help and trace details, and uses the same snapshot commands as the plain REPL.

## Clean-Room Rule

Use public manuals and observable behavior as references. Do not copy HP ROM code, firmware internals, System RPL memory behavior, or proprietary emulator implementation details.
