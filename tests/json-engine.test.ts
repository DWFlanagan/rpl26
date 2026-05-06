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
