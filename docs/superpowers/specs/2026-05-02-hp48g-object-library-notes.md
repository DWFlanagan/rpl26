# HP 48G Object Library Notes

## Source

These notes summarize local reference material from `docs/hp48gug.md`, which is ignored because it contains copyrighted manual text.

Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375, https://literature.hpcalc.org/items/375.

OCR/markdown extraction: olmOCR, https://github.com/allenai/olmocr.

These notes are clean-room summaries for implementation planning. Do not copy extended manual text into tracked files.

## Element Commands

`HEAD` returns the first element of a list or the first character of a string.

`TRIL` returns all but the first element of a list or all but the first character of a string. The HP word is `TRIL`, not `TAIL`.

`SUB` extracts a one-based inclusive range from a list or string. Milestone 4 limits `SUB` to lists and strings even though the HP command also applies to other object families.

`POS` searches a string for a substring or a list for an object and returns a one-based position. The guide explicitly notes that list `POS` returns `0` when the element is not found; Milestone 4 applies the same not-found result to strings.

Source regions: local markdown lines 6198, 15772, 16683, 17683, 17765, and the `HEAD` command section around 19321.

## Character And String Conversion

`CHR` converts a real character code to a one-character string.

`NUM` returns the character code for the first character of a string.

`->STR` converts an object to string form.

Character-set fidelity note: unless a later audit adds an HP 48 character table, Milestone 4 uses JavaScript code points for common ASCII examples and documents this as provisional.

Source regions: local markdown lines 14758, 17663, 18803, 19841, and 20988.

## Tagged Objects

`->TAG` combines an object in level 2 with a string or quoted-name tag in level 1 to create a tagged object.

Milestone 4 supports construction, display, equality, storage, and stack movement for tagged objects. Commands that remove tags or deeply interact with tags remain deferred.

Source regions: local markdown lines 10675, 10690, 11886, 17755, and 21018.
