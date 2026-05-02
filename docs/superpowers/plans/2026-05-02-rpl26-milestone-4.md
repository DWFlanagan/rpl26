# rpl26 Milestone 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual-checked practical object library for strings, lists, object-to-string conversion, tagged objects, and lightweight command discovery.

**Architecture:** Keep command execution in the existing TypeScript evaluator, but introduce a small word metadata registry so builtins, autocomplete, and REPL help share one source of truth. Add tagged objects to the RPL object model only after tests define construction, display, comparison, storage, and cloning behavior. Each HP-like command must be backed by clean-room notes derived from the ignored HP 48G User's Guide extraction.

**Tech Stack:** TypeScript, Vitest, existing parser/evaluator/session/CLI structure, local ignored `docs/hp48gug.md` reference, tracked Markdown notes under `docs/superpowers/specs/`.

---

## File Map

- Create `docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md`: clean-room source notes for `HEAD`, `TRIL`, `SUB`, `POS`, `CHR`, `NUM`, `->STR`, and `->TAG`.
- Create `src/words.ts`: builtin metadata registry, categories, stack effects, help text, and exported builtin name list.
- Modify `src/core.ts`: import builtin names from `src/words.ts`; implement selected object commands.
- Modify `src/types.ts`: add `tagged` object type.
- Modify `src/cli.ts`: export `formatObject`; add `.words`, `.help`, and `.help WORD`.
- Modify `src/session.ts` only if help metadata needs session-independent formatting; prefer no change.
- Create `tests/object-library.test.ts`: string/list/object/tag command behavior.
- Create `tests/word-help.test.ts`: metadata coverage and REPL help behavior.
- Modify `tests/parser.test.ts`, `tests/core-comparison.test.ts`, `tests/cli.test.ts`, `tests/conformance/rpl-identity.test.ts`, and `README.md` for object/tag/help coverage.

## Task 1: Manual Notes

**Suggested subagent effort:** `high` for HP manual interpretation and clean-room behavior summaries.

**Files:**
- Create: `docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md`

- [x] **Step 1: Find source regions**

Run:

```bash
rg -n "HEAD Command|TRIL|SUB Command|POS Command|CHR Command|NUM Command|→STR Command|→Tag Command" docs/hp48gug.md
```

Expected: local line references for each selected command. Current known anchors include `HEAD Command` around line 19321, `NUM Command` around line 19841, `CHR Command` around line 18803, `REPL Command` around line 20435, `→STR Command` around line 20988, and `→Tag Command` around line 21018.

- [x] **Step 2: Write clean-room notes**

Create `docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md` with this structure:

```markdown
# HP 48G Object Library Notes

## Source

These notes summarize local reference material from `docs/hp48gug.md`, which is ignored because it contains copyrighted manual text.

Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375, https://literature.hpcalc.org/items/375.

OCR/markdown extraction: olmOCR, https://github.com/allenai/olmocr.

## Element Commands

`HEAD` returns the first element of a list or the first character of a string. `TRIL` returns the remainder after removing that first element or character. `SUB` extracts a one-based inclusive range from a list or string. `POS` searches a string for a substring or a list for an object and returns a one-based position; the implementation treats not-found as `0` and this must be verified against the command reference before coding.

Source regions: local markdown lines 15772, 16683, 17683, 17765, and detailed command sections around 19321 and neighboring command-reference entries.

## Character And String Conversion

`CHR` converts a real character code to a one-character string. `NUM` returns the code for the first character of a string. `->STR` converts an object to string form.

Character-set fidelity note: unless a later audit adds an HP 48 character table, Milestone 4 uses JavaScript code points for common ASCII examples and documents this as provisional.

Source regions: local markdown lines 14758, 17663, 18803, 19841, and 20988.

## Tagged Objects

`->TAG` combines an object with a name or descriptive string to create a tagged object. Milestone 4 supports construction, display, equality, storage, and stack movement for tagged objects.

Source regions: local markdown lines 10675, 10690, 11886, 17755, and 21018.
```

- [x] **Step 3: Self-review notes**

Run:

```bash
rg -n "TODO|TBD|copy|excerpt|quote" docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md
```

Expected: no placeholders and no long copied manual text.

## Task 2: Word Metadata Registry

**Suggested subagent effort:** `low` for registry scaffolding; raise to `medium` only if metadata refactoring touches evaluator behavior.

**Files:**
- Create: `src/words.ts`
- Modify: `src/core.ts`
- Test: `tests/word-help.test.ts`

- [x] **Step 1: Write failing metadata tests**

Create `tests/word-help.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BUILTIN_NAMES, WORDS, describeWord, listWords } from "../src/words.js";

describe("word metadata", () => {
  it("has metadata for every builtin name", () => {
    expect(BUILTIN_NAMES.every((name) => WORDS[name] !== undefined)).toBe(true);
  });

  it("lists words in sorted order", () => {
    expect(listWords()).toEqual([...listWords()].sort());
  });

  it("describes one word with stack effect, category, and source note", () => {
    expect(describeWord("HEAD")).toContain("HEAD");
    expect(describeWord("HEAD")).toContain("Stack:");
    expect(describeWord("HEAD")).toContain("Category:");
    expect(describeWord("HEAD")).toContain("Source:");
  });

  it("returns undefined for missing word help", () => {
    expect(describeWord("NOPE")).toBeUndefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/word-help.test.ts
```

Expected: FAIL because `src/words.ts` does not exist.

- [x] **Step 3: Implement registry**

Create `src/words.ts`:

```ts
export type WordCategory = "core" | "stack" | "math" | "list" | "string" | "object" | "logic" | "control";

export type WordMetadata = {
  name: string;
  category: WordCategory;
  stack: string;
  description: string;
  source: string;
};

const word = (metadata: WordMetadata): WordMetadata => metadata;

export const WORDS: Record<string, WordMetadata> = {
  EVAL: word({ name: "EVAL", category: "core", stack: "program -> ...", description: "Evaluate a program object or object from level 1.", source: "rpl26 Milestone 1" }),
  STO: word({ name: "STO", category: "core", stack: "object 'name' ->", description: "Store an object in a global variable.", source: "rpl26 Milestone 1" }),
  "+": word({ name: "+", category: "math", stack: "real real -> real", description: "Add two real numbers.", source: "rpl26 Milestone 1" }),
  "-": word({ name: "-", category: "math", stack: "real real -> real", description: "Subtract level 1 from level 2.", source: "rpl26 Milestone 1" }),
  "*": word({ name: "*", category: "math", stack: "real real -> real", description: "Multiply two real numbers.", source: "rpl26 Milestone 1" }),
  "/": word({ name: "/", category: "math", stack: "real real -> real", description: "Divide level 2 by level 1.", source: "rpl26 Milestone 1" }),
  HEAD: word({ name: "HEAD", category: "object", stack: "list|string -> object|string", description: "Return the first list element or first string character.", source: "HP 48G object library notes" }),
  TRIL: word({ name: "TRIL", category: "object", stack: "list|string -> list|string", description: "Return all but the first list element or string character.", source: "HP 48G object library notes" }),
  SUB: word({ name: "SUB", category: "object", stack: "list|string start end -> list|string", description: "Extract a one-based inclusive subrange.", source: "HP 48G object library notes" }),
  POS: word({ name: "POS", category: "object", stack: "list|string object|string -> real", description: "Return a one-based position, or zero when not found.", source: "HP 48G object library notes" }),
  CHR: word({ name: "CHR", category: "string", stack: "real -> string", description: "Convert a character code to a one-character string.", source: "HP 48G object library notes" }),
  NUM: word({ name: "NUM", category: "string", stack: "string -> real", description: "Return the code for the first character of a string.", source: "HP 48G object library notes" }),
  "->STR": word({ name: "->STR", category: "object", stack: "object -> string", description: "Convert an object to display string form.", source: "HP 48G object library notes" }),
  "->TAG": word({ name: "->TAG", category: "object", stack: "object name|string -> tagged", description: "Create a tagged object.", source: "HP 48G object library notes" })
};
```

Then include the existing builtin names from `src/core.ts` in this registry before moving on. Do not leave any current builtin out; the test requires full coverage.

Add exports:

```ts
export const BUILTIN_NAMES = Object.keys(WORDS);

export function listWords(): string[] {
  return [...BUILTIN_NAMES].sort();
}

export function describeWord(name: string): string | undefined {
  const metadata = WORDS[name];
  if (metadata === undefined) return undefined;
  return `${metadata.name}\nCategory: ${metadata.category}\nStack: ${metadata.stack}\nSource: ${metadata.source}\n${metadata.description}`;
}
```

Modify `src/core.ts` to import `BUILTIN_NAMES` from `src/words.ts` and remove the local exported array.

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/word-help.test.ts
```

Expected: PASS.

## Task 3: Tagged Object Type And Formatting

**Suggested subagent effort:** `medium` because this touches the shared object model, formatter, equality, and cloning.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/core.ts`
- Modify: `src/cli.ts`
- Test: `tests/object-library.test.ts`

- [x] **Step 1: Write failing tagged object tests**

Create `tests/object-library.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import { formatStack } from "../src/cli.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const string = (value: string): RplObject => ({ kind: "string", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const quotedName = (value: string): RplObject => ({ kind: "quotedName", name: value });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("object library", () => {
  it("creates tagged objects from a string tag", () => {
    expect(evaluateObject(state(real(42), string("answer")), name("->TAG"))).toEqual({
      ok: true,
      state: state({ kind: "tagged", tag: "answer", value: real(42) })
    });
  });

  it("creates tagged objects from a quoted-name tag", () => {
    expect(evaluateObject(state(real(42), quotedName("answer")), name("->TAG"))).toEqual({
      ok: true,
      state: state({ kind: "tagged", tag: "answer", value: real(42) })
    });
  });

  it("formats tagged objects for humans", () => {
    expect(formatStack([{ level: 1, value: { kind: "tagged", tag: "answer", value: real(42) } }])).toBe("1: answer: 42");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/object-library.test.ts
```

Expected: FAIL because `tagged` is not a valid `RplObject` and `->TAG` is undefined.

- [x] **Step 3: Implement tagged type and formatting**

Modify `src/types.ts`:

```ts
| { kind: "tagged"; tag: string; value: RplObject; source?: string };
```

Modify `cloneObject` and `comparableObject` in `src/core.ts` with `tagged` cases.

Modify `formatObject` in `src/cli.ts`:

```ts
case "tagged":
  return `${object.tag}: ${formatObject(object.value)}`;
```

Export `formatObject` if tests need direct formatting later:

```ts
export function formatObject(object: RplObject): string {
```

Add `->TAG` in `applyBuiltin`:

```ts
case "->TAG": {
  if (next.stack.length < 2) return underflow(state, "->TAG", 2);
  const tagObject = next.stack.pop() as RplObject;
  const value = next.stack.pop() as RplObject;
  if (tagObject.kind !== "string" && tagObject.kind !== "quotedName") {
    return typeError(state, "->TAG requires a string or quoted name tag");
  }
  next.stack.push({ kind: "tagged", tag: tagObject.kind === "string" ? tagObject.value : tagObject.name, value: cloneObject(value) });
  return { ok: true, state: next };
}
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/object-library.test.ts
```

Expected: PASS for tagged object tests.

## Task 4: String And List Element Commands

**Suggested subagent effort:** `medium` for implementing manual-checked stack behavior; use `high` if manual notes reveal ambiguous edge cases.

**Files:**
- Modify: `src/core.ts`
- Test: `tests/object-library.test.ts`

- [x] **Step 1: Add failing tests for `HEAD`, `TRIL`, `SUB`, and `POS`**

Append to `tests/object-library.test.ts`:

```ts
it("gets HEAD and TRIL for strings", () => {
  expect(evaluateObject(state(string("abc")), name("HEAD"))).toEqual({ ok: true, state: state(string("a")) });
  expect(evaluateObject(state(string("abc")), name("TRIL"))).toEqual({ ok: true, state: state(string("bc")) });
});

it("gets HEAD and TRIL for lists", () => {
  const list: RplObject = { kind: "list", items: [real(1), real(2), real(3)] };
  expect(evaluateObject(state(list), name("HEAD"))).toEqual({ ok: true, state: state(real(1)) });
  expect(evaluateObject(state(list), name("TRIL"))).toEqual({ ok: true, state: state({ kind: "list", items: [real(2), real(3)] }) });
});

it("extracts SUB ranges from strings and lists", () => {
  expect(evaluateObject(state(string("abcd"), real(2), real(3)), name("SUB"))).toEqual({ ok: true, state: state(string("bc")) });
  expect(evaluateObject(state({ kind: "list", items: [real(1), real(2), real(3)] }, real(2), real(3)), name("SUB"))).toEqual({
    ok: true,
    state: state({ kind: "list", items: [real(2), real(3)] })
  });
});

it("finds POS in strings and lists", () => {
  expect(evaluateObject(state(string("abc"), string("b")), name("POS"))).toEqual({ ok: true, state: state(real(2)) });
  expect(evaluateObject(state(string("abc"), string("z")), name("POS"))).toEqual({ ok: true, state: state(real(0)) });
  expect(evaluateObject(state({ kind: "list", items: [real(1), real(2)] }, real(2)), name("POS"))).toEqual({ ok: true, state: state(real(2)) });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/object-library.test.ts
```

Expected: FAIL because these commands are not implemented.

- [x] **Step 3: Implement commands**

Add helpers in `src/core.ts` near list helpers:

```ts
function oneBasedRange(state: CalculatorState, command: string, length: number): { ok: true; start: number; end: number } | { ok: false; result: EvaluateResult } {
  const start = integerValue(state.stack[state.stack.length - 2]);
  const end = integerValue(state.stack[state.stack.length - 1]);
  if (start === undefined || end === undefined) return { ok: false, result: invalidOperation(state, `${command} requires integer indexes`) };
  if (start < 1 || end < start || end > length) return { ok: false, result: invalidOperation(state, `${command} index out of range`) };
  return { ok: true, start, end };
}
```

Add `HEAD`, `TRIL`, `SUB`, and `POS` cases in `applyBuiltin` using clone-safe list handling and JavaScript string slicing for the provisional character model. Use one-based indexes in stack behavior.

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/object-library.test.ts
```

Expected: PASS for element command tests.

## Task 5: Character And Object-To-String Commands

**Suggested subagent effort:** `medium` because display formatting becomes shared runtime behavior.

**Files:**
- Modify: `src/core.ts`
- Modify: `src/cli.ts`
- Test: `tests/object-library.test.ts`

- [x] **Step 1: Add failing tests for `CHR`, `NUM`, and `->STR`**

Append to `tests/object-library.test.ts`:

```ts
it("converts between character codes and strings", () => {
  expect(evaluateObject(state(real(65)), name("CHR"))).toEqual({ ok: true, state: state(string("A")) });
  expect(evaluateObject(state(string("Az")), name("NUM"))).toEqual({ ok: true, state: state(real(65)) });
});

it("converts objects to display strings", () => {
  expect(evaluateObject(state(real(42)), name("->STR"))).toEqual({ ok: true, state: state(string("42")) });
  expect(evaluateObject(state({ kind: "list", items: [real(1), real(2)] }), name("->STR"))).toEqual({ ok: true, state: state(string("{ 1 2 }")) });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/object-library.test.ts
```

Expected: FAIL because commands are not implemented.

- [x] **Step 3: Implement commands**

Move or share display formatting so `src/core.ts` can use the same human-readable object formatter as `src/cli.ts`. Prefer creating `src/format.ts` with:

```ts
import type { RplObject } from "./types.js";

export function formatObject(object: RplObject): string {
  switch (object.kind) {
    case "real": return String(object.value);
    case "name": return object.name;
    case "quotedName": return `'${object.name}'`;
    case "program": return `<< ${object.body.map(formatObject).join(" ")} >>`;
    case "list": return `{ ${object.items.map(formatObject).join(" ")} }`;
    case "string": return JSON.stringify(object.value);
    case "tagged": return `${object.tag}: ${formatObject(object.value)}`;
  }
}
```

Then import it in `src/cli.ts` and `src/core.ts`.

Implement:

```ts
case "CHR": {
  if (next.stack.length < 1) return underflow(state, "CHR", 1);
  const code = integerValue(next.stack[next.stack.length - 1]);
  if (code === undefined || code < 0) return invalidOperation(state, "CHR requires a non-negative integer character code");
  next.stack.pop();
  next.stack.push({ kind: "string", value: String.fromCodePoint(code) });
  return { ok: true, state: next };
}
case "NUM": {
  if (next.stack.length < 1) return underflow(state, "NUM", 1);
  const object = next.stack.pop() as RplObject;
  if (object.kind !== "string") return typeError(state, "NUM requires a string");
  if (object.value.length === 0) return invalidOperation(state, "NUM requires a non-empty string");
  next.stack.push(real(object.value.codePointAt(0) ?? 0));
  return { ok: true, state: next };
}
case "->STR": {
  if (next.stack.length < 1) return underflow(state, "->STR", 1);
  const object = next.stack.pop() as RplObject;
  next.stack.push({ kind: "string", value: formatObject(object) });
  return { ok: true, state: next };
}
```

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/object-library.test.ts tests/cli.test.ts
```

Expected: PASS.

## Task 6: REPL Help Commands

**Suggested subagent effort:** `low` for CLI plumbing against the metadata registry.

**Files:**
- Modify: `src/cli.ts`
- Test: `tests/word-help.test.ts`
- Test: `tests/cli.test.ts`

- [x] **Step 1: Add failing REPL help tests**

Append to `tests/word-help.test.ts`:

```ts
import { runReplLines } from "../src/cli.js";

describe("REPL help", () => {
  it("prints word list and single-word help", () => {
    const result = runReplLines([".words", ".help HEAD"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("HEAD");
    expect(result.stdout).toContain("TRIL");
    expect(result.stdout).toContain("Stack:");
  });

  it("reports missing help without failing the session", () => {
    const result = runReplLines([".help NOPE"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No help for NOPE");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/word-help.test.ts
```

Expected: FAIL because `.words` and `.help` are not implemented.

- [x] **Step 3: Implement `.words` and `.help`**

In `src/cli.ts`, import:

```ts
import { describeWord, listWords } from "./words.js";
```

Extend `DOT_COMMANDS`:

```ts
const DOT_COMMANDS = [".stack", ".vars", ".trace", ".words", ".help", ".clear", ".exit", ".quit"];
```

Add a shared helper:

```ts
function runDotCommand(session: CalculatorSession, trimmed: string): string | "exit" | undefined {
  if (trimmed === ".exit" || trimmed === ".quit") return "exit";
  if (trimmed === ".stack") return formatStack(session.getStack());
  if (trimmed === ".vars") return formatVariables(session.getVariables());
  if (trimmed === ".trace") return formatTrace({ ok: true, stack: session.getStack(), variables: session.getVariables(), trace: session.getTrace() });
  if (trimmed === ".words") return listWords().join(" ");
  if (trimmed === ".help") return "Use .help WORD for stack effect, description, and source note.";
  if (trimmed.startsWith(".help ")) {
    const word = trimmed.slice(".help ".length).trim();
    return describeWord(word) ?? `No help for ${word}`;
  }
  if (trimmed === ".clear") {
    session.clear();
    return "Cleared.";
  }
  return undefined;
}
```

Use it from both `runReplLines` and `runReplLine` to avoid duplicated dot-command behavior.

- [x] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/word-help.test.ts tests/cli.test.ts
```

Expected: PASS.

## Task 7: Conformance Examples And README

**Suggested subagent effort:** `low` for examples and documentation updates.

**Files:**
- Modify: `tests/conformance/rpl-identity.test.ts`
- Modify: `README.md`

- [x] **Step 1: Add conformance examples**

Add examples to `tests/conformance/rpl-identity.test.ts`:

```ts
[
  "string head and rest",
  "\"abc\" HEAD \"abc\" TRIL",
  [
    { level: 2, value: { kind: "string", value: "a" } },
    { level: 1, value: { kind: "string", value: "bc" } }
  ]
],
[
  "tagged object",
  "42 \"answer\" ->TAG",
  [{ level: 1, value: { kind: "tagged", tag: "answer", value: { kind: "real", value: 42 } } }]
]
```

- [x] **Step 2: Update README**

Add Milestone 4 commands and REPL help examples:

```rpl
"abc" HEAD
"abc" TRIL
"abcd" 2 3 SUB
42 "answer" ->TAG
.words
.help HEAD
```

- [x] **Step 3: Run tests**

Run:

```bash
npm test -- tests/conformance/rpl-identity.test.ts tests/cli.test.ts
```

Expected: PASS.

## Task 8: Final Verification

**Suggested subagent effort:** `medium` for verification; use `high` only if failures require root-cause debugging.

**Files:**
- All modified source, docs, and tests.

- [x] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [x] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit code 0.

- [x] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: exit code 0.

- [x] **Step 4: Run CLI smoke checks**

Run:

```bash
npm run calc -- '"abc" HEAD'
npm run calc -- '42 "answer" ->TAG'
printf '%s\n' ".help HEAD" ".exit" | npm run repl
```

Expected: first command prints `1: "a"`, second command prints a tagged object, and REPL help includes `HEAD`, `Stack:`, and `Source:`.

- [ ] **Step 5: Commit**

Run:

```bash
git add AGENTS.md README.md docs/superpowers/specs/2026-05-02-rpl26-roadmap.md docs/superpowers/specs/2026-05-02-milestone-4-design.md docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md docs/superpowers/plans/2026-05-02-rpl26-milestone-4.md src tests
git commit -m "feat: add practical object library"
```

Expected: one focused Milestone 4 implementation commit.

## Self-Review

- Spec coverage: manual notes, string/list commands, `->STR`, `->TAG`, command metadata, `.words`, `.help`, README examples, and verification are covered.
- Scope check: binary integers, matrices, units, plotting, CAS, saved history, and GUI work are excluded.
- Type consistency: tagged objects use `{ kind: "tagged"; tag: string; value: RplObject }`; metadata exports are `WORDS`, `BUILTIN_NAMES`, `listWords`, and `describeWord`; object display is centralized in `src/format.ts`.
- Manual fidelity: plan starts with a clean-room notes task and uses HP word `TRIL`, not the invented alias `TAIL`.
