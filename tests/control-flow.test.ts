import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const program = (...body: RplObject[]): RplObject => ({ kind: "program", body });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("HP-style program control flow", () => {
  it("evaluates HP-style IF true and false clauses", () => {
    const choose = program(name("IF"), real(2), real(3), name("<"), name("THEN"), real(10), name("ELSE"), real(20), name("END"));

    expect(evaluateObject(state(choose), name("EVAL"))).toEqual({
      ok: true,
      state: state(real(10))
    });
  });

  it("allows HP-style IF without ELSE", () => {
    const choose = program(name("IF"), real(2), real(3), name(">"), name("THEN"), real(10), name("END"));

    expect(evaluateObject(state(real(9), choose), name("EVAL"))).toEqual({
      ok: true,
      state: state(real(9))
    });
  });

  it("runs START NEXT at least once and repeats while the incremented counter is within finish", () => {
    const countAscending = program(real(0), real(1), real(3), name("START"), real(1), name("+"), name("NEXT"));
    const countReversed = program(real(0), real(3), real(1), name("START"), real(1), name("+"), name("NEXT"));

    expect(evaluateObject(state(countAscending), name("EVAL"))).toEqual({ ok: true, state: state(real(3)) });
    expect(evaluateObject(state(countReversed), name("EVAL"))).toEqual({ ok: true, state: state(real(1)) });
  });

  it("runs START STEP with positive and negative increments", () => {
    const positive = program(real(0), real(1), real(5), name("START"), real(1), name("+"), real(2), name("STEP"));
    const negative = program(real(0), real(5), real(1), name("START"), real(1), name("+"), real(-2), name("STEP"));

    expect(evaluateObject(state(positive), name("EVAL"))).toEqual({ ok: true, state: state(real(3)) });
    expect(evaluateObject(state(negative), name("EVAL"))).toEqual({ ok: true, state: state(real(3)) });
  });

  it("runs FOR NEXT with a loop-local counter and purges it after exit", () => {
    const collect = program(real(1), real(3), name("FOR"), name("i"), name("i"), name("NEXT"), name("i"));

    expect(evaluateObject(state(collect), name("EVAL"))).toEqual({
      ok: false,
      state: state(collect),
      error: { code: "UndefinedName", message: "Undefined name: i" }
    });

    const values = program(real(1), real(3), name("FOR"), name("i"), name("i"), name("NEXT"));
    expect(evaluateObject(state(values), name("EVAL"))).toEqual({
      ok: true,
      state: state(real(1), real(2), real(3))
    });
  });

  it("runs FOR NEXT at least once for reversed bounds", () => {
    const values = program(real(3), real(1), name("FOR"), name("i"), name("i"), name("NEXT"));

    expect(evaluateObject(state(values), name("EVAL"))).toEqual({
      ok: true,
      state: state(real(3))
    });
  });

  it("runs FOR STEP with positive and negative increments", () => {
    const positive = program(real(1), real(5), name("FOR"), name("i"), name("i"), real(2), name("STEP"));
    const negative = program(real(5), real(1), name("FOR"), name("i"), name("i"), real(-2), name("STEP"));

    expect(evaluateObject(state(positive), name("EVAL"))).toEqual({ ok: true, state: state(real(1), real(3), real(5)) });
    expect(evaluateObject(state(negative), name("EVAL"))).toEqual({ ok: true, state: state(real(5), real(3), real(1)) });
  });

  it("runs WHILE REPEAT END as a pre-test loop", () => {
    const countDown = program(real(3), name("WHILE"), name("DUP"), real(0), name(">"), name("REPEAT"), real(1), name("-"), name("END"));
    const skip = program(real(0), name("WHILE"), name("DUP"), real(0), name(">"), name("REPEAT"), real(1), name("-"), name("END"));

    expect(evaluateObject(state(countDown), name("EVAL"))).toEqual({ ok: true, state: state(real(0)) });
    expect(evaluateObject(state(skip), name("EVAL"))).toEqual({ ok: true, state: state(real(0)) });
  });

  it("runs DO UNTIL END as a post-test loop", () => {
    const countUp = program(real(0), name("DO"), real(1), name("+"), name("UNTIL"), name("DUP"), real(3), name("=="), name("END"));

    expect(evaluateObject(state(countUp), name("EVAL"))).toEqual({
      ok: true,
      state: state(real(3))
    });
  });

  it("rejects non-real loop conditions without mutating caller state", () => {
    const badWhile = program(name("WHILE"), { kind: "string", value: "yes" }, name("REPEAT"), real(1), name("END"));
    const before = state(badWhile);

    expect(evaluateObject(before, name("EVAL"))).toEqual({
      ok: false,
      state: before,
      error: { code: "TypeMismatch", message: "WHILE requires a real truth value" }
    });
  });

  it("handles nested control-flow blocks without stopping at inner delimiters", () => {
    const nested = program(
      real(0),
      real(1),
      real(3),
      name("START"),
      name("IF"),
      real(1),
      name("THEN"),
      real(1),
      name("+"),
      name("END"),
      name("NEXT")
    );

    expect(evaluateObject(state(nested), name("EVAL"))).toEqual({
      ok: true,
      state: state(real(3))
    });
  });

  it("reports missing loop delimiters without mutating caller state", () => {
    const missingNext = program(real(1), real(3), name("START"), real(1), name("+"));
    const before = state(missingNext);

    expect(evaluateObject(before, name("EVAL"))).toEqual({
      ok: false,
      state: before,
      error: { code: "InvalidOperation", message: "START requires NEXT or STEP" }
    });
  });

  it("rejects zero STEP increments", () => {
    const zeroStep = program(real(0), real(1), real(3), name("START"), real(1), name("+"), real(0), name("STEP"));
    const before = state(zeroStep);

    expect(evaluateObject(before, name("EVAL"))).toEqual({
      ok: false,
      state: before,
      error: { code: "InvalidOperation", message: "STEP requires a non-zero increment" }
    });
  });

  it("stops non-terminating WHILE loops with an iteration limit", () => {
    const infinite = program(name("WHILE"), real(1), name("REPEAT"), name("END"));
    const before = state(infinite);

    expect(evaluateObject(before, name("EVAL"))).toEqual({
      ok: false,
      state: before,
      error: { code: "InvalidOperation", message: "Loop iteration limit exceeded" }
    });
  });
});
