import { describe, expect, it } from "vitest";
import { formatStack } from "../src/cli.js";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const string = (value: string): RplObject => ({ kind: "string", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const quotedName = (value: string): RplObject => ({ kind: "quotedName", name: value });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("object library", () => {
  it("creates tagged objects from a string tag", () => {
    expect(evaluateObject(state(real(42), string("answer")), name("->TAG"))).toEqual({
      ok: true,
      state: state({ kind: "tagged", tag: "answer", value: real(42) })
    });
  });

  it("creates tagged objects from a quoted-name tag", () => {
    expect(evaluateObject(state(real(42), quotedName("answer")), name("->TAG"))).toEqual({
      ok: true,
      state: state({ kind: "tagged", tag: "answer", value: real(42) })
    });
  });

  it("formats tagged objects for humans", () => {
    expect(formatStack([{ level: 1, value: { kind: "tagged", tag: "answer", value: real(42) } }])).toBe("1: answer: 42");
  });

  it("gets HEAD and TRIL for strings", () => {
    expect(evaluateObject(state(string("abc")), name("HEAD"))).toEqual({ ok: true, state: state(string("a")) });
    expect(evaluateObject(state(string("abc")), name("TRIL"))).toEqual({ ok: true, state: state(string("bc")) });
  });

  it("gets HEAD and TRIL for lists", () => {
    const list: RplObject = { kind: "list", items: [real(1), real(2), real(3)] };

    expect(evaluateObject(state(list), name("HEAD"))).toEqual({ ok: true, state: state(real(1)) });
    expect(evaluateObject(state(list), name("TRIL"))).toEqual({ ok: true, state: state({ kind: "list", items: [real(2), real(3)] }) });
  });

  it("extracts SUB ranges from strings and lists", () => {
    expect(evaluateObject(state(string("abcd"), real(2), real(3)), name("SUB"))).toEqual({ ok: true, state: state(string("bc")) });
    expect(evaluateObject(state({ kind: "list", items: [real(1), real(2), real(3)] }, real(2), real(3)), name("SUB"))).toEqual({
      ok: true,
      state: state({ kind: "list", items: [real(2), real(3)] })
    });
  });

  it("finds POS in strings and lists", () => {
    expect(evaluateObject(state(string("abc"), string("b")), name("POS"))).toEqual({ ok: true, state: state(real(2)) });
    expect(evaluateObject(state(string("abc"), string("z")), name("POS"))).toEqual({ ok: true, state: state(real(0)) });
    expect(evaluateObject(state({ kind: "list", items: [real(1), real(2)] }, real(2)), name("POS"))).toEqual({ ok: true, state: state(real(2)) });
  });

  it("converts between character codes and strings", () => {
    expect(evaluateObject(state(real(65)), name("CHR"))).toEqual({ ok: true, state: state(string("A")) });
    expect(evaluateObject(state(string("Az")), name("NUM"))).toEqual({ ok: true, state: state(real(65)) });
  });

  it("converts objects to display strings", () => {
    expect(evaluateObject(state(real(42)), name("->STR"))).toEqual({ ok: true, state: state(string("42")) });
    expect(evaluateObject(state({ kind: "list", items: [real(1), real(2)] }), name("->STR"))).toEqual({
      ok: true,
      state: state(string("{ 1 2 }"))
    });
  });
});
