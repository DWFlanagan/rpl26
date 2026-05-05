import { formatStack, formatTrace, formatVariables } from "../repl-commands.js";
import { styleText } from "../style.js";
import { describeWordDetail } from "../word-search.js";
import type { CalculatorSession } from "../session.js";
import type { TuiState, TuiTab } from "./state.js";

export type RenderOptions = {
  width: number;
  height: number;
  color: boolean;
};

function clip(text: string, width: number): string {
  if (width <= 0) return "";
  return text.length <= width ? text.padEnd(width, " ") : `${text.slice(0, Math.max(0, width - 1))}>`;
}

function lines(text: string): string[] {
  return text.length === 0 ? [] : text.split("\n");
}

const TABS: Array<{ tab: TuiTab; label: string }> = [
  { tab: "history", label: "History" },
  { tab: "vars", label: "Vars" },
  { tab: "words", label: "Words" },
  { tab: "help", label: "Help" },
  { tab: "trace", label: "Trace" },
  { tab: "session", label: "Session" }
];

function renderTabs(activeTab: TuiTab, width: number, options: RenderOptions): string {
  const labels = TABS.map((tab) => tab.label);
  const plain = clip(labels.join("  "), width);
  if (!options.color) return plain;
  const active = TABS.find((tab) => tab.tab === activeTab)?.label;
  if (active === undefined) return plain;
  const start = plain.indexOf(active);
  if (start < 0 || start + active.length > width) return plain;
  return `${plain.slice(0, start)}${styleText(active, "focus", options)}${plain.slice(start + active.length)}`;
}

function historyLines(state: TuiState, compactStackResults: boolean): string[] {
  return state.history.slice(-5).flatMap((entry) => {
    if (compactStackResults && entry.ok && !entry.input.startsWith(".")) return [`> ${entry.input}`];
    return [`> ${entry.input}`, ...lines(entry.output)];
  });
}

function activePane(state: TuiState, session: CalculatorSession, compactHistory: boolean): string[] {
  switch (state.activeTab) {
    case "history":
      return historyLines(state, compactHistory);
    case "vars":
      return lines(formatVariables(session.getVariables(), true));
    case "words":
      return [`filter: ${state.wordFilter}`, ...state.visibleWords.slice(0, 12).map((word) => `${word.name} (${word.category}) ${word.stack}`)];
    case "help":
      return lines(state.selectedWord === undefined ? "No word selected." : describeWordDetail(state.selectedWord.name) ?? "No help.");
    case "trace":
      return lines(formatTrace(session.getTrace(), true));
    case "session":
      return [`saved: ${state.snapshotPath ?? "<none>"}`, `dirty: ${state.dirty ? "yes" : "no"}`];
  }
}

export function renderTui(state: TuiState, session: CalculatorSession, options: RenderOptions): string {
  const width = Math.max(32, options.width);
  const height = Math.max(12, options.height);
  const wide = width >= 72;
  const header = clip("rpl26 tui", width);
  const tabs = renderTabs(state.activeTab, width, options);
  const status = clip(`${state.status} | Stack ${session.getStack().length} | Vars ${Object.keys(session.getVariables()).length} | saved: ${state.snapshotPath ?? "<none>"}`, width);
  const prompt = clip(`rpl26> ${state.input}`, width);
  const bodyHeight = height - 5;
  const leftWidth = wide ? Math.floor(width * 0.62) : width;
  const rightWidth = wide ? width - leftWidth - 3 : 0;
  const pane = activePane(state, session, wide);
  const stack = wide ? ["Stack", ...lines(formatStack(session.getStack())), "", "Vars", ...lines(formatVariables(session.getVariables()))] : [];
  const body = Array.from({ length: bodyHeight }, (_, index) => {
    const left = clip(pane[index] ?? "", leftWidth);
    if (!wide) return left;
    return `${left} | ${clip(stack[index] ?? "", rightWidth)}`;
  });
  const styledStatus = state.status === "error" ? styleText(status, "error", options) : state.status === "ok" ? styleText(status, "success", options) : status;
  return [header, tabs, ...body, styledStatus, prompt].join("\n");
}
