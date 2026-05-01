import { describe, expect, it } from "vitest";
import { parseInput } from "../src/parser.js";

describe("parseInput", () => {
  it("parses real literals and executable names in order", () => {
    expect(parseInput("2 3 + DUP")).toEqual({
      ok: true,
      objects: [
        { kind: "real", value: 2, source: "2" },
        { kind: "real", value: 3, source: "3" },
        { kind: "name", name: "+", source: "+" },
        { kind: "name", name: "DUP", source: "DUP" }
      ]
    });
  });

  it("parses quoted names, programs, lists, and strings", () => {
    expect(parseInput("<< 1 'A' STO >> { 2 \"hi\" }")).toEqual({
      ok: true,
      objects: [
        {
          kind: "program",
          body: [
            { kind: "real", value: 1, source: "1" },
            { kind: "quotedName", name: "A", source: "'A'" },
            { kind: "name", name: "STO", source: "STO" }
          ],
          source: "<< 1 'A' STO >>"
        },
        {
          kind: "list",
          items: [
            { kind: "real", value: 2, source: "2" },
            { kind: "string", value: "hi", source: "\"hi\"" }
          ],
          source: "{ 2 \"hi\" }"
        }
      ]
    });
  });

  it("accepts guillemet program delimiters", () => {
    expect(parseInput("« 2 3 + »")).toMatchObject({
      ok: true,
      objects: [{ kind: "program" }]
    });
  });

  it("rejects invalid numeric-looking input", () => {
    expect(parseInput("1.2.3")).toEqual({
      ok: false,
      error: { code: "InvalidToken", message: "Invalid token: 1.2.3" }
    });
  });

  it("rejects unterminated strings", () => {
    expect(parseInput('"')).toEqual({
      ok: false,
      error: { code: "ParseError", message: "Unterminated string" }
    });
  });

  it("rejects strings ending after an escaped quote", () => {
    expect(parseInput('"abc\\"')).toEqual({
      ok: false,
      error: { code: "ParseError", message: "Unterminated string" }
    });
  });

  it("rejects non-finite real literals", () => {
    expect(parseInput("1e309")).toEqual({
      ok: false,
      error: { code: "InvalidToken", message: "Invalid token: 1e309" }
    });
  });

  it("rejects malformed exponent atoms as invalid tokens", () => {
    expect(parseInput("1e2.3")).toEqual({
      ok: false,
      error: { code: "InvalidToken", message: "Invalid token: 1e2.3" }
    });
  });

  it("rejects unterminated programs", () => {
    expect(parseInput("<< 1 2 +")).toEqual({
      ok: false,
      error: { code: "ParseError", message: "Unterminated program" }
    });
  });
});
