# Deferred TUI Help Refinement Design

## Context

Milestone 6 already has a terminal UI state shape for word filtering, visible words, and a selected word. The current implementation renders Words and Help panes, but keyboard input still behaves mostly like command entry. The roadmap therefore keeps the TUI help refinement deferred until the Words pane has an explicit keyboard interaction design.

This refinement is local `rpl26` interface behavior. It does not add HP command semantics, reinterpret HP word behavior, or require a new HP manual audit. It should continue to reference the Milestone 6 interface notes for the source boundary.

## Goal

Make the Words pane behave like a focused command-reference browser:

- users can type directly to filter words;
- keyboard selection chooses a word without executing it;
- pressing Enter opens the Help pane for the selected word;
- Help has enough space for multi-line details and examples.

This should make command discovery usable from the TUI while keeping command execution explicit in the normal command-entry flow.

## Interaction Model

When `activeTab === "words"`, the Words tab owns normal printable input.

- Printable keys append to `wordFilter`, including operator characters such as `+`, `/`, `<`, and `>`.
- `Backspace` edits `wordFilter`.
- `Up` and `Down` move `selectedWord` through `visibleWords`.
- Selection movement clamps at the list boundaries. It does not wrap.
- `Enter` switches to the Help tab for the current `selectedWord`.
- If the filter has no matches, `selectedWord` is undefined, `Up` and `Down` are no-ops, and `Enter` switches to Help where the existing no-selection message is shown.
- `Esc` is two-step:
  - if `wordFilter` is non-empty, clear the filter, refresh `visibleWords`, and reset selection to the first visible word;
  - if `wordFilter` is already empty, switch to the History tab and return printable-key ownership to command entry.

When any tab other than Words is active, printable input continues to edit `state.input`, `Backspace` edits command input, `Return` submits the command line, and `Tab` changes tabs. `Tab` also continues to change tabs while Words is active.

## State And Controller

The reducer should stay pure and testable. It can keep the mode rule implicit: Words owns input when `activeTab` is `"words"`; all other tabs use command entry. A separate focus field is unnecessary for this refinement unless implementation reveals a concrete ambiguity.

Reducer changes should include:

- clamped word movement instead of wrapping movement;
- a clear-filter action or equivalent reducer path;
- an action that switches from Words to Help while preserving `selectedWord`;
- an action that returns to History from Words when `Esc` is pressed with an empty filter.

The terminal keypress adapter should route keys based on `activeTab`:

- on Words, route printable text, Backspace, Up, Down, Enter, and Esc to word-browser actions;
- outside Words, preserve existing command-entry behavior.

The selected word is documentation state only. This refinement must not execute, insert, or otherwise mutate the command line when selecting a word.

## Rendering

The Words pane should make filtering state visible.

- Empty filter line: `filter: <type to search>`.
- Non-empty filter line: `filter: QUERY`.
- The selected row should have a plain-text marker such as `> DUP (stack) object -> object object`.
- A no-match filter should render a clear `No matches.` line below the filter.

The Help pane remains the full detail view for `selectedWord`, using the existing word-detail formatter. The Words pane should not grow an inline help preview in this pass; Enter has the clear job of moving from search results to full help.

## Out Of Scope

This refinement does not include:

- inserting a selected word into command input;
- a global command palette;
- vi-style movement keys;
- PageUp, PageDown, Home, or End navigation;
- mouse support;
- new word metadata;
- HP behavior changes or broad command-table imports.

## Testing

Reducer tests should cover:

- direct printable filtering on Words;
- operator-character filtering on Words;
- Backspace editing `wordFilter`;
- clamped Up and Down movement;
- no-match selection behavior;
- Enter switching to Help with the selected word preserved;
- Esc clearing a non-empty filter;
- Esc returning from unfiltered Words to History;
- non-Words printable input continuing to edit command input.

Controller tests should cover key routing for Words versus non-Words tabs.

Renderer tests should cover:

- the empty filter prompt;
- the non-empty filter line;
- the selected-row marker;
- Help rendering for the selected word after navigation.

Before claiming the implementation complete, run:

- `npm test`
- `npm run typecheck`
- `npm run build`
- a small TUI/controller smoke check.

## Completion Criteria

The deferred refinement is complete when a user can open the Words tab, type to filter commands, move through results without wraparound surprises, press Enter to inspect the selected word in Help, and press Esc once or twice to clear search and return to normal command entry.
