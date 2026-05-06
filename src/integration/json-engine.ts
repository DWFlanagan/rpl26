import { loadSessionSnapshot } from "../snapshot.js";
import type { IntegrationService } from "./service.js";
import type { IntegrationError, IntegrationResult, ProgramExample } from "./types.js";

type JsonRequest = {
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

type JsonResponseBody = { ok: true; result: unknown } | { ok: false; error: IntegrationError };
type ParamValidation<T> = { ok: true; value: T } | { ok: false; error: IntegrationError };

const invalidRequest = (message: string, path?: string): IntegrationError =>
  path === undefined ? { code: "InvalidRequest", message } : { code: "InvalidRequest", message, path };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function response(id: unknown, body: JsonResponseBody): string {
  return JSON.stringify({ id: id ?? null, ...body });
}

function unwrap<T>(id: unknown, result: IntegrationResult<T>): string {
  if (result.ok) return response(id, { ok: true, result: result.value });
  return response(id, { ok: false, error: result.error });
}

function paramsRecord(params: unknown): ParamValidation<Record<string, unknown>> {
  if (params === undefined) return { ok: true, value: {} };
  if (!isRecord(params)) return { ok: false, error: invalidRequest("params must be an object") };
  return { ok: true, value: params };
}

function optionalString(params: Record<string, unknown>, key: string): ParamValidation<string | undefined> {
  const value = params[key];
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== "string") return { ok: false, error: invalidRequest(`${key} must be a string`, key) };
  return { ok: true, value };
}

function requiredString(params: Record<string, unknown>, key: string): ParamValidation<string> {
  const value = params[key];
  if (typeof value !== "string") return { ok: false, error: invalidRequest(`${key} must be a string`, key) };
  return { ok: true, value };
}

function sessionArg(params: Record<string, unknown>): ParamValidation<{ session?: string }> {
  const session = optionalString(params, "session");
  if (!session.ok) return session;
  return { ok: true, value: session.value === undefined ? {} : { session: session.value } };
}

function exportMode(params: Record<string, unknown>): ParamValidation<"rpl26" | "hp48-user-rpl"> {
  const mode = params.mode;
  if (mode === "rpl26" || mode === "hp48-user-rpl") return { ok: true, value: mode };
  return { ok: false, error: invalidRequest("mode must be rpl26 or hp48-user-rpl", "mode") };
}

function validateProgramExamples(params: Record<string, unknown>): ParamValidation<ProgramExample[] | undefined> {
  const examples = params.examples;
  if (examples === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(examples)) return { ok: false, error: invalidRequest("examples must be an array", "examples") };

  const validated: ProgramExample[] = [];
  for (let index = 0; index < examples.length; index += 1) {
    const example = examples[index];
    const path = `examples[${index}]`;
    if (!isRecord(example)) return { ok: false, error: invalidRequest("example must be an object", path) };
    if (typeof example.input !== "string") return { ok: false, error: invalidRequest("input must be a string", `${path}.input`) };
    if (example.description !== undefined && typeof example.description !== "string") {
      return { ok: false, error: invalidRequest("description must be a string", `${path}.description`) };
    }
    if (!Array.isArray(example.expectedStack)) {
      return { ok: false, error: invalidRequest("expectedStack must be an array", `${path}.expectedStack`) };
    }

    const snapshot = loadSessionSnapshot({
      format: "rpl26-session",
      version: 1,
      stack: example.expectedStack,
      variables: {}
    });
    if (!snapshot.ok) {
      return {
        ok: false,
        error: invalidRequest(snapshot.error.message, snapshot.error.path.replace(/^stack/, `${path}.expectedStack`))
      };
    }

    const programExample: ProgramExample = {
      input: example.input,
      expectedStack: snapshot.snapshot.stack
    };
    if (example.description !== undefined) programExample.description = example.description;
    validated.push(programExample);
  }

  return { ok: true, value: validated };
}

function invalidResponse(id: unknown, error: IntegrationError): string {
  return response(id, { ok: false, error });
}

export async function handleJsonEngineLine(service: IntegrationService, line: string): Promise<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return invalidResponse(null, invalidRequest("invalid JSON"));
  }

  if (!isRecord(parsed)) {
    return invalidResponse(null, invalidRequest("method is required"));
  }

  const request = parsed as JsonRequest;
  const id = request.id ?? null;
  if (typeof request.method !== "string") {
    return invalidResponse(id, invalidRequest("method is required"));
  }

  const params = paramsRecord(request.params);
  if (!params.ok) return invalidResponse(id, params.error);

  try {
    switch (request.method) {
      case "listSessions":
        return unwrap(id, service.listSessions());
      case "createSession": {
        const name = requiredString(params.value, "name");
        return name.ok ? unwrap(id, service.createSession({ name: name.value })) : invalidResponse(id, name.error);
      }
      case "selectSession": {
        const name = requiredString(params.value, "name");
        return name.ok ? unwrap(id, service.selectSession({ name: name.value })) : invalidResponse(id, name.error);
      }
      case "deleteSession": {
        const name = requiredString(params.value, "name");
        return name.ok ? unwrap(id, service.deleteSession({ name: name.value })) : invalidResponse(id, name.error);
      }
      case "getSessionStatus": {
        const session = sessionArg(params.value);
        if (!session.ok) return invalidResponse(id, session.error);
        const sessions = service.listSessions();
        if (!sessions.ok) return unwrap(id, sessions);
        const programs = service.listPrograms(session.value);
        if (!programs.ok) return unwrap(id, programs);
        return response(id, { ok: true, result: { sessions: sessions.value, programs: programs.value } });
      }
      case "saveSession": {
        const session = sessionArg(params.value);
        if (!session.ok) return invalidResponse(id, session.error);
        const path = requiredString(params.value, "path");
        return path.ok ? unwrap(id, await service.saveSession({ ...session.value, path: path.value })) : invalidResponse(id, path.error);
      }
      case "loadSession": {
        const name = requiredString(params.value, "name");
        if (!name.ok) return invalidResponse(id, name.error);
        const path = requiredString(params.value, "path");
        if (!path.ok) return invalidResponse(id, path.error);
        const select = params.value.select;
        if (select !== undefined && typeof select !== "boolean") {
          return invalidResponse(id, invalidRequest("select must be a boolean", "select"));
        }
        return unwrap(id, await service.loadSession({ name: name.value, path: path.value, select }));
      }
      case "execute": {
        const session = sessionArg(params.value);
        if (!session.ok) return invalidResponse(id, session.error);
        const input = requiredString(params.value, "input");
        return input.ok ? unwrap(id, service.execute({ ...session.value, input: input.value })) : invalidResponse(id, input.error);
      }
      case "getStack": {
        const session = sessionArg(params.value);
        return session.ok ? unwrap(id, service.getStack(session.value)) : invalidResponse(id, session.error);
      }
      case "getVariables": {
        const session = sessionArg(params.value);
        return session.ok ? unwrap(id, service.getVariables(session.value)) : invalidResponse(id, session.error);
      }
      case "getTrace": {
        const session = sessionArg(params.value);
        return session.ok ? unwrap(id, service.getTrace(session.value)) : invalidResponse(id, session.error);
      }
      case "clear": {
        const session = sessionArg(params.value);
        return session.ok ? unwrap(id, service.clear(session.value)) : invalidResponse(id, session.error);
      }
      case "storeProgram": {
        const session = sessionArg(params.value);
        if (!session.ok) return invalidResponse(id, session.error);
        const name = requiredString(params.value, "name");
        if (!name.ok) return invalidResponse(id, name.error);
        const source = requiredString(params.value, "source");
        if (!source.ok) return invalidResponse(id, source.error);
        const examples = validateProgramExamples(params.value);
        if (!examples.ok) return invalidResponse(id, examples.error);
        const notes = optionalString(params.value, "notes");
        if (!notes.ok) return invalidResponse(id, notes.error);
        return unwrap(
          id,
          service.storeProgram({
            ...session.value,
            name: name.value,
            source: source.value,
            examples: examples.value,
            notes: notes.value
          })
        );
      }
      case "getProgramSource": {
        const session = sessionArg(params.value);
        if (!session.ok) return invalidResponse(id, session.error);
        const name = requiredString(params.value, "name");
        return name.ok ? unwrap(id, service.getProgramSource({ ...session.value, name: name.value })) : invalidResponse(id, name.error);
      }
      case "listPrograms": {
        const session = sessionArg(params.value);
        return session.ok ? unwrap(id, service.listPrograms(session.value)) : invalidResponse(id, session.error);
      }
      case "runProgramExamples": {
        const session = sessionArg(params.value);
        if (!session.ok) return invalidResponse(id, session.error);
        const name = requiredString(params.value, "name");
        if (!name.ok) return invalidResponse(id, name.error);
        const examples = validateProgramExamples(params.value);
        return examples.ok
          ? unwrap(id, service.runProgramExamples({ ...session.value, name: name.value, examples: examples.value }))
          : invalidResponse(id, examples.error);
      }
      case "exportProgram": {
        const session = sessionArg(params.value);
        if (!session.ok) return invalidResponse(id, session.error);
        const name = requiredString(params.value, "name");
        if (!name.ok) return invalidResponse(id, name.error);
        const mode = exportMode(params.value);
        return mode.ok
          ? unwrap(id, service.exportProgram({ ...session.value, name: name.value, mode: mode.value }))
          : invalidResponse(id, mode.error);
      }
      case "inspectProgram": {
        const session = sessionArg(params.value);
        if (!session.ok) return invalidResponse(id, session.error);
        const name = requiredString(params.value, "name");
        return name.ok ? unwrap(id, service.inspectProgram({ ...session.value, name: name.value })) : invalidResponse(id, name.error);
      }
      case "shutdown":
        return response(id, { ok: true, result: { shutdown: true } });
      default:
        return invalidResponse(id, invalidRequest(`unknown method: ${request.method}`));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return invalidResponse(id, invalidRequest(message));
  }
}
