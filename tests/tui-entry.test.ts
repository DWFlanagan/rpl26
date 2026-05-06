import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { createTuiController, handleTuiKeypress } from "../src/tui/app.js";

async function moveToWords(controller: ReturnType<typeof createTuiController>) {
  await handleTuiKeypress(controller, undefined, { name: "tab" });
  await handleTuiKeypress(controller, undefined, { name: "tab" });
}

describe("TUI entry support", () => {
  it("handles a command submission through the controller", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });

    const output = await controller.submit("2 3 +");

    expect(output).toContain("1: 5");
    expect(controller.render()).toContain("1: 5");
  });

  it("handles a dot command submission through the controller", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });

    const output = await controller.submit(".find stack");

    expect(output).toContain("DUP");
  });

  it("reports exit from the interactive return key path outside Words", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    controller.dispatch({ type: "insertText", text: ".exit" });

    const result = await handleTuiKeypress(controller, undefined, { name: "return" });

    expect(result).toBe("exit");
  });

  it("routes printable input to the word filter on Words", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    await moveToWords(controller);

    await handleTuiKeypress(controller, "d", { name: "d" });
    await handleTuiKeypress(controller, "u", { name: "u" });
    await handleTuiKeypress(controller, "+", { name: "+" });

    expect(controller.state.activeTab).toBe("words");
    expect(controller.state.input).toBe("");
    expect(controller.state.wordFilter).toBe("du+");
  });

  it("routes Backspace to the word filter on Words", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    await moveToWords(controller);
    await handleTuiKeypress(controller, "d", { name: "d" });
    await handleTuiKeypress(controller, "u", { name: "u" });

    await handleTuiKeypress(controller, undefined, { name: "backspace" });

    expect(controller.state.wordFilter).toBe("d");
    expect(controller.state.input).toBe("");
  });

  it("routes arrows and Enter to word browsing on Words", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    await moveToWords(controller);
    controller.dispatch({ type: "setWordFilter", query: "dup" });

    await handleTuiKeypress(controller, undefined, { name: "down" });
    await handleTuiKeypress(controller, undefined, { name: "return" });

    expect(controller.state.selectedWord?.name).toBe("DUP2");
    expect(controller.state.activeTab).toBe("help");
    expect(controller.state.input).toBe("");
  });

  it("routes Esc to clear first and leave Words second", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    await moveToWords(controller);
    controller.dispatch({ type: "setWordFilter", query: "drop" });

    await handleTuiKeypress(controller, undefined, { name: "escape" });
    expect(controller.state.activeTab).toBe("words");
    expect(controller.state.wordFilter).toBe("");

    await handleTuiKeypress(controller, undefined, { name: "escape" });
    expect(controller.state.activeTab).toBe("history");
  });
});
