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
  | { type: "selectNextWord" }
  | { type: "selectPreviousWord" }
  | { type: "recordOutput"; input: string; output: string; ok: boolean }
  | { type: "setSnapshotPath"; path?: string; dirty: boolean };

const TABS: TuiTab[] = ["history", "vars", "words", "help", "trace", "session"];

export function createTuiState(): TuiState {
  const visibleWords = searchWords("");
  return {
    activeTab: "history",
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
