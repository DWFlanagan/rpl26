import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createCalculatorTools, createServer } from "../src/mcp/server.js";

const parseToolJson = (result: Awaited<ReturnType<Client["callTool"]>>): unknown => {
  if (!("content" in result)) {
    throw new Error("Expected a content tool result");
  }
  const { content: toolContent } = result as { content: Array<{ type: string; text?: string }> };
  const [content] = toolContent;
  if (content?.type !== "text" || typeof content.text !== "string") {
    throw new Error("Expected a text tool result");
  }
  return JSON.parse(content.text);
};

describe("MCP calculator tool handlers", () => {
  it("executes commands against one persistent default RPL session", async () => {
    const tools = createCalculatorTools();
    expect(await tools.execute({ input: "<< 1 + >> 'INC' STO" })).toMatchObject({ ok: true });
    expect(await tools.execute({ input: "41 INC" })).toMatchObject({ ok: true });
    expect(await tools.get_stack({})).toEqual({ stack: [{ level: 1, value: { kind: "real", value: 42 } }] });
  });

  it("stores annotated programs through MCP tool handlers", async () => {
    const tools = createCalculatorTools();

    expect(
      await tools.store_program({
        name: "VELOCITY",
        source: "<<\n  @ Stack: distance time -> velocity\n  *\n>>",
        examples: [{ input: "3 4 VELOCITY", expectedStack: [{ kind: "real", value: 12 }] }]
      })
    ).toMatchObject({ name: "VELOCITY", source: "<<\n  @ Stack: distance time -> velocity\n  *\n>>" });

    expect(await tools.run_program_examples({ name: "VELOCITY" })).toMatchObject({ ok: true });
    expect(await tools.export_program({ name: "VELOCITY", mode: "hp48-user-rpl" })).toMatchObject({
      source: "<<\n  \n  *\n>>"
    });
  });

  it("returns a structured error for malformed example stack objects", async () => {
    const tools = createCalculatorTools();

    await expect(
      tools.store_program({
        name: "BROKEN",
        source: "<< 1 + >>",
        examples: [{ input: "1 BROKEN", expectedStack: [null] }]
      })
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "InvalidRequest"
      }
    });
  });

  it("registers all integration tools on an MCP server", async () => {
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "clear",
        "create_session",
        "delete_session",
        "execute",
        "export_program",
        "get_program_source",
        "get_session_status",
        "get_stack",
        "get_trace",
        "get_variables",
        "inspect_program",
        "list_programs",
        "list_sessions",
        "load_session",
        "run_program_examples",
        "save_session",
        "select_session",
        "store_program"
      ]);

      expect(parseToolJson(await client.callTool({ name: "execute", arguments: { input: "2 3 +" } }))).toMatchObject({
        ok: true
      });
      expect(parseToolJson(await client.callTool({ name: "get_stack", arguments: {} }))).toEqual({
        stack: [{ level: 1, value: { kind: "real", value: 5 } }]
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
