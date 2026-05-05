import { describe, expect, it } from "vitest";
import { createTuiState, reduceTuiState } from "../src/tui/state.js";

describe("TUI state", () => {
  it("navigates tabs without changing calculator input", () => {
    const state = createTuiState();
    const vars = reduceTuiState(state, { type: "nextTab" });
    const words = reduceTuiState(vars, { type: "nextTab" });

    expect(vars.activeTab).toBe("vars");
    expect(words.activeTab).toBe("words");
    expect(words.input).toBe("");
  });

  it("keeps input editing separate from tab selection", () => {
    const state = reduceTuiState(createTuiState(), { type: "insertText", text: "2 3 +" });

    expect(state.input).toBe("2 3 +");
    expect(state.activeTab).toBe("history");
    expect(reduceTuiState(state, { type: "backspace" }).input).toBe("2 3 ");
  });

  it("filters and selects words", () => {
    const state = reduceTuiState(createTuiState(), { type: "setWordFilter", query: "list" });
    const selected = reduceTuiState(state, { type: "selectNextWord" });

    expect(selected.wordFilter).toBe("list");
    expect(selected.visibleWords.map((word) => word.name)).toContain("->LIST");
    expect(selected.selectedWord).toBeDefined();
  });

  it("records execution status", () => {
    const state = reduceTuiState(createTuiState(), { type: "recordOutput", input: "2 3 +", output: "1: 5", ok: true });

    expect(state.history).toEqual([{ input: "2 3 +", output: "1: 5", ok: true }]);
    expect(state.status).toBe("ok");
    expect(state.input).toBe("");
  });
});
