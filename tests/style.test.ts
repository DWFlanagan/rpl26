import { describe, expect, it } from "vitest";
import { styleObjectKind, styleText } from "../src/style.js";

describe("semantic styles", () => {
  it("selects semantic tokens by object kind", () => {
    expect(styleObjectKind("real")).toBe("number");
    expect(styleObjectKind("string")).toBe("string");
    expect(styleObjectKind("program")).toBe("program");
    expect(styleObjectKind("list")).toBe("list");
    expect(styleObjectKind("tagged")).toBe("tagged");
    expect(styleObjectKind("name")).toBe("name");
    expect(styleObjectKind("quotedName")).toBe("name");
  });

  it("can disable ansi color", () => {
    expect(styleText("ok", "success", { color: false })).toBe("ok");
    expect(styleText("ok", "success", { color: true })).toContain("\u001b[");
  });
});
