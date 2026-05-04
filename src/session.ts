import { cloneObject, cloneState, evaluateObject } from "./core.js";
import { parseInput } from "./parser.js";
import { loadSessionSnapshot } from "./snapshot.js";
import type { CalculatorState, ExecuteResult, RplObject, SessionSnapshot, SnapshotLoadResult, StackEntry, TraceEntry } from "./types.js";

const sourceOf = (object: RplObject): string => object.source ?? object.kind;

export class CalculatorSession {
  private state: CalculatorState = { stack: [], variables: {} };
  private trace: TraceEntry[] = [];

  execute(input: string): ExecuteResult {
    const parsed = parseInput(input);
    this.trace = [];

    if (!parsed.ok) {
      return { ok: false, error: parsed.error, stack: this.getStack(), variables: this.getVariables(), trace: this.getTrace() };
    }

    for (const object of parsed.objects) {
      const before = this.state.stack.map(cloneObject);
      const result = evaluateObject(this.state, object, (entry) => {
        this.trace.push(entry);
      });
      this.state = result.state;
      const after = this.state.stack.map(cloneObject);

      if (!result.ok) {
        this.trace.push({ source: sourceOf(object), ok: false, before, after, error: result.error });
        return { ok: false, error: result.error, stack: this.getStack(), variables: this.getVariables(), trace: this.getTrace() };
      }

      this.trace.push({ source: sourceOf(object), ok: true, before, after });
    }

    return { ok: true, stack: this.getStack(), variables: this.getVariables(), trace: this.getTrace() };
  }

  getStack(): StackEntry[] {
    return this.state.stack.map((value, index, values) => ({
      level: values.length - index,
      value: cloneObject(value)
    }));
  }

  getVariables(): Record<string, RplObject> {
    return cloneState(this.state).variables;
  }

  getTrace(): TraceEntry[] {
    return this.trace.map((entry) => ({
      ...entry,
      before: entry.before.map(cloneObject),
      after: entry.after.map(cloneObject)
    }));
  }

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

  clear(): void {
    this.state = { stack: [], variables: {} };
    this.trace = [];
  }
}
