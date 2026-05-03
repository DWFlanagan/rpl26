import { CalculatorSession } from "../../src/session.js";
import type { CalculatorError, ExecuteResult } from "../../src/types.js";
import type { ConformanceFixture, ExpectedError } from "./fixtures.js";

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

    if (fixture.status === "supported") {
      const expectationCount = Number(fixture.expectedStack !== undefined) + Number(fixture.expectedError !== undefined);
      if (expectationCount !== 1) {
        errors.push(`${fixture.id}: supported fixtures require exactly one of expectedStack or expectedError`);
      }
    }
  }

  return errors;
}

export function runSupportedFixture(fixture: ConformanceFixture): SupportedFixtureResult {
  const session = new CalculatorSession();
  return { fixture, result: session.execute(fixture.input) };
}

export function errorMatches(actual: CalculatorError, expected: ExpectedError): boolean {
  if (actual.code !== expected.code) return false;
  if (expected.message === undefined) return true;
  return actual.message === expected.message;
}
