# rpl26 Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working clean-room User RPL-inspired calculator core with persistent MCP access.

**Architecture:** The implementation is split into a pure TypeScript RPL object model, strict recursive parser, deterministic evaluator, persistent session wrapper with trace output, conformance fixtures, and an MCP server. The core has no MCP or natural-language dependencies.

**Tech Stack:** TypeScript, Node.js ESM, Vitest, `@modelcontextprotocol/sdk`, `zod`.

**Design Spec:** `docs/superpowers/specs/2026-05-01-rpl-cleanroom-design.md`

---

## File Structure

- `package.json`: npm metadata, scripts, runtime and test dependencies.
- `tsconfig.json`: strict TypeScript configuration for ESM output.
- `vitest.config.ts`: Vitest configuration.
- `.gitignore`: generated output and local OS files.
- `src/types.ts`: shared RPL object, parser, state, trace, and error types.
- `src/parser.ts`: strict recursive parser for RPL objects and executable names.
- `src/core.ts`: pure stack, arithmetic, variable, and evaluator logic.
- `src/session.ts`: persistent calculator session wrapper.
- `src/mcp/server.ts`: MCP stdio server exposing calculator tools.
- `tests/types-smoke.test.ts`: setup smoke test.
- `tests/parser.test.ts`: parser tests.
- `tests/core-stack.test.ts`: stack operation tests.
- `tests/core-arithmetic.test.ts`: arithmetic and atomic error tests.
- `tests/core-eval.test.ts`: program, `EVAL`, `STO`, and name lookup tests.
- `tests/session.test.ts`: persistence and trace tests.
- `tests/conformance/rpl-identity.test.ts`: RPL identity examples.
- `tests/mcp-server.test.ts`: MCP tool handler and server registration tests.
- `README.md`: project overview and local commands.

---

## Subagent Execution Strategy

Tasks 1-6 are sequential because they share `src/types.ts`, `src/parser.ts`, and `src/core.ts`.

After Task 6 passes, Tasks 7 and 8 may run in parallel:

- Task 7 owns `tests/conformance/rpl-identity.test.ts` and `README.md`.
- Task 8 owns `src/mcp/server.ts` and `tests/mcp-server.test.ts`.

Task 9 is controller-owned final verification.

---

### Task 1: Project Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/types.ts`
- Create: `tests/types-smoke.test.ts`

- [ ] **Step 1: Write the failing smoke test**

Create `tests/types-smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { RplObject } from "../src/types.js";

describe("shared RPL types", () => {
  it("represents real-number objects", () => {
    const value: RplObject = { kind: "real", value: 42 };
    expect(value).toEqual({ kind: "real", value: 42 });
  });
});
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `npm test -- tests/types-smoke.test.ts`

Expected: FAIL because project tooling and `src/types.ts` do not exist yet.

- [ ] **Step 3: Add tooling and the first shared type**

Create `package.json`:

```json
{
  "name": "rpl26",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Clean-room User RPL-inspired persistent object-stack calculator with MCP access.",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "mcp": "node dist/src/mcp/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "rootDir": ".",
    "outDir": "dist",
    "types": ["node", "vitest"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
```

Create `.gitignore`:

```gitignore
dist/
node_modules/
.DS_Store
```

Create `src/types.ts`:

```ts
export type RplObject = {
  kind: "real";
  value: number;
};
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 5: Run the smoke test to verify it passes**

Run: `npm test -- tests/types-smoke.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore src/types.ts tests/types-smoke.test.ts
git commit -m "chore: set up TypeScript test harness"
```

---

### Task 2: Recursive RPL Parser

**Files:**
- Modify: `src/types.ts`
- Create: `src/parser.ts`
- Create: `tests/parser.test.ts`

- [ ] **Step 1: Write parser tests**

Create `tests/parser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseInput } from "../src/parser.js";

describe("parseInput", () => {
  it("parses real literals and executable names in order", () => {
    expect(parseInput("2 3 + DUP")).toEqual({
      ok: true,
      objects: [
        { kind: "real", value: 2, source: "2" },
        { kind: "real", value: 3, source: "3" },
        { kind: "name", name: "+", source: "+" },
        { kind: "name", name: "DUP", source: "DUP" }
      ]
    });
  });

  it("parses quoted names, programs, lists, and strings", () => {
    expect(parseInput("<< 1 'A' STO >> { 2 \"hi\" }")).toEqual({
      ok: true,
      objects: [
        {
          kind: "program",
          body: [
            { kind: "real", value: 1, source: "1" },
            { kind: "quotedName", name: "A", source: "'A'" },
            { kind: "name", name: "STO", source: "STO" }
          ],
          source: "<< 1 'A' STO >>"
        },
        {
          kind: "list",
          items: [
            { kind: "real", value: 2, source: "2" },
            { kind: "string", value: "hi", source: "\"hi\"" }
          ],
          source: "{ 2 \"hi\" }"
        }
      ]
    });
  });

  it("accepts guillemet program delimiters", () => {
    expect(parseInput("« 2 3 + »")).toMatchObject({
      ok: true,
      objects: [{ kind: "program" }]
    });
  });

  it("rejects invalid numeric-looking input", () => {
    expect(parseInput("1.2.3")).toEqual({
      ok: false,
      error: { code: "InvalidToken", message: "Invalid token: 1.2.3" }
    });
  });

  it("rejects unterminated programs", () => {
    expect(parseInput("<< 1 2 +")).toEqual({
      ok: false,
      error: { code: "ParseError", message: "Unterminated program" }
    });
  });
});
```

- [ ] **Step 2: Run parser tests to verify they fail**

Run: `npm test -- tests/parser.test.ts`

Expected: FAIL because `src/parser.ts` does not exist.

- [ ] **Step 3: Implement parser types and parser**

Replace `src/types.ts` with:

```ts
export type CalculatorErrorCode =
  | "InvalidToken"
  | "ParseError"
  | "InvalidCommand"
  | "UndefinedName"
  | "StackUnderflow"
  | "TypeMismatch"
  | "DivisionByZero"
  | "InvalidOperation";

export type CalculatorError = {
  code: CalculatorErrorCode;
  message: string;
};

export type RplObject =
  | { kind: "real"; value: number; source?: string }
  | { kind: "name"; name: string; source?: string }
  | { kind: "quotedName"; name: string; source?: string }
  | { kind: "program"; body: RplObject[]; source?: string }
  | { kind: "list"; items: RplObject[]; source?: string }
  | { kind: "string"; value: string; source?: string };

export type ParseResult =
  | { ok: true; objects: RplObject[] }
  | { ok: false; error: CalculatorError };
```

Create `src/parser.ts`:

```ts
import type { CalculatorError, ParseResult, RplObject } from "./types.js";

const REAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const INVALID_NUMERIC_PATTERN = /^[+-]?[.\d]+(?:[eE][+-]?\d*)?$/;
const SIMPLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

type LexToken = { text: string };

const error = (code: CalculatorError["code"], message: string): ParseResult => ({
  ok: false,
  error: { code, message }
});

function lex(input: string): LexToken[] | CalculatorError {
  const tokens: LexToken[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (input.startsWith("<<", index)) {
      tokens.push({ text: "<<" });
      index += 2;
      continue;
    }

    if (input.startsWith(">>", index)) {
      tokens.push({ text: ">>" });
      index += 2;
      continue;
    }

    if (char === "«" || char === "»" || char === "{" || char === "}") {
      tokens.push({ text: char });
      index += 1;
      continue;
    }

    if (char === "\"") {
      let text = "\"";
      index += 1;
      while (index < input.length) {
        const current = input[index];
        text += current;
        index += 1;
        if (current === "\\" && index < input.length) {
          text += input[index];
          index += 1;
          continue;
        }
        if (current === "\"") {
          tokens.push({ text });
          break;
        }
      }
      if (!text.endsWith("\"")) {
        return { code: "ParseError", message: "Unterminated string" };
      }
      continue;
    }

    let text = "";
    while (index < input.length && !/\s/.test(input[index])) {
      if (input.startsWith("<<", index) || input.startsWith(">>", index)) break;
      if ("{}«»".includes(input[index]) || input[index] === "\"") break;
      text += input[index];
      index += 1;
    }
    if (text.length > 0) {
      tokens.push({ text });
      continue;
    }

    return { code: "InvalidToken", message: `Invalid token: ${input[index]}` };
  }

  return tokens;
}

function parseString(text: string): RplObject | CalculatorError {
  const inner = text.slice(1, -1);
  let value = "";
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    if (char === "\\") {
      const next = inner[index + 1];
      if (next === "\"" || next === "\\") {
        value += next;
        index += 1;
        continue;
      }
      return { code: "ParseError", message: `Invalid string escape: \\${next ?? ""}` };
    }
    value += char;
  }
  return { kind: "string", value, source: text };
}

function parseObjects(tokens: LexToken[], stop: string | undefined): { objects: RplObject[]; index: number } | CalculatorError {
  const objects: RplObject[] = [];
  let index = 0;

  while (index < tokens.length) {
    const text = tokens[index].text;
    if (stop !== undefined && text === stop) {
      return { objects, index: index + 1 };
    }

    if (text === "<<" || text === "«") {
      const close = text === "<<" ? ">>" : "»";
      const nested = parseObjects(tokens.slice(index + 1), close);
      if ("code" in nested) return nested;
      const consumed = nested.index + 1;
      const source = tokens.slice(index, index + consumed).map((token) => token.text).join(" ");
      objects.push({ kind: "program", body: nested.objects, source });
      index += consumed;
      continue;
    }

    if (text === "{") {
      const nested = parseObjects(tokens.slice(index + 1), "}");
      if ("code" in nested) return nested;
      const consumed = nested.index + 1;
      const source = tokens.slice(index, index + consumed).map((token) => token.text).join(" ");
      objects.push({ kind: "list", items: nested.objects, source });
      index += consumed;
      continue;
    }

    if (text === ">>" || text === "»" || text === "}") {
      return { code: "ParseError", message: `Unexpected delimiter: ${text}` };
    }

    if (text.startsWith("\"")) {
      const parsed = parseString(text);
      if ("code" in parsed) return parsed;
      objects.push(parsed);
      index += 1;
      continue;
    }

    if (text.startsWith("'") && text.endsWith("'") && text.length > 2) {
      const name = text.slice(1, -1);
      if (!SIMPLE_NAME_PATTERN.test(name)) {
        return { code: "InvalidToken", message: `Invalid quoted name: ${text}` };
      }
      objects.push({ kind: "quotedName", name, source: text });
      index += 1;
      continue;
    }

    if (REAL_PATTERN.test(text)) {
      objects.push({ kind: "real", value: Number(text), source: text });
      index += 1;
      continue;
    }

    if (INVALID_NUMERIC_PATTERN.test(text)) {
      return { code: "InvalidToken", message: `Invalid token: ${text}` };
    }

    objects.push({ kind: "name", name: text, source: text });
    index += 1;
  }

  if (stop === ">>" || stop === "»") return { code: "ParseError", message: "Unterminated program" };
  if (stop === "}") return { code: "ParseError", message: "Unterminated list" };
  return { objects, index };
}

export function parseInput(input: string): ParseResult {
  const tokens = lex(input);
  if (!Array.isArray(tokens)) {
    return { ok: false, error: tokens };
  }
  const parsed = parseObjects(tokens, undefined);
  if ("code" in parsed) {
    return { ok: false, error: parsed };
  }
  return { ok: true, objects: parsed.objects };
}
```

- [ ] **Step 4: Run parser tests to verify they pass**

Run: `npm test -- tests/parser.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/parser.ts tests/parser.test.ts
git commit -m "feat: add recursive RPL parser"
```

---

### Task 3: Stack Operations And Object Immutability

**Files:**
- Modify: `src/types.ts`
- Create: `src/core.ts`
- Create: `tests/core-stack.test.ts`

- [ ] **Step 1: Write stack operation tests**

Create `tests/core-stack.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("core stack operations", () => {
  it("pushes inert objects onto the stack", () => {
    expect(evaluateObject(state(), real(5))).toEqual({ ok: true, state: state(real(5)) });
  });

  it("duplicates the top stack object", () => {
    expect(evaluateObject(state(real(2)), name("DUP"))).toEqual({ ok: true, state: state(real(2), real(2)) });
  });

  it("drops the top stack object", () => {
    expect(evaluateObject(state(real(2), real(3)), name("DROP"))).toEqual({ ok: true, state: state(real(2)) });
  });

  it("swaps the top two stack objects", () => {
    expect(evaluateObject(state(real(2), real(3)), name("SWAP"))).toEqual({ ok: true, state: state(real(3), real(2)) });
  });

  it("copies the second stack object to the top", () => {
    expect(evaluateObject(state(real(2), real(3)), name("OVER"))).toEqual({ ok: true, state: state(real(2), real(3), real(2)) });
  });

  it("clears the stack without clearing variables", () => {
    const before: CalculatorState = { stack: [real(2)], variables: { A: real(7) } };
    expect(evaluateObject(before, name("CLEAR"))).toEqual({ ok: true, state: { stack: [], variables: { A: real(7) } } });
  });

  it("reports stack underflow without mutating state", () => {
    expect(evaluateObject(state(), name("DROP"))).toEqual({
      ok: false,
      state: state(),
      error: { code: "StackUnderflow", message: "DROP requires 1 stack object" }
    });
  });
});
```

- [ ] **Step 2: Run stack tests to verify they fail**

Run: `npm test -- tests/core-stack.test.ts`

Expected: FAIL because `src/core.ts` and `CalculatorState` do not exist yet.

- [ ] **Step 3: Implement stack core**

Append to `src/types.ts`:

```ts
export type CalculatorState = {
  stack: RplObject[];
  variables: Record<string, RplObject>;
};

export type EvaluateResult =
  | { ok: true; state: CalculatorState }
  | { ok: false; state: CalculatorState; error: CalculatorError };
```

Create `src/core.ts`:

```ts
import type { CalculatorState, EvaluateResult, RplObject } from "./types.js";

export const cloneObject = (object: RplObject): RplObject => {
  switch (object.kind) {
    case "program":
      return { ...object, body: object.body.map(cloneObject) };
    case "list":
      return { ...object, items: object.items.map(cloneObject) };
    default:
      return { ...object };
  }
};

export const cloneState = (state: CalculatorState): CalculatorState => ({
  stack: state.stack.map(cloneObject),
  variables: Object.fromEntries(Object.entries(state.variables).map(([key, value]) => [key, cloneObject(value)]))
});

const underflow = (state: CalculatorState, command: string, count: number): EvaluateResult => ({
  ok: false,
  state: cloneState(state),
  error: { code: "StackUnderflow", message: `${command} requires ${count} stack object${count === 1 ? "" : "s"}` }
});

const push = (state: CalculatorState, object: RplObject): EvaluateResult => ({
  ok: true,
  state: { ...cloneState(state), stack: [...state.stack.map(cloneObject), cloneObject(object)] }
});

function applyBuiltin(state: CalculatorState, name: string): EvaluateResult | undefined {
  const next = cloneState(state);

  switch (name) {
    case "DUP": {
      if (next.stack.length < 1) return underflow(state, "DUP", 1);
      next.stack.push(cloneObject(next.stack[next.stack.length - 1]));
      return { ok: true, state: next };
    }
    case "DROP": {
      if (next.stack.length < 1) return underflow(state, "DROP", 1);
      next.stack.pop();
      return { ok: true, state: next };
    }
    case "SWAP": {
      if (next.stack.length < 2) return underflow(state, "SWAP", 2);
      const y = next.stack.pop() as RplObject;
      const x = next.stack.pop() as RplObject;
      next.stack.push(y, x);
      return { ok: true, state: next };
    }
    case "OVER": {
      if (next.stack.length < 2) return underflow(state, "OVER", 2);
      next.stack.push(cloneObject(next.stack[next.stack.length - 2]));
      return { ok: true, state: next };
    }
    case "CLEAR":
      return { ok: true, state: { stack: [], variables: next.variables } };
    default:
      return undefined;
  }
}

export function evaluateObject(state: CalculatorState, object: RplObject): EvaluateResult {
  if (object.kind !== "name") {
    return push(state, object);
  }

  const builtin = applyBuiltin(state, object.name);
  if (builtin !== undefined) return builtin;

  return {
    ok: false,
    state: cloneState(state),
    error: { code: "UndefinedName", message: `Undefined name: ${object.name}` }
  };
}
```

- [ ] **Step 4: Run stack tests to verify they pass**

Run: `npm test -- tests/core-stack.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/core.ts tests/core-stack.test.ts
git commit -m "feat: add RPL stack operations"
```

---

### Task 4: Real Arithmetic

**Files:**
- Modify: `src/core.ts`
- Create: `tests/core-arithmetic.test.ts`

- [ ] **Step 1: Write arithmetic tests**

Create `tests/core-arithmetic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("core real arithmetic", () => {
  it.each([
    ["+", state(real(2), real(3)), state(real(5))],
    ["-", state(real(2), real(3)), state(real(-1))],
    ["*", state(real(2), real(3)), state(real(6))],
    ["/", state(real(2), real(4)), state(real(0.5))],
    ["NEG", state(real(2)), state(real(-2))],
    ["INV", state(real(4)), state(real(0.25))],
    ["SQ", state(real(4)), state(real(16))],
    ["SQRT", state(real(9)), state(real(3))]
  ])("applies %s", (operator, before, after) => {
    expect(evaluateObject(before, name(operator))).toEqual({ ok: true, state: after });
  });

  it("rejects non-real arithmetic inputs without mutation", () => {
    const before = state({ kind: "string", value: "2" }, real(3));
    expect(evaluateObject(before, name("+"))).toEqual({
      ok: false,
      state: before,
      error: { code: "TypeMismatch", message: "+ requires real arguments" }
    });
  });

  it("rejects division by zero without mutation", () => {
    expect(evaluateObject(state(real(2), real(0)), name("/"))).toEqual({
      ok: false,
      state: state(real(2), real(0)),
      error: { code: "DivisionByZero", message: "/ cannot divide by zero" }
    });
  });
});
```

- [ ] **Step 2: Run arithmetic tests to verify they fail**

Run: `npm test -- tests/core-arithmetic.test.ts`

Expected: FAIL because arithmetic commands are not implemented.

- [ ] **Step 3: Add arithmetic builtins**

In `src/core.ts`, add real arithmetic helpers near `underflow` and add cases in `applyBuiltin` before `default`. Preserve existing stack command behavior.

```ts
const real = (value: number): RplObject => ({ kind: "real", value });

const typeMismatch = (state: CalculatorState, command: string): EvaluateResult => ({
  ok: false,
  state: cloneState(state),
  error: { code: "TypeMismatch", message: `${command} requires real arguments` }
});

function unaryReal(state: CalculatorState, command: string, fn: (x: number) => EvaluateResult): EvaluateResult {
  if (state.stack.length < 1) return underflow(state, command, 1);
  const x = state.stack[state.stack.length - 1];
  if (x.kind !== "real") return typeMismatch(state, command);
  return fn(x.value);
}

function binaryReal(state: CalculatorState, command: string, fn: (x: number, y: number) => EvaluateResult): EvaluateResult {
  if (state.stack.length < 2) return underflow(state, command, 2);
  const x = state.stack[state.stack.length - 2];
  const y = state.stack[state.stack.length - 1];
  if (x.kind !== "real" || y.kind !== "real") return typeMismatch(state, command);
  return fn(x.value, y.value);
}

const replaceTop = (state: CalculatorState, value: number): EvaluateResult => ({
  ok: true,
  state: { ...cloneState(state), stack: [...state.stack.slice(0, -1).map(cloneObject), real(value)] }
});

const replaceTopTwo = (state: CalculatorState, value: number): EvaluateResult => ({
  ok: true,
  state: { ...cloneState(state), stack: [...state.stack.slice(0, -2).map(cloneObject), real(value)] }
});
```

Add switch cases:

```ts
    case "+":
      return binaryReal(state, "+", (x, y) => replaceTopTwo(state, x + y));
    case "-":
      return binaryReal(state, "-", (x, y) => replaceTopTwo(state, x - y));
    case "*":
      return binaryReal(state, "*", (x, y) => replaceTopTwo(state, x * y));
    case "/":
      return binaryReal(state, "/", (x, y) => {
        if (y === 0) {
          return { ok: false, state: cloneState(state), error: { code: "DivisionByZero", message: "/ cannot divide by zero" } };
        }
        return replaceTopTwo(state, x / y);
      });
    case "NEG":
      return unaryReal(state, "NEG", (x) => replaceTop(state, -x));
    case "INV":
      return unaryReal(state, "INV", (x) => {
        if (x === 0) {
          return { ok: false, state: cloneState(state), error: { code: "DivisionByZero", message: "INV cannot divide by zero" } };
        }
        return replaceTop(state, 1 / x);
      });
    case "SQ":
      return unaryReal(state, "SQ", (x) => replaceTop(state, x * x));
    case "SQRT":
      return unaryReal(state, "SQRT", (x) => {
        if (x < 0) {
          return { ok: false, state: cloneState(state), error: { code: "InvalidOperation", message: "SQRT requires a non-negative real" } };
        }
        return replaceTop(state, Math.sqrt(x));
      });
```

- [ ] **Step 4: Run stack and arithmetic tests**

Run: `npm test -- tests/core-stack.test.ts tests/core-arithmetic.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core.ts tests/core-arithmetic.test.ts
git commit -m "feat: add real arithmetic builtins"
```

---

### Task 5: Programs, EVAL, STO, And Global Names

**Files:**
- Modify: `src/core.ts`
- Create: `tests/core-eval.test.ts`

- [ ] **Step 1: Write evaluator tests**

Create `tests/core-eval.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateObject } from "../src/core.js";
import type { CalculatorState, RplObject } from "../src/types.js";

const real = (value: number): RplObject => ({ kind: "real", value });
const name = (value: string): RplObject => ({ kind: "name", name: value });
const quotedName = (value: string): RplObject => ({ kind: "quotedName", name: value });
const program = (...body: RplObject[]): RplObject => ({ kind: "program", body });
const state = (...values: RplObject[]): CalculatorState => ({ stack: values, variables: {} });

describe("RPL evaluator", () => {
  it("pushes program objects without executing them", () => {
    const object = program(real(2), real(3), name("+"));
    expect(evaluateObject(state(), object)).toEqual({ ok: true, state: state(object) });
  });

  it("EVAL executes a program object from level 1", () => {
    expect(evaluateObject(state(program(real(2), real(3), name("+"))), name("EVAL"))).toEqual({
      ok: true,
      state: state(real(5))
    });
  });

  it("stores objects under quoted global names", () => {
    expect(evaluateObject(state(real(5), quotedName("A")), name("STO"))).toEqual({
      ok: true,
      state: { stack: [], variables: { A: real(5) } }
    });
  });

  it("evaluates non-program global names by pushing their value", () => {
    const before: CalculatorState = { stack: [], variables: { A: real(5) } };
    expect(evaluateObject(before, name("A"))).toEqual({
      ok: true,
      state: { stack: [real(5)], variables: { A: real(5) } }
    });
  });

  it("evaluates program global names by executing the program", () => {
    const before: CalculatorState = { stack: [real(41)], variables: { INC: program(real(1), name("+")) } };
    expect(evaluateObject(before, name("INC"))).toEqual({
      ok: true,
      state: { stack: [real(42)], variables: { INC: program(real(1), name("+")) } }
    });
  });

  it("keeps nested programs inert until EVAL", () => {
    const nested = program(real(1), real(2), name("+"));
    expect(evaluateObject(state(program(nested)), name("EVAL"))).toEqual({
      ok: true,
      state: state(nested)
    });
  });
});
```

- [ ] **Step 2: Run evaluator tests to verify they fail**

Run: `npm test -- tests/core-eval.test.ts`

Expected: FAIL because `EVAL`, `STO`, and global name lookup are not implemented.

- [ ] **Step 3: Implement evaluator semantics**

In `src/core.ts`, add:

```ts
function evaluateProgram(state: CalculatorState, program: Extract<RplObject, { kind: "program" }>): EvaluateResult {
  let current = cloneState(state);
  for (const object of program.body) {
    const result = evaluateObject(current, object);
    current = result.state;
    if (!result.ok) return result;
  }
  return { ok: true, state: current };
}
```

Add `EVAL` and `STO` cases in `applyBuiltin` before arithmetic cases or before `default`:

```ts
    case "EVAL": {
      if (next.stack.length < 1) return underflow(state, "EVAL", 1);
      const object = next.stack.pop() as RplObject;
      if (object.kind === "program") {
        return evaluateProgram(next, object);
      }
      return evaluateObject(next, object);
    }
    case "STO": {
      if (next.stack.length < 2) return underflow(state, "STO", 2);
      const target = next.stack[next.stack.length - 1];
      const value = next.stack[next.stack.length - 2];
      if (target.kind !== "quotedName") {
        return {
          ok: false,
          state: cloneState(state),
          error: { code: "TypeMismatch", message: "STO requires a quoted name in level 1" }
        };
      }
      next.stack.pop();
      next.stack.pop();
      next.variables[target.name] = cloneObject(value);
      return { ok: true, state: next };
    }
```

Replace the undefined-name tail of `evaluateObject` with:

```ts
  const variable = state.variables[object.name];
  if (variable !== undefined) {
    if (variable.kind === "program") {
      return evaluateProgram(state, variable);
    }
    return push(state, variable);
  }

  return {
    ok: false,
    state: cloneState(state),
    error: { code: "UndefinedName", message: `Undefined name: ${object.name}` }
  };
```

- [ ] **Step 4: Run core tests**

Run: `npm test -- tests/core-stack.test.ts tests/core-arithmetic.test.ts tests/core-eval.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core.ts tests/core-eval.test.ts
git commit -m "feat: add RPL program and variable evaluation"
```

---

### Task 6: Persistent Session And Trace

**Files:**
- Modify: `src/types.ts`
- Create: `src/session.ts`
- Create: `tests/session.test.ts`

- [ ] **Step 1: Write session tests**

Create `tests/session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../src/session.js";

describe("CalculatorSession", () => {
  it("persists stack and variables across execute calls", () => {
    const session = new CalculatorSession();
    expect(session.execute("<< 1 + >> 'INC' STO")).toMatchObject({ ok: true });
    expect(session.execute("41 INC")).toMatchObject({ ok: true });
    expect(session.getStack()).toEqual([{ level: 1, value: { kind: "real", value: 42 } }]);
    expect(session.getVariables()).toEqual({ INC: { kind: "program", body: [{ kind: "real", value: 1, source: "1" }, { kind: "name", name: "+", source: "+" }], source: "<< 1 + >>" } });
  });

  it("records trace entries and stops on the first failing object", () => {
    const session = new CalculatorSession();
    const result = session.execute("2 0 / 9");
    expect(result).toMatchObject({
      ok: false,
      error: { code: "DivisionByZero", message: "/ cannot divide by zero" },
      stack: [
        { level: 2, value: { kind: "real", value: 2, source: "2" } },
        { level: 1, value: { kind: "real", value: 0, source: "0" } }
      ]
    });
    expect(result.trace.map((entry) => ({ source: entry.source, ok: entry.ok }))).toEqual([
      { source: "2", ok: true },
      { source: "0", ok: true },
      { source: "/", ok: false }
    ]);
  });

  it("clears stack, variables, and trace", () => {
    const session = new CalculatorSession();
    session.execute("5 'A' STO A");
    session.clear();
    expect(session.getStack()).toEqual([]);
    expect(session.getVariables()).toEqual({});
    expect(session.getTrace()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run session tests to verify they fail**

Run: `npm test -- tests/session.test.ts`

Expected: FAIL because `src/session.ts` does not exist.

- [ ] **Step 3: Add session types and implementation**

Append to `src/types.ts`:

```ts
export type StackEntry = {
  level: number;
  value: RplObject;
};

export type TraceEntry =
  | { source: string; ok: true; before: RplObject[]; after: RplObject[] }
  | { source: string; ok: false; before: RplObject[]; after: RplObject[]; error: CalculatorError };

export type ExecuteResult =
  | { ok: true; stack: StackEntry[]; variables: Record<string, RplObject>; trace: TraceEntry[] }
  | { ok: false; error: CalculatorError; stack: StackEntry[]; variables: Record<string, RplObject>; trace: TraceEntry[] };
```

Create `src/session.ts`:

```ts
import { cloneObject, cloneState, evaluateObject } from "./core.js";
import { parseInput } from "./parser.js";
import type { CalculatorState, ExecuteResult, RplObject, StackEntry, TraceEntry } from "./types.js";

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
      const result = evaluateObject(this.state, object);
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

  clear(): void {
    this.state = { stack: [], variables: {} };
    this.trace = [];
  }
}
```

- [ ] **Step 4: Run session tests to verify they pass**

Run: `npm test -- tests/session.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/session.ts tests/session.test.ts
git commit -m "feat: add persistent RPL session"
```

---

### Task 7: RPL Identity Conformance And README

**Files:**
- Create: `tests/conformance/rpl-identity.test.ts`
- Create: `README.md`

- [ ] **Step 1: Write RPL identity tests**

Create `tests/conformance/rpl-identity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../../src/session.js";

describe("RPL identity examples", () => {
  it.each([
    ["real arithmetic", "2 3 +", [{ level: 1, value: { kind: "real", value: 5 } }]],
    ["program object evaluation", "<< 2 3 + >> EVAL", [{ level: 1, value: { kind: "real", value: 5 } }]],
    [
      "stored increment program",
      "<< 1 + >> 'INC' STO 41 INC",
      [{ level: 1, value: { kind: "real", value: 42 } }]
    ]
  ])("%s", (_label, input, expectedStack) => {
    const session = new CalculatorSession();
    expect(session.execute(input)).toMatchObject({ ok: true });
    expect(session.getStack()).toMatchObject(expectedStack);
  });

  it("treats lists as inert first-class objects", () => {
    const session = new CalculatorSession();
    expect(session.execute("{ 1 2 3 } DUP")).toMatchObject({ ok: true });
    expect(session.getStack()).toEqual([
      { level: 2, value: { kind: "list", items: [{ kind: "real", value: 1, source: "1" }, { kind: "real", value: 2, source: "2" }, { kind: "real", value: 3, source: "3" }], source: "{ 1 2 3 }" } },
      { level: 1, value: { kind: "list", items: [{ kind: "real", value: 1, source: "1" }, { kind: "real", value: 2, source: "2" }, { kind: "real", value: 3, source: "3" }], source: "{ 1 2 3 }" } }
    ]);
  });
});
```

- [ ] **Step 2: Run conformance tests**

Run: `npm test -- tests/conformance/rpl-identity.test.ts`

Expected: PASS.

- [ ] **Step 3: Add README**

Create `README.md`:

```md
# rpl26

`rpl26` is a clean-room User RPL-inspired calculator engine with a persistent object stack and an MCP interface.

It is not an HP ROM emulator and does not execute HP firmware. The goal is to build a small Reverse Polish Lisp-style runtime with typed objects, executable programs, variables, and traceable stack evaluation.

## Commands

- `npm test`: run tests.
- `npm run typecheck`: run TypeScript checks.
- `npm run build`: compile TypeScript.
- `npm run mcp`: run the MCP stdio server after building.

## Milestone 1 Scope

- RPL objects: real numbers, bare names, quoted names, programs, lists, and strings.
- Stack commands: `DUP`, `DROP`, `SWAP`, `OVER`, `CLEAR`.
- Arithmetic commands: `+`, `-`, `*`, `/`, `NEG`, `INV`, `SQ`, `SQRT`.
- Program evaluation through `EVAL`.
- Global variables through `STO`.
- Persistent calculator session.
- MCP tools: `execute`, `get_stack`, `get_variables`, `clear`, `get_trace`.

## Clean-Room Rule

Use public manuals and observable behavior as references. Do not copy HP ROM code, firmware internals, System RPL memory behavior, or proprietary emulator implementation details.
```

- [ ] **Step 4: Run all current tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/conformance/rpl-identity.test.ts README.md
git commit -m "test: add RPL identity conformance examples"
```

---

### Task 8: MCP Server Tool Handlers

**Files:**
- Create: `src/mcp/server.ts`
- Create: `tests/mcp-server.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write MCP handler tests**

Create `tests/mcp-server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createCalculatorTools, createServer } from "../src/mcp/server.js";

describe("MCP calculator tool handlers", () => {
  it("executes commands against one persistent RPL session", async () => {
    const tools = createCalculatorTools();
    expect(await tools.execute({ input: "<< 1 + >> 'INC' STO" })).toMatchObject({ ok: true });
    expect(await tools.execute({ input: "41 INC" })).toMatchObject({ ok: true });
    expect(await tools.get_stack({})).toEqual({ stack: [{ level: 1, value: { kind: "real", value: 42 } }] });
  });

  it("clears stack, variables, and trace through the tool surface", async () => {
    const tools = createCalculatorTools();
    await tools.execute({ input: "5 'A' STO A" });
    await tools.clear({});
    expect(await tools.get_stack({})).toEqual({ stack: [] });
    expect(await tools.get_variables({})).toEqual({ variables: {} });
    expect(await tools.get_trace({})).toEqual({ trace: [] });
  });

  it("creates an MCP server instance", () => {
    expect(createServer()).toBeDefined();
  });
});
```

- [ ] **Step 2: Run MCP tests to verify they fail**

Run: `npm test -- tests/mcp-server.test.ts`

Expected: FAIL because `src/mcp/server.ts` does not exist.

- [ ] **Step 3: Implement MCP server and exported handlers**

Create `src/mcp/server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CalculatorSession } from "../session.js";

export function createCalculatorTools(session = new CalculatorSession()) {
  return {
    execute: async ({ input }: { input: string }) => session.execute(input),
    get_stack: async (_args: Record<string, never>) => ({ stack: session.getStack() }),
    get_variables: async (_args: Record<string, never>) => ({ variables: session.getVariables() }),
    clear: async (_args: Record<string, never>) => {
      session.clear();
      return { ok: true };
    },
    get_trace: async (_args: Record<string, never>) => ({ trace: session.getTrace() })
  };
}

export function createServer(session = new CalculatorSession()): McpServer {
  const server = new McpServer({ name: "rpl26", version: "0.1.0" });
  const tools = createCalculatorTools(session);

  server.tool("execute", { input: z.string() }, async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await tools.execute(args), null, 2) }]
  }));

  server.tool("get_stack", {}, async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await tools.get_stack(args), null, 2) }]
  }));

  server.tool("get_variables", {}, async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await tools.get_variables(args), null, 2) }]
  }));

  server.tool("clear", {}, async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await tools.clear(args), null, 2) }]
  }));

  server.tool("get_trace", {}, async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await tools.get_trace(args), null, 2) }]
  }));

  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 4: Run MCP tests and typecheck**

Run: `npm test -- tests/mcp-server.test.ts`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mcp/server.ts tests/mcp-server.test.ts package.json
git commit -m "feat: expose RPL session through MCP tools"
```

---

### Task 9: Final Verification

**Files:**
- No file changes expected unless verification exposes defects.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: PASS for parser, core, session, conformance, MCP handler, and smoke tests.

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS and compiled files appear under `dist/`, which is ignored by `.gitignore`.

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: no uncommitted source changes except unrelated files that existed before implementation.

---

## Self-Review

- Spec coverage: Tasks cover tooling, recursive object parsing, stack operations, real arithmetic, program objects, `EVAL`, `STO`, global names, lists as inert objects, strings as inert objects, session persistence, trace, conformance examples, MCP tools, README, and final verification.
- Deferred scope: Local variables, CAS, algebraics, complex numbers, units, directories, flags, UI behavior, System RPL, and ROM compatibility remain out of scope.
- Placeholder scan: The plan contains concrete commands, file paths, test bodies, implementation snippets, and commit messages.
- Type consistency: `RplObject`, `CalculatorState`, `EvaluateResult`, `ExecuteResult`, stack entries, trace entries, and MCP handler return values are used consistently across tasks.
