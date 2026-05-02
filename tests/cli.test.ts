import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";

describe("CLI", () => {
  it("executes one RPL command line and prints JSON", () => {
    const result = runCli(["<< 1 + >> 'INC' STO 41 INC"]);

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
      stderr: "Usage: rpn50 \"2 3 +\""
    });
  });
});
