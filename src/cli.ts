import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { BUILTIN_NAMES } from "./core.js";
import { createReplCommandState, DOT_COMMANDS, formatStack, runDotCommand } from "./repl-commands.js";
import { CalculatorSession } from "./session.js";
import type { ReplCommandState } from "./repl-commands.js";

export { formatObject } from "./format.js";
export { formatStack } from "./repl-commands.js";

export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  session?: CalculatorSession;
};

type CliMode = "calc" | "repl";
type CompletionResult = [string[], string];

const usage = 'Usage: rpl26 "2 3 +"';

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
  const state = createReplCommandState();
  const repl = createInterface({
    input,
    output,
    prompt: "rpl26> ",
    completer: (line) => completeReplInput(line, session)
  });

  console.log("rpl26 REPL. Commands: .stack .vars .trace .words .find .help .status .clear .save .load .exit");
  repl.prompt();

  for await (const line of repl) {
    const result = await runReplLine(session, state, line);
    if (result === "exit") break;
    if (result.length > 0) console.log(result);
    repl.prompt();
  }

  repl.close();
}

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
