# HP 48G Control Flow Notes

## Source

These notes summarize local reference material from `docs/hp48gug.md`, which is ignored because it contains copyrighted manual text.

Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375, https://literature.hpcalc.org/items/375.

OCR/markdown extraction: `docs/hp48gug.md` was produced locally with olmOCR, https://github.com/allenai/olmocr.

Primary source region: HP 48G Series User's Guide, Chapter 29, "Using Programming Structures", local markdown lines 11571-11690.

These notes are clean-room summaries for implementation planning. Do not copy extended manual text into tracked files.

## Conditional Structures

The HP 48G User's Guide describes `IF` as a structure where `IF` begins the test clause and `THEN` consumes the test result.

Supported conditional forms in the guide:

- `IF test-clause THEN true-clause END`
- `IF test-clause THEN true-clause ELSE false-clause END`
- `CASE ... END`

Implication for `rpl26`: the current Milestone 2 precondition form, `condition IF THEN ... END`, is not the HP-style syntax. Milestone 3 should include a compatibility correction to parse and evaluate `IF test-clause THEN ... END` while deciding whether to keep the old form as a temporary extension or remove it.

`CASE ... END` is HP 48 reality, but it can remain outside Milestone 3 unless the milestone explicitly expands to full conditional structures.

## Definite Loops

The guide describes two anonymous definite loop structures:

- `start finish START loop-clause NEXT`
- `start finish START loop-clause increment STEP`

It also describes two named definite loop structures:

- `start finish FOR counter loop-clause NEXT`
- `start finish FOR counter loop-clause increment STEP`

For both `START` and `FOR`, the loop body runs at least once. `NEXT` increments the loop counter by `1` after each body execution, then compares the new counter value with the finish value to decide whether to repeat.

For `STEP`, the increment is supplied by the program at the end of each loop body. Positive increments repeat while the counter remains less than or equal to the finish value. Negative increments repeat while the counter remains greater than or equal to the finish value.

`FOR` creates a local loop variable that is visible in the loop clause and purged when the loop exits.

Implication for `rpl26`: zero-iteration `START`/`FOR` is not HP-style for these forms. Reversed bounds with `NEXT` still execute once, then exit after the first post-body increment test. Negative stepping belongs to `STEP`, not `NEXT`.

## Indefinite Loops

The guide describes two indefinite loop structures:

- `DO loop-clause UNTIL test-clause END`
- `WHILE test-clause REPEAT loop-clause END`

`DO ... UNTIL ... END` runs the loop clause before testing, so the loop body runs at least once. The test result is consumed at `END`; zero repeats the loop, nonzero exits.

`WHILE ... REPEAT ... END` runs the test before the loop clause, so the loop clause can run zero times. `REPEAT` consumes the test result; nonzero enters the loop clause, zero exits after the matching `END`.

Implication for `rpl26`: `WHILE ... REPEAT ... END` alone is real HP behavior, but `DO ... UNTIL ... END` is the matching post-test loop and should be considered part of the same control-flow family.

## Milestone 3 Consequences

Milestone 3 should change from a minimal loop subset to an HP-shaped control-flow milestone:

- correct `IF` syntax to HP-style test clauses;
- implement `START ... NEXT` and `START ... STEP`;
- implement `FOR name ... NEXT` and `FOR name ... STEP`;
- implement `WHILE ... REPEAT ... END`;
- include `DO ... UNTIL ... END` unless implementation risk forces a documented deferral;
- keep `CASE ... END` deferred unless conditional coverage expands.
