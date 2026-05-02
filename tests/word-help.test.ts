import { describe, expect, it } from "vitest";
import { runReplLines } from "../src/cli.js";
import { BUILTIN_NAMES, WORDS, describeWord, listWords } from "../src/words.js";

describe("word metadata", () => {
  it("has metadata for every builtin name", () => {
    expect(BUILTIN_NAMES.every((name) => WORDS[name] !== undefined)).toBe(true);
  });

  it("lists words in sorted order", () => {
    expect(listWords()).toEqual([...listWords()].sort());
  });

  it("describes one word with stack effect, category, and source note", () => {
    const description = describeWord("HEAD");

    expect(description).toContain("HEAD");
    expect(description).toContain("Stack:");
    expect(description).toContain("Category:");
    expect(description).toContain("Source:");
  });

  it("returns undefined for missing word help", () => {
    expect(describeWord("NOPE")).toBeUndefined();
  });
});

describe("REPL help", () => {
  it("prints word list and single-word help", () => {
    const result = runReplLines([".words", ".help HEAD"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("HEAD");
    expect(result.stdout).toContain("TRIL");
    expect(result.stdout).toContain("Stack:");
  });

  it("reports missing help without failing the session", () => {
    const result = runReplLines([".help NOPE"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No help for NOPE");
  });
});
