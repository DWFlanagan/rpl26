import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { createTuiController } from "../src/tui/app.js";

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
});
