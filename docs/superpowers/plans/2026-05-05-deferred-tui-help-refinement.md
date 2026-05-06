# Deferred TUI Help Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TUI Words tab a focused keyboard browser that filters words directly and opens full Help for the selected word.

**Architecture:** Keep the calculator engine unchanged. Implement the behavior in the pure TUI reducer, route terminal keypresses by active tab in the controller, and update the renderer so Words communicates filter and selection state in plain text.

**Tech Stack:** TypeScript, Node readline keypress events, Vitest, existing dependency-free TUI renderer.

---

## Source Boundary

This is local `rpl26` interface behavior, not HP command behavior. No HP manual audit is required for this plan. Continue to reference `docs/superpowers/specs/2026-05-04-milestone-6-interface-notes.md` and `docs/superpowers/specs/2026-05-05-deferred-tui-help-refinement-design.md` for scope.

## File Structure

- `src/tui/state.ts`: pure reducer and TUI state transitions for tab movement, command input, word filtering, selected-word movement, Help activation, and Esc behavior.
- `src/tui/app.ts`: terminal keypress adapter that routes keys to reducer actions or command submission.
- `src/tui/render.ts`: pure terminal renderer for Words and Help panes.
- `tests/tui-state.test.ts`: reducer behavior tests.
- `tests/tui-entry.test.ts`: controller/key routing tests.
- `tests/tui-render.test.ts`: rendering tests.
- `docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md`: this plan; update checkboxes as tasks complete.

## Task 1: Reducer Semantics

**Suggested subagent effort:** `medium` because the state changes are focused but establish the contract for controller and renderer work.

**Files:**
- Modify: `tests/tui-state.test.ts`
- Modify: `src/tui/state.ts`
- Modify: `docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md`

- [x] **Step 1: Replace reducer tests with focused Words behavior coverage**

Replace `tests/tui-state.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { createTuiState, reduceTuiState } from "../src/tui/state.js";

function wordsState() {
  return reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });
}

describe("TUI state", () => {
  it("navigates tabs without changing calculator input", () => {
    const state = createTuiState();
    const vars = reduceTuiState(state, { type: "nextTab" });
    const words = reduceTuiState(vars, { type: "nextTab" });

    expect(vars.activeTab).toBe("vars");
    expect(words.activeTab).toBe("words");
    expect(words.input).toBe("");
  });

  it("keeps command input editing on non-Words tabs", () => {
    const state = reduceTuiState(createTuiState(), { type: "insertText", text: "2 3 +" });

    expect(state.input).toBe("2 3 +");
    expect(state.activeTab).toBe("history");
    expect(reduceTuiState(state, { type: "backspace" }).input).toBe("2 3 ");
  });

  it("filters words directly without changing command input", () => {
    const filtered = reduceTuiState(wordsState(), { type: "appendWordFilter", text: "dup" });

    expect(filtered.activeTab).toBe("words");
    expect(filtered.input).toBe("");
    expect(filtered.wordFilter).toBe("dup");
    expect(filtered.visibleWords.map((word) => word.name)).toContain("DUP");
    expect(filtered.selectedWord?.name).toBe("DUP");
  });

  it("filters operator words from printable symbols", () => {
    const filtered = reduceTuiState(wordsState(), { type: "appendWordFilter", text: "+" });

    expect(filtered.wordFilter).toBe("+");
    expect(filtered.visibleWords.map((word) => word.name)).toEqual(["+"]);
    expect(filtered.selectedWord?.name).toBe("+");
  });

  it("edits the word filter with Backspace", () => {
    const filtered = reduceTuiState(wordsState(), { type: "appendWordFilter", text: "du" });
    const edited = reduceTuiState(filtered, { type: "backspaceWordFilter" });

    expect(edited.wordFilter).toBe("d");
    expect(edited.input).toBe("");
    expect(edited.visibleWords.map((word) => word.name)).toContain("DUP");
  });

  it("clamps word selection at the visible list boundaries", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "dup" });
    const first = reduceTuiState(filtered, { type: "selectPreviousWord" });
    const second = reduceTuiState(filtered, { type: "selectNextWord" });
    const clamped = reduceTuiState(second, { type: "selectNextWord" });

    expect(filtered.visibleWords.map((word) => word.name)).toEqual(["DUP", "DUP2"]);
    expect(first.selectedWord?.name).toBe("DUP");
    expect(second.selectedWord?.name).toBe("DUP2");
    expect(clamped.selectedWord?.name).toBe("DUP2");
  });

  it("settles missing or stale word selection on the first visible word", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "dup" });
    const staleWord = reduceTuiState(wordsState(), { type: "setWordFilter", query: "drop" }).selectedWord;
    const missingSelection = { ...filtered, selectedWord: undefined };
    const staleSelection = { ...filtered, selectedWord: staleWord };

    expect(reduceTuiState(missingSelection, { type: "selectNextWord" }).selectedWord?.name).toBe("DUP");
    expect(reduceTuiState(missingSelection, { type: "selectPreviousWord" }).selectedWord?.name).toBe("DUP");
    expect(reduceTuiState(staleSelection, { type: "selectNextWord" }).selectedWord?.name).toBe("DUP");
    expect(reduceTuiState(staleSelection, { type: "selectPreviousWord" }).selectedWord?.name).toBe("DUP");
  });

  it("keeps no-match selection empty and allows Help activation", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "zzzz" });
    const moved = reduceTuiState(reduceTuiState(filtered, { type: "selectNextWord" }), { type: "selectPreviousWord" });
    const help = reduceTuiState(moved, { type: "showSelectedWordHelp" });

    expect(filtered.visibleWords).toEqual([]);
    expect(moved.selectedWord).toBeUndefined();
    expect(help.activeTab).toBe("help");
    expect(help.selectedWord).toBeUndefined();
  });

  it("switches to Help while preserving the selected word", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "drop" });
    const help = reduceTuiState(filtered, { type: "showSelectedWordHelp" });

    expect(help.activeTab).toBe("help");
    expect(help.selectedWord?.name).toBe("DROP");
    expect(help.wordFilter).toBe("drop");
  });

  it("clears a non-empty word filter on Esc", () => {
    const filtered = reduceTuiState(wordsState(), { type: "setWordFilter", query: "drop" });
    const cleared = reduceTuiState(filtered, { type: "escapeWords" });

    expect(cleared.activeTab).toBe("words");
    expect(cleared.wordFilter).toBe("");
    expect(cleared.visibleWords.length).toBeGreaterThan(1);
    expect(cleared.selectedWord?.name).toBe(createTuiState().selectedWord?.name);
  });

  it("returns from unfiltered Words to History on Esc", () => {
    const escaped = reduceTuiState(wordsState(), { type: "escapeWords" });

    expect(escaped.activeTab).toBe("history");
    expect(escaped.wordFilter).toBe("");
  });

  it("records execution status", () => {
    const state = reduceTuiState(createTuiState(), { type: "recordOutput", input: "2 3 +", output: "1: 5", ok: true });

    expect(state.history).toEqual([{ input: "2 3 +", output: "1: 5", ok: true }]);
    expect(state.status).toBe("ok");
    expect(state.input).toBe("");
  });
});
```

- [x] **Step 2: Run reducer tests to verify failure**

Run:

```bash
npm test -- tests/tui-state.test.ts
```

Expected: FAIL with TypeScript or assertion errors because `appendWordFilter`, `backspaceWordFilter`, `showSelectedWordHelp`, and `escapeWords` are not implemented, and selection currently wraps.

- [x] **Step 3: Replace reducer implementation**

Replace `src/tui/state.ts` with:

```ts
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
```

- [x] **Step 4: Run reducer tests to verify pass**

Run:

```bash
npm test -- tests/tui-state.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit reducer semantics**

Run:

```bash
git add src/tui/state.ts tests/tui-state.test.ts docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md
git commit -m "feat: refine tui word browser state"
```

Expected: commit succeeds.

## Task 2: Controller Key Routing

**Suggested subagent effort:** `medium` because key routing touches terminal behavior but remains localized to the TUI controller.

**Files:**
- Modify: `tests/tui-entry.test.ts`
- Modify: `src/tui/app.ts`
- Modify: `docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md`

- [x] **Step 1: Add key routing tests**

Replace `tests/tui-entry.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";
import { createTuiController, handleTuiKeypress } from "../src/tui/app.js";

async function moveToWords(controller: ReturnType<typeof createTuiController>) {
  await handleTuiKeypress(controller, undefined, { name: "tab" });
  await handleTuiKeypress(controller, undefined, { name: "tab" });
}

describe("TUI entry support", () => {
  it("handles a command submission through the controller", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });

    const output = await controller.submit("2 3 +");

    expect(output).toContain("1: 5");
    expect(controller.render()).toContain("1: 5");
  });

  it("handles a dot command submission through the controller", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });

    const output = await controller.submit(".find stack");

    expect(output).toContain("DUP");
  });

  it("reports exit from the interactive return key path outside Words", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    controller.dispatch({ type: "insertText", text: ".exit" });

    const result = await handleTuiKeypress(controller, undefined, { name: "return" });

    expect(result).toBe("exit");
  });

  it("routes printable input to the word filter on Words", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    await moveToWords(controller);

    await handleTuiKeypress(controller, "d", { name: "d" });
    await handleTuiKeypress(controller, "u", { name: "u" });
    await handleTuiKeypress(controller, "+", { name: "+" });

    expect(controller.state.activeTab).toBe("words");
    expect(controller.state.input).toBe("");
    expect(controller.state.wordFilter).toBe("du+");
  });

  it("routes Backspace to the word filter on Words", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    await moveToWords(controller);
    await handleTuiKeypress(controller, "d", { name: "d" });
    await handleTuiKeypress(controller, "u", { name: "u" });

    await handleTuiKeypress(controller, undefined, { name: "backspace" });

    expect(controller.state.wordFilter).toBe("d");
    expect(controller.state.input).toBe("");
  });

  it("routes arrows and Enter to word browsing on Words", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    await moveToWords(controller);
    controller.dispatch({ type: "setWordFilter", query: "dup" });

    await handleTuiKeypress(controller, undefined, { name: "down" });
    await handleTuiKeypress(controller, undefined, { name: "return" });

    expect(controller.state.selectedWord?.name).toBe("DUP2");
    expect(controller.state.activeTab).toBe("help");
    expect(controller.state.input).toBe("");
  });

  it("routes Esc to clear first and leave Words second", async () => {
    const controller = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false });
    await moveToWords(controller);
    controller.dispatch({ type: "setWordFilter", query: "drop" });

    await handleTuiKeypress(controller, undefined, { name: "escape" });
    expect(controller.state.activeTab).toBe("words");
    expect(controller.state.wordFilter).toBe("");

    await handleTuiKeypress(controller, undefined, { name: "escape" });
    expect(controller.state.activeTab).toBe("history");
  });
});
```

- [x] **Step 2: Run controller tests to verify failure**

Run:

```bash
npm test -- tests/tui-entry.test.ts
```

Expected: FAIL because Words printable keys still edit command input, Backspace edits command input, Return submits command input, and Esc is not handled.

- [x] **Step 3: Update keypress routing**

In `src/tui/app.ts`, replace `handleTuiKeypress` with:

```ts
export async function handleTuiKeypress(
  controller: ReturnType<typeof createTuiController>,
  text: string | undefined,
  key: TuiKey
): Promise<TuiKeypressResult> {
  if (key.name === "tab") {
    controller.dispatch(key.shift ? { type: "previousTab" } : { type: "nextTab" });
    return "continue";
  }

  if (controller.state.activeTab === "words") {
    if (key.name === "backspace") controller.dispatch({ type: "backspaceWordFilter" });
    else if (key.name === "up") controller.dispatch({ type: "selectPreviousWord" });
    else if (key.name === "down") controller.dispatch({ type: "selectNextWord" });
    else if (key.name === "return") controller.dispatch({ type: "showSelectedWordHelp" });
    else if (key.name === "escape") controller.dispatch({ type: "escapeWords" });
    else if (text !== undefined && text >= " ") controller.dispatch({ type: "appendWordFilter", text });
    return "continue";
  }

  if (key.name === "backspace") controller.dispatch({ type: "backspace" });
  else if (key.name === "return") {
    const result = await controller.submit(controller.state.input);
    if (result === "exit") return "exit";
  } else if (text !== undefined && text >= " ") controller.dispatch({ type: "insertText", text });
  return "continue";
}
```

- [x] **Step 4: Run controller tests to verify pass**

Run:

```bash
npm test -- tests/tui-entry.test.ts
```

Expected: PASS.

- [x] **Step 5: Run reducer and controller tests together**

Run:

```bash
npm test -- tests/tui-state.test.ts tests/tui-entry.test.ts
```

Expected: PASS.

- [x] **Step 6: Commit controller key routing**

Run:

```bash
git add src/tui/app.ts tests/tui-entry.test.ts docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md
git commit -m "feat: route tui words keys"
```

Expected: commit succeeds.

## Task 3: Words And Help Rendering

**Suggested subagent effort:** `low` because rendering is pure and uses existing formatters.

**Files:**
- Modify: `tests/tui-render.test.ts`
- Modify: `src/tui/render.ts`
- Modify: `docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md`

- [ ] **Step 1: Add renderer tests for filter and selection feedback**

Append these tests inside the existing `describe("TUI renderer", () => { ... })` block in `tests/tui-render.test.ts`:

```ts
  it("shows an empty Words filter prompt and selected row marker", () => {
    const words = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });

    const output = renderTui(words, new CalculatorSession(), { width: 90, height: 18, color: false });

    expect(output).toContain("filter: <type to search>");
    expect(output).toContain("> EVAL (core) program|object -> ...");
  });

  it("shows a non-empty Words filter and no-match message", () => {
    const words = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });
    const filtered = reduceTuiState(words, { type: "setWordFilter", query: "zzzz" });

    const output = renderTui(filtered, new CalculatorSession(), { width: 90, height: 18, color: false });

    expect(output).toContain("filter: zzzz");
    expect(output).toContain("No matches.");
  });

  it("renders Help for the selected word after activation", () => {
    const words = reduceTuiState(reduceTuiState(createTuiState(), { type: "nextTab" }), { type: "nextTab" });
    const filtered = reduceTuiState(words, { type: "setWordFilter", query: "dup" });
    const help = reduceTuiState(filtered, { type: "showSelectedWordHelp" });

    const output = renderTui(help, new CalculatorSession(), { width: 90, height: 18, color: false });

    expect(output).toContain("DUP");
    expect(output).toContain("Category: stack");
    expect(output).toContain("Duplicate level 1.");
  });
```

- [ ] **Step 2: Update existing renderer expectation**

In the existing `shows active pane content without history on non-history tabs` test, change:

```ts
expect(leftColumn[0]).toBe("filter:");
```

to:

```ts
expect(leftColumn[0]).toBe("filter: <type to search>");
```

- [ ] **Step 3: Run renderer tests to verify failure**

Run:

```bash
npm test -- tests/tui-render.test.ts
```

Expected: FAIL because the Words pane currently renders `filter: ` without placeholder text, lacks selected row markers, and does not show `No matches.`.

- [ ] **Step 4: Replace Words pane rendering**

In `src/tui/render.ts`, add this helper above `activePane`:

```ts
function wordLines(state: TuiState): string[] {
  const filter = state.wordFilter.length === 0 ? "filter: <type to search>" : `filter: ${state.wordFilter}`;
  if (state.visibleWords.length === 0) return [filter, "No matches."];
  return [
    filter,
    ...state.visibleWords.slice(0, 12).map((word) => {
      const marker = word.name === state.selectedWord?.name ? "> " : "  ";
      return `${marker}${word.name} (${word.category}) ${word.stack}`;
    })
  ];
}
```

Then replace the `case "words"` branch in `activePane` with:

```ts
    case "words":
      return wordLines(state);
```

- [ ] **Step 5: Run renderer tests to verify pass**

Run:

```bash
npm test -- tests/tui-render.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run focused TUI tests together**

Run:

```bash
npm test -- tests/tui-state.test.ts tests/tui-entry.test.ts tests/tui-render.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit rendering**

Run:

```bash
git add src/tui/render.ts tests/tui-render.test.ts docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md
git commit -m "feat: render tui word selection"
```

Expected: commit succeeds.

## Task 4: Verification And Plan Closure

**Suggested subagent effort:** `low` because this task verifies completed work and updates plan status.

**Files:**
- Modify: `docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md`

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run controller smoke check**

Run:

```bash
node --input-type=module -e "import { createTuiController, handleTuiKeypress } from './dist/tui/app.js'; import { CalculatorSession } from './dist/session.js'; const c = createTuiController({ session: new CalculatorSession(), width: 80, height: 20, color: false }); await handleTuiKeypress(c, undefined, { name: 'tab' }); await handleTuiKeypress(c, undefined, { name: 'tab' }); await handleTuiKeypress(c, 'd', { name: 'd' }); await handleTuiKeypress(c, 'u', { name: 'u' }); await handleTuiKeypress(c, undefined, { name: 'down' }); await handleTuiKeypress(c, undefined, { name: 'return' }); console.log(`${c.state.activeTab}:${c.state.wordFilter}:${c.state.selectedWord?.name}`);"
```

Expected output:

```text
help:du:DUP2
```

- [ ] **Step 5: Confirm no HP behavior files changed**

Run:

```bash
git diff --name-only HEAD~3..HEAD
```

Expected: output includes only TUI files, TUI tests, and this plan:

```text
docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md
src/tui/app.ts
src/tui/render.ts
src/tui/state.ts
tests/tui-entry.test.ts
tests/tui-render.test.ts
tests/tui-state.test.ts
```

- [ ] **Step 6: Commit plan closure**

Run:

```bash
git add docs/superpowers/plans/2026-05-05-deferred-tui-help-refinement.md
git commit -m "docs: complete deferred tui help plan"
```

Expected: commit succeeds if plan checkboxes changed after the previous implementation commits. If no plan checkbox changes remain, skip this commit and record that the working tree is clean except for unrelated local artifacts.
