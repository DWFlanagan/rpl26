import { describe, expect, it } from "vitest";
import { createTuiState, reduceTuiState } from "../src/tui/state.js";

function wordsState() {
  return reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });
}

describe("TUI state", () => {
  it("navigates tabs without changing calculator input", () => {
    const state = createTuiState();
    const vars = reduceTuiState(state, { type: "nextTab" });
    const words = reduceTuiState(vars, { type: "nextTab" });

    expect(vars.activeTab).toBe("vars");
    expect(words.activeTab).toBe("words");
    expect(words.input).toBe("");
  });

  it("keeps command input editing on non-Words tabs", () => {
    const state = reduceTuiState(createTuiState(), { type: "insertText", text: "2 3 +" });

    expect(state.input).toBe("2 3 +");
    expect(state.activeTab).toBe("history");
    expect(reduceTuiState(state, { type: "backspace" }).input).toBe("2 3 ");
  });

  it("filters words directly without changing command input", () => {
    const filtered = reduceTuiState(wordsState(), { type: "appendWordFilter", text: "dup" });

    expect(filtered.activeTab).toBe("words");
    expect(filtered.input).toBe("");
    expect(filtered.wordFilter).toBe("dup");
    expect(filtered.visibleWords.map((word) => word.name)).toContain("DUP");
    expect(filtered.selectedWord?.name).toBe("DUP");
  });

  it("filters operator words from printable symbols", () => {
    const filtered = reduceTuiState(wordsState(), { type: "appendWordFilter", text: "+" });

    expect(filtered.wordFilter).toBe("+");
    expect(filtered.visibleWords.map((word) => word.name)).toEqual(["+"]);
    expect(filtered.selectedWord?.name).toBe("+");
  });

  it("edits the word filter with Backspace", () => {
    const filtered = reduceTuiState(wordsState(), { type: "appendWordFilter", text: "du" });
    const edited = reduceTuiState(filtered, { type: "backspaceWordFilter" });

    expect(edited.wordFilter).toBe("d");
    expect(edited.input).toBe("");
    expect(edited.visibleWords.map((word) => word.name)).toContain("DUP");
  });

  it("clamps word selection at the visible list boundaries", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "dup" });
    const first = reduceTuiState(filtered, { type: "selectPreviousWord" });
    const second = reduceTuiState(filtered, { type: "selectNextWord" });
    const clamped = reduceTuiState(second, { type: "selectNextWord" });

    expect(filtered.visibleWords.map((word) => word.name)).toEqual(["DUP", "DUP2"]);
    expect(first.selectedWord?.name).toBe("DUP");
    expect(second.selectedWord?.name).toBe("DUP2");
    expect(clamped.selectedWord?.name).toBe("DUP2");
  });

  it("settles missing or stale word selection on the first visible word", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "dup" });
    const staleWord = reduceTuiState(wordsState(), { type: "setWordFilter", query: "drop" }).selectedWord;
    const missingSelection = { ...filtered, selectedWord: undefined };
    const staleSelection = { ...filtered, selectedWord: staleWord };

    expect(reduceTuiState(missingSelection, { type: "selectNextWord" }).selectedWord?.name).toBe("DUP");
    expect(reduceTuiState(missingSelection, { type: "selectPreviousWord" }).selectedWord?.name).toBe("DUP");
    expect(reduceTuiState(staleSelection, { type: "selectNextWord" }).selectedWord?.name).toBe("DUP");
    expect(reduceTuiState(staleSelection, { type: "selectPreviousWord" }).selectedWord?.name).toBe("DUP");
  });

  it("keeps no-match selection empty and allows Help activation", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "zzzz" });
    const moved = reduceTuiState(reduceTuiState(filtered, { type: "selectNextWord" }), { type: "selectPreviousWord" });
    const help = reduceTuiState(moved, { type: "showSelectedWordHelp" });

    expect(filtered.visibleWords).toEqual([]);
    expect(moved.selectedWord).toBeUndefined();
    expect(help.activeTab).toBe("help");
    expect(help.selectedWord).toBeUndefined();
  });

  it("switches to Help while preserving the selected word", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "drop" });
    const help = reduceTuiState(filtered, { type: "showSelectedWordHelp" });

    expect(help.activeTab).toBe("help");
    expect(help.selectedWord?.name).toBe("DROP");
    expect(help.wordFilter).toBe("drop");
  });

  it("clears a non-empty word filter on Esc", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "drop" });
    const cleared = reduceTuiState(filtered, { type: "escapeWords" });

    expect(cleared.activeTab).toBe("words");
    expect(cleared.wordFilter).toBe("");
    expect(cleared.visibleWords.length).toBeGreaterThan(1);
    expect(cleared.selectedWord?.name).toBe(createTuiState().selectedWord?.name);
  });

  it("returns from unfiltered Words to History on Esc", () => {
    const escaped = reduceTuiState(wordsState(), { type: "escapeWords" });

    expect(escaped.activeTab).toBe("history");
    expect(escaped.wordFilter).toBe("");
  });

  it("records execution status", () => {
    const state = reduceTuiState(createTuiState(), { type: "recordOutput", input: "2 3 +", output: "1: 5", ok: true });

    expect(state.history).toEqual([{ input: "2 3 +", output: "1: 5", ok: true }]);
    expect(state.status).toBe("ok");
    expect(state.input).toBe("");
  });
});
