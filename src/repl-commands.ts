import { formatObject } from "./format.js";
import { CalculatorSession } from "./session.js";
import { loadSessionSnapshot, readSnapshotFile, writeSnapshotFile } from "./snapshot.js";
import { describeWordDetail, searchWords } from "./word-search.js";
import { listWords } from "./words.js";
import type { ExecuteResult, RplObject, StackEntry, TraceEntry } from "./types.js";

export const DOT_COMMANDS = [".stack", ".vars", ".trace", ".words", ".find", ".help", ".status", ".clear", ".save", ".load", ".exit", ".quit"];

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
  if (command === ".find") {
    const output =
      searchWords(args.join(" "))
        .map((word) => `${word.name} (${word.category}) ${word.stack}`)
        .join("\n") || "No matches.";
    return { kind: "output", output };
  }
  if (command === ".help" && args.length === 0) {
    return { kind: "output", output: "Use .help WORD for stack effect, description, source note, and examples." };
  }
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
    return await saveSnapshot(session, state, path);
  }
  if (command === ".load") {
    const path = args.join(" ");
    if (path.length === 0) return { kind: "output", output: "Usage: .load PATH" };
    return await loadSnapshot(session, state, path);
  }
  return { kind: "unknown" };
}

async function saveSnapshot(session: CalculatorSession, state: ReplCommandState, path: string): Promise<ReplCommandResult> {
  const saved = loadSessionSnapshot(session.toSnapshot());
  if (!saved.ok) return { kind: "output", output: `Save failed at ${saved.error.path}: ${saved.error.message}` };
  try {
    await writeSnapshotFile(path, saved.snapshot);
  } catch (error) {
    return { kind: "output", output: `Save failed: ${error instanceof Error ? error.message : String(error)}` };
  }
  state.snapshotPath = path;
  state.dirty = false;
  return { kind: "output", output: `Saved ${path}` };
}

async function loadSnapshot(session: CalculatorSession, state: ReplCommandState, path: string): Promise<ReplCommandResult> {
  let loaded: Awaited<ReturnType<typeof readSnapshotFile>>;
  try {
    loaded = await readSnapshotFile(path);
  } catch (error) {
    return { kind: "output", output: `Load failed: ${error instanceof Error ? error.message : String(error)}` };
  }
  if (!loaded.ok) return { kind: "output", output: `Load failed at ${loaded.error.path}: ${loaded.error.message}` };
  session.loadSnapshot(loaded.snapshot);
  state.snapshotPath = path;
  state.dirty = false;
  state.lastResult = undefined;
  return { kind: "output", output: `Loaded ${path}` };
}
