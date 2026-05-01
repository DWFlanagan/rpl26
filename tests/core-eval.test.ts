import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const quotedName = (value: string): RplObject => ({ kind: "quotedName", name: value });
const program = (...body: RplObject[]): RplObject => ({ kind: "program", body });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("RPL evaluator", () => {
  it("pushes program objects without executing them", () => {
    const object = program(real(2), real(3), name("+"));
    expect(evaluateObject(state(), object)).toEqual({ ok: true, state: state(object) });
  });

  it("EVAL executes a program object from level 1", () => {
    expect(evaluateObject(state(program(real(2), real(3), name("+"))), name("EVAL"))).toEqual({
      ok: true,
      state: state(real(5))
    });
  });

  it("stores objects under quoted global names", () => {
    expect(evaluateObject(state(real(5), quotedName("A")), name("STO"))).toEqual({
      ok: true,
      state: { stack: [], variables: { A: real(5) } }
    });
  });

  it("evaluates non-program global names by pushing their value", () => {
    const before: CalculatorState = { stack: [], variables: { A: real(5) } };
    expect(evaluateObject(before, name("A"))).toEqual({
      ok: true,
      state: { stack: [real(5)], variables: { A: real(5) } }
    });
  });

  it("evaluates program global names by executing the program", () => {
    const before: CalculatorState = { stack: [real(41)], variables: { INC: program(real(1), name("+")) } };
    expect(evaluateObject(before, name("INC"))).toEqual({
      ok: true,
      state: { stack: [real(42)], variables: { INC: program(real(1), name("+")) } }
    });
  });

  it("keeps nested programs inert until EVAL", () => {
    const nested = program(real(1), real(2), name("+"));
    expect(evaluateObject(state(program(nested)), name("EVAL"))).toEqual({
      ok: true,
      state: state(nested)
    });
  });

  it("leaves the original state unchanged when EVALed program storage fails later", () => {
    const object = program(real(1), quotedName("B"), name("STO"), name("MISSING"));
    const before = state(object);
    expect(evaluateObject(before, name("EVAL"))).toEqual({
      ok: false,
      state: before,
      error: { code: "UndefinedName", message: "Undefined name: MISSING" }
    });
  });

  it("leaves the caller state unchanged when stored program storage fails later", () => {
    const failingProgram = program(real(1), quotedName("B"), name("STO"), name("MISSING"));
    const before: CalculatorState = {
      stack: [real(10)],
      variables: { A: real(7), FAIL: failingProgram }
    };
    expect(evaluateObject(before, name("FAIL"))).toEqual({
      ok: false,
      state: before,
      error: { code: "UndefinedName", message: "Undefined name: MISSING" }
    });
  });

  it("reports unknown non-command non-variable names", () => {
    expect(evaluateObject(state(), name("MISSING"))).toEqual({
      ok: false,
      state: state(),
      error: { code: "UndefinedName", message: "Undefined name: MISSING" }
    });
  });
});
