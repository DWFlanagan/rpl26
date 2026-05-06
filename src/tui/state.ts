import { searchWords } from "../word-search.js";
import type { WordMetadata } from "../words.js";

export type TuiTab = "history" | "vars" | "words" | "help" | "trace" | "session";

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
  | { type: "appendWordFilter"; text: string }
  | { type: "backspaceWordFilter" }
  | { type: "escapeWords" }
  | { type: "showSelectedWordHelp" }
  | { type: "selectNextWord" }
  | { type: "selectPreviousWord" }
  | { type: "recordOutput"; input: string; output: string; ok: boolean }
  | { type: "setSnapshotPath"; path?: string; dirty: boolean };

const TABS: TuiTab[] = ["history", "vars", "words", "help", "trace", "session"];

function wordFilterState(query: string): Pick<TuiState, "wordFilter" | "visibleWords" | "selectedWord"> {
  const visibleWords = searchWords(query);
  return { wordFilter: query, visibleWords, selectedWord: visibleWords[0] };
}

export function createTuiState(): TuiState {
  return {
    activeTab: "history",
    input: "",
    history: [],
    status: "ready",
    ...wordFilterState(""),
    dirty: false
  };
}

function moveTab(activeTab: TuiTab, delta: number): TuiTab {
  const index = TABS.indexOf(activeTab);
  return TABS[(index + delta + TABS.length) % TABS.length];
}

function moveWord(words: WordMetadata[], selected: WordMetadata | undefined, delta: number): WordMetadata | undefined {
  if (words.length === 0) return undefined;
  if (selected === undefined) return words[0];
  const index = words.findIndex((word) => word.name === selected.name);
  if (index < 0) return words[0];
  const nextIndex = Math.min(Math.max(index + delta, 0), words.length - 1);
  return words[nextIndex];
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
    case "setWordFilter":
      return { ...state, ...wordFilterState(action.query) };
    case "appendWordFilter":
      return { ...state, ...wordFilterState(`${state.wordFilter}${action.text}`) };
    case "backspaceWordFilter":
      return { ...state, ...wordFilterState(state.wordFilter.slice(0, -1)) };
    case "escapeWords":
      if (state.wordFilter.length > 0) return { ...state, ...wordFilterState("") };
      return { ...state, activeTab: "history" };
    case "showSelectedWordHelp":
      return { ...state, activeTab: "help" };
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
