import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const list = (...items: RplObject[]): RplObject => ({ kind: "list", items });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("core stack operations", () => {
  it("pushes inert objects onto the stack", () => {
    expect(evaluateObject(state(), real(5))).toEqual({ ok: true, state: state(real(5)) });
  });

  it("duplicates the top stack object", () => {
    expect(evaluateObject(state(real(2)), name("DUP"))).toEqual({ ok: true, state: state(real(2), real(2)) });
  });

  it("drops the top stack object", () => {
    expect(evaluateObject(state(real(2), real(3)), name("DROP"))).toEqual({ ok: true, state: state(real(2)) });
  });

  it("swaps the top two stack objects", () => {
    expect(evaluateObject(state(real(2), real(3)), name("SWAP"))).toEqual({ ok: true, state: state(real(3), real(2)) });
  });

  it("copies the second stack object to the top", () => {
    expect(evaluateObject(state(real(2), real(3)), name("OVER"))).toEqual({ ok: true, state: state(real(2), real(3), real(2)) });
  });

  it("clears the stack without clearing variables", () => {
    const before: CalculatorState = { stack: [real(2)], variables: { A: real(7) } };
    expect(evaluateObject(before, name("CLEAR"))).toEqual({ ok: true, state: { stack: [], variables: { A: real(7) } } });
  });

  it("reports stack underflow without mutating state", () => {
    expect(evaluateObject(state(), name("DROP"))).toEqual({
      ok: false,
      state: state(),
      error: { code: "StackUnderflow", message: "DROP requires 1 stack object" }
    });
  });

  it("deep clones nested stack objects when duplicating", () => {
    const original = list(real(1));
    const result = evaluateObject(state(original), name("DUP"));

    expect(result).toEqual({ ok: true, state: state(list(real(1)), list(real(1))) });
    if (result.ok) {
      expect(result.state.stack[0]).not.toBe(original);
      expect(result.state.stack[1]).not.toBe(original);
      expect(result.state.stack[0]).not.toBe(result.state.stack[1]);
    }
  });
});
