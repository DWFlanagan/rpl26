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

## Implemented Scope Through Milestone 6

- Milestone 1, RPL identity: typed RPL objects, strict parsing, persistent stack evaluation, programs as objects, `EVAL`, globals through `STO`, locals through `->`, CLI, REPL, autocomplete, and MCP access.
- Milestone 2, everyday stack programming: stack utilities such as `DUP2`, `DROP2`, `ROT`, and `PICK`; list construction and decomposition with `->LIST`, `LIST->`, `SIZE`, and `GET`; booleans, comparisons, and first conditional behavior.
- Milestone 3, program control flow: `IF THEN ELSE END`, `START NEXT`, `START STEP`, `FOR NEXT`, `FOR STEP`, `WHILE REPEAT END`, and `DO UNTIL END`, with readable traces for multi-step evaluation.
- Milestone 4, object library: practical non-CAS object words for strings, lists, and tagged values, including `HEAD`, `TRIL`, `SUB`, `POS`, `CHR`, `NUM`, `->STR`, and `->TAG`.
- Milestone 5, conformance suite: source-labeled manual-derived examples, clean-room notes, and fixture validation for supported behavior, deferred behavior, and intentional divergences.
- Milestone 6, usability surface: richer dot commands, `.find`, `.help WORD`, verbose stack/variable/trace views, saved session snapshots, searchable word metadata, terminal styling, and the keyboard-first TUI.

Current object support includes real numbers, bare names, quoted names, programs, lists, strings, and tagged values. MCP exposes calculator tools (`execute`, `get_stack`, `get_variables`, `clear`, `get_trace`), program tools (`store_program`, `run_program_examples`, `export_program`, `get_program_source`, `inspect_program`, `list_programs`), and session tools (`list_sessions`, `create_session`, `select_session`, `delete_session`, `get_session_status`, `save_session`, `load_session`).

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

## Readable RPL And Agent Authoring

Milestone 7 adds an integration surface for readable RPL authoring.

Programs are still normal RPL variables:

```rpl
<< * >> 'AREA' STO
```

`rpl26` can also preserve annotated source with `@` comments:

```rpl
<<
  @ AREA(width, height)
  @ Multiply width by height and leave area on the stack.
  @ Stack: width height -> area
  *
>>
```

Comments are ignored for execution. `rpl26` export preserves them, while `hp48-user-rpl` export produces calculator-oriented stripped source. Export is source-oriented and limited to the implemented `rpl26` subset; it does not validate full HP compatibility.

## Claude Desktop MCP Setup

Build the MCP server first:

```bash
cd /Users/dwf/code/rpn50
npm run build
```

On macOS, open Claude Desktop's local MCP config:

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

Add `rpl26` under `mcpServers`:

```json
{
  "mcpServers": {
    "rpl26": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/dwf/code/rpn50/dist/src/mcp/server.js"
      ]
    }
  }
}
```

If the file already contains other MCP servers, merge only the `rpl26` entry into the existing `mcpServers` object.

Restart Claude Desktop after editing the config. Then ask Claude something like:

```text
Use rpl26 to run 2 3 + and show me the stack.
```

Claude Desktop launches local MCP servers as stdio processes, so rebuild with `npm run build` whenever TypeScript changes before expecting Claude to see the new server behavior.

## Agent Skill

`rpl26` includes an agent skill for readable RPL workflows:

- `skills/rpl26/SKILL.md`

Use it with Codex, Claude-style agents, or other MCP clients when connecting to the `rpl26` MCP server. The skill teaches agents to write annotated RPL, store programs as variables, run examples, save sessions, and export stripped calculator-oriented source when needed.

## JSON Engine

Build first, then launch the local JSON stdio engine:

```bash
npm run build
npm run engine
```

The engine accepts one JSON request per line and returns one JSON response per line. It is intended for scripts, editor extensions, and the future SwiftUI menu bar app.

Example request line:

```json
{"id":"1","method":"execute","params":{"input":"2 3 +"}}
```

Example response line:

```json
{"id":"1","ok":true,"result":{"ok":true,"stack":[{"level":1,"value":{"kind":"real","value":5}}],"variables":{},"trace":[]}}
```

## Clean-Room Rule

Use public manuals and observable behavior as references. Do not copy HP ROM code, firmware internals, System RPL memory behavior, or proprietary emulator implementation details.
