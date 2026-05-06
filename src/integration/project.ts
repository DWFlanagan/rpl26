import { readFile, writeFile } from "node:fs/promises";
import { loadSessionSnapshot } from "../snapshot.js";
import type { RplObject, SnapshotValidationError } from "../types.js";
import type { AnnotatedSourceRecord, ProgramExample, ProjectLoadResult, ProjectSnapshot } from "./types.js";

const error = (path: string, message: string): SnapshotValidationError => ({ path, message });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function rebaseStackPath(path: string, stackPath: string): string {
  if (stackPath === "stack[0]") return path;
  if (stackPath.startsWith("stack[0].")) return `${path}${stackPath.slice("stack[0]".length)}`;
  return path;
}

function validateRplObject(
  value: unknown,
  path: string
): { ok: true; value: RplObject } | { ok: false; error: SnapshotValidationError } {
  const sessionResult = loadSessionSnapshot({ format: "rpl26-session", version: 1, stack: [value], variables: {} });
  if (!sessionResult.ok) {
    return { ok: false, error: error(rebaseStackPath(path, sessionResult.error.path), sessionResult.error.message) };
  }
  return { ok: true, value: sessionResult.snapshot.stack[0] };
}

function validateExample(
  value: unknown,
  path: string
): { ok: true; example: ProgramExample } | { ok: false; error: SnapshotValidationError } {
  if (!isRecord(value)) return { ok: false, error: error(path, "expected object") };
  if (value.description !== undefined && typeof value.description !== "string") {
    return { ok: false, error: error(`${path}.description`, "expected string") };
  }
  if (typeof value.input !== "string") return { ok: false, error: error(`${path}.input`, "expected string") };
  if (!Array.isArray(value.expectedStack)) return { ok: false, error: error(`${path}.expectedStack`, "expected array") };

  const expectedStack: RplObject[] = [];
  for (let index = 0; index < value.expectedStack.length; index += 1) {
    const object = validateRplObject(value.expectedStack[index], `${path}.expectedStack[${index}]`);
    if (!object.ok) return object;
    expectedStack.push(object.value);
  }

  const example: ProgramExample = { input: value.input, expectedStack };
  if (value.description !== undefined) example.description = value.description;
  return { ok: true, example };
}

function validateSourceRecord(
  key: string,
  value: unknown
): { ok: true; record: AnnotatedSourceRecord } | { ok: false; error: SnapshotValidationError } {
  const path = `sources.${key}`;
  if (!isRecord(value)) return { ok: false, error: error(path, "expected object") };
  if (value.name !== key) return { ok: false, error: error(`${path}.name`, "expected source name to match key") };
  if (typeof value.source !== "string") return { ok: false, error: error(`${path}.source`, "expected string") };
  if (typeof value.installedHash !== "string") {
    return { ok: false, error: error(`${path}.installedHash`, "expected string") };
  }
  if (typeof value.updatedAt !== "string") return { ok: false, error: error(`${path}.updatedAt`, "expected string") };
  if (!Array.isArray(value.examples)) return { ok: false, error: error(`${path}.examples`, "expected array") };
  if (value.notes !== undefined && typeof value.notes !== "string") {
    return { ok: false, error: error(`${path}.notes`, "expected string") };
  }

  const examples: ProgramExample[] = [];
  for (let index = 0; index < value.examples.length; index += 1) {
    const example = validateExample(value.examples[index], `${path}.examples[${index}]`);
    if (!example.ok) return example;
    examples.push(example.example);
  }

  const record: AnnotatedSourceRecord = {
    name: key,
    source: value.source,
    installedHash: value.installedHash,
    updatedAt: value.updatedAt,
    examples
  };
  if (value.notes !== undefined) record.notes = value.notes;

  return {
    ok: true,
    record
  };
}

export function loadProjectSnapshot(value: unknown): ProjectLoadResult {
  if (!isRecord(value)) return { ok: false, error: error("$", "expected object") };
  if (value.format !== "rpl26-project") return { ok: false, error: error("format", "expected rpl26-project") };
  if (value.version !== 1) return { ok: false, error: error("version", "expected version 1") };

  const snapshot = loadSessionSnapshot(value.snapshot);
  if (!snapshot.ok) return { ok: false, error: error(`snapshot.${snapshot.error.path}`, snapshot.error.message) };

  if (!isRecord(value.sources)) return { ok: false, error: error("sources", "expected object") };

  const sources: Record<string, AnnotatedSourceRecord> = {};
  for (const [key, sourceValue] of Object.entries(value.sources)) {
    const record = validateSourceRecord(key, sourceValue);
    if (!record.ok) return record;
    sources[key] = record.record;
  }

  return {
    ok: true,
    project: {
      format: "rpl26-project",
      version: 1,
      snapshot: snapshot.snapshot,
      sources
    }
  };
}

export async function readProjectFile(path: string): Promise<ProjectLoadResult> {
  const text = await readFile(path, "utf8");
  try {
    return loadProjectSnapshot(JSON.parse(text));
  } catch {
    return { ok: false, error: error("$", "invalid JSON") };
  }
}

export async function writeProjectFile(
  path: string,
  project: ProjectSnapshot
): Promise<{ ok: true } | { ok: false; error: SnapshotValidationError }> {
  const result = loadProjectSnapshot(project);
  if (!result.ok) return result;
  await writeFile(path, `${JSON.stringify(result.project, null, 2)}\n`, "utf8");
  return { ok: true };
}
