import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { renderTui } from "../src/tui/render.js";
import { createTuiState } from "../src/tui/state.js";

describe("TUI renderer", () => {
  it("renders wide layout with stack inspector on the right", () => {
    const session = new CalculatorSession();
    session.execute("2 3 +");

    const output = renderTui(createTuiState(), session, { width: 90, height: 24, color: false });

    expect(output).toContain("rpl26 tui");
    expect(output).toContain("Stack  Vars  Words  Help  Trace  Session");
    expect(output).toContain("History / Active Pane");
    expect(output).toContain("Stack");
    expect(output).toContain("1: 5");
    expect(output).toContain("rpl26>");
  });

  it("renders narrow layout without the right inspector", () => {
    const output = renderTui(createTuiState(), new CalculatorSession(), { width: 48, height: 16, color: false });

    expect(output).toContain("rpl26 tui");
    expect(output).toContain("Stack  Vars  Words");
    expect(output).not.toContain("History / Active Pane        Stack");
  });
});
