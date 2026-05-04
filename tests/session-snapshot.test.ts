import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { loadSessionSnapshot } from "../src/snapshot.js";

describe("session snapshots", () => {
  it("serializes stack and variables into a versioned snapshot", () => {
    const session = new CalculatorSession();
    session.execute("<< 1 + >> 'INC' STO 41 INC");

    expect(session.toSnapshot()).toMatchObject({
      format: "rpl26-session",
      version: 1,
      stack: [{ kind: "real", value: 42 }],
      variables: { INC: { kind: "program" } }
    });
  });

  it("loads a valid snapshot and clears trace", () => {
    const session = new CalculatorSession();
    session.execute("1 2 +");
    expect(session.getTrace().length).toBeGreaterThan(0);

    const result = session.loadSnapshot({
      format: "rpl26-session",
      version: 1,
      stack: [{ kind: "real", value: 5 }],
      variables: { A: { kind: "string", value: "hello" } }
    });

    expect(result).toEqual({ ok: true });
    expect(session.getStack()).toEqual([{ level: 1, value: { kind: "real", value: 5 } }]);
    expect(session.getVariables()).toEqual({ A: { kind: "string", value: "hello" } });
    expect(session.getTrace()).toEqual([]);
  });

  it("rejects malformed snapshots without mutating the session", () => {
    const session = new CalculatorSession();
    session.execute("1 2 + 'A' STO 9");
    const before = session.toSnapshot();
    const traceBefore = session.getTrace();

    const result = session.loadSnapshot({
      format: "rpl26-session",
      version: 2,
      stack: [],
      variables: {}
    });

    expect(result).toEqual({
      ok: false,
      error: { path: "version", message: "expected version 1" }
    });
    expect(session.toSnapshot()).toEqual(before);
    expect(session.getTrace()).toEqual(traceBefore);
  });

  it("validates nested object shapes deterministically", () => {
    expect(
      loadSessionSnapshot({
        format: "rpl26-session",
        version: 1,
        stack: [{ kind: "program", body: [{ kind: "list", items: [{ kind: "real", value: "5" }] }] }],
        variables: {}
      })
    ).toEqual({
      ok: false,
      error: { path: "stack[0].body[0].items[0].value", message: "expected number" }
    });
  });

  it("rejects non-finite real values", () => {
    expect(
      loadSessionSnapshot({
        format: "rpl26-session",
        version: 1,
        stack: [{ kind: "real", value: Number.NaN }],
        variables: {}
      })
    ).toEqual({
      ok: false,
      error: { path: "stack[0].value", message: "expected finite number" }
    });
  });

  it("loads canonical objects without extra properties", () => {
    const session = new CalculatorSession();
    const result = session.loadSnapshot({
      format: "rpl26-session",
      version: 1,
      stack: [{ kind: "real", value: 5, extra: "ignored" }],
      variables: {
        INC: {
          kind: "program",
          body: [{ kind: "real", value: 1, debug: true }],
          source: "<< 1 >>",
          metadata: { untrusted: true }
        }
      }
    });

    expect(result).toEqual({ ok: true });
    expect(session.getStack()).toEqual([{ level: 1, value: { kind: "real", value: 5 } }]);
    expect(session.getVariables()).toEqual({
      INC: {
        kind: "program",
        body: [{ kind: "real", value: 1 }],
        source: "<< 1 >>"
      }
    });
  });
});
