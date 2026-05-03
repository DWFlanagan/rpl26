import { describe, expect, it } from "vitest";
import { completeReplInput, formatStack, runCli, runReplLines } from "../src/cli.js";

describe("CLI", () => {
  it("executes one RPL command line and prints a readable stack", () => {
    const result = runCli(["<< 1 + >> 'INC' STO 41 INC"]);

    expect(result).toEqual({
      exitCode: 0,
      stdout: "1: 42",
      stderr: ""
    });
  });

  it("prints JSON when requested", () => {
    const result = runCli(["--json", "<< 1 + >> 'INC' STO 41 INC"]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      stack: [{ level: 1, value: { kind: "real", value: 42 } }],
      variables: { INC: { kind: "program" } }
    });
    expect(result.stderr).toBe("");
  });

  it("returns a usage error when no command line is provided", () => {
    const result = runCli([]);

    expect(result).toEqual({
      exitCode: 1,
      stdout: "",
      stderr: "Usage: rpl26 \"2 3 +\""
    });
  });

  it("formats stack objects for humans", () => {
    expect(
      formatStack([
        { level: 2, value: { kind: "list", items: [{ kind: "real", value: 1 }, { kind: "real", value: 2 }] } },
        { level: 1, value: { kind: "program", body: [{ kind: "real", value: 1 }, { kind: "name", name: "+" }] } }
      ])
    ).toBe("2: { 1 2 }\n1: << 1 + >>");
  });

  it("runs REPL lines against one persistent session", () => {
    const result = runReplLines(["<< 1 + >> 'INC' STO", "41 INC", ".stack", ".vars", ".clear", ".stack"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.split("\n")).toEqual([
      "Stack: <empty>",
      "1: 42",
      "1: 42",
      "INC: << 1 + >>",
      "Cleared.",
      "Stack: <empty>"
    ]);
  });

  it("completes dot commands, builtins, and stored variable names", () => {
    const result = runReplLines(["<< 1 + >> 'INC' STO"]);

    expect(result.exitCode).toBe(0);
    expect(result.session).toBeDefined();
    const session = result.session!;
    expect(completeReplInput(".st", session)).toEqual([[".stack"], ".st"]);
    expect(completeReplInput("SQ", session)).toEqual([["SQ", "SQRT"], "SQ"]);
    expect(completeReplInput("IN", session)).toEqual([["INC", "INV"], "IN"]);
    expect(completeReplInput("ST", session)).toEqual([["START", "STEP", "STO"], "ST"]);
    expect(completeReplInput("WH", session)).toEqual([["WHILE"], "WH"]);
  });
});

describe("manual-derived CLI smoke examples", () => {
  it("prints string object examples in stack order", () => {
    const result = runCli(["\"abc\" HEAD \"abc\" TRIL"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('2: "a"');
    expect(result.stdout).toContain('1: "bc"');
  });
});
