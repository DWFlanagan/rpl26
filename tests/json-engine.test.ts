import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IntegrationService } from "../src/integration/service.js";
import { handleJsonEngineLine } from "../src/integration/json-engine.js";

describe("JSON stdio engine handler", () => {
  it("executes one request line", async () => {
    const service = new IntegrationService();

    const line = await handleJsonEngineLine(service, '{"id":"1","method":"execute","params":{"input":"2 3 +"}}');
    const response = JSON.parse(line);

    expect(response).toMatchObject({
      id: "1",
      ok: true,
      result: { ok: true, stack: [{ level: 1, value: { kind: "real", value: 5 } }], variables: {} }
    });
    expect(Array.isArray(response.result.trace)).toBe(true);
  });

  it("stores and exports a program", async () => {
    const service = new IntegrationService();
    await handleJsonEngineLine(
      service,
      JSON.stringify({ id: "1", method: "storeProgram", params: { name: "INC", source: "<< @ add one\n 1 + >>" } })
    );

    await expect(
      handleJsonEngineLine(
        service,
        JSON.stringify({ id: "2", method: "exportProgram", params: { name: "INC", mode: "hp48-user-rpl" } })
      )
    ).resolves.toBe(JSON.stringify({ id: "2", ok: true, result: { source: "<< \n 1 + >>", warnings: [] } }));
  });

  it("saves, loads, and reports session status", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-json-engine-"));
    const path = join(dir, "project.json");
    const service = new IntegrationService();

    try {
      await handleJsonEngineLine(
        service,
        JSON.stringify({ id: "1", method: "storeProgram", params: { name: "INC", source: "<< 1 + >>" } })
      );
      await expect(
        handleJsonEngineLine(service, JSON.stringify({ id: "2", method: "saveSession", params: { path } }))
      ).resolves.toBe(JSON.stringify({ id: "2", ok: true, result: { path } }));
      await expect(
        handleJsonEngineLine(service, JSON.stringify({ id: "3", method: "loadSession", params: { name: "loaded", path } }))
      ).resolves.toBe(JSON.stringify({ id: "3", ok: true, result: { name: "loaded", selected: true } }));

      const status = JSON.parse(await handleJsonEngineLine(service, JSON.stringify({ id: "4", method: "getSessionStatus" })));
      expect(status).toMatchObject({
        id: "4",
        ok: true,
        result: {
          sessions: [
            { name: "default", selected: false },
            { name: "loaded", selected: true }
          ],
          programs: [{ name: "INC", annotated: true, stale: false }]
        }
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns structured errors for invalid JSON, missing methods, and unknown methods", async () => {
    const service = new IntegrationService();

    await expect(handleJsonEngineLine(service, "{nope")).resolves.toBe(
      JSON.stringify({ id: null, ok: false, error: { code: "InvalidRequest", message: "invalid JSON" } })
    );
    await expect(handleJsonEngineLine(service, '{"id":"2"}')).resolves.toBe(
      JSON.stringify({ id: "2", ok: false, error: { code: "InvalidRequest", message: "method is required" } })
    );
    await expect(handleJsonEngineLine(service, '{"id":"3","method":"missing"}')).resolves.toBe(
      JSON.stringify({ id: "3", ok: false, error: { code: "InvalidRequest", message: "unknown method: missing" } })
    );
  });

  it("returns InvalidRequest for malformed example expectedStack values", async () => {
    const service = new IntegrationService();
    await handleJsonEngineLine(
      service,
      JSON.stringify({ id: "1", method: "storeProgram", params: { name: "INC", source: "<< 1 + >>" } })
    );

    await expect(
      handleJsonEngineLine(
        service,
        JSON.stringify({
          id: "4",
          method: "runProgramExamples",
          params: { name: "INC", examples: [{ input: "41 INC", expectedStack: [null] }] }
        })
      )
    ).resolves.toBe(
      JSON.stringify({
        id: "4",
        ok: false,
        error: { code: "InvalidRequest", message: "expected object", path: "examples[0].expectedStack[0]" }
      })
    );
  });
});
