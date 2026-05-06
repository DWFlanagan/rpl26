# Milestone 7 Comment Notes

## Source

Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375.

Local extraction: `docs/hp48gug.md`.

OCR/markdown extraction: olmOCR, https://github.com/allenai/olmocr.

## Behavior Checked

Command-line comments using `@`.

Source region:

- `docs/hp48gug.md` lines 930-935: command-line entry behavior for `@` outside strings.

## Behavior Summary

In HP 48 command-line entry, an `@` outside a string marks adjacent command-line text as a comment. The calculator strips that comment when the command line is entered.

User RPL source listings commonly use `@` comments for human-readable notes such as stack effects. Those comments are authoring/source text, not runtime stack objects.

## Implementation Consequences For rpl26

Milestone 7 intentionally preserves `@` comments in annotated source records so agents and humans can read stored programs.

`rpl26` strips comments before parsing or executing annotated source. Comments must not appear as `RplObject` values, trace entries, stack values, or variables.

`hp48-user-rpl` export strips comments. `rpl26` export preserves comments.

## Known Uncertainty Or Intentional Divergence

The exact HP command-line definition of "adjacent text" is UI-oriented. `rpl26` will use a line-oriented source rule for Milestone 7: an `@` outside a string begins a comment that runs to the end of the current line.

This line-comment rule is an intentional authoring divergence, chosen for readable source files and agent workflows.
