# Milestone 6 Interface Notes

## Source Boundary

Milestone 6 is a local terminal usability milestone for `rpl26`.

Primary design source: `docs/superpowers/specs/2026-05-03-milestone-6-design.md`.

HP 48G Series User's Guide role: the manual remains the behavior baseline for HP-like language words, but this milestone does not add or reinterpret HP command semantics.

## Behavior Checked

- Plain REPL dot commands: `.find`, `.status`, `.trace --verbose`, `.stack --verbose`, `.vars --verbose`, `.save PATH`, and `.load PATH`.
- TUI panes for stack, variables, word search, help, trace, and session status.
- Versioned `rpl26` JSON snapshots for stack and variables.

## Implementation Consequences

- Do not change `src/core.ts` or `src/parser.ts` unless a focused bug is found and covered by a separate note.
- Treat REPL dot commands and TUI controls as `rpl26` conveniences, not HP compatibility claims.
- Tests for this milestone should reference this note when they cover interface behavior.

## Known Uncertainty Or Intentional Divergence

- TUI keyboard shortcuts are local `rpl26` UI choices.
- Snapshot JSON is a local persistence format and is not related to HP binary object formats.
- Word help examples are documentation examples written in our own words or based on existing clean-room notes.
- Deferred TUI help behavior: the Help pane should eventually be driven by a selected word from the Words pane, with keyboard filtering/navigation still to be designed.
