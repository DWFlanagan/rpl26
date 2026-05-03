import { describe, expect, it } from "vitest";
import { CONFORMANCE_FIXTURES } from "./fixtures.js";
import { runSupportedFixture, validateFixtures } from "./runner.js";

const TASK_3_SUPPORTED_FIXTURE_IDS = [
  "m1-real-arithmetic-add",
  "m1-stack-swap",
  "m1-program-eval",
  "m1-stored-program",
  "m2-list-roundtrip",
  "m3-if-true-branch",
  "m3-for-loop-values",
  "m4-string-head-tril",
  "m4-tagged-object",
  "error-undefined-name"
] as const;

const supportedFixtures = CONFORMANCE_FIXTURES.filter((fixture) => fixture.status === "supported");

const fixtureContext = (fixture: (typeof supportedFixtures)[number], result: unknown): string =>
  [
    `${fixture.id}: ${fixture.title}`,
    `sourceNote: ${fixture.sourceNote}`,
    `input: ${fixture.input}`,
    `actual: ${JSON.stringify(result, null, 2)}`
  ].join("\n");

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

  it("rejects supported fixtures with both expected stack and expected error", () => {
    const fixtures = [
      {
        id: "ambiguous-supported",
        title: "ambiguous supported expectation",
        input: "1",
        status: "supported" as const,
        sourceNote: "docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md#stack-and-arithmetic-examples",
        expectedStack: [{ level: 1, value: { kind: "real" as const, value: 1 } }],
        expectedError: { code: "InvalidOperation" as const }
      }
    ];

    expect(validateFixtures(fixtures)).toContain(
      "ambiguous-supported: supported fixtures require exactly one of expectedStack or expectedError"
    );
  });
});

describe("manual-derived supported conformance fixtures", () => {
  it("includes the expected Task 3 supported fixture corpus", () => {
    expect(supportedFixtures.map((fixture) => fixture.id)).toEqual(TASK_3_SUPPORTED_FIXTURE_IDS);
  });

  it.each(supportedFixtures)("$id: $title", (fixture) => {
    const { result } = runSupportedFixture(fixture);
    const context = fixtureContext(fixture, result);

    if (fixture.expectedError !== undefined) {
      if (result.ok) {
        expect(result, context).toMatchObject({ ok: false });
        return;
      }
      expect(result.error, context).toMatchObject(fixture.expectedError);
      return;
    }

    if (!result.ok) {
      expect(result, context).toMatchObject({ ok: true });
      return;
    }
    expect(result.stack, context).toEqual(fixture.expectedStack);
    if (fixture.expectedVariables !== undefined) {
      expect(result.variables, context).toEqual(fixture.expectedVariables);
    }
  });
});

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
