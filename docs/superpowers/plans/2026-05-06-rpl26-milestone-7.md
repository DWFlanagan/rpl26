# rpl26 Milestone 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Milestone 7 integration surface: readable annotated RPL authoring, named sessions, MCP program tools, a JSON stdio engine, and an installable agent skill.

**Architecture:** Keep `CalculatorSession` as the source of runtime semantics. Add a shared integration service for named sessions, annotated source, project save/load, examples, export, MCP, and JSON stdio. Comments are preserved in annotated source records, stripped before parsing/execution, and stripped for HP-compatible export.

**Tech Stack:** TypeScript, Node.js built-ins, `@modelcontextprotocol/sdk`, `zod`, Vitest, existing `CalculatorSession`, existing snapshot APIs.

---

## File Map

- Create `docs/superpowers/specs/2026-05-06-milestone-7-comment-notes.md`: clean-room notes for `@` comments and the intentional `rpl26` preservation divergence.
- Create `src/annotated-source.ts`: strip `@` comments outside strings, parse annotated program source, export annotated or stripped source, and compute stable object hashes.
- Create `tests/annotated-source.test.ts`: comment stripping, string preservation, program parsing, and export behavior.
- Create `src/integration/types.ts`: shared named-session, project, source-record, example, and error/result types.
- Create `src/integration/project.ts`: project validation, project read/write helpers, and immutable load behavior.
- Create `tests/integration-project.test.ts`: project validation and save/load tests.
- Create `src/integration/service.ts`: `IntegrationService` with named sessions, program storage, examples, export, and stale-source detection.
- Create `tests/integration-service.test.ts`: service behavior tests.
- Modify `src/mcp/server.ts`: replace one-session-only tool handlers with service-backed tools while preserving existing tool names.
- Modify `tests/mcp-server.test.ts`: update existing assertions and add named session/program authoring tests.
- Create `src/engine.ts`: newline-delimited JSON stdio engine entry point.
- Create `src/integration/json-engine.ts`: testable request handler for JSON engine methods.
- Create `tests/json-engine.test.ts`: non-interactive JSON protocol tests.
- Modify `package.json`: add `"engine": "node dist/src/engine.js"`.
- Create `skills/rpl26/SKILL.md`: agent skill for readable RPL authoring.
- Create `tests/skill-file.test.ts`: verifies the skill exists and contains required guidance.
- Modify `README.md`: document annotated RPL, MCP workflow, skill location, and JSON engine.
- Modify `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`: update checkboxes as tasks complete.

## Subagent Dispatch Plan

Use `superpowers:subagent-driven-development` for execution. Dispatch one fresh worker per task, review the returned diff, run the task's verification commands locally, update this plan's checkboxes, then dispatch the next unblocked task.

| Wave | Task | Suggested effort | Worker ownership | Blocks | Main-thread review focus |
| --- | --- | --- | --- | --- | --- |
| 1 | Task 1: Clean-Room Comment Notes | `low` | `docs/superpowers/specs/2026-05-06-milestone-7-comment-notes.md` and this plan only | Task 2 | Confirm no copied manual text, notes cite the local manual range, and the intentional `@` comment divergence is stated in project language. |
| 2 | Task 2: Annotated Source Utilities | `high` | `src/annotated-source.ts`, `tests/annotated-source.test.ts`, and this plan only | Tasks 4, 5, 6 | Check comment stripping outside strings, no runtime comment objects, object hashing stability, and parser-facing behavior. |
| 2 | Task 3: Project Types And Persistence | `medium` | `src/integration/types.ts`, `src/integration/project.ts`, `tests/integration-project.test.ts`, and this plan only | Task 4 | Check validation is immutable on malformed load, session snapshots remain compatible, and file helpers use explicit paths. |
| 3 | Task 4: Shared Integration Service | `high` | `src/integration/service.ts`, `tests/integration-service.test.ts`, and this plan only | Tasks 5, 6 | Check named-session lifecycle, variable-as-source-of-truth semantics, stale-source detection, example isolation, and project save/load behavior. |
| 4 | Task 5: Service-Backed MCP Tools | `medium` | `src/mcp/server.ts`, `tests/mcp-server.test.ts`, and this plan only | Task 7 naming docs | Check MCP compatibility for existing tools, new tool names and schemas, stable error/results, and no duplicated business logic. |
| 4 | Task 6: JSON Stdio Engine | `medium` | `src/integration/json-engine.ts`, `src/engine.ts`, `tests/json-engine.test.ts`, `package.json`, and this plan only | Task 8 | Check one-request-per-line behavior, deterministic JSON errors, shutdown, and service method parity. |
| 5 | Task 7: Agent Skill And Documentation | `medium` | `skills/rpl26/SKILL.md`, `tests/skill-file.test.ts`, `README.md`, and this plan only | Task 8 | Check the skill teaches annotated-source workflow, avoids unsupported RPL claims, and README matches final MCP/engine names. |
| 6 | Task 8: Final Integration Verification | `medium` | verification commands and this plan only | Completion | Check full test/typecheck/build evidence plus MCP and JSON smoke checks before claiming the milestone complete. |

Parallelism is safe only inside a wave. Task 2 and Task 3 can run at the same time because their write sets are disjoint except for this plan file; if both workers update plan checkboxes, the main thread should reconcile that single doc after review. Task 5 and Task 6 can also run in parallel after Task 4 lands.

Do not dispatch Tasks 4, 5, or 6 until Task 2 has passed review. Do not dispatch Task 4 until Task 3 has passed review. Do not dispatch Task 7 until Task 5 confirms the final MCP tool names.

## Task 1: Clean-Room Comment Notes

**Suggested subagent effort:** `low` because this is a bounded documentation task with known manual anchors.

**Files:**
- Create: `docs/superpowers/specs/2026-05-06-milestone-7-comment-notes.md`
- Modify: `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`

- [x] **Step 1: Create comment clean-room notes**

Create `docs/superpowers/specs/2026-05-06-milestone-7-comment-notes.md`:

```markdown
# Milestone 7 Comment Notes

## Source

Source manual: HP 48G Series User's Guide, HP Calculator Literature item 375.

Local extraction: `docs/hp48gug.md`.

OCR/markdown extraction: olmOCR, https://github.com/allenai/olmocr.

## Behavior Checked

Command-line comments using `@`.

Source region:

- `docs/hp48gug.md` lines 930-935: command-line entry behavior for `@` outside strings.

## Behavior Summary

In HP 48 command-line entry, an `@` outside a string marks adjacent command-line text as a comment. The calculator strips that comment when the command line is entered.

User RPL source listings commonly use `@` comments for human-readable notes such as stack effects. Those comments are authoring/source text, not runtime stack objects.

## Implementation Consequences For rpl26

Milestone 7 intentionally preserves `@` comments in annotated source records so agents and humans can read stored programs.

`rpl26` strips comments before parsing or executing annotated source. Comments must not appear as `RplObject` values, trace entries, stack values, or variables.

`hp48-user-rpl` export strips comments. `rpl26` export preserves comments.

## Known Uncertainty Or Intentional Divergence

The exact HP command-line definition of "adjacent text" is UI-oriented. `rpl26` will use a line-oriented source rule for Milestone 7: an `@` outside a string begins a comment that runs to the end of the current line.

This line-comment rule is an intentional authoring divergence, chosen for readable source files and agent workflows.
```

- [x] **Step 2: Check for accidental long manual excerpts or placeholders**

Run:

```bash
rg -n "TODO|TBD|HP says|copy this|If you enter an @ character" docs/superpowers/specs/2026-05-06-milestone-7-comment-notes.md
```

Expected: no output.

- [x] **Step 3: Mark task complete in this plan**

Change this task's checkboxes from `[ ]` to `[x]` as each step completes.

- [x] **Step 4: Commit**

Run:

```bash
git add docs/superpowers/specs/2026-05-06-milestone-7-comment-notes.md docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md
git commit -m "docs: add milestone 7 comment notes"
```

Expected: commit succeeds.

## Task 2: Annotated Source Utilities

**Suggested subagent effort:** `high` because parser-adjacent behavior and comment stripping affect execution semantics.

**Files:**
- Create: `src/annotated-source.ts`
- Create: `tests/annotated-source.test.ts`
- Modify: `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`

- [x] **Step 1: Write failing annotated source tests**

Create `tests/annotated-source.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  exportAnnotatedSource,
  objectHash,
  parseAnnotatedProgramSource,
  stripRplComments
} from "../src/annotated-source.js";

describe("annotated RPL source", () => {
  it("strips @ comments outside strings", () => {
    expect(stripRplComments("<<\n  @ Stack: x y -> z\n  * @ multiply\n>>")).toBe("<<\n  \n  * \n>>");
  });

  it("preserves @ inside strings", () => {
    expect(stripRplComments('<< "email@example.com" @ comment\n >>')).toBe('<< "email@example.com" \n >>');
  });

  it("handles escaped quotes before @ characters", () => {
    expect(stripRplComments('<< "say \\\\"@\\\\"" @ comment\n >>')).toBe('<< "say \\\\"@\\\\"" \n >>');
  });

  it("parses annotated source into exactly one program object", () => {
    const result = parseAnnotatedProgramSource("<<\n  @ increment\n  1 +\n>>");

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.object).toEqual({
      kind: "program",
      body: [
        { kind: "real", value: 1, source: "1" },
        { kind: "name", name: "+", source: "+" }
      ],
      source: "<< 1 + >>"
    });
    expect(result.executableSource).toBe("<<\n  \n  1 +\n>>");
  });

  it("rejects annotated source that is not exactly one program", () => {
    expect(parseAnnotatedProgramSource("1 2 +")).toEqual({
      ok: false,
      error: { code: "InvalidAnnotatedSource", message: "expected exactly one program object" }
    });
  });

  it("exports comments according to mode", () => {
    const source = "<<\n  @ Stack: x y -> z\n  *\n>>";
    expect(exportAnnotatedSource(source, "rpl26")).toEqual({ source, warnings: [] });
    expect(exportAnnotatedSource(source, "hp48-user-rpl")).toEqual({ source: "<<\n  \n  *\n>>", warnings: [] });
  });

  it("hashes equivalent objects deterministically", () => {
    const left = parseAnnotatedProgramSource("<< @ comment\n1 + >>");
    const right = parseAnnotatedProgramSource("<< 1 + >>");
    expect(left.ok && right.ok ? objectHash(left.object) === objectHash(right.object) : false).toBe(true);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/annotated-source.test.ts
```

Expected: FAIL because `src/annotated-source.ts` does not exist.

- [x] **Step 3: Implement annotated source utilities**

Create `src/annotated-source.ts`:

```ts
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
      } else if (char === "\\\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === "@") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      if (index < source.length) output += "\n";
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
    return { ok: false, error: { code: "InvalidAnnotatedSource", message: "expected exactly one program object" } };
  }

  return { ok: true, object: parsed.objects[0], executableSource };
}

function canonicalObject(value: RplObject): unknown {
  switch (value.kind) {
    case "real":
      return { kind: value.kind, value: value.value };
    case "name":
      return { kind: value.kind, name: value.name };
    case "quotedName":
      return { kind: value.kind, name: value.name };
    case "string":
      return { kind: value.kind, value: value.value };
    case "program":
      return { kind: value.kind, body: value.body.map(canonicalObject) };
    case "list":
      return { kind: value.kind, items: value.items.map(canonicalObject) };
    case "tagged":
      return { kind: value.kind, tag: value.tag, value: canonicalObject(value.value) };
  }
}

export function objectHash(value: RplObject): string {
  return createHash("sha256").update(JSON.stringify(canonicalObject(value))).digest("hex");
}

export function exportAnnotatedSource(source: string, mode: ExportMode): ExportSourceResult {
  if (mode === "rpl26") return { source, warnings: [] };
  return { source: stripRplComments(source), warnings: [] };
}
```

- [x] **Step 4: Run annotated source tests**

Run:

```bash
npm test -- tests/annotated-source.test.ts
```

Expected: PASS.

- [x] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 6: Mark task complete in this plan**

Change this task's checkboxes from `[ ]` to `[x]` as each step completes.

- [x] **Step 7: Commit**

Run:

```bash
git add src/annotated-source.ts tests/annotated-source.test.ts docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md
git commit -m "feat: add annotated RPL source utilities"
```

Expected: commit succeeds.

## Task 3: Project Types And Persistence

**Suggested subagent effort:** `medium` because this is structured validation and file I/O with clear behavior.

**Files:**
- Create: `src/integration/types.ts`
- Create: `src/integration/project.ts`
- Create: `tests/integration-project.test.ts`
- Modify: `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`

- [x] **Step 1: Write failing project tests**

Create `tests/integration-project.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadProjectSnapshot, readProjectFile, writeProjectFile } from "../src/integration/project.js";

describe("integration project persistence", () => {
  it("validates a project snapshot with annotated sources", () => {
    const result = loadProjectSnapshot({
      format: "rpl26-project",
      version: 1,
      snapshot: { format: "rpl26-session", version: 1, stack: [], variables: {} },
      sources: {
        VELOCITY: {
          name: "VELOCITY",
          source: "<< @ Stack: distance time -> velocity\n * >>",
          installedHash: "abc",
          updatedAt: "2026-05-06T00:00:00.000Z",
          examples: [
            {
              description: "multiplies two reals",
              input: "3 4 VELOCITY",
              expectedStack: [{ kind: "real", value: 12 }]
            }
          ]
        }
      }
    });

    expect(result).toMatchObject({ ok: true });
  });

  it("rejects mismatched source keys and names", () => {
    expect(
      loadProjectSnapshot({
        format: "rpl26-project",
        version: 1,
        snapshot: { format: "rpl26-session", version: 1, stack: [], variables: {} },
        sources: {
          VELOCITY: {
            name: "SPEED",
            source: "<< * >>",
            installedHash: "abc",
            updatedAt: "2026-05-06T00:00:00.000Z",
            examples: []
          }
        }
      })
    ).toEqual({ ok: false, error: { path: "sources.VELOCITY.name", message: "expected source name to match key" } });
  });

  it("writes and reads project files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-project-"));
    const path = join(dir, "project.json");

    try {
      const project = {
        format: "rpl26-project" as const,
        version: 1 as const,
        snapshot: { format: "rpl26-session" as const, version: 1 as const, stack: [], variables: {} },
        sources: {}
      };

      expect(await writeProjectFile(path, project)).toEqual({ ok: true });
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual(project);
      expect(await readProjectFile(path)).toEqual({ ok: true, project });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/integration-project.test.ts
```

Expected: FAIL because integration project modules do not exist.

- [x] **Step 3: Add integration types**

Create `src/integration/types.ts`:

```ts
import type { RplObject, SessionSnapshot, SnapshotValidationError } from "../types.js";

export type ProgramExample = {
  description?: string;
  input: string;
  expectedStack: RplObject[];
};

export type AnnotatedSourceRecord = {
  name: string;
  source: string;
  installedHash: string;
  updatedAt: string;
  examples: ProgramExample[];
  notes?: string;
};

export type ProjectSnapshot = {
  format: "rpl26-project";
  version: 1;
  snapshot: SessionSnapshot;
  sources: Record<string, AnnotatedSourceRecord>;
};

export type ProjectLoadResult = { ok: true; project: ProjectSnapshot } | { ok: false; error: SnapshotValidationError };

export type IntegrationErrorCode =
  | "UnknownSession"
  | "DuplicateSession"
  | "InvalidName"
  | "InvalidAnnotatedSource"
  | "InvalidProject"
  | "NonProgramVariable"
  | "SourceUnavailable"
  | "ExampleFailed"
  | "ExampleMismatch"
  | "InvalidRequest";

export type IntegrationError = {
  code: IntegrationErrorCode;
  message: string;
  path?: string;
};

export type IntegrationResult<T> = { ok: true; value: T } | { ok: false; error: IntegrationError };
```

- [x] **Step 4: Implement project validation and file helpers**

Create `src/integration/project.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { loadSessionSnapshot } from "../snapshot.js";
import type { RplObject, SnapshotValidationError } from "../types.js";
import type { AnnotatedSourceRecord, ProjectLoadResult, ProjectSnapshot, ProgramExample } from "./types.js";

const error = (path: string, message: string): SnapshotValidationError => ({ path, message });

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function validateRplObject(value: unknown, path: string): { ok: true; value: RplObject } | { ok: false; error: SnapshotValidationError } {
  const sessionResult = loadSessionSnapshot({ format: "rpl26-session", version: 1, stack: [value], variables: {} });
  if (!sessionResult.ok) {
    return { ok: false, error: error(path, sessionResult.error.message) };
  }
  return { ok: true, value: sessionResult.snapshot.stack[0] };
}

function validateExample(value: unknown, path: string): { ok: true; example: ProgramExample } | { ok: false; error: SnapshotValidationError } {
  if (!isRecord(value)) return { ok: false, error: error(path, "expected object") };
  if (value.description !== undefined && typeof value.description !== "string") return { ok: false, error: error(`${path}.description`, "expected string") };
  if (typeof value.input !== "string") return { ok: false, error: error(`${path}.input`, "expected string") };
  if (!Array.isArray(value.expectedStack)) return { ok: false, error: error(`${path}.expectedStack`, "expected array") };

  const expectedStack: RplObject[] = [];
  for (let index = 0; index < value.expectedStack.length; index += 1) {
    const object = validateRplObject(value.expectedStack[index], `${path}.expectedStack[${index}]`);
    if (!object.ok) return object;
    expectedStack.push(object.value);
  }

  return { ok: true, example: { description: value.description, input: value.input, expectedStack } };
}

function validateSourceRecord(key: string, value: unknown): { ok: true; record: AnnotatedSourceRecord } | { ok: false; error: SnapshotValidationError } {
  const path = `sources.${key}`;
  if (!isRecord(value)) return { ok: false, error: error(path, "expected object") };
  if (value.name !== key) return { ok: false, error: error(`${path}.name`, "expected source name to match key") };
  if (typeof value.source !== "string") return { ok: false, error: error(`${path}.source`, "expected string") };
  if (typeof value.installedHash !== "string") return { ok: false, error: error(`${path}.installedHash`, "expected string") };
  if (typeof value.updatedAt !== "string") return { ok: false, error: error(`${path}.updatedAt`, "expected string") };
  if (!Array.isArray(value.examples)) return { ok: false, error: error(`${path}.examples`, "expected array") };
  if (value.notes !== undefined && typeof value.notes !== "string") return { ok: false, error: error(`${path}.notes`, "expected string") };

  const examples: ProgramExample[] = [];
  for (let index = 0; index < value.examples.length; index += 1) {
    const example = validateExample(value.examples[index], `${path}.examples[${index}]`);
    if (!example.ok) return example;
    examples.push(example.example);
  }

  return {
    ok: true,
    record: {
      name: key,
      source: value.source,
      installedHash: value.installedHash,
      updatedAt: value.updatedAt,
      examples,
      notes: value.notes
    }
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

export async function writeProjectFile(path: string, project: ProjectSnapshot): Promise<{ ok: true } | { ok: false; error: SnapshotValidationError }> {
  const result = loadProjectSnapshot(project);
  if (!result.ok) return result;
  await writeFile(path, `${JSON.stringify(result.project, null, 2)}\n`, "utf8");
  return { ok: true };
}
```

- [x] **Step 5: Run project tests**

Run:

```bash
npm test -- tests/integration-project.test.ts
```

Expected: PASS.

- [x] **Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 7: Mark task complete in this plan**

Change this task's checkboxes from `[ ]` to `[x]` as each step completes.

- [x] **Step 8: Commit**

Run:

```bash
git add src/integration/types.ts src/integration/project.ts tests/integration-project.test.ts docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md
git commit -m "feat: add rpl26 project persistence"
```

Expected: commit succeeds.

## Task 4: Shared Integration Service

**Suggested subagent effort:** `high` because this is the main cross-client contract and must preserve calculator semantics.

**Files:**
- Create: `src/integration/service.ts`
- Create: `tests/integration-service.test.ts`
- Modify: `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`

- [x] **Step 1: Write failing service tests**

Create `tests/integration-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IntegrationService } from "../src/integration/service.js";

describe("IntegrationService", () => {
  it("creates, lists, selects, and deletes named sessions", () => {
    const service = new IntegrationService();

    expect(service.listSessions()).toEqual({ ok: true, value: [{ name: "default", selected: true }] });
    expect(service.createSession({ name: "work" })).toEqual({ ok: true, value: { name: "work", selected: false } });
    expect(service.selectSession({ name: "work" })).toEqual({ ok: true, value: { name: "work", selected: true } });
    expect(service.deleteSession({ name: "work" })).toEqual({ ok: true, value: { deleted: "work", selected: "default" } });
  });

  it("stores annotated source as a normal executable variable", () => {
    const service = new IntegrationService();

    const stored = service.storeProgram({
      session: "default",
      name: "VELOCITY",
      source: "<<\n  @ Stack: distance time -> velocity\n  *\n>>",
      examples: [{ input: "3 4 VELOCITY", expectedStack: [{ kind: "real", value: 12 }] }]
    });

    expect(stored).toMatchObject({ ok: true });
    expect(service.execute({ session: "default", input: "3 4 VELOCITY" })).toMatchObject({
      ok: true,
      value: { ok: true, stack: [{ level: 1, value: { kind: "real", value: 12 } }] }
    });
    expect(service.getProgramSource({ session: "default", name: "VELOCITY" })).toMatchObject({
      ok: true,
      value: { name: "VELOCITY", stale: false, source: "<<\n  @ Stack: distance time -> velocity\n  *\n>>" }
    });
  });

  it("runs program examples in an isolated session", () => {
    const service = new IntegrationService();
    service.execute({ session: "default", input: "99" });
    service.storeProgram({
      session: "default",
      name: "VELOCITY",
      source: "<< * >>",
      examples: [{ description: "simple multiplication", input: "3 4 VELOCITY", expectedStack: [{ kind: "real", value: 12 }] }]
    });

    expect(service.runProgramExamples({ session: "default", name: "VELOCITY" })).toEqual({
      ok: true,
      value: {
        ok: true,
        results: [
          {
            description: "simple multiplication",
            input: "3 4 VELOCITY",
            ok: true,
            actualStack: [{ level: 1, value: { kind: "real", value: 12 } }]
          }
        ]
      }
    });
    expect(service.getStack({ session: "default" })).toEqual({ ok: true, value: { stack: [{ level: 1, value: { kind: "real", value: 99 } }] } });
  });

  it("detects stale annotated source when a variable is overwritten", () => {
    const service = new IntegrationService();
    service.storeProgram({ session: "default", name: "INC", source: "<< 1 + >>" });
    service.execute({ session: "default", input: "<< 2 + >> 'INC' STO" });

    expect(service.getProgramSource({ session: "default", name: "INC" })).toMatchObject({
      ok: true,
      value: { name: "INC", stale: true }
    });
  });

  it("exports annotated and stripped program source", () => {
    const service = new IntegrationService();
    service.storeProgram({ session: "default", name: "INC", source: "<< @ add one\n 1 + >>" });

    expect(service.exportProgram({ session: "default", name: "INC", mode: "rpl26" })).toMatchObject({
      ok: true,
      value: { source: "<< @ add one\n 1 + >>" }
    });
    expect(service.exportProgram({ session: "default", name: "INC", mode: "hp48-user-rpl" })).toMatchObject({
      ok: true,
      value: { source: "<< \n 1 + >>" }
    });
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/integration-service.test.ts
```

Expected: FAIL because `IntegrationService` does not exist.

- [x] **Step 3: Implement the integration service**

Create `src/integration/service.ts`:

```ts
import { exportAnnotatedSource, objectHash, parseAnnotatedProgramSource, type ExportMode } from "../annotated-source.js";
import { CalculatorSession } from "../session.js";
import type { ExecuteResult, RplObject, StackEntry } from "../types.js";
import { readProjectFile, writeProjectFile } from "./project.js";
import type { AnnotatedSourceRecord, IntegrationResult, ProgramExample, ProjectSnapshot } from "./types.js";

type SessionName = string;

type IntegrationSession = {
  name: SessionName;
  calculator: CalculatorSession;
  sources: Record<string, AnnotatedSourceRecord>;
};

type SessionArg = { session?: string };

const nowIso = () => new Date().toISOString();

const error = <T>(code: Parameters<typeof makeError>[0], message: string): IntegrationResult<T> => ({ ok: false, error: makeError(code, message) });

function makeError(code: "UnknownSession" | "DuplicateSession" | "InvalidName" | "InvalidAnnotatedSource" | "NonProgramVariable" | "SourceUnavailable" | "ExampleFailed" | "ExampleMismatch" | "InvalidProject" | "InvalidRequest", message: string) {
  return { code, message };
}

function validName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(name);
}

function stackValues(stack: StackEntry[]): RplObject[] {
  return stack.map((entry) => entry.value);
}

function sameObjects(left: RplObject[], right: RplObject[]): boolean {
  return JSON.stringify(left.map(objectHash)) === JSON.stringify(right.map(objectHash));
}

export class IntegrationService {
  private selected = "default";
  private sessions = new Map<string, IntegrationSession>([
    ["default", { name: "default", calculator: new CalculatorSession(), sources: {} }]
  ]);

  listSessions(): IntegrationResult<Array<{ name: string; selected: boolean }>> {
    return {
      ok: true,
      value: [...this.sessions.values()].map((session) => ({ name: session.name, selected: session.name === this.selected }))
    };
  }

  createSession({ name }: { name: string }): IntegrationResult<{ name: string; selected: boolean }> {
    if (!validName(name)) return error("InvalidName", "session names must start with a letter and contain only letters, digits, and underscores");
    if (this.sessions.has(name)) return error("DuplicateSession", `session already exists: ${name}`);
    this.sessions.set(name, { name, calculator: new CalculatorSession(), sources: {} });
    return { ok: true, value: { name, selected: false } };
  }

  selectSession({ name }: { name: string }): IntegrationResult<{ name: string; selected: boolean }> {
    if (!this.sessions.has(name)) return error("UnknownSession", `unknown session: ${name}`);
    this.selected = name;
    return { ok: true, value: { name, selected: true } };
  }

  deleteSession({ name }: { name: string }): IntegrationResult<{ deleted: string; selected: string }> {
    if (name === "default") return error("InvalidRequest", "default session cannot be deleted");
    if (!this.sessions.delete(name)) return error("UnknownSession", `unknown session: ${name}`);
    if (this.selected === name) this.selected = "default";
    return { ok: true, value: { deleted: name, selected: this.selected } };
  }

  execute({ session, input }: SessionArg & { input: string }): IntegrationResult<ExecuteResult> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return { ok: true, value: resolved.value.calculator.execute(input) };
  }

  getStack({ session }: SessionArg): IntegrationResult<{ stack: StackEntry[] }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return { ok: true, value: { stack: resolved.value.calculator.getStack() } };
  }

  getVariables({ session }: SessionArg): IntegrationResult<{ variables: Record<string, RplObject> }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return { ok: true, value: { variables: resolved.value.calculator.getVariables() } };
  }

  getTrace({ session }: SessionArg): IntegrationResult<{ trace: ReturnType<CalculatorSession["getTrace"]> }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return { ok: true, value: { trace: resolved.value.calculator.getTrace() } };
  }

  clear({ session }: SessionArg): IntegrationResult<{ ok: true }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    resolved.value.calculator.clear();
    resolved.value.sources = {};
    return { ok: true, value: { ok: true } };
  }

  storeProgram({ session, name, source, examples = [], notes }: SessionArg & { name: string; source: string; examples?: ProgramExample[]; notes?: string }): IntegrationResult<AnnotatedSourceRecord> {
    if (!validName(name)) return error("InvalidName", "program names must start with a letter and contain only letters, digits, and underscores");
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    const parsed = parseAnnotatedProgramSource(source);
    if (!parsed.ok) return error("InvalidAnnotatedSource", parsed.error.message);

    const stored = resolved.value.calculator.execute(`${parsed.executableSource} '${name}' STO`);
    if (!stored.ok) return error("InvalidAnnotatedSource", stored.error.message);

    const record: AnnotatedSourceRecord = {
      name,
      source,
      installedHash: objectHash(parsed.object),
      updatedAt: nowIso(),
      examples,
      notes
    };
    resolved.value.sources[name] = record;
    return { ok: true, value: record };
  }

  getProgramSource({ session, name }: SessionArg & { name: string }): IntegrationResult<{ name: string; source: string; stale: boolean; record?: AnnotatedSourceRecord }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    const record = resolved.value.sources[name];
    if (record === undefined) return error("SourceUnavailable", `no annotated source for ${name}`);
    return { ok: true, value: { name, source: record.source, stale: this.isStale(resolved.value, name, record), record } };
  }

  listPrograms({ session }: SessionArg): IntegrationResult<Array<{ name: string; annotated: boolean; stale: boolean }>> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    const variables = resolved.value.calculator.getVariables();
    return {
      ok: true,
      value: Object.entries(variables)
        .filter(([, value]) => value.kind === "program")
        .map(([name]) => {
          const record = resolved.value.sources[name];
          return { name, annotated: record !== undefined, stale: record === undefined ? false : this.isStale(resolved.value, name, record) };
        })
    };
  }

  runProgramExamples({ session, name, examples }: SessionArg & { name: string; examples?: ProgramExample[] }): IntegrationResult<{ ok: boolean; results: Array<{ description?: string; input: string; ok: boolean; actualStack: StackEntry[]; message?: string }> }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    const record = resolved.value.sources[name];
    const examplesToRun = examples ?? record?.examples;
    if (examplesToRun === undefined) return error("SourceUnavailable", `no examples for ${name}`);

    const results = examplesToRun.map((example) => {
      const isolated = new CalculatorSession();
      isolated.loadSnapshot(resolved.value.calculator.toSnapshot());
      isolated.clear();
      const variablesOnly = resolved.value.calculator.toSnapshot();
      variablesOnly.stack = [];
      isolated.loadSnapshot(variablesOnly);
      const result = isolated.execute(example.input);
      if (!result.ok) {
        return { description: example.description, input: example.input, ok: false, actualStack: result.stack, message: `${result.error.code}: ${result.error.message}` };
      }
      const matches = sameObjects(stackValues(result.stack), example.expectedStack);
      return { description: example.description, input: example.input, ok: matches, actualStack: result.stack, message: matches ? undefined : "expected stack did not match" };
    });

    return { ok: true, value: { ok: results.every((result) => result.ok), results } };
  }

  exportProgram({ session, name, mode }: SessionArg & { name: string; mode: ExportMode }): IntegrationResult<{ source: string; warnings: string[] }> {
    const source = this.getProgramSource({ session, name });
    if (!source.ok) return source;
    const exported = exportAnnotatedSource(source.value.source, mode);
    return { ok: true, value: exported };
  }

  inspectProgram({ session, name }: SessionArg & { name: string }): IntegrationResult<{ name: string; variable?: RplObject; source?: string; stale?: boolean; examples?: ProgramExample[] }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    const variable = resolved.value.calculator.getVariables()[name];
    const record = resolved.value.sources[name];
    return {
      ok: true,
      value: {
        name,
        variable,
        source: record?.source,
        stale: record === undefined ? undefined : this.isStale(resolved.value, name, record),
        examples: record?.examples
      }
    };
  }

  toProject({ session }: SessionArg): IntegrationResult<ProjectSnapshot> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return {
      ok: true,
      value: {
        format: "rpl26-project",
        version: 1,
        snapshot: resolved.value.calculator.toSnapshot(),
        sources: resolved.value.sources
      }
    };
  }

  async saveSession({ session, path }: SessionArg & { path: string }): Promise<IntegrationResult<{ path: string }>> {
    const project = this.toProject({ session });
    if (!project.ok) return project;
    const written = await writeProjectFile(path, project.value);
    if (!written.ok) return { ok: false, error: { code: "InvalidProject", message: written.error.message, path: written.error.path } };
    return { ok: true, value: { path } };
  }

  async loadSession({ name, path, select = true }: { name: string; path: string; select?: boolean }): Promise<IntegrationResult<{ name: string; selected: boolean }>> {
    if (!validName(name)) return error("InvalidName", "session names must start with a letter and contain only letters, digits, and underscores");
    const loaded = await readProjectFile(path);
    if (!loaded.ok) return { ok: false, error: { code: "InvalidProject", message: loaded.error.message, path: loaded.error.path } };

    const calculator = new CalculatorSession();
    const loadedSnapshot = calculator.loadSnapshot(loaded.project.snapshot);
    if (!loadedSnapshot.ok) return { ok: false, error: { code: "InvalidProject", message: loadedSnapshot.error.message, path: loadedSnapshot.error.path } };

    this.sessions.set(name, { name, calculator, sources: loaded.project.sources });
    if (select) this.selected = name;
    return { ok: true, value: { name, selected: this.selected === name } };
  }

  private resolve(name?: string): IntegrationResult<IntegrationSession> {
    const sessionName = name ?? this.selected;
    const session = this.sessions.get(sessionName);
    if (session === undefined) return error("UnknownSession", `unknown session: ${sessionName}`);
    return { ok: true, value: session };
  }

  private isStale(session: IntegrationSession, name: string, record: AnnotatedSourceRecord): boolean {
    const variable = session.calculator.getVariables()[name];
    if (variable === undefined) return true;
    return objectHash(variable) !== record.installedHash;
  }
}
```

- [x] **Step 4: Run service tests**

Run:

```bash
npm test -- tests/integration-service.test.ts
```

Expected: PASS. If TypeScript reports a type error around `IntegrationResult` narrowing, fix it by returning concrete result objects rather than loosening types.

- [x] **Step 5: Run focused existing tests**

Run:

```bash
npm test -- tests/session.test.ts tests/session-snapshot.test.ts tests/parser.test.ts
```

Expected: PASS.

- [x] **Step 6: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 7: Mark task complete in this plan**

Change this task's checkboxes from `[ ]` to `[x]` as each step completes.

- [x] **Step 8: Commit**

Run:

```bash
git add src/integration/service.ts tests/integration-service.test.ts docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md
git commit -m "feat: add integration service"
```

Expected: commit succeeds.

## Task 5: Service-Backed MCP Tools

**Suggested subagent effort:** `medium` because the service owns behavior and MCP mostly maps schemas.

**Files:**
- Modify: `src/mcp/server.ts`
- Modify: `tests/mcp-server.test.ts`
- Modify: `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`

- [x] **Step 1: Replace MCP tests with service-backed expectations**

Modify `tests/mcp-server.test.ts` so it keeps existing compatibility coverage and adds new tools:

```ts
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
    expect(await tools.export_program({ name: "VELOCITY", mode: "hp48-user-rpl" })).toMatchObject({ source: "<<\n  \n  *\n>>" });
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
```

- [x] **Step 2: Run MCP tests to verify they fail**

Run:

```bash
npm test -- tests/mcp-server.test.ts
```

Expected: FAIL because new MCP tools are not implemented.

- [x] **Step 3: Update MCP server**

Modify `src/mcp/server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { IntegrationService } from "../integration/service.js";

const sessionArg = { session: z.string().optional() };
const rplObjectSchema: z.ZodType<unknown> = z.unknown();
const programExampleSchema = z.object({
  description: z.string().optional(),
  input: z.string(),
  expectedStack: z.array(rplObjectSchema)
});

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (result.ok) return result.value;
  return { ok: false, error: result.error } as T;
}

export function createCalculatorTools(service = new IntegrationService()) {
  return {
    list_sessions: async (_args: Record<string, never>) => unwrap(service.listSessions()),
    create_session: async ({ name }: { name: string }) => unwrap(service.createSession({ name })),
    select_session: async ({ name }: { name: string }) => unwrap(service.selectSession({ name })),
    delete_session: async ({ name }: { name: string }) => unwrap(service.deleteSession({ name })),
    get_session_status: async ({ session }: { session?: string }) => ({
      sessions: unwrap(service.listSessions()),
      programs: unwrap(service.listPrograms({ session }))
    }),
    save_session: async ({ session, path }: { session?: string; path: string }) => unwrap(await service.saveSession({ session, path })),
    load_session: async ({ name, path, select }: { name: string; path: string; select?: boolean }) => unwrap(await service.loadSession({ name, path, select })),
    execute: async ({ session, input }: { session?: string; input: string }) => unwrap(service.execute({ session, input })),
    get_stack: async ({ session }: { session?: string }) => unwrap(service.getStack({ session })),
    get_variables: async ({ session }: { session?: string }) => unwrap(service.getVariables({ session })),
    clear: async ({ session }: { session?: string }) => unwrap(service.clear({ session })),
    get_trace: async ({ session }: { session?: string }) => unwrap(service.getTrace({ session })),
    store_program: async (args: { session?: string; name: string; source: string; examples?: Array<{ description?: string; input: string; expectedStack: unknown[] }>; notes?: string }) =>
      unwrap(service.storeProgram({ ...args, examples: args.examples as never })),
    get_program_source: async (args: { session?: string; name: string }) => unwrap(service.getProgramSource(args)),
    list_programs: async ({ session }: { session?: string }) => unwrap(service.listPrograms({ session })),
    run_program_examples: async (args: { session?: string; name: string; examples?: Array<{ description?: string; input: string; expectedStack: unknown[] }> }) =>
      unwrap(service.runProgramExamples({ ...args, examples: args.examples as never })),
    export_program: async (args: { session?: string; name: string; mode: "rpl26" | "hp48-user-rpl" }) => unwrap(service.exportProgram(args)),
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
  server.tool("save_session", { ...sessionArg, path: z.string() }, async (args) => textResult(await tools.save_session(args)));
  server.tool("load_session", { name: z.string(), path: z.string(), select: z.boolean().optional() }, async (args) => textResult(await tools.load_session(args)));

  server.tool("execute", { ...sessionArg, input: z.string() }, async (args) => textResult(await tools.execute(args)));
  server.tool("get_stack", sessionArg, async (args) => textResult(await tools.get_stack(args)));
  server.tool("get_variables", sessionArg, async (args) => textResult(await tools.get_variables(args)));
  server.tool("clear", sessionArg, async (args) => textResult(await tools.clear(args)));
  server.tool("get_trace", sessionArg, async (args) => textResult(await tools.get_trace(args)));

  server.tool("store_program", { ...sessionArg, name: z.string(), source: z.string(), examples: z.array(programExampleSchema).optional(), notes: z.string().optional() }, async (args) =>
    textResult(await tools.store_program(args))
  );
  server.tool("get_program_source", { ...sessionArg, name: z.string() }, async (args) => textResult(await tools.get_program_source(args)));
  server.tool("list_programs", sessionArg, async (args) => textResult(await tools.list_programs(args)));
  server.tool("run_program_examples", { ...sessionArg, name: z.string(), examples: z.array(programExampleSchema).optional() }, async (args) =>
    textResult(await tools.run_program_examples(args))
  );
  server.tool("export_program", { ...sessionArg, name: z.string(), mode: z.enum(["rpl26", "hp48-user-rpl"]) }, async (args) => textResult(await tools.export_program(args)));
  server.tool("inspect_program", { ...sessionArg, name: z.string() }, async (args) => textResult(await tools.inspect_program(args)));

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
```

- [x] **Step 4: Run MCP tests**

Run:

```bash
npm test -- tests/mcp-server.test.ts
```

Expected: PASS.

- [x] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS. If `zod` schema typing complains about `sessionArg`, replace spread schemas with explicit object literals for each tool.

- [x] **Step 6: Mark task complete in this plan**

Change this task's checkboxes from `[ ]` to `[x]` as each step completes.

- [x] **Step 7: Commit**

Run:

```bash
git add src/mcp/server.ts tests/mcp-server.test.ts docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md
git commit -m "feat: expand mcp integration tools"
```

Expected: commit succeeds.

## Task 6: JSON Stdio Engine

**Suggested subagent effort:** `medium` because this is protocol plumbing over the shared service.

**Files:**
- Create: `src/integration/json-engine.ts`
- Create: `src/engine.ts`
- Create: `tests/json-engine.test.ts`
- Modify: `package.json`
- Modify: `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`

- [x] **Step 1: Write failing JSON engine tests**

Create `tests/json-engine.test.ts`:

```ts
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
    await handleJsonEngineLine(service, JSON.stringify({ id: "1", method: "storeProgram", params: { name: "INC", source: "<< @ add one\n 1 + >>" } }));

    await expect(handleJsonEngineLine(service, JSON.stringify({ id: "2", method: "exportProgram", params: { name: "INC", mode: "hp48-user-rpl" } }))).resolves.toBe(
      JSON.stringify({ id: "2", ok: true, result: { source: "<< \n 1 + >>", warnings: [] } })
    );
  });

  it("returns structured errors for invalid JSON and unknown methods", async () => {
    const service = new IntegrationService();

    await expect(handleJsonEngineLine(service, "{nope")).resolves.toBe(
      JSON.stringify({ id: null, ok: false, error: { code: "InvalidRequest", message: "invalid JSON" } })
    );
    await expect(handleJsonEngineLine(service, '{"id":"3","method":"missing"}')).resolves.toBe(
      JSON.stringify({ id: "3", ok: false, error: { code: "InvalidRequest", message: "unknown method: missing" } })
    );
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/json-engine.test.ts
```

Expected: FAIL because JSON engine modules do not exist.

- [x] **Step 3: Implement the testable JSON handler**

Create `src/integration/json-engine.ts`:

```ts
import type { IntegrationService } from "./service.js";

type JsonRequest = {
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const response = (id: unknown, body: { ok: true; result: unknown } | { ok: false; error: unknown }): string => JSON.stringify({ id: id ?? null, ...body });

function unwrap(id: unknown, result: { ok: true; value: unknown } | { ok: false; error: unknown }): string {
  if (result.ok) return response(id, { ok: true, result: result.value });
  return response(id, { ok: false, error: result.error });
}

export async function handleJsonEngineLine(service: IntegrationService, line: string): Promise<string> {
  let request: JsonRequest;
  try {
    request = JSON.parse(line) as JsonRequest;
  } catch {
    return response(null, { ok: false, error: { code: "InvalidRequest", message: "invalid JSON" } });
  }

  const id = request.id ?? null;
  if (typeof request.method !== "string") {
    return response(id, { ok: false, error: { code: "InvalidRequest", message: "method is required" } });
  }
  const params = isRecord(request.params) ? request.params : {};

  switch (request.method) {
    case "listSessions":
      return unwrap(id, service.listSessions());
    case "createSession":
      return unwrap(id, service.createSession({ name: String(params.name ?? "") }));
    case "selectSession":
      return unwrap(id, service.selectSession({ name: String(params.name ?? "") }));
    case "deleteSession":
      return unwrap(id, service.deleteSession({ name: String(params.name ?? "") }));
    case "execute":
      return unwrap(id, service.execute({ session: params.session as string | undefined, input: String(params.input ?? "") }));
    case "getStack":
      return unwrap(id, service.getStack({ session: params.session as string | undefined }));
    case "getVariables":
      return unwrap(id, service.getVariables({ session: params.session as string | undefined }));
    case "getTrace":
      return unwrap(id, service.getTrace({ session: params.session as string | undefined }));
    case "clear":
      return unwrap(id, service.clear({ session: params.session as string | undefined }));
    case "storeProgram":
      return unwrap(
        id,
        service.storeProgram({
          session: params.session as string | undefined,
          name: String(params.name ?? ""),
          source: String(params.source ?? ""),
          examples: params.examples as never,
          notes: params.notes as string | undefined
        })
      );
    case "getProgramSource":
      return unwrap(id, service.getProgramSource({ session: params.session as string | undefined, name: String(params.name ?? "") }));
    case "listPrograms":
      return unwrap(id, service.listPrograms({ session: params.session as string | undefined }));
    case "runProgramExamples":
      return unwrap(id, service.runProgramExamples({ session: params.session as string | undefined, name: String(params.name ?? ""), examples: params.examples as never }));
    case "exportProgram":
      return unwrap(id, service.exportProgram({ session: params.session as string | undefined, name: String(params.name ?? ""), mode: params.mode as never }));
    case "inspectProgram":
      return unwrap(id, service.inspectProgram({ session: params.session as string | undefined, name: String(params.name ?? "") }));
    case "shutdown":
      return response(id, { ok: true, result: { shutdown: true } });
    default:
      return response(id, { ok: false, error: { code: "InvalidRequest", message: `unknown method: ${request.method}` } });
  }
}
```

- [x] **Step 4: Implement the engine entry point**

Create `src/engine.ts`:

```ts
import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { IntegrationService } from "./integration/service.js";
import { handleJsonEngineLine } from "./integration/json-engine.js";

export async function main(): Promise<void> {
  const service = new IntegrationService();
  const lines = createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    if (line.trim().length === 0) continue;
    const response = await handleJsonEngineLine(service, line);
    output.write(`${response}\n`);
    try {
      const parsed = JSON.parse(response) as { result?: { shutdown?: boolean } };
      if (parsed.result?.shutdown === true) break;
    } catch {
      // Responses are generated internally; ignore impossible parse failures.
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
```

- [x] **Step 5: Add package script**

Modify `package.json` scripts:

```json
"engine": "node dist/src/engine.js"
```

Keep the existing scripts unchanged.

- [x] **Step 6: Run JSON engine tests**

Run:

```bash
npm test -- tests/json-engine.test.ts
```

Expected: PASS.

- [x] **Step 7: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [x] **Step 8: Run a JSON engine smoke check**

Run:

```bash
printf '%s\n' '{"id":"1","method":"execute","params":{"input":"2 3 +"}}' '{"id":"2","method":"shutdown"}' | npm run engine
```

Expected output includes one response with `"ok":true` and stack level 1 real value 5, followed by a shutdown response.

- [x] **Step 9: Mark task complete in this plan**

Change this task's checkboxes from `[ ]` to `[x]` as each step completes.

- [x] **Step 10: Commit**

Run:

```bash
git add src/integration/json-engine.ts src/engine.ts tests/json-engine.test.ts package.json docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md
git commit -m "feat: add json stdio engine"
```

Expected: commit succeeds.

## Task 7: Agent Skill And Documentation

**Suggested subagent effort:** `medium` because this requires product judgment but no runtime architecture.

**Files:**
- Create: `skills/rpl26/SKILL.md`
- Create: `tests/skill-file.test.ts`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`

- [x] **Step 1: Write failing skill-file test**

Create `tests/skill-file.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("rpl26 agent skill", () => {
  it("documents the readable RPL workflow for agents", async () => {
    const text = await readFile("skills/rpl26/SKILL.md", "utf8");

    expect(text).toContain("name: rpl26");
    expect(text).toContain("annotated RPL");
    expect(text).toContain("@ comments");
    expect(text).toContain("store_program");
    expect(text).toContain("run_program_examples");
    expect(text).toContain("export_program");
    expect(text).toContain("Do not invent unsupported RPL behavior");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/skill-file.test.ts
```

Expected: FAIL because `skills/rpl26/SKILL.md` does not exist.

- [x] **Step 3: Create the skill**

Create `skills/rpl26/SKILL.md`:

```markdown
---
name: rpl26
description: Use when connected to the rpl26 MCP server to write, test, annotate, save, inspect, or export readable User RPL-inspired programs.
---

# rpl26 Readable RPL Authoring

Use this skill when a user asks to work with `/rpl26`, the `rpl26` MCP server, readable RPL, annotated RPL, stored calculator programs, or HP-compatible User RPL export.

## Core Rule

The executable program is an RPL program stored as a normal variable.

Annotated source is the readable authoring form. Use `@ comments` for explanation, stack effects, examples, and intent. Comments are ignored by execution. HP-compatible export strips comments.

## Workflow

1. Inspect the session if context matters: `get_stack`, `get_variables`, `list_programs`, and `get_trace`.
2. Write a small named program as annotated RPL source.
3. Store it with `store_program`.
4. Run examples with `run_program_examples`.
5. If examples fail, revise the executable RPL first, then revise comments to match behavior.
6. Use `get_program_source` or `inspect_program` before editing an existing program.
7. Save the session/project when the user asks.
8. Use `export_program` with `rpl26` for readable source and `hp48-user-rpl` for stripped calculator-oriented source.

## Annotated Source Style

Start programs with purpose and stack-effect comments:

```rpl
<<
  @ VELOCITY(distance, time)
  @ Multiply distance by time and leave velocity on the stack.
  @ Stack: distance time -> velocity
  *
>>
```

Keep executable RPL terse and real. Do not put pseudo-code in executable positions. Prose belongs in `@` comments.

## Testing Style

Every stored program should have at least one concrete example unless the user explicitly asks only for a sketch.

Example record:

```json
{
  "input": "3 4 VELOCITY",
  "expectedStack": [{ "kind": "real", "value": 12 }]
}
```

Run examples before claiming the program works.

## Scope Discipline

Do not invent unsupported RPL behavior.

Avoid CAS, symbolic algebra, exact algebra, units, matrices, plotting, graphics, directories, HP binary object formats, System RPL, and real interactive input unless the user explicitly asks to design future behavior.

If the user asks for a program that "asks" for input, represent inputs in comments and stack effects. Let the agent, GUI, or human collect values outside the RPL evaluator for now.

## Export

Use `export_program`:

- `mode: "rpl26"` preserves readable `@` comments.
- `mode: "hp48-user-rpl"` strips comments for calculator-oriented source.

HP-compatible export is source-oriented. Do not promise binary transfer, ROM compatibility, or support for commands outside the implemented `rpl26` subset.
```

- [x] **Step 4: Document Milestone 7 in README**

Modify `README.md` by adding sections after the Terminal UI section:

```markdown
## Readable RPL And Agent Authoring

Milestone 7 adds an integration surface for readable RPL authoring.

Programs are still normal RPL variables:

```rpl
<< * >> 'VELOCITY' STO
```

`rpl26` can also preserve annotated source with `@` comments:

```rpl
<<
  @ VELOCITY(distance, time)
  @ Multiply distance by time and leave velocity on the stack.
  @ Stack: distance time -> velocity
  *
>>
```

Comments are ignored for execution. `rpl26` export preserves them, while `hp48-user-rpl` export strips them.

## Agent Skill

`rpl26` includes an agent skill for readable RPL workflows:

- `skills/rpl26/SKILL.md`

Use it with Codex, Claude-style agents, or other MCP clients when connecting to the `rpl26` MCP server. The skill teaches agents to write annotated RPL, store programs as variables, run examples, save sessions, and export stripped HP-compatible source when needed.

## JSON Engine

Build first, then launch the local JSON stdio engine:

```bash
npm run build
npm run engine
```

The engine accepts one JSON request per line and returns one JSON response per line. It is intended for scripts, editor extensions, and the future SwiftUI menu bar app.
```

Place these sections after the existing Terminal UI section. If a heading with the same name exists, replace that heading's content with the text above.

- [x] **Step 5: Run skill and README tests**

Run:

```bash
npm test -- tests/skill-file.test.ts
```

Expected: PASS.

- [x] **Step 6: Run full typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 7: Mark task complete in this plan**

Change this task's checkboxes from `[ ]` to `[x]` as each step completes.

- [x] **Step 8: Commit**

Run:

```bash
git add skills/rpl26/SKILL.md tests/skill-file.test.ts README.md docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md
git commit -m "docs: add rpl26 agent skill"
```

Expected: commit succeeds.

## Task 8: Final Integration Verification

**Suggested subagent effort:** `medium` because this task verifies cross-surface behavior and catches integration drift.

**Files:**
- Modify: `docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md`

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run MCP handler smoke check through tests**

Run:

```bash
npm test -- tests/mcp-server.test.ts
```

Expected: PASS, including `store_program`, `run_program_examples`, and `export_program` coverage.

- [ ] **Step 5: Run JSON engine smoke check**

Run:

```bash
printf '%s\n' '{"id":"1","method":"storeProgram","params":{"name":"VELOCITY","source":"<< @ Stack: distance time -> velocity\n * >>","examples":[{"input":"3 4 VELOCITY","expectedStack":[{"kind":"real","value":12}]}]}}' '{"id":"2","method":"runProgramExamples","params":{"name":"VELOCITY"}}' '{"id":"3","method":"exportProgram","params":{"name":"VELOCITY","mode":"hp48-user-rpl"}}' '{"id":"4","method":"shutdown"}' | npm run engine
```

Expected: all four responses have `"ok":true`; the export response strips the `@` comment.

- [ ] **Step 6: Inspect changed files**

Run:

```bash
git status --short
```

Expected: only intentional files are modified.

- [ ] **Step 7: Mark final task complete in this plan**

Change this task's checkboxes from `[ ]` to `[x]` as each step completes.

- [ ] **Step 8: Commit final plan status**

Run:

```bash
git add docs/superpowers/plans/2026-05-06-rpl26-milestone-7.md
git commit -m "docs: complete milestone 7 plan status"
```

Expected: commit succeeds if the plan status changed since the previous task commit.

## Notes For Subagent Dispatch

- Use one fresh worker per task, with the exact files from the task's **Files** section as that worker's write scope.
- Tell every worker they are not alone in the codebase, must not revert edits made by others, and must adapt to already-landed changes.
- Workers should update only their task checkboxes in this plan. The main thread owns resolving checkbox conflicts when parallel workers both touch the plan.
- The main thread reviews each task before dispatching any dependent task. Review includes reading the diff, running the task's specified test commands, and checking that unrelated files were not modified.
- Keep architectural decisions and cross-task contract changes in the main thread. If a worker finds that the plan's public types or tool names are wrong, it should report the issue instead of silently redesigning downstream tasks.
- Task 2 blocks Tasks 4, 5, and 6 because annotated parsing and hashing define the core executable-source contract.
- Task 3 blocks Task 4 project save/load work because the service should consume the shared project types rather than inventing parallel persistence structures.
- Task 4 blocks Tasks 5 and 6 because MCP and JSON stdio must wrap the shared service instead of duplicating behavior.
- Task 7 can run after Task 5 defines final MCP names, but it does not need runtime code ownership.
