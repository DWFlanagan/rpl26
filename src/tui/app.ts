import { stdin, stdout } from "node:process";
import { emitKeypressEvents } from "node:readline";
import { createReplCommandState, formatStack, runDotCommand } from "../repl-commands.js";
import { CalculatorSession } from "../session.js";
import { renderTui } from "./render.js";
import { createTuiState, reduceTuiState, type TuiAction, type TuiState } from "./state.js";

export type TuiControllerOptions = {
  session?: CalculatorSession;
  width: number;
  height: number;
  color: boolean;
};

export type TuiKey = {
  name?: string;
  ctrl?: boolean;
  shift?: boolean;
};

export type TuiKeypressResult = "continue" | "exit";

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
    dispatch(action: TuiAction) {
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

export async function handleTuiKeypress(
  controller: ReturnType<typeof createTuiController>,
  text: string | undefined,
  key: TuiKey
): Promise<TuiKeypressResult> {
  if (key.name === "tab") controller.dispatch(key.shift ? { type: "previousTab" } : { type: "nextTab" });
  else if (key.name === "backspace") controller.dispatch({ type: "backspace" });
  else if (key.name === "return") {
    const result = await controller.submit(controller.state.input);
    if (result === "exit") return "exit";
  } else if (text !== undefined && text >= " ") controller.dispatch({ type: "insertText", text });
  return "continue";
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
    const result = await handleTuiKeypress(controller, text, key);
    if (result === "exit") {
      if (stdin.isTTY) stdin.setRawMode(false);
      stdout.write("\n");
      process.exit(0);
    }
    draw();
  });
}
