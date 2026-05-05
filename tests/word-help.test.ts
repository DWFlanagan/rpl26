import { describe, expect, it } from "vitest";
import { runReplLines } from "../src/cli.js";
import { describeWordDetail, searchWords } from "../src/word-search.js";
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

  it("searches words by name, category, stack effect, description, source, keyword, and alias", () => {
    expect(searchWords("").map((word) => word.name)).toEqual(listWords());
    expect(searchWords("dup").map((word) => word.name)).toContain("DUP");
    expect(searchWords("list").map((word) => word.name)).toContain("->LIST");
    expect(searchWords("real real").map((word) => word.name)).toContain("+");
    expect(searchWords("duplicate").map((word) => word.name)).toContain("DUP");
    expect(searchWords("Milestone 1").map((word) => word.name)).toContain("DUP");
    expect(searchWords("copy").map((word) => word.name)).toContain("DUP");
    expect(searchWords("plus").map((word) => word.name)).toContain("+");
  });

  it("renders rich word details with aliases, keywords, and examples", () => {
    expect(describeWordDetail("DUP")).toContain("Examples:");
    expect(describeWordDetail("DUP")).toContain("1 DUP");
    expect(describeWordDetail("STO")).toContain("Aliases: store");
    expect(describeWordDetail("STO")).toContain("Keywords: store, variable, global");
    expect(describeWordDetail("NOPE")).toBeUndefined();
  });
});

describe("REPL help", () => {
  it("prints word list and single-word help", async () => {
    const result = await runReplLines([".words", ".help HEAD"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("HEAD");
    expect(result.stdout).toContain("TRIL");
    expect(result.stdout).toContain("Stack:");
  });

  it("reports missing help without failing the session", async () => {
    const result = await runReplLines([".help NOPE"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No help for NOPE");
  });
});
