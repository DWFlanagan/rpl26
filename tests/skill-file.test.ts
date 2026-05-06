import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("rpl26 agent skill", () => {
  it("documents the readable RPL workflow for agents", async () => {
    const text = await readFile("skills/rpl26/SKILL.md", "utf8");

    expect(text).toContain("name: rpl26");
    expect(text).toContain("annotated RPL");
    expect(text).toContain("@ comments");
    expect(text).toContain("store_program");
    expect(text).toContain("run_program_examples");
    expect(text).toContain("get_program_source");
    expect(text).toContain("inspect_program");
    expect(text).toContain("save_session");
    expect(text).toContain("load_session");
    expect(text).toContain("export_program");
    expect(text).toContain("hp48-user-rpl");
    expect(text).toContain("Do not invent unsupported RPL behavior");
    expect(text).toContain("CAS");
    expect(text).toContain("units");
    expect(text).toContain("matrices");
    expect(text).toContain("System RPL");
    expect(text).toContain("HP binary object formats");
  });
});
