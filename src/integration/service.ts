import { cloneObject } from "../core.js";
import { exportAnnotatedSource, objectHash, parseAnnotatedProgramSource, type ExportMode } from "../annotated-source.js";
import { CalculatorSession } from "../session.js";
import type { ExecuteResult, RplObject, StackEntry, TraceEntry } from "../types.js";
import { readProjectFile, writeProjectFile } from "./project.js";
import type {
  AnnotatedSourceRecord,
  IntegrationError,
  IntegrationErrorCode,
  IntegrationResult,
  ProgramExample,
  ProjectSnapshot
} from "./types.js";

type SessionArg = { session?: string };

type IntegrationSession = {
  name: string;
  calculator: CalculatorSession;
  sources: Record<string, AnnotatedSourceRecord>;
};

type ExampleResult = {
  description?: string;
  input: string;
  ok: boolean;
  actualStack: StackEntry[];
  message?: string;
};

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

function validName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

function makeError(code: IntegrationErrorCode, message: string, path?: string): IntegrationError {
  return path === undefined ? { code, message } : { code, message, path };
}

function failure<T>(code: IntegrationErrorCode, message: string, path?: string): IntegrationResult<T> {
  return { ok: false, error: makeError(code, message, path) };
}

function unknownErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function cloneExample(example: ProgramExample): ProgramExample {
  const cloned: ProgramExample = {
    input: example.input,
    expectedStack: example.expectedStack.map(cloneObject)
  };
  if (example.description !== undefined) cloned.description = example.description;
  return cloned;
}

function cloneSourceRecord(record: AnnotatedSourceRecord): AnnotatedSourceRecord {
  const cloned: AnnotatedSourceRecord = {
    name: record.name,
    source: record.source,
    installedHash: record.installedHash,
    updatedAt: record.updatedAt,
    examples: record.examples.map(cloneExample)
  };
  if (record.notes !== undefined) cloned.notes = record.notes;
  return cloned;
}

function cloneSources(sources: Record<string, AnnotatedSourceRecord>): Record<string, AnnotatedSourceRecord> {
  return Object.fromEntries(Object.entries(sources).map(([name, record]) => [name, cloneSourceRecord(record)]));
}

function stackValues(stack: StackEntry[]): RplObject[] {
  return stack.map((entry) => entry.value);
}

function sameObjects(left: RplObject[], right: RplObject[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => objectHash(value) === objectHash(right[index]));
}

function nowIso(): string {
  return new Date().toISOString();
}

export class IntegrationService {
  private selected = "default";
  private readonly sessions = new Map<string, IntegrationSession>([
    ["default", { name: "default", calculator: new CalculatorSession(), sources: {} }]
  ]);

  listSessions(): IntegrationResult<Array<{ name: string; selected: boolean }>> {
    return {
      ok: true,
      value: [...this.sessions.values()].map((session) => ({
        name: session.name,
        selected: session.name === this.selected
      }))
    };
  }

  createSession({ name }: { name: string }): IntegrationResult<{ name: string; selected: boolean }> {
    const valid = this.validateSessionName(name);
    if (!valid.ok) return valid;
    if (this.sessions.has(name)) return failure("DuplicateSession", `session already exists: ${name}`);

    this.sessions.set(name, { name, calculator: new CalculatorSession(), sources: {} });
    return { ok: true, value: { name, selected: false } };
  }

  selectSession({ name }: { name: string }): IntegrationResult<{ name: string; selected: boolean }> {
    const valid = this.validateSessionName(name);
    if (!valid.ok) return valid;
    if (!this.sessions.has(name)) return failure("UnknownSession", `unknown session: ${name}`);

    this.selected = name;
    return { ok: true, value: { name, selected: true } };
  }

  deleteSession({ name }: { name: string }): IntegrationResult<{ deleted: string; selected: string }> {
    const valid = this.validateSessionName(name);
    if (!valid.ok) return valid;
    if (name === "default") return failure("InvalidRequest", "default session cannot be deleted");
    if (!this.sessions.delete(name)) return failure("UnknownSession", `unknown session: ${name}`);

    if (this.selected === name) this.selected = "default";
    return { ok: true, value: { deleted: name, selected: this.selected } };
  }

  execute({ session, input }: SessionArg & { input: string }): IntegrationResult<ExecuteResult> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return { ok: true, value: resolved.value.calculator.execute(input) };
  }

  getStack({ session }: SessionArg = {}): IntegrationResult<{ stack: StackEntry[] }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return { ok: true, value: { stack: resolved.value.calculator.getStack() } };
  }

  getVariables({ session }: SessionArg = {}): IntegrationResult<{ variables: Record<string, RplObject> }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return { ok: true, value: { variables: resolved.value.calculator.getVariables() } };
  }

  getTrace({ session }: SessionArg = {}): IntegrationResult<{ trace: TraceEntry[] }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return { ok: true, value: { trace: resolved.value.calculator.getTrace() } };
  }

  clear({ session }: SessionArg = {}): IntegrationResult<{ ok: true }> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    resolved.value.calculator.clear();
    resolved.value.sources = {};
    return { ok: true, value: { ok: true } };
  }

  storeProgram({
    session,
    name,
    source,
    examples = [],
    notes
  }: SessionArg & { name: string; source: string; examples?: ProgramExample[]; notes?: string }): IntegrationResult<AnnotatedSourceRecord> {
    const validProgramName = this.validateProgramName(name);
    if (!validProgramName.ok) return validProgramName;
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;

    const parsed = parseAnnotatedProgramSource(source);
    if (!parsed.ok) return failure("InvalidAnnotatedSource", parsed.error.message);

    const stored = resolved.value.calculator.execute(`${parsed.executableSource} '${name}' STO`);
    if (!stored.ok) return failure("InvalidAnnotatedSource", stored.error.message);

    const record: AnnotatedSourceRecord = {
      name,
      source,
      installedHash: objectHash(parsed.object),
      updatedAt: nowIso(),
      examples: examples.map(cloneExample)
    };
    if (notes !== undefined) record.notes = notes;

    resolved.value.sources[name] = cloneSourceRecord(record);
    return { ok: true, value: record };
  }

  getProgramSource({
    session,
    name
  }: SessionArg & { name: string }): IntegrationResult<{ name: string; source: string; stale: boolean; record: AnnotatedSourceRecord }> {
    const validProgramName = this.validateProgramName(name);
    if (!validProgramName.ok) return validProgramName;
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;

    const record = resolved.value.sources[name];
    if (record === undefined) return failure("SourceUnavailable", `no annotated source for ${name}`);

    return {
      ok: true,
      value: {
        name,
        source: record.source,
        stale: this.isStale(resolved.value, name, record),
        record: cloneSourceRecord(record)
      }
    };
  }

  listPrograms({ session }: SessionArg = {}): IntegrationResult<Array<{ name: string; annotated: boolean; stale: boolean }>> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;

    const variables = resolved.value.calculator.getVariables();
    return {
      ok: true,
      value: Object.entries(variables)
        .filter(([, variable]) => variable.kind === "program")
        .map(([name]) => {
          const record = resolved.value.sources[name];
          return {
            name,
            annotated: record !== undefined,
            stale: record === undefined ? false : this.isStale(resolved.value, name, record)
          };
        })
    };
  }

  runProgramExamples({
    session,
    name,
    examples
  }: SessionArg & {
    name: string;
    examples?: ProgramExample[];
  }): IntegrationResult<{ ok: boolean; results: ExampleResult[] }> {
    const validProgramName = this.validateProgramName(name);
    if (!validProgramName.ok) return validProgramName;
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;

    const record = resolved.value.sources[name];
    const examplesToRun = examples ?? record?.examples;
    if (examplesToRun === undefined) return failure("SourceUnavailable", `no examples for ${name}`);

    const results = examplesToRun.map((example) => this.runExample(resolved.value, example));
    return { ok: true, value: { ok: results.every((result) => result.ok), results } };
  }

  exportProgram({ session, name, mode }: SessionArg & { name: string; mode: ExportMode }): IntegrationResult<{ source: string; warnings: string[] }> {
    const current = this.getProgramSource({ session, name });
    if (!current.ok) return current;
    const exported = exportAnnotatedSource(current.value.source, mode);
    return {
      ok: true,
      value: {
        source: exported.source,
        warnings: current.value.stale
          ? [...exported.warnings, "annotated source is stale relative to the current variable value"]
          : exported.warnings
      }
    };
  }

  inspectProgram({
    session,
    name
  }: SessionArg & { name: string }): IntegrationResult<{
    name: string;
    variable?: RplObject;
    source?: string;
    stale?: boolean;
    examples?: ProgramExample[];
  }> {
    const validProgramName = this.validateProgramName(name);
    if (!validProgramName.ok) return validProgramName;
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;

    const variable = resolved.value.calculator.getVariables()[name];
    const record = resolved.value.sources[name];
    const value: {
      name: string;
      variable?: RplObject;
      source?: string;
      stale?: boolean;
      examples?: ProgramExample[];
    } = { name };
    if (variable !== undefined) value.variable = cloneObject(variable);
    if (record !== undefined) {
      value.source = record.source;
      value.stale = this.isStale(resolved.value, name, record);
      value.examples = record.examples.map(cloneExample);
    }
    return { ok: true, value };
  }

  toProject({ session }: SessionArg = {}): IntegrationResult<ProjectSnapshot> {
    const resolved = this.resolve(session);
    if (!resolved.ok) return resolved;
    return {
      ok: true,
      value: {
        format: "rpl26-project",
        version: 1,
        snapshot: resolved.value.calculator.toSnapshot(),
        sources: cloneSources(resolved.value.sources)
      }
    };
  }

  async saveSession({ session, path }: SessionArg & { path: string }): Promise<IntegrationResult<{ path: string }>> {
    const project = this.toProject({ session });
    if (!project.ok) return project;

    try {
      const written = await writeProjectFile(path, project.value);
      if (!written.ok) return failure("InvalidProject", written.error.message, written.error.path);
      return { ok: true, value: { path } };
    } catch (error) {
      return failure("InvalidProject", unknownErrorMessage(error));
    }
  }

  async loadSession({
    name,
    path,
    select = true
  }: {
    name: string;
    path: string;
    select?: boolean;
  }): Promise<IntegrationResult<{ name: string; selected: boolean }>> {
    const validSessionName = this.validateSessionName(name);
    if (!validSessionName.ok) return validSessionName;

    try {
      const loaded = await readProjectFile(path);
      if (!loaded.ok) return failure("InvalidProject", loaded.error.message, loaded.error.path);

      const calculator = new CalculatorSession();
      const snapshotLoaded = calculator.loadSnapshot(loaded.project.snapshot);
      if (!snapshotLoaded.ok) return failure("InvalidProject", snapshotLoaded.error.message, snapshotLoaded.error.path);

      this.sessions.set(name, { name, calculator, sources: cloneSources(loaded.project.sources) });
      if (select) this.selected = name;
      return { ok: true, value: { name, selected: this.selected === name } };
    } catch (error) {
      return failure("InvalidProject", unknownErrorMessage(error));
    }
  }

  private runExample(session: IntegrationSession, example: ProgramExample): ExampleResult {
    const snapshot = session.calculator.toSnapshot();
    const isolated = new CalculatorSession();
    const loaded = isolated.loadSnapshot({ ...snapshot, stack: [] });
    if (!loaded.ok) {
      return this.exampleResult(example, false, [], loaded.error.message);
    }

    const result = isolated.execute(example.input);
    if (!result.ok) {
      return this.exampleResult(example, false, result.stack, `${result.error.code}: ${result.error.message}`);
    }

    const matches = sameObjects(stackValues(result.stack), example.expectedStack);
    return this.exampleResult(example, matches, result.stack, matches ? undefined : "expected stack did not match");
  }

  private exampleResult(example: ProgramExample, ok: boolean, actualStack: StackEntry[], message?: string): ExampleResult {
    const result: ExampleResult = { input: example.input, ok, actualStack };
    if (example.description !== undefined) result.description = example.description;
    if (message !== undefined) result.message = message;
    return result;
  }

  private resolve(name: string | undefined): IntegrationResult<IntegrationSession> {
    const sessionName = name ?? this.selected;
    const valid = this.validateSessionName(sessionName);
    if (!valid.ok) return valid;

    const session = this.sessions.get(sessionName);
    if (session === undefined) return failure("UnknownSession", `unknown session: ${sessionName}`);
    return { ok: true, value: session };
  }

  private validateSessionName(name: string): IntegrationResult<{ name: string }> {
    if (validName(name)) return { ok: true, value: { name } };
    return failure("InvalidName", "session names must start with a letter and contain only letters, digits, and underscores");
  }

  private validateProgramName(name: string): IntegrationResult<{ name: string }> {
    if (validName(name)) return { ok: true, value: { name } };
    return failure("InvalidName", "program names must start with a letter and contain only letters, digits, and underscores");
  }

  private isStale(session: IntegrationSession, name: string, record: AnnotatedSourceRecord): boolean {
    const variable = session.calculator.getVariables()[name];
    if (variable === undefined) return true;
    return objectHash(variable) !== record.installedHash;
  }
}
