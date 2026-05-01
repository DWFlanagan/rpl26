import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("core real arithmetic", () => {
  it.each([
    ["+", state(real(2), real(3)), state(real(5))],
    ["-", state(real(2), real(3)), state(real(-1))],
    ["*", state(real(2), real(3)), state(real(6))],
    ["/", state(real(2), real(4)), state(real(0.5))],
    ["NEG", state(real(2)), state(real(-2))],
    ["INV", state(real(4)), state(real(0.25))],
    ["SQ", state(real(4)), state(real(16))],
    ["SQRT", state(real(9)), state(real(3))]
  ])("applies %s", (operator, before, after) => {
    expect(evaluateObject(before, name(operator))).toEqual({ ok: true, state: after });
  });

  it("rejects non-real arithmetic inputs without mutation", () => {
    const before = state({ kind: "string", value: "2" }, real(3));
    expect(evaluateObject(before, name("+"))).toEqual({
      ok: false,
      state: before,
      error: { code: "TypeMismatch", message: "+ requires real arguments" }
    });
  });

  it("rejects division by zero without mutation", () => {
    expect(evaluateObject(state(real(2), real(0)), name("/"))).toEqual({
      ok: false,
      state: state(real(2), real(0)),
      error: { code: "DivisionByZero", message: "/ cannot divide by zero" }
    });
  });
});
