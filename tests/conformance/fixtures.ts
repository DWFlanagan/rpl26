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
