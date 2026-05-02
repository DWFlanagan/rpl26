# HP 48G Conformance Notes

## Source

These notes summarize local reference material from `docs/hp48gug.md`, which is ignored because it contains copyrighted manual text.

Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375, https://literature.hpcalc.org/items/375.

OCR/markdown extraction: olmOCR, https://github.com/allenai/olmocr.

These are clean-room summaries for conformance planning. Keep tracked files limited to short behavior summaries and source anchors.

Manual audit note: this linked worktree did not have the ignored extraction checked out at `docs/hp48gug.md`, so the same local extraction was read from `/Users/dwf/code/rpn50/docs/hp48gug.md`.

## Stack And Arithmetic Examples

Behavior checked: basic real arithmetic and stack manipulation examples for already-implemented words such as `DUP`, `DROP`, `SWAP`, `OVER`, `CLEAR`, `+`, `-`, `*`, and `/`.

Source regions:

- `docs/hp48gug.md` lines 1190-1259: introductory chain arithmetic and stack-manipulation examples for addition, multiplication, subtraction, division, `SWAP`, `DUP`, `DROP`, and `CLEAR`.
- `docs/hp48gug.md` lines 1449-1510: stack-command examples for `DROP2`, `DROPN`, `DUP`, `DUP2`, `DUPN`, and `OVER`.
- `docs/hp48gug.md` lines 14772-14773, 15344-15377, 16533-16534, and 17714-17715: appendix command entries for `CLEAR`, `DROP`, `DUP`, `OVER`, and `SWAP`.

Summary: `rpl26` should preserve the HP-style level order where level 1 is the top of stack. Basic stack words rearrange, duplicate, delete, or clear stack levels without changing object values. Basic arithmetic consumes real arguments from the stack and leaves a real result, with multi-step calculations retaining intermediate stack results until later commands consume them.

Implementation consequences: conformance fixtures should assert object-stack results, not formatted display text, for these examples. Fixture inputs can be strict `rpl26` stack syntax using `*` and `/` where the HP manual uses keyboard glyphs for multiplication and division.

Uncertainty or divergence: HP numeric display precision, calculator entry modes, `LASTARG`, and full real-number formatting are not part of this milestone.

## Variables And Program Evaluation Examples

Behavior checked: quoted names, `STO`, executable names, inert program objects, and explicit `EVAL`.

Source regions:

- `docs/hp48gug.md` lines 2189-2297: creating variables with `STO`, evaluating variables, quoted names, formal names, and using `EVAL` on a formal-name example.
- `docs/hp48gug.md` lines 11370-11498: program-object behavior, examples where nested programs remain data until `EVAL`, local-variable structure overview, and program execution by stored or direct program object.
- `docs/hp48gug.md` lines 11720-11770: local-variable creation and the distinction between evaluating local names and global names.
- `docs/hp48gug.md` lines 15515-15516 and 17605-17606: appendix command entries for `EVAL` and `STO`.

Summary: quoted names are data until evaluation, while executable names look up stored variables. Evaluating a global name evaluates the stored object, so a stored scalar is returned and a stored program runs. A program object entered inside another program is placed on the stack as data unless `EVAL` is applied. Local names return their stored object without the additional global-name evaluation step, so explicit `EVAL` is needed when local data should be executed.

Implementation consequences: fixtures should include at least one stored scalar, one stored program, one program object that remains inert on the stack, and one explicit `EVAL` of a program object.

Uncertainty or divergence: directories, purging, calculator flags, algebraic objects, library objects, and HP menu behavior are outside this milestone.

## Control Flow Examples

Behavior checked: representative examples from the existing HP 48G control-flow notes for `IF`, `START`, `FOR`, `WHILE`, and `DO`.

Source regions:

- `docs/superpowers/specs/2026-05-02-hp48g-control-flow-notes.md` summarizes the primary manual region, `docs/hp48gug.md` lines 11571-11690.
- `docs/hp48gug.md` lines 15843-15854, 17014-17015, 17543-17564, 17806-17807, 17960-17961, and 18084-18085: appendix command entries for `IF`, `REPEAT`, `START`, `STEP`, `THEN`, `UNTIL`, and `WHILE`.
- `docs/hp48gug.md` lines 20814-20845 and 21421-21435: command-reference sections for `START` and `WHILE`.

Summary: conformance fixtures should exercise the already-supported HP-style program syntax and loop execution rules without adding new control forms. `IF` evaluates a test clause and consumes its result at `THEN`; nonzero selects the true clause and zero selects the false path or skips the true clause. `START` and `FOR` definite loops run the body at least once, with `NEXT` using an increment of 1 and `STEP` consuming an explicit increment. `DO ... UNTIL ... END` tests after the body, while `WHILE ... REPEAT ... END` tests before the body.

Implementation consequences: fixtures should include true and false branches, definite loops, named loop-variable behavior, pre-test and post-test indefinite loops, and one expected loop rejection case when that rejection is already part of supported `rpl26` behavior.

Uncertainty or divergence: `CASE`, error trapping, debugger-like tracing, algebraic tests, and HP UI typing aids remain deferred.

## Object Library Examples

Behavior checked: representative examples from the existing HP 48G object-library notes for strings, lists, character conversion, object-to-string conversion, and tagged objects.

Source regions:

- `docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md` summarizes existing object-library anchors.
- `docs/hp48gug.md` lines 6198-6202: list `POS` and `SUB` examples.
- `docs/hp48gug.md` lines 14757-14758, 15771-15772, 16682-16683, 17662-17683, 17755, 17765, 18803, 19321, 19841, and 20988: appendix and command-reference entries for `CHR`, `HEAD`, `POS`, `->STR`, `SUB`, `->TAG`, `TRIL`, and `NUM`.

Summary: `HEAD`, `TRIL`, `SUB`, and `POS` operate on supported string and list families. `HEAD` returns the first element or character, `TRIL` returns the remainder after the first element or character, `SUB` extracts a one-based inclusive range, and `POS` returns the first one-based match position with 0 for a list element that is not found. `CHR` and `NUM` convert between character codes and one-character strings for the supported character slice. `->STR` returns a string form of an object, and `->TAG` combines a value with a string or name tag.

Implementation consequences: fixtures should include supported string and list examples, character conversion examples limited to common ASCII, object-to-string examples that match `rpl26` formatting, tagged-object construction examples, and explicit divergence or deferred entries for unsupported HP object families.

Uncertainty or divergence: HP character set fidelity, arrays, graphics objects, subexpressions, byte-perfect HP object serialization, and tag-removal or deep tag operations are intentional divergences or deferrals for now.
