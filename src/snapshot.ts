import { readFile, writeFile } from "node:fs/promises";
import type { RplObject, SessionSnapshot, SnapshotLoadResult, SnapshotValidationError } from "./types.js";

const SNAPSHOT_FORMAT = "rpl26-session";
const SNAPSHOT_VERSION = 1;

type SnapshotLoadSuccess = { ok: true; snapshot: SessionSnapshot };
type SnapshotLoadFailure = { ok: false; error: SnapshotValidationError };
export type SessionSnapshotLoadResult = SnapshotLoadSuccess | SnapshotLoadFailure;

function error(path: string, message: string): SnapshotValidationError {
  return { path, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceOf(value: Record<string, unknown>, path: string): { ok: true; source?: string } | SnapshotLoadFailure {
  if (value.source === undefined) return { ok: true };
  if (typeof value.source !== "string") return { ok: false, error: error(`${path}.source`, "expected string") };
  return { ok: true, source: value.source };
}

function withSource(source: string | undefined): { source?: string } {
  return source === undefined ? {} : { source };
}

function canonicalObject(value: unknown, path: string): { ok: true; object: RplObject } | SnapshotLoadFailure {
  if (!isRecord(value)) return { ok: false, error: error(path, "expected object") };
  if (typeof value.kind !== "string") return { ok: false, error: error(`${path}.kind`, "expected string") };

  const source = sourceOf(value, path);
  if (!source.ok) return source;
  const sourceField = withSource(source.source);

  switch (value.kind) {
    case "real":
      if (typeof value.value !== "number") return { ok: false, error: error(`${path}.value`, "expected number") };
      if (!Number.isFinite(value.value)) return { ok: false, error: error(`${path}.value`, "expected finite number") };
      return { ok: true, object: { kind: "real", value: value.value, ...sourceField } };
    case "name":
    case "quotedName":
      if (typeof value.name !== "string") return { ok: false, error: error(`${path}.name`, "expected string") };
      return { ok: true, object: { kind: value.kind, name: value.name, ...sourceField } };
    case "string":
      if (typeof value.value !== "string") return { ok: false, error: error(`${path}.value`, "expected string") };
      return { ok: true, object: { kind: "string", value: value.value, ...sourceField } };
    case "program": {
      if (!Array.isArray(value.body)) return { ok: false, error: error(`${path}.body`, "expected array") };
      const body: RplObject[] = [];
      for (let index = 0; index < value.body.length; index += 1) {
        const nested = canonicalObject(value.body[index], `${path}.body[${index}]`);
        if (!nested.ok) return nested;
        body.push(nested.object);
      }
      return { ok: true, object: { kind: "program", body, ...sourceField } };
    }
    case "list": {
      if (!Array.isArray(value.items)) return { ok: false, error: error(`${path}.items`, "expected array") };
      const items: RplObject[] = [];
      for (let index = 0; index < value.items.length; index += 1) {
        const nested = canonicalObject(value.items[index], `${path}.items[${index}]`);
        if (!nested.ok) return nested;
        items.push(nested.object);
      }
      return { ok: true, object: { kind: "list", items, ...sourceField } };
    }
    case "tagged": {
      if (typeof value.tag !== "string") return { ok: false, error: error(`${path}.tag`, "expected string") };
      const nested = canonicalObject(value.value, `${path}.value`);
      if (!nested.ok) return nested;
      return { ok: true, object: { kind: "tagged", tag: value.tag, value: nested.object, ...sourceField } };
    }
    default:
      return { ok: false, error: error(`${path}.kind`, `unsupported object kind ${value.kind}`) };
  }
}

export function loadSessionSnapshot(value: unknown): SessionSnapshotLoadResult {
  if (!isRecord(value)) return { ok: false, error: error("$", "expected object") };
  if (value.format !== SNAPSHOT_FORMAT) return { ok: false, error: error("format", `expected ${SNAPSHOT_FORMAT}`) };
  if (value.version !== SNAPSHOT_VERSION) return { ok: false, error: error("version", `expected version ${SNAPSHOT_VERSION}`) };
  if (!Array.isArray(value.stack)) return { ok: false, error: error("stack", "expected array") };
  if (!isRecord(value.variables)) return { ok: false, error: error("variables", "expected object") };

  const stack: RplObject[] = [];
  for (let index = 0; index < value.stack.length; index += 1) {
    const stackObject = canonicalObject(value.stack[index], `stack[${index}]`);
    if (!stackObject.ok) return stackObject;
    stack.push(stackObject.object);
  }

  const variables: Record<string, RplObject> = {};
  for (const [name, object] of Object.entries(value.variables)) {
    if (name.trim().length === 0) return { ok: false, error: error("variables", "variable names must be non-empty") };
    const variableObject = canonicalObject(object, `variables.${name}`);
    if (!variableObject.ok) return variableObject;
    variables[name] = variableObject.object;
  }

  return {
    ok: true,
    snapshot: {
      format: SNAPSHOT_FORMAT,
      version: SNAPSHOT_VERSION,
      stack,
      variables
    }
  };
}

export async function readSnapshotFile(path: string): Promise<SessionSnapshotLoadResult> {
  const text = await readFile(path, "utf8");
  try {
    return loadSessionSnapshot(JSON.parse(text));
  } catch {
    return { ok: false, error: error("$", "invalid JSON") };
  }
}

export async function writeSnapshotFile(path: string, snapshot: SessionSnapshot): Promise<SnapshotLoadResult> {
  const result = loadSessionSnapshot(snapshot);
  if (!result.ok) return result;
  await writeFile(path, `${JSON.stringify(result.snapshot, null, 2)}\n`, "utf8");
  return { ok: true };
}
