import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { IntegrationService } from "../integration/service.js";
import type { IntegrationError, IntegrationResult, ProgramExample } from "../integration/types.js";
import { loadSessionSnapshot } from "../snapshot.js";

const sessionArg = { session: z.string().optional() };
const rplObjectSchema: z.ZodType<unknown> = z.unknown();
const programExampleSchema = z.object({
  description: z.string().optional(),
  input: z.string(),
  expectedStack: z.array(rplObjectSchema)
});

type ToolErrorResult = { ok: false; error: IntegrationError };

function invalidRequest(message: string, path?: string): ToolErrorResult {
  return {
    ok: false,
    error: path === undefined ? { code: "InvalidRequest", message } : { code: "InvalidRequest", message, path }
  };
}

function unwrap<T>(result: IntegrationResult<T>): T | ToolErrorResult {
  if (result.ok) return result.value;
  return { ok: false, error: result.error };
}

function validateProgramExamples(
  examples: Array<{ description?: string; input: string; expectedStack: unknown[] }> | undefined
): { ok: true; examples?: ProgramExample[] } | ToolErrorResult {
  if (examples === undefined) return { ok: true };

  const validatedExamples: ProgramExample[] = [];
  for (let index = 0; index < examples.length; index += 1) {
    const example = examples[index];
    const snapshot = loadSessionSnapshot({
      format: "rpl26-session",
      version: 1,
      stack: example.expectedStack,
      variables: {}
    });

    if (!snapshot.ok) {
      const path = snapshot.error.path.replace(/^stack/, `examples[${index}].expectedStack`);
      return invalidRequest(snapshot.error.message, path);
    }

    const validatedExample: ProgramExample = {
      input: example.input,
      expectedStack: snapshot.snapshot.stack
    };
    if (example.description !== undefined) validatedExample.description = example.description;
    validatedExamples.push(validatedExample);
  }

  return { ok: true, examples: validatedExamples };
}

export function createCalculatorTools(service = new IntegrationService()) {
  return {
    list_sessions: async (_args: Record<string, never>) => unwrap(service.listSessions()),
    create_session: async ({ name }: { name: string }) => unwrap(service.createSession({ name })),
    select_session: async ({ name }: { name: string }) => unwrap(service.selectSession({ name })),
    delete_session: async ({ name }: { name: string }) => unwrap(service.deleteSession({ name })),
    get_session_status: async ({ session }: { session?: string }) => {
      const sessions = service.listSessions();
      if (!sessions.ok) return unwrap(sessions);
      const programs = service.listPrograms({ session });
      if (!programs.ok) return unwrap(programs);
      return { sessions: sessions.value, programs: programs.value };
    },
    save_session: async ({ session, path }: { session?: string; path: string }) =>
      unwrap(await service.saveSession({ session, path })),
    load_session: async ({ name, path, select }: { name: string; path: string; select?: boolean }) =>
      unwrap(await service.loadSession({ name, path, select })),
    execute: async ({ session, input }: { session?: string; input: string }) => unwrap(service.execute({ session, input })),
    get_stack: async ({ session }: { session?: string }) => unwrap(service.getStack({ session })),
    get_variables: async ({ session }: { session?: string }) => unwrap(service.getVariables({ session })),
    clear: async ({ session }: { session?: string }) => unwrap(service.clear({ session })),
    get_trace: async ({ session }: { session?: string }) => unwrap(service.getTrace({ session })),
    store_program: async (args: {
      session?: string;
      name: string;
      source: string;
      examples?: Array<{ description?: string; input: string; expectedStack: unknown[] }>;
      notes?: string;
    }) => {
      const validated = validateProgramExamples(args.examples);
      if (!validated.ok) return validated;
      return unwrap(service.storeProgram({ ...args, examples: validated.examples }));
    },
    get_program_source: async (args: { session?: string; name: string }) => unwrap(service.getProgramSource(args)),
    list_programs: async ({ session }: { session?: string }) => unwrap(service.listPrograms({ session })),
    run_program_examples: async (args: {
      session?: string;
      name: string;
      examples?: Array<{ description?: string; input: string; expectedStack: unknown[] }>;
    }) => {
      const validated = validateProgramExamples(args.examples);
      if (!validated.ok) return validated;
      return unwrap(service.runProgramExamples({ ...args, examples: validated.examples }));
    },
    export_program: async (args: { session?: string; name: string; mode: "rpl26" | "hp48-user-rpl" }) =>
      unwrap(service.exportProgram(args)),
    inspect_program: async (args: { session?: string; name: string }) => unwrap(service.inspectProgram(args))
  };
}

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }]
});

export function createServer(service = new IntegrationService()): McpServer {
  const server = new McpServer({ name: "rpl26", version: "0.1.0" });
  const tools = createCalculatorTools(service);

  server.tool("list_sessions", {}, async (args) => textResult(await tools.list_sessions(args)));
  server.tool("create_session", { name: z.string() }, async (args) => textResult(await tools.create_session(args)));
  server.tool("select_session", { name: z.string() }, async (args) => textResult(await tools.select_session(args)));
  server.tool("delete_session", { name: z.string() }, async (args) => textResult(await tools.delete_session(args)));
  server.tool("get_session_status", sessionArg, async (args) => textResult(await tools.get_session_status(args)));
  server.tool("save_session", { session: z.string().optional(), path: z.string() }, async (args) =>
    textResult(await tools.save_session(args))
  );
  server.tool("load_session", { name: z.string(), path: z.string(), select: z.boolean().optional() }, async (args) =>
    textResult(await tools.load_session(args))
  );

  server.tool("execute", { session: z.string().optional(), input: z.string() }, async (args) =>
    textResult(await tools.execute(args))
  );
  server.tool("get_stack", sessionArg, async (args) => textResult(await tools.get_stack(args)));
  server.tool("get_variables", sessionArg, async (args) => textResult(await tools.get_variables(args)));
  server.tool("clear", sessionArg, async (args) => textResult(await tools.clear(args)));
  server.tool("get_trace", sessionArg, async (args) => textResult(await tools.get_trace(args)));

  server.tool(
    "store_program",
    {
      session: z.string().optional(),
      name: z.string(),
      source: z.string(),
      examples: z.array(programExampleSchema).optional(),
      notes: z.string().optional()
    },
    async (args) => textResult(await tools.store_program(args))
  );
  server.tool("get_program_source", { session: z.string().optional(), name: z.string() }, async (args) =>
    textResult(await tools.get_program_source(args))
  );
  server.tool("list_programs", sessionArg, async (args) => textResult(await tools.list_programs(args)));
  server.tool(
    "run_program_examples",
    { session: z.string().optional(), name: z.string(), examples: z.array(programExampleSchema).optional() },
    async (args) => textResult(await tools.run_program_examples(args))
  );
  server.tool(
    "export_program",
    { session: z.string().optional(), name: z.string(), mode: z.enum(["rpl26", "hp48-user-rpl"]) },
    async (args) => textResult(await tools.export_program(args))
  );
  server.tool("inspect_program", { session: z.string().optional(), name: z.string() }, async (args) =>
    textResult(await tools.inspect_program(args))
  );

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
