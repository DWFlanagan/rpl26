import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { BUILTIN_NAMES } from "./core.js";
import { formatObject } from "./format.js";
import { CalculatorSession } from "./session.js";
import { describeWord, listWords } from "./words.js";
import type { ExecuteResult, RplObject, StackEntry } from "./types.js";

export { formatObject } from "./format.js";

export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  session?: CalculatorSession;
};

type CliMode = "calc" | "repl";
type CompletionResult = [string[], string];

const usage = 'Usage: rpl26 "2 3 +"';
const DOT_COMMANDS = [".stack", ".vars", ".trace", ".words", ".help", ".clear", ".exit", ".quit"];

export function formatStack(stack: StackEntry[]): string {
  if (stack.length === 0) return "Stack: <empty>";
  return stack.map((entry) => `${entry.level}: ${formatObject(entry.value)}`).join("\n");
}

function formatVariables(variables: Record<string, RplObject>): string {
  const entries = Object.entries(variables);
  if (entries.length === 0) return "Variables: <empty>";
  return entries.map(([name, value]) => `${name}: ${formatObject(value)}`).join("\n");
}

function formatTrace(result: ExecuteResult): string {
  if (result.trace.length === 0) return "Trace: <empty>";
  return result.trace.map((entry) => `${entry.ok ? "ok" : "error"} ${entry.source}`).join("\n");
}

function currentWord(line: string): string {
  return line.match(/\S+$/)?.[0] ?? "";
}

export function completeReplInput(line: string, session: CalculatorSession): CompletionResult {
  const word = currentWord(line);
  const variableNames = Object.keys(session.getVariables());
  const candidates = word.startsWith(".") ? DOT_COMMANDS : [...variableNames, ...BUILTIN_NAMES];
  const matches = [...new Set(candidates)].filter((candidate) => candidate.startsWith(word)).sort();
  return [matches.length > 0 ? matches : candidates, word];
}

export function runCli(args: string[]): CliResult {
  const json = args[0] === "--json";
  const inputArgs = json ? args.slice(1) : args;
  const input = inputArgs.join(" ").trim();

  if (input.length === 0) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: usage
    };
  }

  const session = new CalculatorSession();
  const result = session.execute(input);

  return {
    exitCode: result.ok ? 0 : 1,
    stdout: json ? JSON.stringify(result, null, 2) : formatStack(result.stack),
    stderr: ""
  };
}

export function runReplLines(lines: string[]): CliResult {
  const session = new CalculatorSession();
  const outputLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const dotResult = runDotCommand(session, trimmed);
    if (dotResult === "exit") break;
    if (dotResult !== undefined) {
      outputLines.push(dotResult);
      continue;
    }

    const result = session.execute(trimmed);
    if (!result.ok) {
      return {
        exitCode: 1,
        stdout: outputLines.join("\n"),
        stderr: `${result.error.code}: ${result.error.message}`
      };
    }
    outputLines.push(formatStack(result.stack));
  }

  return {
    exitCode: 0,
    stdout: outputLines.join("\n"),
    stderr: "",
    session
  };
}

export async function runInteractiveRepl(): Promise<void> {
  const session = new CalculatorSession();
  const repl = createInterface({
    input,
    output,
    prompt: "rpl26> ",
    completer: (line) => completeReplInput(line, session)
  });

  console.log("rpl26 REPL. Commands: .stack .vars .trace .words .help .clear .exit");
  repl.prompt();

  for await (const line of repl) {
    const result = runReplLine(session, line);
    if (result === "exit") break;
    if (result.length > 0) console.log(result);
    repl.prompt();
  }

  repl.close();
}

function runReplLine(session: CalculatorSession, line: string): string | "exit" {
  const trimmed = line.trim();
  if (trimmed.length === 0) return "";
  const dotResult = runDotCommand(session, trimmed);
  if (dotResult !== undefined) return dotResult;

  const result = session.execute(trimmed);
  if (!result.ok) return `${result.error.code}: ${result.error.message}`;
  return formatStack(result.stack);
}

function runDotCommand(session: CalculatorSession, trimmed: string): string | "exit" | undefined {
  if (trimmed === ".exit" || trimmed === ".quit") return "exit";
  if (trimmed === ".stack") return formatStack(session.getStack());
  if (trimmed === ".vars") return formatVariables(session.getVariables());
  if (trimmed === ".trace") return formatTrace({ ok: true, stack: session.getStack(), variables: session.getVariables(), trace: session.getTrace() });
  if (trimmed === ".words") return listWords().join(" ");
  if (trimmed === ".help") return "Use .help WORD for stack effect, description, and source note.";
  if (trimmed.startsWith(".help ")) {
    const word = trimmed.slice(".help ".length).trim();
    return describeWord(word) ?? `No help for ${word}`;
  }
  if (trimmed === ".clear") {
    session.clear();
    return "Cleared.";
  }
  return undefined;
}

export function main(args = process.argv.slice(2), mode: CliMode = "calc"): void {
  if (mode === "repl") {
    void runInteractiveRepl();
    return;
  }

  const result = runCli(args);
  if (result.stdout.length > 0) {
    console.log(result.stdout);
  }
  if (result.stderr.length > 0) {
    console.error(result.stderr);
  }
  process.exitCode = result.exitCode;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2), process.argv[1]?.endsWith("repl.js") ? "repl" : "calc");
}
