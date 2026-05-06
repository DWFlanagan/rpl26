import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { renderTui } from "../src/tui/render.js";
import { createTuiState, reduceTuiState } from "../src/tui/state.js";

describe("TUI renderer", () => {
  it("renders wide layout with stack inspector on the right", () => {
    const session = new CalculatorSession();
    session.execute("2 3 +");

    const output = renderTui(createTuiState(), session, { width: 90, height: 24, color: false });

    expect(output).toContain("rpl26 tui");
    expect(output).toContain("History  Vars  Words  Help  Trace  Session");
    expect(output).toContain("Stack");
    expect(output).toContain("1: 5");
    expect(output).toContain("rpl26>");
  });

  it("renders narrow layout without the right inspector", () => {
    const output = renderTui(createTuiState(), new CalculatorSession(), { width: 48, height: 16, color: false });

    expect(output).toContain("rpl26 tui");
    expect(output).toContain("History  Vars  Words");
    expect(output).not.toContain("History / Active Pane");
  });

  it("highlights the active top tab in color mode", () => {
    const state = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });

    const output = renderTui(state, new CalculatorSession(), { width: 90, height: 18, color: true });
    const tabs = output.split("\n")[1];

    expect(tabs).toContain("History  Vars  \u001b[7mWords\u001b[27m  Help  Trace  Session");
  });

  it("keeps the top tab row plain when color is disabled", () => {
    const state = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });

    const output = renderTui(state, new CalculatorSession(), { width: 90, height: 18, color: false });

    expect(output.split("\n")[1].trimEnd()).toBe("History  Vars  Words  Help  Trace  Session");
  });

  it("keeps the wide layout divider aligned for multi-line history output", () => {
    const state = reduceTuiState(createTuiState(), { type: "recordOutput", input: ".find stack", output: "DUP\nDROP\nSWAP", ok: true });
    const output = renderTui(state, new CalculatorSession(), { width: 90, height: 18, color: false });
    const body = output.split("\n").slice(2, -2);
    const dividerColumns = body.map((line) => line.indexOf(" | "));

    expect(body).toHaveLength(13);
    expect(new Set(dividerColumns)).toEqual(new Set([55]));
  });

  it("uses wide history as a command log when the right stack inspector is visible", () => {
    const session = new CalculatorSession();
    session.execute("5");
    const state = reduceTuiState(createTuiState(), { type: "recordOutput", input: "5", output: "1: 5", ok: true });

    const output = renderTui(state, session, { width: 90, height: 18, color: false });
    const body = output.split("\n").slice(2, -2);
    const leftColumn = body.map((line) => line.slice(0, 55).trimEnd());

    expect(leftColumn[0]).toBe("> 5");
    expect(leftColumn).toContain("> 5");
    expect(leftColumn).not.toContain("rpl26> 5");
    expect(leftColumn).not.toContain("1: 5");
    expect(output.split("\n").at(-1)?.trimEnd()).toBe("rpl26>");
  });

  it("shows active pane content without history on non-history tabs", () => {
    const session = new CalculatorSession();
    session.execute("5");
    const withHistory = reduceTuiState(createTuiState(), { type: "recordOutput", input: "5", output: "1: 5", ok: true });
    const words = reduceTuiState(reduceTuiState(withHistory, { type: "nextTab" }), { type: "nextTab" });

    const output = renderTui(words, session, { width: 90, height: 18, color: false });
    const body = output.split("\n").slice(2, -2);
    const leftColumn = body.map((line) => line.slice(0, 55).trimEnd());

    expect(leftColumn[0]).toBe("filter: <type to search>");
    expect(leftColumn).not.toContain("Words");
    expect(leftColumn).not.toContain("> 5");
    expect(leftColumn).not.toContain("1: 5");
  });

  it("shows an empty Words filter prompt and selected row marker", () => {
    const words = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });

    const output = renderTui(words, new CalculatorSession(), { width: 90, height: 18, color: false });

    expect(output).toContain("filter: <type to search>");
    expect(output).toContain("> * (math) real real -> real");
  });

  it("keeps the selected Words row visible after navigation past the first page", () => {
    let words = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });
    for (let index = 0; index < 13; index += 1) {
      words = reduceTuiState(words, { type: "selectNextWord" });
    }

    const output = renderTui(words, new CalculatorSession(), { width: 90, height: 18, color: false });
    const body = output.split("\n").slice(2, -2);
    const leftColumn = body.map((line) => line.slice(0, 55).trimEnd());
    const selectedRows = leftColumn.filter((line) => line.startsWith("> "));

    expect(words.selectedWord?.name).toBeDefined();
    expect(leftColumn).toContain(`> ${words.selectedWord?.name} (${words.selectedWord?.category}) ${words.selectedWord?.stack}`);
    expect(selectedRows).toHaveLength(1);
  });

  it("keeps the selected Words row visible at short supported heights", () => {
    let words = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });
    for (let index = 0; index < 8; index += 1) {
      words = reduceTuiState(words, { type: "selectNextWord" });
    }

    const output = renderTui(words, new CalculatorSession(), { width: 90, height: 12, color: false });
    const body = output.split("\n").slice(2, -2);
    const leftColumn = body.map((line) => line.slice(0, 55).trimEnd());
    const selectedRows = leftColumn.filter((line) => line.startsWith("> "));

    expect(words.selectedWord?.name).toBeDefined();
    expect(leftColumn).toContain(`> ${words.selectedWord?.name} (${words.selectedWord?.category}) ${words.selectedWord?.stack}`);
    expect(selectedRows).toHaveLength(1);
  });

  it("shows a non-empty Words filter and no-match message", () => {
    const words = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });
    const filtered = reduceTuiState(words, { type: "setWordFilter", query: "zzzz" });

    const output = renderTui(filtered, new CalculatorSession(), { width: 90, height: 18, color: false });

    expect(output).toContain("filter: zzzz");
    expect(output).toContain("No matches.");
  });

  it("renders Help for the selected word after activation", () => {
    const words = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });
    const filtered = reduceTuiState(words, { type: "setWordFilter", query: "dup" });
    const help = reduceTuiState(filtered, { type: "showSelectedWordHelp" });

    const output = renderTui(help, new CalculatorSession(), { width: 90, height: 18, color: false });

    expect(output).toContain("DUP");
    expect(output).toContain("Category: stack");
    expect(output).toContain("Duplicate level 1.");
  });

  it("keeps stack results in narrow history because there is no right inspector", () => {
    const session = new CalculatorSession();
    session.execute("5");
    const state = reduceTuiState(createTuiState(), { type: "recordOutput", input: "5", output: "1: 5", ok: true });

    const output = renderTui(state, session, { width: 48, height: 16, color: false });

    expect(output).toContain("> 5");
    expect(output).toContain("rpl26>");
    expect(output).toContain("1: 5");
  });
});
