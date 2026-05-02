import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const list = (...items: RplObject[]): RplObject => ({ kind: "list", items });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("core comparisons and booleans", () => {
  it("pushes TRUE and FALSE as real truth values", () => {
    expect(evaluateObject(state(), name("TRUE"))).toEqual({ ok: true, state: state(real(1)) });
    expect(evaluateObject(state(), name("FALSE"))).toEqual({ ok: true, state: state(real(0)) });
  });

  it.each([
    ["==", state(real(2), real(2)), state(real(1))],
    ["==", state(real(2), real(3)), state(real(0))],
    ["<>", state(real(2), real(3)), state(real(1))],
    ["<", state(real(2), real(3)), state(real(1))],
    [">", state(real(2), real(3)), state(real(0))],
    ["<=", state(real(2), real(2)), state(real(1))],
    [">=", state(real(3), real(2)), state(real(1))]
  ])("applies %s", (operator, before, after) => {
    expect(evaluateObject(before, name(operator))).toEqual({ ok: true, state: after });
  });

  it("compares nested objects structurally while ignoring source metadata", () => {
    expect(evaluateObject(state(list({ kind: "real", value: 1, source: "1" }), list(real(1))), name("=="))).toEqual({
      ok: true,
      state: state(real(1))
    });
  });

  it("rejects ordering comparisons for non-real objects without mutation", () => {
    expect(evaluateObject(state(list(real(1)), real(2)), name("<"))).toEqual({
      ok: false,
      state: state(list(real(1)), real(2)),
      error: { code: "TypeMismatch", message: "< requires real arguments" }
    });
  });
});
