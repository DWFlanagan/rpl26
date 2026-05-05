import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("runs REPL lines against one persistent session", async () => {
    const result = await runReplLines(["<< 1 + >> 'INC' STO", "41 INC", ".stack", ".vars", ".clear", ".stack"]);

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

  it("completes dot commands, builtins, and stored variable names", async () => {
    const result = await runReplLines(["<< 1 + >> 'INC' STO"]);

    expect(result.exitCode).toBe(0);
    expect(result.session).toBeDefined();
    const session = result.session!;
    expect(completeReplInput(".st", session)).toEqual([[".stack", ".status"], ".st"]);
    expect(completeReplInput(".lo", session)).toEqual([[".load"], ".lo"]);
    expect(completeReplInput(".sa", session)).toEqual([[".save"], ".sa"]);
    expect(completeReplInput("SQ", session)).toEqual([["SQ", "SQRT"], "SQ"]);
    expect(completeReplInput("IN", session)).toEqual([["INC", "INV"], "IN"]);
    expect(completeReplInput("ST", session)).toEqual([["START", "STEP", "STO"], "ST"]);
    expect(completeReplInput("WH", session)).toEqual([["WHILE"], "WH"]);
  });

  it("finds words from the plain REPL", async () => {
    const result = await runReplLines([".find list"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("->LIST");
    expect(result.stdout).toContain("LIST->");
  });

  it("shows REPL status", async () => {
    const result = await runReplLines(["1 2 + 'A' STO", ".status"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Stack 0");
    expect(result.stdout).toContain("Vars 1");
    expect(result.stdout).toContain("Last ok");
    expect(result.stdout).toContain("saved: <none>");
  });

  it("prints compact and verbose traces", async () => {
    const result = await runReplLines(["1 2 +", ".trace", ".trace --verbose"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ok +");
    expect(result.stdout).toContain("before:");
    expect(result.stdout).toContain("after:");
  });

  it("prints verbose stack and variable views", async () => {
    const result = await runReplLines(["42 'A' STO \"abc\"", ".stack --verbose", ".vars --verbose"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("1: string \"abc\"");
    expect(result.stdout).toContain("A: real 42");
  });

  it("saves and loads snapshots from the REPL", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-"));
    const path = join(dir, "session.json");

    const saved = await runReplLines(["42 'A' STO 9", `.save ${path}`]);
    expect(saved.exitCode).toBe(0);
    expect(saved.stdout).toContain(`Saved ${path}`);
    expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({
      format: "rpl26-session",
      version: 1,
      stack: [{ kind: "real", value: 9 }],
      variables: { A: { kind: "real", value: 42 } }
    });

    const loaded = await runReplLines([`.load ${path}`, ".stack", ".vars"]);
    expect(loaded.exitCode).toBe(0);
    expect(loaded.stdout).toContain("Loaded");
    expect(loaded.stdout).toContain("1: 9");
    expect(loaded.stdout).toContain("A: 42");
  });

  it("keeps the current session when load fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-"));
    const path = join(dir, "bad-session.json");
    await writeFile(path, JSON.stringify({ format: "rpl26-session", version: 99, stack: [], variables: {} }), "utf8");

    const result = await runReplLines(["5", `.load ${path}`, ".stack"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Load failed at version: expected version 1");
    expect(result.stdout).toContain("1: 5");
  });

  it("keeps the current session when the load file cannot be read", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-"));
    const path = join(dir, "missing-session.json");

    const result = await runReplLines(["5", `.load ${path}`, ".stack"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Load failed:");
    expect(result.stdout).toContain("1: 5");
  });

  it("reports save failures without changing snapshot status", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-"));
    const validPath = join(dir, "session.json");
    const invalidPath = join(dir, "missing", "session.json");

    const result = await runReplLines(["5", `.save ${validPath}`, "6", `.save ${invalidPath}`, ".status"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`Saved ${validPath}`);
    expect(result.stdout).toContain("Save failed:");
    expect(result.stdout).toContain(`saved: ${validPath} (modified)`);
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
