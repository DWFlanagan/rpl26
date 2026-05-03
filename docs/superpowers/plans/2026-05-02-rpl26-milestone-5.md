# rpl26 Milestone 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual-derived conformance suite and use it to triage or fix compatibility drift in behavior already implemented through Milestone 4.

**Architecture:** Keep conformance support test-local: fixture data under `tests/conformance/`, a small TypeScript fixture runner, and Vitest tests that execute supported cases through `CalculatorSession`. Tracked clean-room notes under `docs/superpowers/specs/` explain the manual behavior behind each fixture group; runtime changes are allowed only when fixtures reveal clear Milestone 1-4 drift.

**Tech Stack:** TypeScript, Vitest, existing `CalculatorSession`, existing RPL object types, local ignored `docs/hp48gug.md`, tracked Markdown clean-room notes.

---

## File Map

- Create `docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md`: clean-room notes for the first Milestone 5 fixture corpus.
- Create `tests/conformance/fixtures.ts`: typed fixture data for supported, deferred, divergent, and needs-fix examples.
- Create `tests/conformance/runner.ts`: schema validation, duplicate id detection, and supported fixture execution helpers.
- Create `tests/conformance/manual-derived.test.ts`: Vitest tests for fixture metadata and supported fixture behavior.
- Modify `docs/superpowers/plans/2026-05-02-rpl26-milestone-5.md`: update task checkboxes as work completes.
- Modify runtime files only if Task 4 identifies and fixes clear already-supported behavior drift:
  - `src/parser.ts`
  - `src/core.ts`
  - `src/format.ts`
  - `src/cli.ts`
  - `src/words.ts`
- Modify focused existing tests only when a drift fix needs a unit-level regression test:
  - `tests/parser.test.ts`
  - `tests/core-stack.test.ts`
  - `tests/core-arithmetic.test.ts`
  - `tests/core-eval.test.ts`
  - `tests/control-flow.test.ts`
  - `tests/object-library.test.ts`
  - `tests/word-help.test.ts`

## Task 1: Manual Audit And Clean-Room Notes

**Suggested subagent effort:** `high` for HP manual interpretation and clean-room behavior summaries.

**Files:**
- Create: `docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md`
- Reference: `docs/hp48gug.md`
- Reference: `docs/superpowers/specs/2026-05-02-hp48g-control-flow-notes.md`
- Reference: `docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md`

- [x] **Step 1: Locate manual anchors for implemented behavior**

Run:

```bash
rg -n "DUP|DROP|SWAP|OVER|CLEAR|STO|EVAL|IF|THEN|ELSE|START|NEXT|STEP|FOR|WHILE|REPEAT|DO|UNTIL|HEAD|TRIL|SUB|POS|CHR|NUM|→STR|→TAG" docs/hp48gug.md
```

Expected: local source anchors for each implemented command family. Do not copy manual text into tracked files.

- [x] **Step 2: Write conformance clean-room notes**

Create `docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md`:

```markdown
# HP 48G Conformance Notes

## Source

These notes summarize local reference material from `docs/hp48gug.md`, which is ignored because it contains copyrighted manual text.

Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375, https://literature.hpcalc.org/items/375.

OCR/markdown extraction: olmOCR, https://github.com/allenai/olmocr.

These are clean-room summaries for conformance planning. Do not copy extended manual text into tracked files.

## Stack And Arithmetic Examples

Behavior checked: basic real arithmetic and stack manipulation examples for already-implemented words such as `DUP`, `DROP`, `SWAP`, `OVER`, `CLEAR`, `+`, `-`, `*`, and `/`.

Source regions: record the local line ranges found in `docs/hp48gug.md` during implementation.

Summary: `rpl26` should preserve the HP-style level order where level 1 is the top of stack. Basic stack words operate on stack levels without changing object values. Basic arithmetic consumes real arguments and returns a real result.

Implementation consequences: conformance fixtures should assert object-stack results, not formatted display text, for these examples.

Uncertainty or divergence: HP numeric display precision and full real-number formatting are not part of this milestone.

## Variables And Program Evaluation Examples

Behavior checked: quoted names, `STO`, executable names, inert program objects, and explicit `EVAL`.

Source regions: record the local line ranges found in `docs/hp48gug.md` during implementation.

Summary: quoted names are data, executable names are evaluated, and program objects execute only when evaluated directly or through a stored program name.

Implementation consequences: fixtures should include at least one stored scalar and one stored program.

Uncertainty or divergence: directories, purging, flags, and HP library behavior are outside this milestone.

## Control Flow Examples

Behavior checked: representative examples from the existing HP 48G control-flow notes for `IF`, `START`, `FOR`, `WHILE`, and `DO`.

Source regions: see `docs/superpowers/specs/2026-05-02-hp48g-control-flow-notes.md`.

Summary: conformance fixtures should exercise the already-supported HP-style program syntax and loop execution rules without adding new control forms.

Implementation consequences: fixtures should include true and false branches, definite loops, and one expected loop rejection case.

Uncertainty or divergence: `CASE`, error trapping, and debugger-like tracing remain deferred.

## Object Library Examples

Behavior checked: representative examples from the existing HP 48G object-library notes for strings, lists, character conversion, object-to-string conversion, and tagged objects.

Source regions: see `docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md`.

Summary: `HEAD`, `TRIL`, `SUB`, and `POS` operate on the supported string and list families. `CHR`, `NUM`, `->STR`, and `->TAG` cover the Milestone 4 object library slice.

Implementation consequences: fixtures should include supported examples and explicit divergence/deferred entries for HP object families beyond strings and lists.

Uncertainty or divergence: HP character set fidelity and byte-perfect HP object serialization are intentional divergences for now.
```

- [x] **Step 3: Self-review notes**

Run:

```bash
rg -n "TODO|TBD|copy extended|quote the manual" docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md
```

Expected: no output.

- [x] **Step 4: Run focused verification**

Run:

```bash
npm test -- tests/conformance/rpl-identity.test.ts tests/object-library.test.ts tests/control-flow.test.ts
```

Expected: focused conformance-related tests pass.

- [x] **Step 5: Commit manual notes**

Run:

```bash
git add docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md docs/superpowers/plans/2026-05-02-rpl26-milestone-5.md
git commit -m "docs: add milestone 5 conformance notes"
```

Expected: commit succeeds.

## Task 2: Fixture Types And Validation

**Suggested subagent effort:** `medium` because the schema defines the conformance suite contract.

**Files:**
- Create: `tests/conformance/fixtures.ts`
- Create: `tests/conformance/runner.ts`
- Create: `tests/conformance/manual-derived.test.ts`

- [x] **Step 1: Write failing fixture validation tests**

Create `tests/conformance/manual-derived.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CONFORMANCE_FIXTURES } from "./fixtures.js";
import { validateFixtures } from "./runner.js";

describe("manual-derived conformance fixture metadata", () => {
  it("accepts the checked-in fixture corpus", () => {
    expect(validateFixtures(CONFORMANCE_FIXTURES)).toEqual([]);
  });

  it("rejects duplicate fixture ids", () => {
    const fixtures = [
      {
        id: "duplicate",
        title: "first",
        input: "1",
        status: "supported" as const,
        sourceNote: "docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md#stack-and-arithmetic-examples",
        expectedStack: [{ level: 1, value: { kind: "real" as const, value: 1 } }]
      },
      {
        id: "duplicate",
        title: "second",
        input: "2",
        status: "supported" as const,
        sourceNote: "docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md#stack-and-arithmetic-examples",
        expectedStack: [{ level: 1, value: { kind: "real" as const, value: 2 } }]
      }
    ];

    expect(validateFixtures(fixtures)).toContain("duplicate fixture id: duplicate");
  });

  it("requires reasons for non-supported fixtures", () => {
    const fixtures = [
      {
        id: "missing-reason",
        title: "missing reason",
        input: "1",
        status: "deferred" as const,
        sourceNote: "docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md#stack-and-arithmetic-examples"
      }
    ];

    expect(validateFixtures(fixtures)).toContain("missing-reason: non-supported fixtures require a reason");
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- tests/conformance/manual-derived.test.ts
```

Expected: FAIL because `fixtures.ts` and `runner.ts` do not exist.

- [x] **Step 3: Add fixture types and an empty corpus**

Create `tests/conformance/fixtures.ts`:

```ts
import type { CalculatorErrorCode, RplObject, StackEntry } from "../../src/types.js";

export type ConformanceStatus = "supported" | "deferred" | "intentional-divergence" | "needs-fix";

export type ExpectedError = {
  code: CalculatorErrorCode;
  message?: string;
};

export type ConformanceFixture = {
  id: string;
  title: string;
  input: string;
  status: ConformanceStatus;
  sourceNote: string;
  expectedStack?: StackEntry[];
  expectedVariables?: Record<string, RplObject>;
  expectedError?: ExpectedError;
  reason?: string;
};

export const CONFORMANCE_FIXTURES: ConformanceFixture[] = [];
```

- [x] **Step 4: Add validation helper**

Create `tests/conformance/runner.ts`:

```ts
import { CalculatorSession } from "../../src/session.js";
import type { CalculatorError, ExecuteResult } from "../../src/types.js";
import type { ConformanceFixture } from "./fixtures.js";

const STATUSES = new Set(["supported", "deferred", "intentional-divergence", "needs-fix"]);

export type SupportedFixtureResult = {
  fixture: ConformanceFixture;
  result: ExecuteResult;
};

export function validateFixtures(fixtures: ConformanceFixture[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const fixture of fixtures) {
    if (fixture.id.trim() === "") errors.push("fixture id must not be empty");
    if (seen.has(fixture.id)) errors.push(`duplicate fixture id: ${fixture.id}`);
    seen.add(fixture.id);

    if (fixture.title.trim() === "") errors.push(`${fixture.id}: title is required`);
    if (fixture.input.trim() === "") errors.push(`${fixture.id}: input is required`);
    if (!STATUSES.has(fixture.status)) errors.push(`${fixture.id}: unknown status ${fixture.status}`);
    if (fixture.sourceNote.trim() === "") errors.push(`${fixture.id}: sourceNote is required`);

    if (fixture.status !== "supported" && (fixture.reason === undefined || fixture.reason.trim() === "")) {
      errors.push(`${fixture.id}: non-supported fixtures require a reason`);
    }

    if (fixture.status === "supported" && fixture.expectedStack === undefined && fixture.expectedError === undefined) {
      errors.push(`${fixture.id}: supported fixtures require expectedStack or expectedError`);
    }
  }

  return errors;
}

export function runSupportedFixture(fixture: ConformanceFixture): SupportedFixtureResult {
  const session = new CalculatorSession();
  return { fixture, result: session.execute(fixture.input) };
}

export function errorMatches(actual: CalculatorError, expected: { code: string; message?: string }): boolean {
  if (actual.code !== expected.code) return false;
  if (expected.message === undefined) return true;
  return actual.message === expected.message;
}
```

- [x] **Step 5: Run tests to verify validation passes**

Run:

```bash
npm test -- tests/conformance/manual-derived.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit fixture validation scaffolding**

Run:

```bash
git add tests/conformance/fixtures.ts tests/conformance/runner.ts tests/conformance/manual-derived.test.ts docs/superpowers/plans/2026-05-02-rpl26-milestone-5.md
git commit -m "test: add conformance fixture validation"
```

Expected: commit succeeds.

## Task 3: Supported Fixture Execution

**Suggested subagent effort:** `medium` for test harness implementation and representative fixture selection.

**Files:**
- Modify: `tests/conformance/fixtures.ts`
- Modify: `tests/conformance/manual-derived.test.ts`

- [ ] **Step 1: Add failing supported execution test**

Append to `tests/conformance/manual-derived.test.ts`:

```ts
import { errorMatches, runSupportedFixture } from "./runner.js";

describe("manual-derived supported conformance fixtures", () => {
  it.each(CONFORMANCE_FIXTURES.filter((fixture) => fixture.status === "supported"))("$id: $title", (fixture) => {
    const { result } = runSupportedFixture(fixture);

    if (fixture.expectedError !== undefined) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(errorMatches(result.error, fixture.expectedError)).toBe(true);
      }
      return;
    }

    expect(result.ok).toBe(true);
    expect(result.stack).toEqual(fixture.expectedStack);
    if (fixture.expectedVariables !== undefined) {
      expect(result.variables).toEqual(fixture.expectedVariables);
    }
  });
});
```

Keep the existing imports by merging this import with the imports already at the top of the file.

- [ ] **Step 2: Populate representative supported fixtures**

Replace the empty `CONFORMANCE_FIXTURES` array in `tests/conformance/fixtures.ts` with:

```ts
const note = (anchor: string): string => `docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md#${anchor}`;
const controlNote = (anchor: string): string => `docs/superpowers/specs/2026-05-02-hp48g-control-flow-notes.md#${anchor}`;
const objectNote = (anchor: string): string => `docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md#${anchor}`;

export const CONFORMANCE_FIXTURES: ConformanceFixture[] = [
  {
    id: "m1-real-arithmetic-add",
    title: "real addition leaves one real result",
    input: "2 3 +",
    status: "supported",
    sourceNote: note("stack-and-arithmetic-examples"),
    expectedStack: [{ level: 1, value: { kind: "real", value: 5 } }]
  },
  {
    id: "m1-stack-swap",
    title: "SWAP exchanges levels 1 and 2",
    input: "1 2 SWAP",
    status: "supported",
    sourceNote: note("stack-and-arithmetic-examples"),
    expectedStack: [
      { level: 2, value: { kind: "real", value: 2 } },
      { level: 1, value: { kind: "real", value: 1 } }
    ]
  },
  {
    id: "m1-program-eval",
    title: "EVAL executes an inert program object",
    input: "<< 2 3 + >> EVAL",
    status: "supported",
    sourceNote: note("variables-and-program-evaluation-examples"),
    expectedStack: [{ level: 1, value: { kind: "real", value: 5 } }]
  },
  {
    id: "m1-stored-program",
    title: "stored program executes through its name",
    input: "<< 1 + >> 'INC' STO 41 INC",
    status: "supported",
    sourceNote: note("variables-and-program-evaluation-examples"),
    expectedStack: [{ level: 1, value: { kind: "real", value: 42 } }],
    expectedVariables: { INC: { kind: "program", body: [{ kind: "real", value: 1, source: "1" }, { kind: "name", name: "+", source: "+" }], source: "<< 1 + >>" } }
  },
  {
    id: "m2-list-roundtrip",
    title: "objects collect into a list with ->LIST",
    input: "1 2 3 3 ->LIST",
    status: "supported",
    sourceNote: note("stack-and-arithmetic-examples"),
    expectedStack: [
      {
        level: 1,
        value: {
          kind: "list",
          items: [
            { kind: "real", value: 1, source: "1" },
            { kind: "real", value: 2, source: "2" },
            { kind: "real", value: 3, source: "3" }
          ]
        }
      }
    ]
  },
  {
    id: "m3-if-true-branch",
    title: "HP-style IF selects true branch",
    input: "<< IF 2 3 < THEN 10 ELSE 20 END >> EVAL",
    status: "supported",
    sourceNote: controlNote("conditional-structures"),
    expectedStack: [{ level: 1, value: { kind: "real", value: 10 } }]
  },
  {
    id: "m3-for-loop-values",
    title: "FOR NEXT exposes loop counter values",
    input: "<< 1 3 FOR i i NEXT >> EVAL",
    status: "supported",
    sourceNote: controlNote("definite-loops"),
    expectedStack: [
      { level: 3, value: { kind: "real", value: 1 } },
      { level: 2, value: { kind: "real", value: 2 } },
      { level: 1, value: { kind: "real", value: 3 } }
    ]
  },
  {
    id: "m4-string-head-tril",
    title: "HEAD and TRIL split a string",
    input: "\"abc\" HEAD \"abc\" TRIL",
    status: "supported",
    sourceNote: objectNote("element-commands"),
    expectedStack: [
      { level: 2, value: { kind: "string", value: "a" } },
      { level: 1, value: { kind: "string", value: "bc" } }
    ]
  },
  {
    id: "m4-tagged-object",
    title: "->TAG creates a tagged object",
    input: "42 \"answer\" ->TAG",
    status: "supported",
    sourceNote: objectNote("tagged-objects"),
    expectedStack: [{ level: 1, value: { kind: "tagged", tag: "answer", value: { kind: "real", value: 42, source: "42" } } }]
  },
  {
    id: "error-undefined-name",
    title: "unknown executable names fail clearly",
    input: "NO_SUCH_NAME",
    status: "supported",
    sourceNote: note("variables-and-program-evaluation-examples"),
    expectedError: { code: "UndefinedName", message: "Undefined name: NO_SUCH_NAME" }
  }
];
```

- [ ] **Step 3: Run conformance tests**

Run:

```bash
npm test -- tests/conformance/manual-derived.test.ts
```

Expected: PASS. If an expected source object contains parser `source` metadata not shown here, update the fixture expectation rather than changing runtime behavior.

- [ ] **Step 4: Commit supported fixture execution**

Run:

```bash
git add tests/conformance/fixtures.ts tests/conformance/manual-derived.test.ts docs/superpowers/plans/2026-05-02-rpl26-milestone-5.md
git commit -m "test: add supported manual conformance fixtures"
```

Expected: commit succeeds.

## Task 4: Non-Supported Fixtures And Drift Triage

**Suggested subagent effort:** `high` for deciding whether mismatch belongs to fix, defer, or divergence.

**Files:**
- Modify: `tests/conformance/fixtures.ts`
- Modify: runtime and focused tests only for selected `needs-fix` cases.

- [ ] **Step 1: Add non-supported fixture examples**

Append these fixtures to `CONFORMANCE_FIXTURES`:

```ts
  {
    id: "deferred-units-object",
    title: "unit objects remain outside the current object model",
    input: "1_m",
    status: "deferred",
    sourceNote: note("object-library-examples"),
    reason: "Units are explicitly reserved for Milestone 9 and require their own object model."
  },
  {
    id: "divergence-hp-character-set",
    title: "CHR and NUM use JavaScript code points for now",
    input: "65 CHR NUM",
    status: "intentional-divergence",
    sourceNote: objectNote("character-and-string-conversion"),
    reason: "Milestone 4 intentionally uses JavaScript code points until an HP 48 character table is audited."
  }
```

- [ ] **Step 2: Add metadata tests for the visible triage corpus**

Append to `tests/conformance/manual-derived.test.ts`:

```ts
describe("manual-derived non-supported conformance fixtures", () => {
  it("keeps deferred and divergent examples visible", () => {
    expect(CONFORMANCE_FIXTURES.some((fixture) => fixture.status === "deferred")).toBe(true);
    expect(CONFORMANCE_FIXTURES.some((fixture) => fixture.status === "intentional-divergence")).toBe(true);
  });

  it("does not leave unresolved needs-fix fixtures in the passing corpus", () => {
    const needsFix = CONFORMANCE_FIXTURES.filter((fixture) => fixture.status === "needs-fix");

    expect(needsFix).toEqual([]);
  });
});
```

- [ ] **Step 3: Run conformance tests**

Run:

```bash
npm test -- tests/conformance/manual-derived.test.ts
```

Expected: PASS.

- [ ] **Step 4: Audit for real needs-fix cases**

Audit implemented behavior while reading the manual notes. Choose one path:

Path A, if a clear Milestone 1-4 drift case is found:

1. Add a real `needs-fix` fixture describing the drift.
2. Add a focused failing unit test in the relevant existing test file.
3. Make the smallest runtime change in `src/parser.ts`, `src/core.ts`, `src/format.ts`, `src/cli.ts`, or `src/words.ts`.
4. Promote the fixture from `needs-fix` to `supported`.
5. Keep the `does not leave unresolved needs-fix fixtures` test passing by resolving the selected case in the same task.

Path B, if no clear drift case is selected for Milestone 5:

Keep only `deferred` and `intentional-divergence` examples as the visible triage corpus.

- [ ] **Step 5: Run conformance tests**

Run:

```bash
npm test -- tests/conformance/manual-derived.test.ts
```

Expected: PASS with no unresolved `needs-fix` fixture.

- [ ] **Step 6: Commit triage fixtures and any drift fix**

Run:

```bash
git add tests/conformance/fixtures.ts tests/conformance/runner.ts tests/conformance/manual-derived.test.ts src/parser.ts src/core.ts src/format.ts src/cli.ts src/words.ts tests/parser.test.ts tests/core-stack.test.ts tests/core-arithmetic.test.ts tests/core-eval.test.ts tests/control-flow.test.ts tests/object-library.test.ts tests/word-help.test.ts docs/superpowers/plans/2026-05-02-rpl26-milestone-5.md
git commit -m "test: triage manual conformance drift"
```

Expected: commit succeeds. If no runtime files changed, `git add` prints no error for unmatched tracked paths and the commit contains only fixture or test changes.

## Task 5: CLI Smoke Coverage

**Suggested subagent effort:** `low` for narrow CLI coverage.

**Files:**
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Add failing CLI smoke test for a manual-derived example**

Append to `tests/cli.test.ts`:

```ts
import { spawnSync } from "node:child_process";

describe("manual-derived CLI smoke examples", () => {
  it("prints string object examples in stack order", () => {
    const result = spawnSync(process.execPath, ["dist/src/cli.js", "\"abc\" HEAD \"abc\" TRIL"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('2: "a"');
    expect(result.stdout).toContain('1: "bc"');
  });
});
```

If `tests/cli.test.ts` already imports `spawnSync`, merge the import instead of duplicating it.

- [ ] **Step 2: Run the CLI test before building to observe failure if `dist` is stale**

Run:

```bash
npm test -- tests/cli.test.ts
```

Expected: PASS if `dist` is already current, or FAIL because `dist/src/cli.js` is missing or stale.

- [ ] **Step 3: Build and rerun the CLI test**

Run:

```bash
npm run build
npm test -- tests/cli.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit CLI smoke coverage**

Run:

```bash
git add tests/cli.test.ts docs/superpowers/plans/2026-05-02-rpl26-milestone-5.md
git commit -m "test: add manual-derived CLI smoke coverage"
```

Expected: commit succeeds.

## Task 6: Final Verification

**Suggested subagent effort:** `medium` for verification and any focused cleanup from failures.

**Files:**
- Modify only files required to fix verification failures.
- Modify: `docs/superpowers/plans/2026-05-02-rpl26-milestone-5.md`

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run strict CLI smoke check**

Run:

```bash
npm run calc -- "\"abc\" HEAD \"abc\" TRIL"
```

Expected: output includes:

```text
2: "a"
1: "bc"
```

- [ ] **Step 5: Commit plan completion updates**

Run:

```bash
git add docs/superpowers/plans/2026-05-02-rpl26-milestone-5.md
git commit -m "docs: complete milestone 5 implementation plan"
```

Expected: commit succeeds if plan checkboxes changed.
