import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IntegrationService } from "../src/integration/service.js";

describe("IntegrationService", () => {
  it("creates, lists, selects, and deletes named sessions", () => {
    const service = new IntegrationService();

    expect(service.listSessions()).toEqual({ ok: true, value: [{ name: "default", selected: true }] });
    expect(service.createSession({ name: "work" })).toEqual({ ok: true, value: { name: "work", selected: false } });
    expect(service.selectSession({ name: "work" })).toEqual({ ok: true, value: { name: "work", selected: true } });
    expect(service.listSessions()).toEqual({
      ok: true,
      value: [
        { name: "default", selected: false },
        { name: "work", selected: true }
      ]
    });
    expect(service.deleteSession({ name: "work" })).toEqual({ ok: true, value: { deleted: "work", selected: "default" } });
    expect(service.deleteSession({ name: "default" })).toMatchObject({
      ok: false,
      error: { code: "InvalidRequest" }
    });
  });

  it("stores annotated source as a normal executable variable", () => {
    const service = new IntegrationService();

    const stored = service.storeProgram({
      session: "default",
      name: "VELOCITY",
      source: "<<\n  @ Stack: distance time -> velocity\n  *\n>>",
      examples: [{ input: "3 4 VELOCITY", expectedStack: [{ kind: "real", value: 12 }] }]
    });

    expect(stored).toMatchObject({ ok: true });
    expect(service.execute({ session: "default", input: "3 4 VELOCITY" })).toMatchObject({
      ok: true,
      value: { ok: true, stack: [{ level: 1, value: { kind: "real", value: 12 } }] }
    });
    expect(service.getProgramSource({ session: "default", name: "VELOCITY" })).toMatchObject({
      ok: true,
      value: { name: "VELOCITY", stale: false, source: "<<\n  @ Stack: distance time -> velocity\n  *\n>>" }
    });
    expect(service.listPrograms({ session: "default" })).toEqual({
      ok: true,
      value: [{ name: "VELOCITY", annotated: true, stale: false }]
    });
  });

  it("runs program examples in an isolated session without mutating the live stack", () => {
    const service = new IntegrationService();
    service.execute({ session: "default", input: "99" });
    service.storeProgram({
      session: "default",
      name: "VELOCITY",
      source: "<< * >>",
      examples: [{ description: "simple multiplication", input: "3 4 VELOCITY", expectedStack: [{ kind: "real", value: 12 }] }]
    });

    expect(service.runProgramExamples({ session: "default", name: "VELOCITY" })).toEqual({
      ok: true,
      value: {
        ok: true,
        results: [
          {
            description: "simple multiplication",
            input: "3 4 VELOCITY",
            ok: true,
            actualStack: [{ level: 1, value: { kind: "real", value: 12 } }]
          }
        ]
      }
    });
    expect(service.getStack({ session: "default" })).toEqual({
      ok: true,
      value: { stack: [{ level: 1, value: { kind: "real", value: 99, source: "99" } }] }
    });
  });

  it("detects stale annotated source when a variable is overwritten outside storeProgram", () => {
    const service = new IntegrationService();
    service.storeProgram({ session: "default", name: "INC", source: "<< 1 + >>" });
    service.execute({ session: "default", input: "<< 2 + >> 'INC' STO" });

    expect(service.getProgramSource({ session: "default", name: "INC" })).toMatchObject({
      ok: true,
      value: { name: "INC", stale: true }
    });
    expect(service.listPrograms({ session: "default" })).toEqual({
      ok: true,
      value: [{ name: "INC", annotated: true, stale: true }]
    });
  });

  it("exports annotated and stripped program source", () => {
    const service = new IntegrationService();
    service.storeProgram({ session: "default", name: "INC", source: "<< @ add one\n 1 + >>" });

    expect(service.exportProgram({ session: "default", name: "INC", mode: "rpl26" })).toMatchObject({
      ok: true,
      value: { source: "<< @ add one\n 1 + >>", warnings: [] }
    });
    expect(service.exportProgram({ session: "default", name: "INC", mode: "hp48-user-rpl" })).toMatchObject({
      ok: true,
      value: { source: "<< \n 1 + >>", warnings: [] }
    });
  });

  it("clears stack variables trace and source records", () => {
    const service = new IntegrationService();
    service.storeProgram({ session: "default", name: "INC", source: "<< 1 + >>" });
    service.execute({ session: "default", input: "41 INC" });

    expect(service.clear({ session: "default" })).toEqual({ ok: true, value: { ok: true } });
    expect(service.getStack({ session: "default" })).toEqual({ ok: true, value: { stack: [] } });
    expect(service.getVariables({ session: "default" })).toEqual({ ok: true, value: { variables: {} } });
    expect(service.getTrace({ session: "default" })).toEqual({ ok: true, value: { trace: [] } });
    expect(service.getProgramSource({ session: "default", name: "INC" })).toMatchObject({
      ok: false,
      error: { code: "SourceUnavailable" }
    });
  });

  it("saves and loads project sessions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-service-"));
    const path = join(dir, "project.json");
    const service = new IntegrationService();

    try {
      service.storeProgram({
        session: "default",
        name: "INC",
        source: "<< @ add one\n 1 + >>",
        examples: [{ input: "41 INC", expectedStack: [{ kind: "real", value: 42 }] }],
        notes: "demo"
      });
      service.execute({ session: "default", input: "5" });

      await expect(service.saveSession({ session: "default", path })).resolves.toEqual({ ok: true, value: { path } });
      await expect(service.loadSession({ name: "loaded", path })).resolves.toEqual({
        ok: true,
        value: { name: "loaded", selected: true }
      });

      expect(service.getStack({ session: "loaded" })).toEqual({
        ok: true,
        value: { stack: [{ level: 1, value: { kind: "real", value: 5, source: "5" } }] }
      });
      expect(service.inspectProgram({ session: "loaded", name: "INC" })).toMatchObject({
        ok: true,
        value: {
          name: "INC",
          variable: { kind: "program" },
          source: "<< @ add one\n 1 + >>",
          stale: false,
          examples: [{ input: "41 INC", expectedStack: [{ kind: "real", value: 42 }] }]
        }
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
