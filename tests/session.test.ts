import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";

describe("CalculatorSession", () => {
  it("persists stack and variables across execute calls", () => {
    const session = new CalculatorSession();
    expect(session.execute("<< 1 + >> 'INC' STO")).toMatchObject({ ok: true });
    expect(session.execute("41 INC")).toMatchObject({ ok: true });
    expect(session.getStack()).toEqual([{ level: 1, value: { kind: "real", value: 42 } }]);
    expect(session.getVariables()).toEqual({
      INC: {
        kind: "program",
        body: [
          { kind: "real", value: 1, source: "1" },
          { kind: "name", name: "+", source: "+" }
        ],
        source: "<< 1 + >>"
      }
    });
  });

  it("displays the deepest stack object first and level 1 last", () => {
    const session = new CalculatorSession();
    expect(session.execute("1 2 3")).toMatchObject({ ok: true });
    expect(session.getStack()).toEqual([
      { level: 3, value: { kind: "real", value: 1, source: "1" } },
      { level: 2, value: { kind: "real", value: 2, source: "2" } },
      { level: 1, value: { kind: "real", value: 3, source: "3" } }
    ]);
  });

  it("records trace entries and stops on the first failing object", () => {
    const session = new CalculatorSession();
    const result = session.execute("2 0 / 9");
    expect(result).toMatchObject({
      ok: false,
      error: { code: "DivisionByZero", message: "/ cannot divide by zero" },
      stack: [
        { level: 2, value: { kind: "real", value: 2, source: "2" } },
        { level: 1, value: { kind: "real", value: 0, source: "0" } }
      ]
    });
    expect(result.trace.map((entry) => ({ source: entry.source, ok: entry.ok }))).toEqual([
      { source: "2", ok: true },
      { source: "0", ok: true },
      { source: "/", ok: false }
    ]);
  });

  it("records trace entries for program-body objects evaluated by EVAL", () => {
    const session = new CalculatorSession();
    const result = session.execute("<< 2 3 + >> EVAL");
    expect(result).toMatchObject({ ok: true });
    expect(result.trace.map((entry) => ({ source: entry.source, ok: entry.ok }))).toEqual([
      { source: "<< 2 3 + >>", ok: true },
      { source: "2", ok: true },
      { source: "3", ok: true },
      { source: "+", ok: true },
      { source: "EVAL", ok: true }
    ]);
  });

  it("records trace entries for stored program-body objects", () => {
    const session = new CalculatorSession();
    expect(session.execute("<< 1 + >> 'INC' STO")).toMatchObject({ ok: true });
    const result = session.execute("41 INC");
    expect(result).toMatchObject({ ok: true });
    expect(result.trace.map((entry) => ({ source: entry.source, ok: entry.ok }))).toEqual([
      { source: "41", ok: true },
      { source: "1", ok: true },
      { source: "+", ok: true },
      { source: "INC", ok: true }
    ]);
  });

  it("clears stack, variables, and trace", () => {
    const session = new CalculatorSession();
    session.execute("5 'A' STO A");
    session.clear();
    expect(session.getStack()).toEqual([]);
    expect(session.getVariables()).toEqual({});
    expect(session.getTrace()).toEqual([]);
  });
});
