# rpl26 Milestone 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate keyboard-first terminal UI plus reusable REPL usability features for word discovery, help, trace viewing, status, and versioned session snapshots.

**Architecture:** Keep HP-like parser/evaluator semantics unchanged. Add snapshot APIs to `CalculatorSession`, move human-facing REPL helpers into reusable modules, and build a dependency-free TUI around a testable state reducer plus a small ANSI renderer. The plain CLI/REPL remains line-oriented and script-friendly.

**Tech Stack:** TypeScript, Node.js built-ins (`node:fs/promises`, `node:readline`, `node:readline/promises`, `node:process`), Vitest, existing `CalculatorSession`, existing RPL object types.

---

## Dependency Decision

Milestone 6 considered two implementation options from the design:

- **Dependency-free readline/control-sequence TUI:** best fit for this repository right now because the existing dependency surface is intentionally small, package installation is avoided, and reducer/render tests can cover the important behavior without terminal emulation.
- **Small npm TUI library:** deferred because libraries such as Ink/Blessed would add framework concepts, transitive dependencies, and likely require test harness work before the UI behavior itself is useful.

Chosen approach: implement a dependency-free TUI with pure state/render helpers and a tiny terminal adapter. If later milestones need richer widgets, this plan leaves the state model separable enough to replace only the adapter/renderer.

## File Map

- Create `docs/superpowers/specs/2026-05-04-milestone-6-interface-notes.md`: clean-room boundary notes explaining that Milestone 6 adds local interface behavior, not HP language semantics.
- Create `src/snapshot.ts`: versioned session snapshot schema, validation, cloning, file load/save helpers.
- Modify `src/types.ts`: add `SessionSnapshot`, `SnapshotValidationError`, `SnapshotLoadResult`, and optional word metadata fields.
- Modify `src/session.ts`: add `toSnapshot()` and `loadSnapshot(snapshot)` without changing evaluation semantics.
- Create `tests/session-snapshot.test.ts`: snapshot serialization, validation, and failed-load immutability tests.
- Create `src/word-search.ts`: searchable word metadata and formatted help details.
- Modify `src/words.ts`: add optional `examples`, `keywords`, `aliases`; keep existing word names stable.
- Modify `tests/word-help.test.ts`: metadata examples, keyword search, alias search, and richer help output.
- Create `src/repl-commands.ts`: parse and execute dot commands shared by plain REPL and TUI.
- Modify `src/cli.ts`: delegate dot commands to `src/repl-commands.ts`; keep command-line behavior stable while allowing `runReplLines` to become async for snapshot file I/O.
- Modify `tests/cli.test.ts`: `.find`, `.status`, `.trace --verbose`, `.stack --verbose`, `.vars --verbose`, `.save`, `.load`, completions.
- Create `src/style.ts`: semantic token and ANSI styling helpers with no-color fallback.
- Create `tests/style.test.ts`: token selection and ANSI/no-color behavior.
- Create `src/tui/state.ts`: TUI reducer, tabs, focus, word filter, selected word, status, and input history model.
- Create `src/tui/render.ts`: pure renderer for wide and narrow layouts.
- Create `src/tui/app.ts`: terminal adapter, key handling, launch loop.
- Create `src/tui.ts`: executable TUI entry point.
- Create `tests/tui-state.test.ts`: reducer and keyboard behavior.
- Create `tests/tui-render.test.ts`: layout smoke checks.
- Create `tests/tui-entry.test.ts`: non-interactive entry smoke path.
- Modify `package.json`: add `tui` script.
- Modify `README.md`: document TUI, improved REPL commands, and session snapshot examples.
- Modify `docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md`: update checkboxes as tasks complete.

## Task 1: Reference Boundary Notes

**Suggested subagent effort:** `low` because this is documentation hygiene, not HP manual interpretation.

**Files:**
- Create: `docs/superpowers/specs/2026-05-04-milestone-6-interface-notes.md`
- Reference: `docs/superpowers/specs/2026-05-03-milestone-6-design.md`

- [x] **Step 1: Create interface boundary notes**

Create `docs/superpowers/specs/2026-05-04-milestone-6-interface-notes.md`:

```markdown
# Milestone 6 Interface Notes

## Source Boundary

Milestone 6 is a local terminal usability milestone for `rpl26`.

Primary design source: `docs/superpowers/specs/2026-05-03-milestone-6-design.md`.

HP 48G Series User's Guide role: the manual remains the behavior baseline for HP-like language words, but this milestone does not add or reinterpret HP command semantics.

## Behavior Checked

- Plain REPL dot commands: `.find`, `.status`, `.trace --verbose`, `.stack --verbose`, `.vars --verbose`, `.save PATH`, and `.load PATH`.
- TUI panes for stack, variables, word search, help, trace, and session status.
- Versioned `rpl26` JSON snapshots for stack and variables.

## Implementation Consequences

- Do not change `src/core.ts` or `src/parser.ts` unless a focused bug is found and covered by a separate note.
- Treat REPL dot commands and TUI controls as `rpl26` conveniences, not HP compatibility claims.
- Tests for this milestone should reference this note when they cover interface behavior.

## Known Uncertainty Or Intentional Divergence

- TUI keyboard shortcuts are local `rpl26` UI choices.
- Snapshot JSON is a local persistence format and is not related to HP binary object formats.
- Word help examples are documentation examples written in our own words or based on existing clean-room notes.
```

- [x] **Step 2: Check for accidental manual-text placeholders**

Run:

```bash
rg -n "TODO|TBD|HP says|manual text|copy" docs/superpowers/specs/2026-05-04-milestone-6-interface-notes.md
```

Expected: no output.

- [ ] **Step 3: Commit boundary notes**

Run:

```bash
git add docs/superpowers/specs/2026-05-04-milestone-6-interface-notes.md docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "docs: add milestone 6 interface notes"
```

Expected: commit succeeds.

## Task 2: Session Snapshot API

**Suggested subagent effort:** `medium` because validation must be deterministic and failed loads must not mutate state.

**Files:**
- Modify: `src/types.ts`
- Create: `src/snapshot.ts`
- Modify: `src/session.ts`
- Create: `tests/session-snapshot.test.ts`

- [x] **Step 1: Write failing snapshot tests**

Create `tests/session-snapshot.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { loadSessionSnapshot } from "../src/snapshot.js";

describe("session snapshots", () => {
  it("serializes stack and variables into a versioned snapshot", () => {
    const session = new CalculatorSession();
    session.execute("<< 1 + >> 'INC' STO 41 INC");

    expect(session.toSnapshot()).toMatchObject({
      format: "rpl26-session",
      version: 1,
      stack: [{ kind: "real", value: 42 }],
      variables: { INC: { kind: "program" } }
    });
  });

  it("loads a valid snapshot", () => {
    const session = new CalculatorSession();
    const result = session.loadSnapshot({
      format: "rpl26-session",
      version: 1,
      stack: [{ kind: "real", value: 5 }],
      variables: { A: { kind: "string", value: "hello" } }
    });

    expect(result).toEqual({ ok: true });
    expect(session.getStack()).toEqual([{ level: 1, value: { kind: "real", value: 5 } }]);
    expect(session.getVariables()).toEqual({ A: { kind: "string", value: "hello" } });
  });

  it("rejects malformed snapshots without mutating the session", () => {
    const session = new CalculatorSession();
    session.execute("1 2 + 'A' STO 9");
    const before = session.toSnapshot();

    const result = session.loadSnapshot({
      format: "rpl26-session",
      version: 2,
      stack: [],
      variables: {}
    });

    expect(result).toEqual({
      ok: false,
      error: { path: "version", message: "expected version 1" }
    });
    expect(session.toSnapshot()).toEqual(before);
  });

  it("validates nested object shapes", () => {
    expect(loadSessionSnapshot({ format: "rpl26-session", version: 1, stack: [{ kind: "real", value: "5" }], variables: {} })).toEqual({
      ok: false,
      error: { path: "stack[0].value", message: "expected number" }
    });
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/session-snapshot.test.ts
```

Expected: FAIL because `src/snapshot.ts`, `toSnapshot()`, and `loadSnapshot()` do not exist.

- [x] **Step 3: Add snapshot types**

Modify `src/types.ts` by adding these exports after `CalculatorState`:

```ts
export type SessionSnapshot = {
  format: "rpl26-session";
  version: 1;
  stack: RplObject[];
  variables: Record<string, RplObject>;
};

export type SnapshotValidationError = {
  path: string;
  message: string;
};

export type SnapshotLoadResult = { ok: true } | { ok: false; error: SnapshotValidationError };
```

- [x] **Step 4: Implement snapshot validation**

Create `src/snapshot.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { cloneObject } from "./core.js";
import type { RplObject, SessionSnapshot, SnapshotLoadResult, SnapshotValidationError } from "./types.js";

const SNAPSHOT_FORMAT = "rpl26-session";
const SNAPSHOT_VERSION = 1;

function error(path: string, message: string): SnapshotValidationError {
  return { path, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateObject(value: unknown, path: string): SnapshotValidationError | undefined {
  if (!isRecord(value)) return error(path, "expected object");
  if (typeof value.kind !== "string") return error(`${path}.kind`, "expected string");

  switch (value.kind) {
    case "real":
      return typeof value.value === "number" ? undefined : error(`${path}.value`, "expected number");
    case "name":
    case "quotedName":
      return typeof value.name === "string" ? undefined : error(`${path}.name`, "expected string");
    case "string":
      return typeof value.value === "string" ? undefined : error(`${path}.value`, "expected string");
    case "program":
      if (!Array.isArray(value.body)) return error(`${path}.body`, "expected array");
      for (let index = 0; index < value.body.length; index += 1) {
        const nested = validateObject(value.body[index], `${path}.body[${index}]`);
        if (nested !== undefined) return nested;
      }
      return undefined;
    case "list":
      if (!Array.isArray(value.items)) return error(`${path}.items`, "expected array");
      for (let index = 0; index < value.items.length; index += 1) {
        const nested = validateObject(value.items[index], `${path}.items[${index}]`);
        if (nested !== undefined) return nested;
      }
      return undefined;
    case "tagged":
      if (typeof value.tag !== "string") return error(`${path}.tag`, "expected string");
      return validateObject(value.value, `${path}.value`);
    default:
      return error(`${path}.kind`, `unsupported object kind ${value.kind}`);
  }
}

export function loadSessionSnapshot(value: unknown): SnapshotLoadResult & { snapshot?: SessionSnapshot } {
  if (!isRecord(value)) return { ok: false, error: error("$", "expected object") };
  if (value.format !== SNAPSHOT_FORMAT) return { ok: false, error: error("format", `expected ${SNAPSHOT_FORMAT}`) };
  if (value.version !== SNAPSHOT_VERSION) return { ok: false, error: error("version", `expected version ${SNAPSHOT_VERSION}`) };
  if (!Array.isArray(value.stack)) return { ok: false, error: error("stack", "expected array") };
  if (!isRecord(value.variables)) return { ok: false, error: error("variables", "expected object") };

  for (let index = 0; index < value.stack.length; index += 1) {
    const stackError = validateObject(value.stack[index], `stack[${index}]`);
    if (stackError !== undefined) return { ok: false, error: stackError };
  }

  for (const [name, object] of Object.entries(value.variables)) {
    if (name.trim().length === 0) return { ok: false, error: error("variables", "variable names must be non-empty") };
    const variableError = validateObject(object, `variables.${name}`);
    if (variableError !== undefined) return { ok: false, error: variableError };
  }

  return {
    ok: true,
    snapshot: {
      format: SNAPSHOT_FORMAT,
      version: SNAPSHOT_VERSION,
      stack: value.stack.map((object) => cloneObject(object as RplObject)),
      variables: Object.fromEntries(Object.entries(value.variables).map(([name, object]) => [name, cloneObject(object as RplObject)]))
    }
  };
}

export async function readSnapshotFile(path: string): Promise<SnapshotLoadResult & { snapshot?: SessionSnapshot }> {
  const text = await readFile(path, "utf8");
  return loadSessionSnapshot(JSON.parse(text));
}

export async function writeSnapshotFile(path: string, snapshot: SessionSnapshot): Promise<void> {
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}
```

- [x] **Step 5: Add session APIs**

Modify `src/session.ts`:

```ts
import { loadSessionSnapshot } from "./snapshot.js";
import type { CalculatorState, ExecuteResult, RplObject, SessionSnapshot, SnapshotLoadResult, StackEntry, TraceEntry } from "./types.js";
```

Add methods before `clear()`:

```ts
  toSnapshot(): SessionSnapshot {
    const state = cloneState(this.state);
    return {
      format: "rpl26-session",
      version: 1,
      stack: state.stack,
      variables: state.variables
    };
  }

  loadSnapshot(snapshot: unknown): SnapshotLoadResult {
    const result = loadSessionSnapshot(snapshot);
    if (!result.ok) return result;
    this.state = {
      stack: result.snapshot.stack.map(cloneObject),
      variables: Object.fromEntries(Object.entries(result.snapshot.variables).map(([name, value]) => [name, cloneObject(value)]))
    };
    this.trace = [];
    return { ok: true };
  }
```

- [x] **Step 6: Run snapshot tests**

Run:

```bash
npm test -- tests/session-snapshot.test.ts
```

Expected: PASS.

- [x] **Step 7: Commit snapshot API**

Run:

```bash
git add src/types.ts src/snapshot.ts src/session.ts tests/session-snapshot.test.ts docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "feat: add session snapshots"
```

Expected: commit succeeds.

## Task 3: Word Metadata And Search

**Suggested subagent effort:** `medium` because this creates shared search/help behavior but does not alter command semantics.

**Files:**
- Modify: `src/types.ts`
- Modify: `src/words.ts`
- Create: `src/word-search.ts`
- Modify: `tests/word-help.test.ts`

- [ ] **Step 1: Write failing word search tests**

Add to `tests/word-help.test.ts`:

```ts
import { describeWordDetail, searchWords } from "../src/word-search.js";
```

Add tests:

```ts
  it("searches words by name, category, stack effect, description, keyword, and alias", () => {
    expect(searchWords("dup").map((word) => word.name)).toContain("DUP");
    expect(searchWords("list").map((word) => word.name)).toContain("->LIST");
    expect(searchWords("real real").map((word) => word.name)).toContain("+");
    expect(searchWords("duplicate").map((word) => word.name)).toContain("DUP");
    expect(searchWords("copy").map((word) => word.name)).toContain("DUP");
    expect(searchWords("store").map((word) => word.name)).toContain("STO");
  });

  it("renders rich word details with examples", () => {
    expect(describeWordDetail("DUP")).toContain("Examples:");
    expect(describeWordDetail("DUP")).toContain("1 DUP");
    expect(describeWordDetail("NOPE")).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/word-help.test.ts
```

Expected: FAIL because `src/word-search.ts` does not exist and metadata lacks examples/keywords.

- [ ] **Step 3: Extend word metadata type**

Modify `src/words.ts`:

```ts
export type WordMetadata = {
  name: string;
  category: WordCategory;
  stack: string;
  description: string;
  source: string;
  examples?: string[];
  keywords?: string[];
  aliases?: string[];
};
```

- [ ] **Step 4: Add focused metadata**

Update representative entries in `src/words.ts`:

```ts
  DUP: word({
    name: "DUP",
    category: "stack",
    stack: "object -> object object",
    description: "Duplicate level 1.",
    source: "rpl26 Milestone 1",
    examples: ["1 DUP"],
    keywords: ["copy", "duplicate", "stack"]
  }),
```

```ts
  STO: word({
    name: "STO",
    category: "core",
    stack: "object 'name' ->",
    description: "Store an object in a global variable.",
    source: "rpl26 Milestone 1",
    examples: ["42 'A' STO"],
    keywords: ["store", "variable", "global"],
    aliases: ["store"]
  }),
```

```ts
  "->LIST": word({
    name: "->LIST",
    category: "list",
    stack: "objects... n -> list",
    description: "Collect objects into a list.",
    source: "rpl26 Milestone 2",
    examples: ["1 2 3 3 ->LIST"],
    keywords: ["list", "collect", "aggregate"]
  }),
```

Add examples/keywords for at least `+`, `DROP`, `SWAP`, `OVER`, `SIZE`, `GET`, `IF`, `HEAD`, `SUB`, `->STR`, and `->TAG` using short original examples from existing README/test behavior.

- [ ] **Step 5: Implement search helpers**

Create `src/word-search.ts`:

```ts
import { WORDS, type WordMetadata } from "./words.js";

function haystack(word: WordMetadata): string {
  return [
    word.name,
    word.category,
    word.stack,
    word.description,
    word.source,
    ...(word.keywords ?? []),
    ...(word.aliases ?? [])
  ]
    .join(" ")
    .toLowerCase();
}

export function searchWords(query: string): WordMetadata[] {
  const normalized = query.trim().toLowerCase();
  const words = Object.values(WORDS).sort((left, right) => left.name.localeCompare(right.name));
  if (normalized.length === 0) return words;
  return words.filter((word) => haystack(word).includes(normalized));
}

export function describeWordDetail(name: string): string | undefined {
  const word = WORDS[name];
  if (word === undefined) return undefined;
  const lines = [
    word.name,
    `Category: ${word.category}`,
    `Stack: ${word.stack}`,
    `Source: ${word.source}`,
    word.description
  ];
  if (word.aliases !== undefined && word.aliases.length > 0) lines.push(`Aliases: ${word.aliases.join(", ")}`);
  if (word.keywords !== undefined && word.keywords.length > 0) lines.push(`Keywords: ${word.keywords.join(", ")}`);
  if (word.examples !== undefined && word.examples.length > 0) lines.push("Examples:", ...word.examples.map((example) => `  ${example}`));
  return lines.join("\n");
}
```

- [ ] **Step 6: Delegate existing help to rich details**

Modify `src/words.ts`:

```ts
export function describeWord(name: string): string | undefined {
  const metadata = WORDS[name];
  if (metadata === undefined) return undefined;
  const examples = metadata.examples === undefined || metadata.examples.length === 0 ? "" : `\nExamples:\n${metadata.examples.map((example) => `  ${example}`).join("\n")}`;
  return `${metadata.name}\nCategory: ${metadata.category}\nStack: ${metadata.stack}\nSource: ${metadata.source}\n${metadata.description}${examples}`;
}
```

- [ ] **Step 7: Run word tests**

Run:

```bash
npm test -- tests/word-help.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit word search**

Run:

```bash
git add src/words.ts src/word-search.ts tests/word-help.test.ts docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "feat: add searchable word metadata"
```

Expected: commit succeeds.

## Task 4: Shared REPL Commands

**Suggested subagent effort:** `medium` because this touches user-facing CLI behavior and shared command contracts.

**Files:**
- Create: `src/repl-commands.ts`
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Write failing REPL command tests**

Add tests to `tests/cli.test.ts`:

```ts
  it("finds words from the plain REPL", async () => {
    const result = await runReplLines([".find list"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("->LIST");
    expect(result.stdout).toContain("LIST->");
  });

  it("shows REPL status", async () => {
    const result = await runReplLines(["1 2 + 'A' STO", ".status"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Stack 0");
    expect(result.stdout).toContain("Vars 1");
    expect(result.stdout).toContain("Last ok");
    expect(result.stdout).toContain("saved: <none>");
  });

  it("prints compact and verbose traces", async () => {
    const result = await runReplLines(["1 2 +", ".trace", ".trace --verbose"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ok +");
    expect(result.stdout).toContain("before:");
    expect(result.stdout).toContain("after:");
  });

  it("prints verbose stack and variable views", async () => {
    const result = await runReplLines(["42 'A' STO \"abc\"", ".stack --verbose", ".vars --verbose"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("1: string \"abc\"");
    expect(result.stdout).toContain("A: real 42");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/cli.test.ts
```

Expected: FAIL because the new dot commands and verbose flags do not exist.

- [ ] **Step 3: Implement shared command helpers**

Create `src/repl-commands.ts`:

```ts
import { readSnapshotFile, writeSnapshotFile } from "./snapshot.js";
import { formatObject } from "./format.js";
import { CalculatorSession } from "./session.js";
import { describeWordDetail, searchWords } from "./word-search.js";
import { listWords } from "./words.js";
import type { ExecuteResult, RplObject, StackEntry, TraceEntry } from "./types.js";

export type ReplCommandState = {
  lastResult?: ExecuteResult;
  snapshotPath?: string;
  dirty: boolean;
};

export type ReplCommandResult = { kind: "output"; output: string } | { kind: "exit" } | { kind: "unknown" };

export function createReplCommandState(): ReplCommandState {
  return { dirty: false };
}

export function formatStack(stack: StackEntry[], verbose = false): string {
  if (stack.length === 0) return "Stack: <empty>";
  return stack.map((entry) => `${entry.level}: ${verbose ? `${entry.value.kind} ` : ""}${formatObject(entry.value)}`).join("\n");
}

export function formatVariables(variables: Record<string, RplObject>, verbose = false): string {
  const entries = Object.entries(variables);
  if (entries.length === 0) return "Variables: <empty>";
  return entries.map(([name, value]) => `${name}: ${verbose ? `${value.kind} ` : ""}${formatObject(value)}`).join("\n");
}

function formatRawStack(values: RplObject[]): string {
  if (values.length === 0) return "<empty>";
  return values.map(formatObject).join(" ");
}

export function formatTrace(trace: TraceEntry[], verbose = false): string {
  if (trace.length === 0) return "Trace: <empty>";
  if (!verbose) return trace.map((entry) => `${entry.ok ? "ok" : "error"} ${entry.source}`).join("\n");
  return trace
    .map((entry) => {
      const lines = [`${entry.ok ? "ok" : "error"} ${entry.source}`, `  before: ${formatRawStack(entry.before)}`, `  after: ${formatRawStack(entry.after)}`];
      if (!entry.ok) lines.push(`  error: ${entry.error.code}: ${entry.error.message}`);
      return lines.join("\n");
    })
    .join("\n");
}

export function formatStatus(session: CalculatorSession, state: ReplCommandState): string {
  const last = state.lastResult === undefined ? "none" : state.lastResult.ok ? "ok" : `error ${state.lastResult.error.code}`;
  const saved = state.snapshotPath === undefined ? "<none>" : state.dirty ? `${state.snapshotPath} (modified)` : state.snapshotPath;
  return `Stack ${session.getStack().length} | Vars ${Object.keys(session.getVariables()).length} | Last ${last} | saved: ${saved}`;
}

export async function runDotCommand(session: CalculatorSession, state: ReplCommandState, trimmed: string): Promise<ReplCommandResult> {
  const [command, ...args] = trimmed.split(/\s+/);
  if (command === ".exit" || command === ".quit") return { kind: "exit" };
  if (command === ".stack") return { kind: "output", output: formatStack(session.getStack(), args.includes("--verbose")) };
  if (command === ".vars") return { kind: "output", output: formatVariables(session.getVariables(), args.includes("--verbose")) };
  if (command === ".trace") return { kind: "output", output: formatTrace(session.getTrace(), args.includes("--verbose")) };
  if (command === ".words") return { kind: "output", output: listWords().join(" ") };
  if (command === ".find") return { kind: "output", output: searchWords(args.join(" ")).map((word) => `${word.name} (${word.category}) ${word.stack}`).join("\n") || "No matches." };
  if (command === ".help" && args.length === 0) return { kind: "output", output: "Use .help WORD for stack effect, description, source note, and examples." };
  if (command === ".help") return { kind: "output", output: describeWordDetail(args.join(" ")) ?? `No help for ${args.join(" ")}` };
  if (command === ".status") return { kind: "output", output: formatStatus(session, state) };
  if (command === ".clear") {
    session.clear();
    state.lastResult = undefined;
    state.dirty = true;
    return { kind: "output", output: "Cleared." };
  }
  if (command === ".save") {
    const path = args.join(" ");
    if (path.length === 0) return { kind: "output", output: "Usage: .save PATH" };
    await writeSnapshotFile(path, session.toSnapshot());
    state.snapshotPath = path;
    state.dirty = false;
    return { kind: "output", output: `Saved ${path}` };
  }
  if (command === ".load") {
    const path = args.join(" ");
    if (path.length === 0) return { kind: "output", output: "Usage: .load PATH" };
    const loaded = await readSnapshotFile(path);
    if (!loaded.ok) return { kind: "output", output: `Load failed at ${loaded.error.path}: ${loaded.error.message}` };
    session.loadSnapshot(loaded.snapshot);
    state.snapshotPath = path;
    state.dirty = false;
    state.lastResult = undefined;
    return { kind: "output", output: `Loaded ${path}` };
  }
  return { kind: "unknown" };
}
```

- [ ] **Step 4: Update CLI to use shared commands**

Modify `src/cli.ts` imports:

```ts
import { createReplCommandState, formatStack, runDotCommand } from "./repl-commands.js";
import type { ReplCommandState } from "./repl-commands.js";
```

Remove local `formatStack`, `formatVariables`, `formatTrace`, and `runDotCommand` implementations from `src/cli.ts`. Keep this re-export:

```ts
export { formatObject } from "./format.js";
export { formatStack } from "./repl-commands.js";
```

Update `runReplLines` to become async and update existing tests to `await runReplLines(...)`:

```ts
export async function runReplLines(lines: string[]): Promise<CliResult> {
  const session = new CalculatorSession();
  const state = createReplCommandState();
  const outputLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const dotResult = await runDotCommand(session, state, trimmed);
    if (dotResult.kind === "exit") break;
    if (dotResult.kind === "output") {
      outputLines.push(dotResult.output);
      continue;
    }

    const result = session.execute(trimmed);
    state.lastResult = result;
    state.dirty = true;
    if (!result.ok) {
      return { exitCode: 1, stdout: outputLines.join("\n"), stderr: `${result.error.code}: ${result.error.message}` };
    }
    outputLines.push(formatStack(result.stack));
  }

  return { exitCode: 0, stdout: outputLines.join("\n"), stderr: "", session };
}
```

Update `runReplLine` for the interactive REPL:

```ts
async function runReplLine(session: CalculatorSession, state: ReplCommandState, line: string): Promise<string | "exit"> {
  const trimmed = line.trim();
  if (trimmed.length === 0) return "";
  const dotResult = await runDotCommand(session, state, trimmed);
  if (dotResult.kind === "exit") return "exit";
  if (dotResult.kind === "output") return dotResult.output;

  const result = session.execute(trimmed);
  state.lastResult = result;
  state.dirty = true;
  if (!result.ok) return `${result.error.code}: ${result.error.message}`;
  return formatStack(result.stack);
}
```

Update `runInteractiveRepl()` to create command state and await line execution:

```ts
  const state = createReplCommandState();
  for await (const line of repl) {
    const result = await runReplLine(session, state, line);
    if (result === "exit") break;
    if (result.length > 0) console.log(result);
    repl.prompt();
  }
```

Update all `tests/cli.test.ts` calls from `const result = runReplLines([...])` to `const result = await runReplLines([...])`, and mark those tests `async`.

- [ ] **Step 5: Run focused CLI tests**

Run:

```bash
npm test -- tests/cli.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit shared REPL commands**

Run:

```bash
git add src/repl-commands.ts src/cli.ts tests/cli.test.ts docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "feat: share richer repl commands"
```

Expected: commit succeeds.

## Task 5: Save And Load Dot Commands

**Suggested subagent effort:** `medium` because file I/O needs clear error behavior and must not damage active sessions.

**Files:**
- Modify: `tests/cli.test.ts`
- Modify: `src/repl-commands.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Write failing save/load tests**

Add to `tests/cli.test.ts`:

```ts
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runReplLines } from "../src/cli.js";
```

Add tests:

```ts
  it("saves and loads snapshots from the REPL", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-"));
    const path = join(dir, "session.json");

    const saved = await runReplLines(["42 'A' STO 9", `.save ${path}`]);
    expect(saved.exitCode).toBe(0);
    expect(saved.stdout).toContain(`Saved ${path}`);
    expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({
      format: "rpl26-session",
      version: 1,
      stack: [{ kind: "real", value: 9 }],
      variables: { A: { kind: "real", value: 42 } }
    });

    const loaded = await runReplLines([`.load ${path}`, ".stack", ".vars"]);
    expect(loaded.exitCode).toBe(0);
    expect(loaded.stdout).toContain("Loaded");
    expect(loaded.stdout).toContain("1: 9");
    expect(loaded.stdout).toContain("A: 42");
  });

  it("keeps the current session when load fails", async () => {
    const dir = await mkdtemp(join(tmpdir(), "rpl26-"));
    const path = join(dir, "bad-session.json");
    await writeFile(path, JSON.stringify({ format: "rpl26-session", version: 99, stack: [], variables: {} }), "utf8");

    const result = await runReplLines(["5", `.load ${path}`, ".stack"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Load failed at version: expected version 1");
    expect(result.stdout).toContain("1: 5");
  });
```

- [ ] **Step 2: Run tests to verify failure or incomplete behavior**

Run:

```bash
npm test -- tests/cli.test.ts tests/session-snapshot.test.ts
```

Expected: FAIL if Task 4 did not fully wire async save/load; otherwise PASS and continue to Step 4.

- [ ] **Step 3: Verify interactive REPL awaits file I/O**

Confirm `src/cli.ts` has this async line helper:

```ts
async function runReplLine(session: CalculatorSession, state: ReplCommandState, line: string): Promise<string | "exit"> {
  const trimmed = line.trim();
  if (trimmed.length === 0) return "";
  const dotResult = await runDotCommand(session, state, trimmed);
  if (dotResult.kind === "exit") return "exit";
  if (dotResult.kind === "output") return dotResult.output;

  const result = session.execute(trimmed);
  state.lastResult = result;
  state.dirty = true;
  if (!result.ok) return `${result.error.code}: ${result.error.message}`;
  return formatStack(result.stack);
}
```

Update the interactive loop:

```ts
  const state = createReplCommandState();
  for await (const line of repl) {
    const result = await runReplLine(session, state, line);
    if (result === "exit") break;
    if (result.length > 0) console.log(result);
    repl.prompt();
  }
```

- [ ] **Step 4: Run save/load tests**

Run:

```bash
npm test -- tests/cli.test.ts tests/session-snapshot.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit save/load commands**

Run:

```bash
git add src/repl-commands.ts src/cli.ts tests/cli.test.ts docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "feat: add repl snapshot commands"
```

Expected: commit succeeds.

## Task 6: Semantic Styling Layer

**Suggested subagent effort:** `low` because this is bounded presentation logic.

**Files:**
- Create: `src/style.ts`
- Create: `tests/style.test.ts`

- [ ] **Step 1: Write failing style tests**

Create `tests/style.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { styleObjectKind, styleText } from "../src/style.js";

describe("semantic styles", () => {
  it("selects semantic tokens by object kind", () => {
    expect(styleObjectKind("real")).toBe("number");
    expect(styleObjectKind("string")).toBe("string");
    expect(styleObjectKind("program")).toBe("program");
    expect(styleObjectKind("list")).toBe("list");
    expect(styleObjectKind("tagged")).toBe("tagged");
    expect(styleObjectKind("name")).toBe("name");
    expect(styleObjectKind("quotedName")).toBe("name");
  });

  it("can disable ansi color", () => {
    expect(styleText("ok", "success", { color: false })).toBe("ok");
    expect(styleText("ok", "success", { color: true })).toContain("\u001b[");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/style.test.ts
```

Expected: FAIL because `src/style.ts` does not exist.

- [ ] **Step 3: Implement semantic styling**

Create `src/style.ts`:

```ts
import type { RplObject } from "./types.js";

export type StyleToken = "number" | "string" | "program" | "list" | "tagged" | "name" | "success" | "error" | "warning" | "dim" | "focus";

export type StyleOptions = {
  color: boolean;
};

const ANSI: Record<StyleToken, [string, string]> = {
  number: ["\u001b[36m", "\u001b[39m"],
  string: ["\u001b[32m", "\u001b[39m"],
  program: ["\u001b[33m", "\u001b[39m"],
  list: ["\u001b[34m", "\u001b[39m"],
  tagged: ["\u001b[35m", "\u001b[39m"],
  name: ["\u001b[2m", "\u001b[22m"],
  success: ["\u001b[32m", "\u001b[39m"],
  error: ["\u001b[31m", "\u001b[39m"],
  warning: ["\u001b[33m", "\u001b[39m"],
  dim: ["\u001b[2m", "\u001b[22m"],
  focus: ["\u001b[7m", "\u001b[27m"]
};

export function styleObjectKind(kind: RplObject["kind"]): StyleToken {
  switch (kind) {
    case "real":
      return "number";
    case "string":
      return "string";
    case "program":
      return "program";
    case "list":
      return "list";
    case "tagged":
      return "tagged";
    case "name":
    case "quotedName":
      return "name";
  }
}

export function styleText(text: string, token: StyleToken, options: StyleOptions): string {
  if (!options.color) return text;
  const [open, close] = ANSI[token];
  return `${open}${text}${close}`;
}
```

- [ ] **Step 4: Run style tests**

Run:

```bash
npm test -- tests/style.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit styling layer**

Run:

```bash
git add src/style.ts tests/style.test.ts docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "feat: add terminal style tokens"
```

Expected: commit succeeds.

## Task 7: TUI State Model

**Suggested subagent effort:** `high` because keyboard state and session effects are easy to tangle; keep it pure and reviewed.

**Files:**
- Create: `src/tui/state.ts`
- Create: `tests/tui-state.test.ts`

- [ ] **Step 1: Write failing reducer tests**

Create `tests/tui-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createTuiState, reduceTuiState } from "../src/tui/state.js";

describe("TUI state", () => {
  it("navigates tabs without changing calculator state", () => {
    const state = createTuiState();
    const words = reduceTuiState(state, { type: "nextTab" });
    const help = reduceTuiState(words, { type: "nextTab" });

    expect(words.activeTab).toBe("vars");
    expect(help.activeTab).toBe("words");
    expect(help.input).toBe("");
  });

  it("keeps input editing separate from tab selection", () => {
    const state = reduceTuiState(createTuiState(), { type: "insertText", text: "2 3 +" });

    expect(state.input).toBe("2 3 +");
    expect(state.activeTab).toBe("stack");
  });

  it("filters and selects words", () => {
    const state = reduceTuiState(createTuiState(), { type: "setWordFilter", query: "list" });
    const selected = reduceTuiState(state, { type: "selectNextWord" });

    expect(selected.wordFilter).toBe("list");
    expect(selected.visibleWords.map((word) => word.name)).toContain("->LIST");
    expect(selected.selectedWord).toBeDefined();
  });

  it("records execution status", () => {
    const state = reduceTuiState(createTuiState(), { type: "recordOutput", input: "2 3 +", output: "1: 5", ok: true });

    expect(state.history).toEqual([{ input: "2 3 +", output: "1: 5", ok: true }]);
    expect(state.status).toBe("ok");
    expect(state.input).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/tui-state.test.ts
```

Expected: FAIL because `src/tui/state.ts` does not exist.

- [ ] **Step 3: Implement TUI state reducer**

Create `src/tui/state.ts`:

```ts
import { searchWords } from "../word-search.js";
import type { WordMetadata } from "../words.js";

export type TuiTab = "stack" | "vars" | "words" | "help" | "trace" | "session";

export type TuiHistoryEntry = {
  input: string;
  output: string;
  ok: boolean;
};

export type TuiState = {
  activeTab: TuiTab;
  input: string;
  history: TuiHistoryEntry[];
  status: "ready" | "ok" | "error";
  wordFilter: string;
  visibleWords: WordMetadata[];
  selectedWord?: WordMetadata;
  snapshotPath?: string;
  dirty: boolean;
};

export type TuiAction =
  | { type: "nextTab" }
  | { type: "previousTab" }
  | { type: "insertText"; text: string }
  | { type: "backspace" }
  | { type: "setWordFilter"; query: string }
  | { type: "selectNextWord" }
  | { type: "selectPreviousWord" }
  | { type: "recordOutput"; input: string; output: string; ok: boolean }
  | { type: "setSnapshotPath"; path?: string; dirty: boolean };

const TABS: TuiTab[] = ["stack", "vars", "words", "help", "trace", "session"];

export function createTuiState(): TuiState {
  const visibleWords = searchWords("");
  return {
    activeTab: "stack",
    input: "",
    history: [],
    status: "ready",
    wordFilter: "",
    visibleWords,
    selectedWord: visibleWords[0],
    dirty: false
  };
}

function moveTab(activeTab: TuiTab, delta: number): TuiTab {
  const index = TABS.indexOf(activeTab);
  return TABS[(index + delta + TABS.length) % TABS.length];
}

function moveWord(words: WordMetadata[], selected: WordMetadata | undefined, delta: number): WordMetadata | undefined {
  if (words.length === 0) return undefined;
  const index = selected === undefined ? 0 : words.findIndex((word) => word.name === selected.name);
  return words[(Math.max(index, 0) + delta + words.length) % words.length];
}

export function reduceTuiState(state: TuiState, action: TuiAction): TuiState {
  switch (action.type) {
    case "nextTab":
      return { ...state, activeTab: moveTab(state.activeTab, 1) };
    case "previousTab":
      return { ...state, activeTab: moveTab(state.activeTab, -1) };
    case "insertText":
      return { ...state, input: `${state.input}${action.text}` };
    case "backspace":
      return { ...state, input: state.input.slice(0, -1) };
    case "setWordFilter": {
      const visibleWords = searchWords(action.query);
      return { ...state, wordFilter: action.query, visibleWords, selectedWord: visibleWords[0] };
    }
    case "selectNextWord":
      return { ...state, selectedWord: moveWord(state.visibleWords, state.selectedWord, 1) };
    case "selectPreviousWord":
      return { ...state, selectedWord: moveWord(state.visibleWords, state.selectedWord, -1) };
    case "recordOutput":
      return {
        ...state,
        input: "",
        status: action.ok ? "ok" : "error",
        dirty: true,
        history: [...state.history, { input: action.input, output: action.output, ok: action.ok }].slice(-100)
      };
    case "setSnapshotPath":
      return { ...state, snapshotPath: action.path, dirty: action.dirty };
  }
}
```

- [ ] **Step 4: Run reducer tests**

Run:

```bash
npm test -- tests/tui-state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit TUI state**

Run:

```bash
git add src/tui/state.ts tests/tui-state.test.ts docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "feat: add tui state model"
```

Expected: commit succeeds.

## Task 8: TUI Renderer

**Suggested subagent effort:** `medium` because rendering is pure but must stay readable at multiple widths.

**Files:**
- Create: `src/tui/render.ts`
- Create: `tests/tui-render.test.ts`

- [ ] **Step 1: Write failing renderer tests**

Create `tests/tui-render.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { createTuiState } from "../src/tui/state.js";
import { renderTui } from "../src/tui/render.js";

describe("TUI renderer", () => {
  it("renders wide layout with stack inspector on the right", () => {
    const session = new CalculatorSession();
    session.execute("2 3 +");

    const output = renderTui(createTuiState(), session, { width: 90, height: 24, color: false });

    expect(output).toContain("rpl26 tui");
    expect(output).toContain("Stack  Vars  Words  Help  Trace  Session");
    expect(output).toContain("History / Active Pane");
    expect(output).toContain("Stack");
    expect(output).toContain("1: 5");
    expect(output).toContain("rpl26>");
  });

  it("renders narrow layout without the right inspector", () => {
    const output = renderTui(createTuiState(), new CalculatorSession(), { width: 48, height: 16, color: false });

    expect(output).toContain("rpl26 tui");
    expect(output).toContain("Stack  Vars  Words");
    expect(output).not.toContain("History / Active Pane        Stack");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/tui-render.test.ts
```

Expected: FAIL because `src/tui/render.ts` does not exist.

- [ ] **Step 3: Implement pure renderer**

Create `src/tui/render.ts` with helpers that clamp line width rather than relying on terminal wrapping:

```ts
import { formatStack, formatTrace, formatVariables } from "../repl-commands.js";
import { styleText } from "../style.js";
import { describeWordDetail } from "../word-search.js";
import type { CalculatorSession } from "../session.js";
import type { TuiState } from "./state.js";

export type RenderOptions = {
  width: number;
  height: number;
  color: boolean;
};

function clip(text: string, width: number): string {
  if (width <= 0) return "";
  return text.length <= width ? text.padEnd(width, " ") : text.slice(0, Math.max(0, width - 1)) + ">";
}

function lines(text: string): string[] {
  return text.length === 0 ? [] : text.split("\n");
}

function activePane(state: TuiState, session: CalculatorSession): string[] {
  switch (state.activeTab) {
    case "stack":
      return ["Stack", ...lines(formatStack(session.getStack(), true))];
    case "vars":
      return ["Vars", ...lines(formatVariables(session.getVariables(), true))];
    case "words":
      return ["Words", `filter: ${state.wordFilter}`, ...state.visibleWords.slice(0, 12).map((word) => `${word.name} (${word.category}) ${word.stack}`)];
    case "help":
      return ["Help", ...lines(state.selectedWord === undefined ? "No word selected." : describeWordDetail(state.selectedWord.name) ?? "No help.")];
    case "trace":
      return ["Trace", ...lines(formatTrace(session.getTrace(), true))];
    case "session":
      return ["Session", `saved: ${state.snapshotPath ?? "<none>"}`, `dirty: ${state.dirty ? "yes" : "no"}`];
  }
}

export function renderTui(state: TuiState, session: CalculatorSession, options: RenderOptions): string {
  const width = Math.max(32, options.width);
  const height = Math.max(12, options.height);
  const wide = width >= 72;
  const header = clip("rpl26 tui", width);
  const tabs = clip("Stack  Vars  Words  Help  Trace  Session", width);
  const status = clip(`${state.status} | Stack ${session.getStack().length} | Vars ${Object.keys(session.getVariables()).length} | saved: ${state.snapshotPath ?? "<none>"}`, width);
  const prompt = clip(`rpl26> ${state.input}`, width);
  const bodyHeight = height - 5;
  const leftWidth = wide ? Math.floor(width * 0.62) : width;
  const rightWidth = wide ? width - leftWidth - 3 : 0;
  const pane = ["History / Active Pane", ...state.history.slice(-5).flatMap((entry) => [`rpl26> ${entry.input}`, entry.output]), "", ...activePane(state, session)];
  const stack = wide ? ["Stack", ...lines(formatStack(session.getStack())), "", "Vars", ...lines(formatVariables(session.getVariables()))] : [];
  const body = Array.from({ length: bodyHeight }, (_, index) => {
    const left = clip(pane[index] ?? "", leftWidth);
    if (!wide) return left;
    return `${left} | ${clip(stack[index] ?? "", rightWidth)}`;
  });
  const styledStatus = state.status === "error" ? styleText(status, "error", options) : state.status === "ok" ? styleText(status, "success", options) : status;
  return [header, tabs, ...body, styledStatus, prompt].join("\n");
}
```

- [ ] **Step 4: Run renderer tests**

Run:

```bash
npm test -- tests/tui-render.test.ts tests/style.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit renderer**

Run:

```bash
git add src/tui/render.ts tests/tui-render.test.ts docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "feat: render tui panes"
```

Expected: commit succeeds.

## Task 9: TUI Entry Point And Keyboard Loop

**Suggested subagent effort:** `high` because terminal input loops are user-facing and should remain isolated from pure state/render logic.

**Files:**
- Create: `src/tui/app.ts`
- Create: `src/tui.ts`
- Modify: `package.json`
- Create: `tests/tui-entry.test.ts`

- [ ] **Step 1: Write failing TUI entry tests**

Create `tests/tui-entry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { createTuiController } from "../src/tui/app.js";

describe("TUI entry support", () => {
  it("handles a command submission through the controller", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });

    const output = await controller.submit("2 3 +");

    expect(output).toContain("1: 5");
    expect(controller.render()).toContain("1: 5");
  });

  it("handles a dot command submission through the controller", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });

    const output = await controller.submit(".find stack");

    expect(output).toContain("DUP");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/tui-entry.test.ts
```

Expected: FAIL because `src/tui/app.ts` does not exist.

- [ ] **Step 3: Implement TUI controller**

Create `src/tui/app.ts`:

```ts
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { createReplCommandState, formatStack, runDotCommand } from "../repl-commands.js";
import { CalculatorSession } from "../session.js";
import { createTuiState, reduceTuiState, type TuiState } from "./state.js";
import { renderTui } from "./render.js";

export type TuiControllerOptions = {
  session?: CalculatorSession;
  width: number;
  height: number;
  color: boolean;
};

export function createTuiController(options: TuiControllerOptions) {
  const session = options.session ?? new CalculatorSession();
  const commandState = createReplCommandState();
  let state: TuiState = createTuiState();

  return {
    get state() {
      return state;
    },
    render() {
      return renderTui(state, session, options);
    },
    dispatch(action: Parameters<typeof reduceTuiState>[1]) {
      state = reduceTuiState(state, action);
      return state;
    },
    async submit(input: string): Promise<string> {
      const trimmed = input.trim();
      if (trimmed.length === 0) return "";
      const dotResult = await runDotCommand(session, commandState, trimmed);
      if (dotResult.kind === "exit") return "exit";
      if (dotResult.kind === "output") {
        state = reduceTuiState(state, { type: "recordOutput", input: trimmed, output: dotResult.output, ok: true });
        return dotResult.output;
      }
      const result = session.execute(trimmed);
      commandState.lastResult = result;
      commandState.dirty = true;
      const output = result.ok ? formatStack(result.stack) : `${result.error.code}: ${result.error.message}`;
      state = reduceTuiState(state, { type: "recordOutput", input: trimmed, output, ok: result.ok });
      return output;
    }
  };
}

export async function runTui(): Promise<void> {
  const controller = createTuiController({
    width: stdout.columns ?? 100,
    height: stdout.rows ?? 28,
    color: !process.env.NO_COLOR
  });

  emitKeypressEvents(stdin);
  if (stdin.isTTY) stdin.setRawMode(true);

  const draw = () => {
    stdout.write("\u001b[2J\u001b[H");
    stdout.write(controller.render());
  };

  draw();
  stdin.on("keypress", async (text, key) => {
    if (key.ctrl && key.name === "c") {
      if (stdin.isTTY) stdin.setRawMode(false);
      stdout.write("\n");
      process.exit(0);
    }
    if (key.name === "tab") controller.dispatch(key.shift ? { type: "previousTab" } : { type: "nextTab" });
    else if (key.name === "backspace") controller.dispatch({ type: "backspace" });
    else if (key.name === "return") await controller.submit(controller.state.input);
    else if (text !== undefined && text >= " ") controller.dispatch({ type: "insertText", text });
    draw();
  });
}
```

- [ ] **Step 4: Add executable entry point**

Create `src/tui.ts`:

```ts
import { runTui } from "./tui/app.js";

await runTui();
```

Modify `package.json` scripts:

```json
"tui": "node dist/src/tui.js"
```

- [ ] **Step 5: Run entry tests**

Run:

```bash
npm test -- tests/tui-entry.test.ts tests/tui-state.test.ts tests/tui-render.test.ts
```

Expected: PASS.

- [ ] **Step 6: Build and smoke the TUI entry module**

Run:

```bash
npm run build
```

Expected: PASS.

Run:

```bash
node -e "import('./dist/src/tui/app.js').then(({ createTuiController }) => { const c = createTuiController({ width: 80, height: 20, color: false }); return c.submit('2 3 +').then(() => console.log(c.render().includes('1: 5') ? 'tui smoke ok' : 'tui smoke failed')); })"
```

Expected: prints `tui smoke ok`.

- [ ] **Step 7: Commit TUI entry point**

Run:

```bash
git add src/tui/app.ts src/tui.ts package.json tests/tui-entry.test.ts docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "feat: add tui entry point"
```

Expected: commit succeeds.

## Task 10: README Documentation

**Suggested subagent effort:** `low` because this is documentation that should describe implemented behavior exactly.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README commands**

Modify the command list in `README.md` to include:

```markdown
- `npm run tui`: start the keyboard-first terminal UI after building.
```

Update the REPL sentence:

```markdown
The REPL supports `.stack`, `.stack --verbose`, `.vars`, `.vars --verbose`, `.trace`, `.trace --verbose`, `.words`, `.find QUERY`, `.help WORD`, `.status`, `.save PATH`, `.load PATH`, `.clear`, and `.exit`.
```

- [ ] **Step 2: Add session snapshot example**

Add to the examples section:

```markdown
Session snapshots:

```rpl
42 'A' STO
.save examples/session.json
.clear
.load examples/session.json
.status
```
```

- [ ] **Step 3: Add TUI note**

Add:

```markdown
## Terminal UI

Build first, then launch the TUI:

```bash
npm run build
npm run tui
```

The TUI is separate from `npm run repl`. It keeps stack and variable inspection visible, lets you switch panes with the keyboard, searches words, shows help and trace details, and uses the same snapshot commands as the plain REPL.
```

- [ ] **Step 4: Run README checks**

Run:

```bash
rg -n "npm run tui|\\.find QUERY|\\.save PATH|Terminal UI" README.md
```

Expected: all four patterns are found.

- [ ] **Step 5: Commit docs**

Run:

```bash
git add README.md docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "docs: document milestone 6 terminal UI"
```

Expected: commit succeeds.

## Task 11: Final Verification

**Suggested subagent effort:** `medium` if delegated as verification-only work; otherwise run locally in the main thread before claiming completion.

**Files:**
- Modify only if verification reveals a focused issue:
  - `src/**/*.ts`
  - `tests/**/*.ts`
  - `README.md`

- [ ] **Step 1: Run full tests**

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

- [ ] **Step 4: Run plain CLI smoke**

Run:

```bash
npm run calc -- "<< 1 + >> 'INC' STO 41 INC"
```

Expected stdout:

```text
1: 42
```

- [ ] **Step 5: Run REPL helper smoke**

Run:

```bash
node -e "import('./dist/src/cli.js').then(async ({ runReplLines }) => { const result = await runReplLines(['2 3 +', '.find stack', '.status']); console.log(result.exitCode === 0 && result.stdout.includes('1: 5') && result.stdout.includes('DUP') ? 'repl smoke ok' : result.stdout); })"
```

Expected: prints `repl smoke ok`.

- [ ] **Step 6: Run TUI controller smoke**

Run:

```bash
node -e "import('./dist/src/tui/app.js').then(async ({ createTuiController }) => { const c = createTuiController({ width: 90, height: 24, color: false }); await c.submit('2 3 +'); console.log(c.render().includes('1: 5') ? 'tui smoke ok' : 'tui smoke failed'); })"
```

Expected: prints `tui smoke ok`.

- [ ] **Step 7: Review changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: only intended Milestone 6 files are changed.

- [ ] **Step 8: Commit any verification fixes**

If Step 1-7 required fixes, run:

```bash
git add src tests README.md docs/superpowers/plans/2026-05-04-rpl26-milestone-6.md
git commit -m "fix: stabilize milestone 6 verification"
```

Expected: commit succeeds if there were fixes; skip this step if no files changed.

## Success Criteria

- [ ] `npm run repl` still works as a plain line-oriented REPL.
- [ ] `npm run tui` launches a separate TUI after `npm run build`.
- [ ] TUI renders Stack, Vars, Words, Help, Trace, and Session panes.
- [ ] Wide layout keeps stack/vars visible on the right.
- [ ] Narrow layout remains readable without relying on terminal wrapping.
- [ ] Keyboard navigation changes tabs without changing calculator state.
- [ ] `.find QUERY` searches name, category, stack effect, description, keyword, and alias metadata.
- [ ] `.status` reports stack depth, variable count, last result/error, and snapshot path.
- [ ] `.trace` remains compact and `.trace --verbose` includes before/after stack summaries and errors.
- [ ] `.stack --verbose` and `.vars --verbose` include object kinds.
- [ ] `.save PATH` writes versioned snapshot JSON.
- [ ] `.load PATH` validates before replacing state.
- [ ] Failed snapshot loads leave the current session unchanged.
- [ ] Semantic styling supports ANSI and no-color output.
- [ ] README documents TUI and improved REPL commands.
- [ ] `npm test`, `npm run typecheck`, `npm run build`, CLI smoke, REPL smoke, and TUI smoke all pass.
