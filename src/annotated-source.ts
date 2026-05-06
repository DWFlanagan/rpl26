import { createHash } from "node:crypto";
import { parseInput } from "./parser.js";
import type { RplObject } from "./types.js";

export type AnnotatedSourceErrorCode = "InvalidAnnotatedSource";

export type AnnotatedSourceError = {
  code: AnnotatedSourceErrorCode;
  message: string;
};

export type ParseAnnotatedProgramResult =
  | { ok: true; object: Extract<RplObject, { kind: "program" }>; executableSource: string }
  | { ok: false; error: AnnotatedSourceError };

export type ExportMode = "rpl26" | "hp48-user-rpl";

export type ExportSourceResult = {
  source: string;
  warnings: string[];
};

type CanonicalRplObject =
  | { kind: "real"; value: number }
  | { kind: "name"; name: string }
  | { kind: "quotedName"; name: string }
  | { kind: "program"; body: CanonicalRplObject[] }
  | { kind: "list"; items: CanonicalRplObject[] }
  | { kind: "tagged"; tag: string; value: CanonicalRplObject }
  | { kind: "string"; value: string };

export function stripRplComments(source: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "@") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      if (index < source.length) {
        output += source[index];
      }
      continue;
    }

    output += char;
  }

  return output;
}

export function parseAnnotatedProgramSource(source: string): ParseAnnotatedProgramResult {
  const executableSource = stripRplComments(source);
  const parsed = parseInput(executableSource);
  if (!parsed.ok) {
    return { ok: false, error: { code: "InvalidAnnotatedSource", message: parsed.error.message } };
  }

  if (parsed.objects.length !== 1 || parsed.objects[0]?.kind !== "program") {
    return {
      ok: false,
      error: { code: "InvalidAnnotatedSource", message: "expected exactly one program object" }
    };
  }

  return { ok: true, object: parsed.objects[0], executableSource };
}

export function objectHash(value: RplObject): string {
  const canonical = canonicalizeRplObject(value);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function exportAnnotatedSource(source: string, mode: ExportMode): ExportSourceResult {
  if (mode === "rpl26") {
    return { source, warnings: [] };
  }
  return { source: stripRplComments(source), warnings: [] };
}

function canonicalizeRplObject(value: RplObject): CanonicalRplObject {
  switch (value.kind) {
    case "real":
      return { kind: "real", value: value.value };
    case "name":
      return { kind: "name", name: value.name };
    case "quotedName":
      return { kind: "quotedName", name: value.name };
    case "program":
      return { kind: "program", body: value.body.map(canonicalizeRplObject) };
    case "list":
      return { kind: "list", items: value.items.map(canonicalizeRplObject) };
    case "tagged":
      return { kind: "tagged", tag: value.tag, value: canonicalizeRplObject(value.value) };
    case "string":
      return { kind: "string", value: value.value };
  }
}
