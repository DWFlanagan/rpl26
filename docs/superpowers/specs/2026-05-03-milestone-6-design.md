# rpl26 Milestone 6 Design

## Reference Baseline

Milestone 6 is a usability milestone for `rpl26`, not an HP language-semantics milestone. The HP 48G Series User's Guide remains the behavior baseline for HP-like commands, but this milestone should not add or reinterpret calculator words unless a later implementation plan explicitly includes a manual audit and clean-room notes.

The REPL dot commands and terminal UI controls are `rpl26` interface features. They should be documented as local conveniences, not as HP command compatibility.

The terminal UI direction is inspired by the keyboard-first feel of the OpenAI Codex CLI: a text interface with panes, command discovery, status information, and quick navigation. The design should borrow interaction patterns, not coding-agent-specific features such as approvals, models, plugins, background terminals, or conversation forking.

Reference links:

- OpenAI Codex repository: https://github.com/openai/codex
- Codex CLI slash command documentation: https://developers.openai.com/codex/cli/slash-commands

## Purpose

Milestone 6 makes `rpl26` pleasant to explore directly from a terminal.

By the end of the milestone, a user should be able to launch a separate terminal UI, type RPL commands, watch the stack change, browse commands, inspect help, read traces, and save or load a small session snapshot without switching to source files or JSON output.

The existing line-oriented CLI and REPL remain stable. Scripts, tests, and users who prefer plain terminal input should not be forced into the richer TUI.

## Scope

Milestone 6 includes:

- A separate TUI entry point, likely `npm run tui` and/or `rpl26 tui`.
- A Codex-like terminal layout with top tabs, a left history/active workspace, a right stack and variable inspector, a bottom status line, and a bottom RPL input composer.
- Keyboard navigation between tabs or panes.
- Semantic color coding for object types, execution status, focus, and save/load state, with a no-color fallback.
- Searchable word discovery through the TUI and plain REPL.
- More useful word metadata: examples, keywords, and richer help text where appropriate.
- Better human-readable stack, variable, and trace views.
- A minimal versioned JSON session snapshot for stack and variables.
- Plain REPL dot-command improvements that are reusable from the TUI: `.find`, `.status`, improved `.trace`, `.save PATH`, and `.load PATH`.
- README examples for the TUI and the improved plain REPL.

Milestone 6 does not include:

- Replacing the existing `npm run repl` behavior.
- Named sessions or a saved-session picker.
- MCP tool/schema changes.
- Editor integration or agent integration examples.
- Menu bar GUI work.
- Slash-command compatibility with Codex.
- Plugins, apps, config layers, approvals, model selection, background processes, or conversation management.
- Persistent readline history management unless it is a very small, low-risk addition.
- HP language behavior changes, new HP command families, CAS, symbolic algebra, units, matrices, plotting, binary object formats, System RPL, ROM behavior, or HP display modes.

## TUI Layout

The target layout is a keyboard-first text UI with the stack visible on the right:

```text
┌─ rpl26 tui ───────────────────────────────────────────────┐
│ Stack  Vars  Words  Help  Trace  Session                  │
├──────────────────────────────────────┬─────────────────────┤
│ History / Active Pane                │ Stack               │
│                                      │                     │
│ rpl26> 2 3 +                         │ 4: 10               │
│ 1: 5                                 │ 3: "abc"            │
│                                      │ 2: << 1 + >>        │
│ rpl26> .find list                    │ 1: 42               │
│ LIST->  ->LIST  GET  SIZE            │                     │
│                                      │ Vars                │
│                                      │ INC: << 1 + >>      │
│                                      │ A: 5                │
├──────────────────────────────────────┴─────────────────────┤
│ ok · Stack 4 · Vars 2 · saved: examples/session.json       │
├────────────────────────────────────────────────────────────┤
│ rpl26>                                                     │
└────────────────────────────────────────────────────────────┘
```

The layout should degrade gracefully:

- On wide terminals, keep the right stack/vars inspector visible.
- On narrow terminals, allow the active tab to occupy the full width and make stack/vars reachable through tabs.
- The bottom input line remains the primary command path.
- The selected tab changes the left active pane, not the calculator engine.

## TUI Tabs And Panes

### Stack

The Stack tab focuses on stack inspection. It should show HP-style level numbers with level 1 at the top of stack conceptually but displayed last, matching existing `formatStack` behavior. The right inspector should remain a compact stack overview when another tab is active.

### Vars

The Vars tab shows stored globals and programs. It should make names easy to scan and should use the same object formatter as the stack. This milestone should not add directories, namespaces, or library management.

### Words

The Words tab is the command reference browser. It should support typing to filter by:

- word name;
- category;
- stack effect;
- description;
- keyword;
- alias, if present.

Selecting a word should update the Help pane or an inline help panel without executing the word.

### Help

The Help tab shows details for a selected or named word:

- name;
- category;
- stack effect;
- description;
- source note;
- examples, when metadata provides them.

Help examples are documentation only. They should not be copied from HP manuals unless they are already represented through tracked clean-room notes.

### Trace

The Trace tab shows the last execution trace in a readable form. The compact view should list source and status. The verbose view should include before and after stack summaries and error details for failed entries.

Trace display should help users debug programs without reading raw JSON.

### Session

The Session tab exposes local session actions:

- status;
- save snapshot;
- load snapshot;
- clear session.

This tab should operate on the one active `CalculatorSession`. It should not become a session database or project manager.

## Color And Styling

Color should be semantic and restrained:

- real numbers: cyan or bright default;
- strings: green;
- programs: yellow;
- lists: blue;
- tagged objects: magenta;
- names and quoted names: default or dim white;
- success: green;
- errors: red;
- unsaved snapshot state: yellow;
- saved/current snapshot state: dim green;
- focused pane or active tab: inverse, underline, or bold so it works without color.

The implementation should keep plain formatting and styled formatting separate. Existing CLI and tests should be able to keep using plain text output. The TUI can render styled spans or theme tokens through a dedicated formatter layer.

## Plain REPL Improvements

The existing `npm run repl` should remain line-oriented and script-friendly. Milestone 6 may improve it by sharing the same helpers used by the TUI:

- `.find QUERY`: search command metadata.
- `.status`: show stack depth, variable count, last result or error, and snapshot state.
- `.trace`: keep compact output by default.
- `.trace --verbose`: include before/after stack summaries and errors.
- `.stack --verbose`: include object kinds or expanded nested values.
- `.vars --verbose`: include object kinds or expanded nested values.
- `.save PATH`: write a snapshot.
- `.load PATH`: load a snapshot.

Plain REPL commands should return clear one-line or block output, not interactive menus.

## Session Snapshots

Milestone 6 should add a small versioned JSON snapshot format for stack and variables:

```json
{
  "format": "rpl26-session",
  "version": 1,
  "stack": [],
  "variables": {}
}
```

Snapshots should include only the calculator state needed to resume stack work:

- stack objects;
- global variables.

Snapshots should not include:

- trace history;
- command history;
- UI tab selection;
- terminal size;
- named sessions;
- MCP client state.

Loading a snapshot should validate the format and object shapes before replacing the current session state. A failed load should leave the current session unchanged.

## Architecture

Milestone 6 should preserve the current engine boundary:

- `src/core.ts`, `src/parser.ts`, and HP-like evaluator semantics should remain unchanged unless a bug is found.
- `CalculatorSession` should gain an explicit snapshot API such as `toSnapshot()` and `loadSnapshot(snapshot)`.
- Snapshot validation should be deterministic and tested with malformed input.
- Word metadata in `src/words.ts` may grow optional `examples`, `keywords`, and `aliases`.
- Plain and styled object formatting should share the same conceptual rules but have separate output paths.
- TUI state should sit outside the calculator engine and should coordinate input, selected tab, filters, selected word, status, and last result/error.

The implementation may introduce a terminal UI dependency if it keeps the code smaller and testable. The implementation plan should compare at least:

- a lightweight dependency-free TUI built on Node readline/control sequences;
- a small npm TUI library suitable for TypeScript and tests.

The design preference is maintainability over terminal flourish.

## Testing

Tests should cover:

- snapshot serialization and loading;
- malformed snapshot rejection without mutating the current session;
- `.find` search behavior;
- `.status` output;
- compact and verbose `.trace`;
- improved `.words` or word filtering behavior;
- word metadata examples and keywords;
- plain formatter output remains stable;
- styled formatter token selection where practical;
- TUI reducer/state-model behavior without requiring a real terminal;
- at least one smoke path for the TUI entry point.

The final verification gate remains:

```bash
npm test
npm run typecheck
npm run build
```

For user-facing behavior, also run a small CLI or REPL smoke check, and a TUI smoke check if the chosen library supports non-interactive rendering or state-model tests.

## Success Criteria

Milestone 6 is complete when:

- `npm run repl` still works as a plain line-oriented REPL.
- The new TUI launches separately.
- The TUI uses the approved stack-right layout or a narrow-terminal fallback.
- The TUI supports keyboard navigation across the main panes.
- Stack, variables, words, help, trace, and session status are visible without raw JSON.
- Semantic color coding works and has a no-color fallback.
- Users can search words and inspect help with examples.
- Users can save and load a versioned JSON snapshot of stack and variables.
- Snapshot load failures do not damage the active session.
- README documents the TUI and the plain REPL improvements.
- `npm test`, `npm run typecheck`, `npm run build`, and user-facing smoke checks pass.

Milestone 6 should leave `rpl26` feeling like a real terminal calculator workspace while keeping the language runtime clean, testable, and ready for the later integration and GUI milestones.
