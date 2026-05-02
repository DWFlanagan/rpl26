# rpl26 Milestone 4 Design

## Reference Baseline

Milestone 4 should follow HP 48 User RPL behavior for each object command it implements. The HP 48G Series User's Guide is the preferred reference, using the local ignored `docs/hp48gug.md` extraction and tracked clean-room notes.

Before implementing each command family, create or update a source-labeled notes file that summarizes the relevant manual behavior without copying long excerpts. See the repo-level `AGENTS.md` instructions.

## Purpose

Milestone 4 expands `rpl26` from a control-flow-capable language into a more useful object manipulation environment. It should make strings and lists more practical, introduce tagged objects if the manual behavior is clear, and pull forward a small usability slice so users can discover the words they can play with.

This is still a non-CAS milestone. It should not add symbolic algebra, exact arithmetic, units, matrices, plotting, System RPL, HP ROM compatibility, or full command-table ingestion.

## Scope

Milestone 4 includes:

- String basics that overlap cleanly with list/object behavior: likely `CHR`, `NUM`, `HEAD`, `TRIL`, `SUB`, and `POS`.
- List basics beyond Milestone 2: likely `HEAD`, `TRIL`, `POS`, and possibly `PUT` or `REPL` if manual behavior is clear and small.
- Object-to-string conversion with `->STR` if display semantics can be kept clean and documented.
- Tagged objects with `->TAG` if parser/object-model impact stays small.
- Command metadata for implemented builtins: name, category, stack effect, short help text, and source note.
- REPL usability commands: `.words`, `.help`, and `.help WORD`.
- README examples that show object manipulation and help discovery.

Milestone 4 does not include:

- Binary integers, wordsize, base modes, and bit operations.
- Matrices, arrays, graphics objects, units, algebraics, plotting, or CAS behavior.
- Full HP command reference import.
- Persistent history or saved sessions.
- Menu bar GUI work.

## Pulled-Forward Usability Slice

Milestone 6 remains the broader usability milestone, but Milestone 4 should pull forward command discovery because the object library will otherwise be hard to explore.

The runtime should expose a small word metadata registry shared by CLI, REPL, README examples, and future MCP help. Autocomplete should continue to come from the same source of truth as command execution.

Initial REPL commands:

- `.words`: list known words, grouped or sorted.
- `.help`: show a compact overview of help usage and available categories.
- `.help WORD`: show stack effect, description, category, and source note for one word.

This does not need a pager, fuzzy search, terminal UI, or full documentation browser.

## Command Families

### Strings

String commands should be chosen from HP 48 behavior confirmed in the manual notes. The first pass should favor operations that are easy to test and useful at the stack:

- `CHR`: real character code to one-character string.
- `NUM`: first character of string to real character code.
- `HEAD`: first character of string.
- `TRIL`: string without first character.
- `SUB`: substring by one-based start and end positions.
- `POS`: substring position, returning a one-based index or zero if not found if confirmed by the manual.

Character encoding should be documented. If HP 48 character-set fidelity is unclear, use JavaScript string code units provisionally and mark the divergence.

### Lists

List commands should mirror string-compatible behavior where HP does so:

- `HEAD`: first list element.
- `TRIL`: list without first element.
- `POS`: position of an object in a list, using existing structural equality.
- `SUB`: slice by one-based start and end positions if confirmed.
- `PUT` or `REPL`: update/replace behavior only if the manual notes make stack effects and indexing clear.

The list implementation should preserve object identity semantics by cloning objects in the same style as existing stack/list operations.

### Object Conversion

`->STR` should produce a string object from an RPL object using the user-facing formatter, not JSON. It should be explicit that the result is for display and lightweight program use, not a byte-perfect HP serialization.

Parsing strings back into objects should remain out of scope unless the manual audit and parser design make it low risk.

### Tagged Objects

If included, `->TAG` should add a new tagged object type to the object model. The first pass should support constructing, displaying, storing, comparing, and stack-moving tagged objects.

Commands that deeply interact with tags can remain deferred.

## Testing

Tests should cover:

- Manual-derived string stack effects and edge cases.
- Manual-derived list stack effects and edge cases.
- Shared behavior for `HEAD`, `TRIL`, `SUB`, and `POS` across strings and lists where applicable.
- `->STR` display output for real, string, list, program, and tagged objects.
- Tagged object construction and display if `->TAG` is included.
- Help metadata exists for every builtin.
- `.words`, `.help`, and `.help WORD` output.
- Autocomplete still includes implemented command names.

## Manual Notes

Before implementation, create clean-room notes for the selected Milestone 4 command families. Suggested first notes:

- HP 48G string and list element commands: `HEAD`, `TRIL`, `SUB`, `POS`.
- HP 48G character/string conversion commands: `CHR`, `NUM`, `->STR`.
- HP 48G tagged object command: `->TAG`.

If a command's behavior is unclear, defer it instead of guessing.
