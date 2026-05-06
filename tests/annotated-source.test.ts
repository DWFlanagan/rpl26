import { describe, expect, it } from "vitest";
import {
  exportAnnotatedSource,
  objectHash,
  parseAnnotatedProgramSource,
  stripRplComments
} from "../src/annotated-source.js";

describe("annotated RPL source", () => {
  it("strips @ comments outside strings", () => {
    expect(stripRplComments("<<\n  @ Stack: x y -> z\n  * @ multiply\n>>")).toBe("<<\n  \n  * \n>>");
  });

  it("preserves @ inside strings", () => {
    expect(stripRplComments('<< "email@example.com" @ comment\n >>')).toBe('<< "email@example.com" \n >>');
  });

  it("handles escaped quotes before @ characters", () => {
    expect(stripRplComments('<< "say \\"@\\"" @ comment\n >>')).toBe('<< "say \\"@\\"" \n >>');
  });

  it("strips comments after strings ending with a literal backslash", () => {
    expect(stripRplComments('<< "x\\\\" @ comment\n >>')).toBe('<< "x\\\\" \n >>');
  });

  it("parses annotated source into exactly one program object", () => {
    const result = parseAnnotatedProgramSource("<<\n  @ increment\n  1 +\n>>");

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.object).toEqual({
      kind: "program",
      body: [
        { kind: "real", value: 1, source: "1" },
        { kind: "name", name: "+", source: "+" }
      ],
      source: "<< 1 + >>"
    });
    expect(result.executableSource).toBe("<<\n  \n  1 +\n>>");
  });

  it("rejects annotated source that is not exactly one program", () => {
    expect(parseAnnotatedProgramSource("1 2 +")).toEqual({
      ok: false,
      error: { code: "InvalidAnnotatedSource", message: "expected exactly one program object" }
    });
  });

  it("exports comments according to mode", () => {
    const source = "<<\n  @ Stack: x y -> z\n  *\n>>";
    expect(exportAnnotatedSource(source, "rpl26")).toEqual({ source, warnings: [] });
    expect(exportAnnotatedSource(source, "hp48-user-rpl")).toEqual({ source: "<<\n  \n  *\n>>", warnings: [] });
  });

  it("hashes equivalent objects deterministically", () => {
    const left = parseAnnotatedProgramSource("<< @ comment\n1 + >>");
    const right = parseAnnotatedProgramSource("<< 1 + >>");
    expect(left.ok && right.ok ? objectHash(left.object) === objectHash(right.object) : false).toBe(true);
  });
});
