import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const list = (...items: RplObject[]): RplObject => ({ kind: "list", items });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("core list operations", () => {
  it("builds a list from a count and stack objects", () => {
    expect(evaluateObject(state(real(1), real(2), real(3), real(3)), name("->LIST"))).toEqual({
      ok: true,
      state: state(list(real(1), real(2), real(3)))
    });
  });

  it("decomposes a list into items followed by count", () => {
    expect(evaluateObject(state(list(real(1), real(2), real(3))), name("LIST->"))).toEqual({
      ok: true,
      state: state(real(1), real(2), real(3), real(3))
    });
  });

  it("returns list size", () => {
    expect(evaluateObject(state(list(real(1), real(2))), name("SIZE"))).toEqual({
      ok: true,
      state: state(real(2))
    });
  });

  it("gets a one-based list item", () => {
    expect(evaluateObject(state(list(real(10), real(20)), real(2)), name("GET"))).toEqual({
      ok: true,
      state: state(real(20))
    });
  });

  it("rejects invalid list indexes without mutation", () => {
    expect(evaluateObject(state(list(real(10)), real(2)), name("GET"))).toEqual({
      ok: false,
      state: state(list(real(10)), real(2)),
      error: { code: "InvalidOperation", message: "GET index out of range" }
    });
  });
});
