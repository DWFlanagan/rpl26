import { CalculatorSession } from "./session.js";

export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export function runCli(args: string[]): CliResult {
  const input = args.join(" ").trim();

  if (input.length === 0) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: 'Usage: rpn50 "2 3 +"'
    };
  }

  const session = new CalculatorSession();
  const result = session.execute(input);

  return {
    exitCode: result.ok ? 0 : 1,
    stdout: JSON.stringify(result, null, 2),
    stderr: ""
  };
}

export function main(args = process.argv.slice(2)): void {
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
  main();
}
