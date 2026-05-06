# rpl26 Milestone 7 Integration Design

## Reference Baseline

Milestone 7 is an integration and authoring milestone for `rpl26`.

The HP 48G Series User's Guide remains the behavior baseline for HP-like language behavior. This milestone does not add new HP command families, interactive HP UI commands, CAS, units, matrices, plotting, directories, libraries, binary object formats, or System RPL behavior.

Manual behavior checked for comments:

- Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375.
- Local extraction: `docs/hp48gug.md`, lines 930-935.
- Behavior summary: an `@` character outside a string in the command line marks adjacent text as a comment, and the calculator strips that comment when the command line is entered.

`rpl26` intentionally diverges from the HP command-line storage behavior for authoring source: it will preserve `@` comments in annotated source records, while still ignoring them for execution and stripping them for HP-compatible export.

Web reference examples also show `@` comments as a common User RPL source-listing convention, especially for stack notes. Example source: https://www.azimonti.com/hp48gx/rpl/.

## Purpose

Milestone 7 makes `rpl26` a dependable backend for agents, editors, scripts, and the future menu bar app.

The milestone's product theme is readable RPL. RPL programs should remain small, executable stack programs stored in variables, but `rpl26` should preserve annotated source with `@` comments so an agent or human can understand, revise, test, save, and export programs without reverse-engineering terse stack code every time.

By the end of the milestone, a user should be able to connect Claude, Codex, or another MCP client to `rpl26`, ask for a named RPL program, have the agent create annotated source, test it, store it as a normal variable, save the session, retrieve the readable source later, and export either annotated `rpl26` source or stripped HP-compatible User RPL source.

The same core service should also be available through a local JSON stdio engine that a future SwiftUI menu bar app can spawn without speaking MCP directly.

## Scope

Milestone 7 includes:

- Named integration sessions for MCP and local engine use.
- A shared TypeScript service layer used by MCP tools and the JSON stdio engine.
- Annotated RPL source records keyed by variable name.
- `@` comment parsing for source accepted through annotated program tools.
- Comment stripping for execution and HP-compatible export.
- Program storage that installs parsed executable program objects into normal session variables.
- Session/project save and load for stack, variables, and annotated source records.
- Program example tests that run in isolated session copies.
- MCP tools for session management, calculator state, readable program authoring, example execution, and export.
- `rpl26 engine`, a newline-delimited JSON stdio process for app and script integration.
- A checked-in agent skill at `skills/rpl26/SKILL.md`.
- README documentation for MCP setup, the skill, annotated RPL, and the JSON engine.

Milestone 7 does not include:

- A menu bar GUI.
- Any GenAI calls inside `rpl26`.
- Real interactive RPL input or prompt words.
- A second program-library semantic store separate from variables.
- Full source formatting, pretty-printing, or comment attachment to individual AST nodes.
- HP directory, library, port, transfer, or binary object compatibility.
- CAS, symbolic algebra, exact algebra, units, matrices, plotting, graphics, or System RPL.

## Core Model

Variables remain the canonical runtime model.

A program named `VELOCITY` is stored as a normal global variable:

```rpl
<< * >> 'VELOCITY' STO
```

Evaluating `VELOCITY` runs the stored program. This is already the core `rpl26` behavior and should not change.

Milestone 7 adds authoring source beside that variable:

```rpl
<<
  @ VELOCITY(distance, time)
  @ Multiply distance by time and leave velocity on the stack.
  @ Stack: distance time -> velocity
  *
>>
```

When this source is stored under `VELOCITY`, `rpl26` strips comments for parsing and execution, installs the parsed program object into `variables.VELOCITY`, and preserves the annotated source for later inspection and export.

Comments must not become stack objects, trace entries, or runtime values. They are source trivia and authoring documentation.

## Annotated Source Records

An annotated source record is keyed by variable name and belongs to a named session.

The design should support:

- variable name;
- annotated source text;
- installed object hash used for stale-source detection;
- updated timestamp or monotonically increasing revision marker;
- optional examples;
- optional notes about export mode or unsupported behavior.

Examples are not RPL objects. They are test records for integration tools. A minimal example should include:

- input source to execute;
- expected stack, either as structured objects or source strings parsed into objects;
- optional description.

The record is advisory for authoring. The executable source of truth remains the variable value. If a variable is changed directly through `execute`, existing annotated source may become stale. The service should report that condition rather than silently pretending the annotation is current.

## Save Formats

Milestone 6 snapshots remain the minimal runtime state format:

```json
{
  "format": "rpl26-session",
  "version": 1,
  "stack": [],
  "variables": {}
}
```

Milestone 7 should introduce a richer project/session format for integration work:

```json
{
  "format": "rpl26-project",
  "version": 1,
  "snapshot": {
    "format": "rpl26-session",
    "version": 1,
    "stack": [],
    "variables": {}
  },
  "sources": {
    "VELOCITY": {
      "name": "VELOCITY",
      "source": "<<\n  @ Stack: distance time -> velocity\n  *\n>>",
      "installedHash": "implementation-defined",
      "updatedAt": "2026-05-06T00:00:00.000Z",
      "examples": []
    }
  }
}
```

The project format should preserve annotated source and examples. Loading a malformed project must leave the current session unchanged.

The existing snapshot format should stay readable and writable for users who only want stack and variables.

Plain REPL `.save` and `.load` should remain snapshot-only for compatibility. Project save/load should use explicit new commands such as `.save-project PATH` and `.load-project PATH` if the implementation plan includes REPL exposure.

## Export

`rpl26` should support two program export modes:

- `rpl26`: return annotated source with comments preserved.
- `hp48-user-rpl`: return source with `@` comments stripped.

HP-compatible export is source compatibility only. It should not claim binary object compatibility, menu compatibility, transfer automation, or support for commands outside `rpl26`'s implemented subset.

If the stored program uses unsupported object families or `rpl26`-specific conveniences, export should return a warning rather than a false compatibility claim.

## MCP Surface

MCP should expose named authoring sessions. The existing anonymous single-session behavior can remain as a default session for compatibility, but new tools should accept or resolve a session name explicitly.

Session tools:

- `list_sessions`
- `create_session`
- `select_session`
- `delete_session`
- `save_session`
- `load_session`
- `get_session_status`

Calculator state tools:

- `execute`
- `get_stack`
- `get_variables`
- `get_trace`
- `clear`

Readable RPL tools:

- `store_program`: store annotated source under a variable name, install the parsed program into variables, and optionally save examples.
- `get_program_source`: return annotated source when available, with stale status if the variable no longer matches.
- `list_programs`: list variables containing program objects and whether annotated source exists.
- `run_program_examples`: run saved or supplied examples in an isolated session copy.
- `export_program`: export annotated or HP-compatible stripped source.
- `inspect_program`: return stored object, available source, trace hints, stack effect comments when present, and examples so an MCP client can generate or improve comments.

`rpl26` should not include a tool that calls GenAI. Agents generate prose comments themselves, then call `store_program` with revised annotated source.

## JSON Stdio Engine

Milestone 7 should add:

```bash
rpl26 engine
```

The engine uses newline-delimited JSON over stdin/stdout. Each request includes an `id`, a `method`, and optional `params`. Each response includes the same `id`, an `ok` boolean, and either `result` or `error`.

Example:

```json
{"id":"1","method":"execute","params":{"session":"default","input":"2 3 +"}}
{"id":"1","ok":true,"result":{"stack":[{"level":1,"value":{"kind":"real","value":5}}]}}
```

The engine should wrap the same service operations as MCP. It is intended for the future SwiftUI menu bar app, shell scripts, editor extensions, and tests.

The protocol should be deliberately small:

- one request per line;
- one response per line;
- no streaming partial results in Milestone 7;
- deterministic JSON error objects;
- graceful shutdown method.

## Agent Skill

The repo should include a canonical skill at:

```text
skills/rpl26/SKILL.md
```

The README should point users to this skill and explain that it teaches Codex, Claude-style agents, or other MCP clients how to use `rpl26`.

The skill should instruct agents to:

- use the MCP server as an RPL authoring workspace;
- write small named programs stored as variables;
- prefer annotated source with `@` comments;
- include stack-effect comments;
- avoid pseudo-code inside executable RPL;
- run examples before claiming a program works;
- revise comments when traces reveal different behavior;
- save sessions or projects when asked;
- export `rpl26` annotated source for readability and HP-compatible stripped source for calculator transfer;
- stay within the implemented `rpl26` subset unless the user explicitly asks to design future behavior.

## Shared Service Layer

MCP tools and the JSON engine should not duplicate business logic. They should call a shared service module that owns:

- named session registry;
- snapshot and project load/save;
- annotated source parsing and comment stripping;
- program installation into variables;
- example execution in isolated session copies;
- export;
- stale-source detection.

The existing `CalculatorSession` should remain focused on parsing and evaluating RPL objects. It should not learn about MCP, JSON stdio, files, skills, or agent workflows.

## Error Handling

Errors should be structured and stable enough for agents and GUI clients.

Important error cases:

- unknown session;
- duplicate session unless overwrite is explicit;
- invalid variable name;
- annotated source does not parse after comments are stripped;
- annotated source does not produce exactly one program object for `store_program`;
- example execution fails;
- example expected stack does not match actual stack;
- source record is stale relative to the variable value;
- project file has invalid JSON or invalid shape;
- export requested for a non-program variable;
- unsupported export compatibility claim.

MCP may still serialize tool results as text JSON, but the underlying result objects should have stable discriminants that tests can assert.

## Testing

Tests should cover:

- stripping `@` comments outside strings while preserving `@` inside strings;
- parsing annotated source into executable RPL;
- storing annotated source under a variable and executing that variable;
- preserving annotated source in project save/load;
- keeping Milestone 6 snapshots compatible;
- stale-source detection when variables change outside `store_program`;
- export with comments preserved and stripped;
- isolated example execution that does not mutate the live session;
- named session lifecycle;
- MCP tool registration and handler behavior;
- JSON stdio request/response behavior through a non-interactive harness;
- skill file presence and required guidance headings.

Before claiming Milestone 7 complete, run:

- `npm test`
- `npm run typecheck`
- `npm run build`
- an MCP smoke check for storing and exporting an annotated program;
- a JSON engine smoke check for executing a command and storing a program.

## Example Workflow

User:

```text
Use /rpl26 to write a program called VELOCITY that multiplies distance by time.
```

Agent writes annotated source:

```rpl
<<
  @ VELOCITY(distance, time)
  @ Multiply distance by time and leave velocity on the stack.
  @ Stack: distance time -> velocity
  *
>>
```

Agent calls `store_program` with variable name `VELOCITY`, then runs examples such as:

```rpl
3 4 VELOCITY
```

Expected stack:

```rpl
12
```

The session variable stores the executable program. The annotated source remains available for humans and agents.

## Implementation Defaults

The implementation plan should follow these defaults unless it records a concrete reason to change them:

- Use names close to `IntegrationService`, `IntegrationSession`, `ProjectSnapshot`, `AnnotatedSourceRecord`, and `ProgramExample`.
- Detect stale annotated source by comparing a stable canonical hash of the installed variable object with the source record's `installedHash`.
- Require explicit file paths for project save/load in Milestone 7. Do not invent a default project directory yet.
- Keep MCP method names in snake case, matching the tool list in this spec.
- Keep JSON engine method names in lower camel case wrappers around the same operations, such as `storeProgram` and `exportProgram`.
- Keep `.save` and `.load` snapshot-only. Use explicit project names if REPL project commands are added.
