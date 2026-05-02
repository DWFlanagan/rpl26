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
  it("executes commands against one persistent RPL session", async () => {
    const tools = createCalculatorTools();
    expect(await tools.execute({ input: "<< 1 + >> 'INC' STO" })).toMatchObject({ ok: true });
    expect(await tools.execute({ input: "41 INC" })).toMatchObject({ ok: true });
    expect(await tools.get_stack({})).toEqual({ stack: [{ level: 1, value: { kind: "real", value: 42 } }] });
  });

  it("clears stack, variables, and trace through the tool surface", async () => {
    const tools = createCalculatorTools();
    await tools.execute({ input: "5 'A' STO A" });
    await tools.clear({});
    expect(await tools.get_stack({})).toEqual({ stack: [] });
    expect(await tools.get_variables({})).toEqual({ variables: {} });
    expect(await tools.get_trace({})).toEqual({ trace: [] });
  });

  it("registers all calculator tools on an MCP server", async () => {
    const server = createServer();
    const client = new Client({ name: "test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
        "clear",
        "execute",
        "get_stack",
        "get_trace",
        "get_variables"
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
