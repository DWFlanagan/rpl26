import { describe, expect, it } from "vitest";
import { CONFORMANCE_FIXTURES } from "./fixtures.js";
import { errorMatches, runSupportedFixture, validateFixtures } from "./runner.js";

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
