import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CalculatorSession } from "../session.js";

export function createCalculatorTools(session = new CalculatorSession()) {
  return {
    execute: async ({ input }: { input: string }) => session.execute(input),
    get_stack: async (_args: Record<string, never>) => ({ stack: session.getStack() }),
    get_variables: async (_args: Record<string, never>) => ({ variables: session.getVariables() }),
    clear: async (_args: Record<string, never>) => {
      session.clear();
      return { ok: true };
    },
    get_trace: async (_args: Record<string, never>) => ({ trace: session.getTrace() })
  };
}

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }]
});

export function createServer(session = new CalculatorSession()): McpServer {
  const server = new McpServer({ name: "rpn50", version: "0.1.0" });
  const tools = createCalculatorTools(session);

  server.tool("execute", { input: z.string() }, async (args) => textResult(await tools.execute(args)));
  server.tool("get_stack", {}, async (args) => textResult(await tools.get_stack(args)));
  server.tool("get_variables", {}, async (args) => textResult(await tools.get_variables(args)));
  server.tool("clear", {}, async (args) => textResult(await tools.clear(args)));
  server.tool("get_trace", {}, async (args) => textResult(await tools.get_trace(args)));

  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
