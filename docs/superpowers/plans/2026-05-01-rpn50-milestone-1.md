# RPN50 Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working clean-room HP-style RPN calculator core with persistent MCP access.

**Architecture:** The implementation is split into a pure TypeScript calculator core, a strict parser, a stateful session wrapper with trace output, manual-derived conformance fixtures, and an MCP server that exposes the session. The core has no MCP or natural-language dependencies.

**Tech Stack:** TypeScript, Node.js ESM, Vitest, `@modelcontextprotocol/sdk`.

---

## File Structure

- `package.json`: npm metadata, scripts, runtime and test dependencies.
- `tsconfig.json`: strict TypeScript configuration for ESM output.
- `vitest.config.ts`: Vitest configuration.
- `src/types.ts`: shared calculator, stack, token, result, trace, and error types.
- `src/parser.ts`: strict tokenizer for HP-style numeric literals and command names.
- `src/core.ts`: pure stack machine and command application logic.
- `src/session.ts`: persistent calculator session wrapper.
- `src/mcp/server.ts`: MCP stdio server exposing `execute`, `get_stack`, `clear`, and `get_trace`.
- `tests/parser.test.ts`: parser tests.
- `tests/core-stack.test.ts`: literal and stack operation tests.
- `tests/core-arithmetic.test.ts`: arithmetic and atomic error tests.
- `tests/session.test.ts`: persistence and trace tests.
- `tests/conformance/manual-basic.test.ts`: manual-style golden tests with source labels.
- `tests/mcp-server.test.ts`: MCP tool handler tests through exported factory functions.
- `README.md`: project overview and local commands.

---

### Task 1: Project Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/types.ts`
- Create: `tests/types-smoke.test.ts`

- [ ] **Step 1: Write the failing smoke test**

Create `tests/types-smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { StackValue } from "../src/types.js";

describe("shared types", () => {
  it("represents real-number stack values", () => {
    const value: StackValue = { kind: "real", value: 42 };
    expect(value).toEqual({ kind: "real", value: 42 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/types-smoke.test.ts`

Expected: FAIL because `package.json`, Vitest, and `src/types.ts` do not exist yet.

- [ ] **Step 3: Add tooling and the first shared type**

Create `package.json`:

```json
{
  "name": "rpn50",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Clean-room HP-style persistent RPN calculator with MCP access.",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "mcp": "node dist/mcp/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.8"
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

Create `src/types.ts`:

```ts
export type StackValue = {
  kind: "real";
  value: number;
};
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- tests/types-smoke.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts src/types.ts tests/types-smoke.test.ts
git commit -m "chore: set up TypeScript test harness"
```

---

### Task 2: Strict Parser

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
  it("parses real literals and command tokens in order", () => {
    expect(parseInput("2 3 + DUP")).toEqual({
      ok: true,
      tokens: [
        { kind: "literal", value: { kind: "real", value: 2 } },
        { kind: "literal", value: { kind: "real", value: 3 } },
        { kind: "command", name: "+" },
        { kind: "command", name: "DUP" }
      ]
    });
  });

  it("normalizes alphabetic commands to uppercase", () => {
    expect(parseInput("dup sqrt")).toEqual({
      ok: true,
      tokens: [
        { kind: "command", name: "DUP" },
        { kind: "command", name: "SQRT" }
      ]
    });
  });

  it("rejects invalid numeric-looking input", () => {
    expect(parseInput("1.2.3")).toEqual({
      ok: false,
      error: { code: "InvalidToken", message: "Invalid token: 1.2.3" }
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
export type StackValue = {
  kind: "real";
  value: number;
};

export type CalculatorErrorCode =
  | "InvalidToken"
  | "InvalidCommand"
  | "StackUnderflow"
  | "DivisionByZero"
  | "InvalidOperation";

export type CalculatorError = {
  code: CalculatorErrorCode;
  message: string;
};

export type Token =
  | { kind: "literal"; value: StackValue }
  | { kind: "command"; name: string };

export type ParseResult =
  | { ok: true; tokens: Token[] }
  | { ok: false; error: CalculatorError };
```

Create `src/parser.ts`:

```ts
import type { ParseResult, Token } from "./types.js";

const REAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const INVALID_NUMERIC_PATTERN = /^[+-]?[.\d]+$/;

export function parseInput(input: string): ParseResult {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  const tokens: Token[] = [];

  for (const part of parts) {
    if (REAL_PATTERN.test(part)) {
      tokens.push({ kind: "literal", value: { kind: "real", value: Number(part) } });
      continue;
    }

    if (INVALID_NUMERIC_PATTERN.test(part)) {
      return { ok: false, error: { code: "InvalidToken", message: `Invalid token: ${part}` } };
    }

    tokens.push({ kind: "command", name: part.toUpperCase() });
  }

  return { ok: true, tokens };
}
```

- [ ] **Step 4: Run parser tests to verify they pass**

Run: `npm test -- tests/parser.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/parser.ts tests/parser.test.ts
git commit -m "feat: add strict command parser"
```

---

### Task 3: Core Stack Operations

**Files:**
- Modify: `src/types.ts`
- Create: `src/core.ts`
- Create: `tests/core-stack.test.ts`

- [ ] **Step 1: Write stack operation tests**

Create `tests/core-stack.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyToken } from "../src/core.js";
import type { CalculatorState, Token } from "../src/types.js";

const real = (value: number) => ({ kind: "real" as const, value });
const command = (name: string): Token => ({ kind: "command", name });
const literal = (value: number): Token => ({ kind: "literal", value: real(value) });
const state = (...values: number[]): CalculatorState => ({ stack: values.map(real) });

describe("core stack operations", () => {
  it("pushes real literals onto the stack", () => {
    expect(applyToken(state(), literal(5))).toEqual({ ok: true, state: state(5) });
  });

  it("duplicates the top stack value", () => {
    expect(applyToken(state(2), command("DUP"))).toEqual({ ok: true, state: state(2, 2) });
  });

  it("drops the top stack value", () => {
    expect(applyToken(state(2, 3), command("DROP"))).toEqual({ ok: true, state: state(2) });
  });

  it("swaps the top two stack values", () => {
    expect(applyToken(state(2, 3), command("SWAP"))).toEqual({ ok: true, state: state(3, 2) });
  });

  it("copies the second stack value to the top", () => {
    expect(applyToken(state(2, 3), command("OVER"))).toEqual({ ok: true, state: state(2, 3, 2) });
  });

  it("clears the stack", () => {
    expect(applyToken(state(2, 3), command("CLEAR"))).toEqual({ ok: true, state: state() });
  });

  it("does not mutate the original state", () => {
    const original = state(2);
    applyToken(original, command("DUP"));
    expect(original).toEqual(state(2));
  });

  it("reports stack underflow without mutating state", () => {
    expect(applyToken(state(), command("DROP"))).toEqual({
      ok: false,
      state: state(),
      error: { code: "StackUnderflow", message: "DROP requires 1 stack value" }
    });
  });
});
```

- [ ] **Step 2: Run stack tests to verify they fail**

Run: `npm test -- tests/core-stack.test.ts`

Expected: FAIL because `src/core.ts` does not exist.

- [ ] **Step 3: Implement stack core**

Replace `src/types.ts` with:

```ts
export type StackValue = {
  kind: "real";
  value: number;
};

export type CalculatorState = {
  stack: StackValue[];
};

export type CalculatorErrorCode =
  | "InvalidToken"
  | "InvalidCommand"
  | "StackUnderflow"
  | "DivisionByZero"
  | "InvalidOperation";

export type CalculatorError = {
  code: CalculatorErrorCode;
  message: string;
};

export type Token =
  | { kind: "literal"; value: StackValue }
  | { kind: "command"; name: string };

export type ParseResult =
  | { ok: true; tokens: Token[] }
  | { ok: false; error: CalculatorError };

export type ApplyResult =
  | { ok: true; state: CalculatorState }
  | { ok: false; state: CalculatorState; error: CalculatorError };
```

Create `src/core.ts`:

```ts
import type { ApplyResult, CalculatorState, StackValue, Token } from "./types.js";

const cloneState = (state: CalculatorState): CalculatorState => ({
  stack: state.stack.map((value) => ({ ...value }))
});

const underflow = (state: CalculatorState, command: string, count: number): ApplyResult => ({
  ok: false,
  state: cloneState(state),
  error: { code: "StackUnderflow", message: `${command} requires ${count} stack value${count === 1 ? "" : "s"}` }
});

export function applyToken(state: CalculatorState, token: Token): ApplyResult {
  const next = cloneState(state);

  if (token.kind === "literal") {
    next.stack.push({ ...token.value });
    return { ok: true, state: next };
  }

  switch (token.name) {
    case "DUP": {
      if (next.stack.length < 1) return underflow(state, "DUP", 1);
      next.stack.push({ ...next.stack[next.stack.length - 1] });
      return { ok: true, state: next };
    }
    case "DROP": {
      if (next.stack.length < 1) return underflow(state, "DROP", 1);
      next.stack.pop();
      return { ok: true, state: next };
    }
    case "SWAP": {
      if (next.stack.length < 2) return underflow(state, "SWAP", 2);
      const y = next.stack.pop() as StackValue;
      const x = next.stack.pop() as StackValue;
      next.stack.push(y, x);
      return { ok: true, state: next };
    }
    case "OVER": {
      if (next.stack.length < 2) return underflow(state, "OVER", 2);
      next.stack.push({ ...next.stack[next.stack.length - 2] });
      return { ok: true, state: next };
    }
    case "CLEAR":
      return { ok: true, state: { stack: [] } };
    default:
      return {
        ok: false,
        state: cloneState(state),
        error: { code: "InvalidCommand", message: `Invalid command: ${token.name}` }
      };
  }
}
```

- [ ] **Step 4: Run stack tests to verify they pass**

Run: `npm test -- tests/core-stack.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/core.ts tests/core-stack.test.ts
git commit -m "feat: add core stack operations"
```

---

### Task 4: Arithmetic Commands and Atomic Errors

**Files:**
- Modify: `src/core.ts`
- Create: `tests/core-arithmetic.test.ts`

- [ ] **Step 1: Write arithmetic tests**

Create `tests/core-arithmetic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyToken } from "../src/core.js";
import type { CalculatorState, Token } from "../src/types.js";

const real = (value: number) => ({ kind: "real" as const, value });
const command = (name: string): Token => ({ kind: "command", name });
const state = (...values: number[]): CalculatorState => ({ stack: values.map(real) });

describe("core arithmetic", () => {
  it.each([
    ["+", state(2, 3), state(5)],
    ["-", state(2, 3), state(-1)],
    ["*", state(2, 3), state(6)],
    ["/", state(2, 4), state(0.5)],
    ["NEG", state(2), state(-2)],
    ["INV", state(4), state(0.25)],
    ["SQ", state(4), state(16)],
    ["SQRT", state(9), state(3)]
  ])("applies %s", (name, before, after) => {
    expect(applyToken(before, command(name))).toEqual({ ok: true, state: after });
  });

  it("rejects division by zero without mutating the stack", () => {
    expect(applyToken(state(2, 0), command("/"))).toEqual({
      ok: false,
      state: state(2, 0),
      error: { code: "DivisionByZero", message: "/ cannot divide by zero" }
    });
  });

  it("rejects inverse of zero without mutating the stack", () => {
    expect(applyToken(state(0), command("INV"))).toEqual({
      ok: false,
      state: state(0),
      error: { code: "DivisionByZero", message: "INV cannot divide by zero" }
    });
  });

  it("rejects square root of a negative real without mutating the stack", () => {
    expect(applyToken(state(-1), command("SQRT"))).toEqual({
      ok: false,
      state: state(-1),
      error: { code: "InvalidOperation", message: "SQRT requires a non-negative real" }
    });
  });
});
```

- [ ] **Step 2: Run arithmetic tests to verify they fail**

Run: `npm test -- tests/core-arithmetic.test.ts`

Expected: FAIL because arithmetic commands are invalid.

- [ ] **Step 3: Add arithmetic command handling**

In `src/core.ts`, add helper functions below `underflow`:

```ts
const real = (value: number): StackValue => ({ kind: "real", value });

function unary(state: CalculatorState, command: string, operation: (x: number) => ApplyResult): ApplyResult {
  if (state.stack.length < 1) return underflow(state, command, 1);
  return operation(state.stack[state.stack.length - 1].value);
}

function binary(state: CalculatorState, command: string, operation: (x: number, y: number) => ApplyResult): ApplyResult {
  if (state.stack.length < 2) return underflow(state, command, 2);
  const x = state.stack[state.stack.length - 2].value;
  const y = state.stack[state.stack.length - 1].value;
  return operation(x, y);
}

const replaceTop = (state: CalculatorState, value: number): ApplyResult => ({
  ok: true,
  state: { stack: [...state.stack.slice(0, -1), real(value)] }
});

const replaceTopTwo = (state: CalculatorState, value: number): ApplyResult => ({
  ok: true,
  state: { stack: [...state.stack.slice(0, -2), real(value)] }
});
```

Then add these cases before `default` in the existing switch:

```ts
    case "+":
      return binary(state, "+", (x, y) => replaceTopTwo(state, x + y));
    case "-":
      return binary(state, "-", (x, y) => replaceTopTwo(state, x - y));
    case "*":
      return binary(state, "*", (x, y) => replaceTopTwo(state, x * y));
    case "/":
      return binary(state, "/", (x, y) => {
        if (y === 0) {
          return {
            ok: false,
            state: cloneState(state),
            error: { code: "DivisionByZero", message: "/ cannot divide by zero" }
          };
        }
        return replaceTopTwo(state, x / y);
      });
    case "NEG":
      return unary(state, "NEG", (x) => replaceTop(state, -x));
    case "INV":
      return unary(state, "INV", (x) => {
        if (x === 0) {
          return {
            ok: false,
            state: cloneState(state),
            error: { code: "DivisionByZero", message: "INV cannot divide by zero" }
          };
        }
        return replaceTop(state, 1 / x);
      });
    case "SQ":
      return unary(state, "SQ", (x) => replaceTop(state, x * x));
    case "SQRT":
      return unary(state, "SQRT", (x) => {
        if (x < 0) {
          return {
            ok: false,
            state: cloneState(state),
            error: { code: "InvalidOperation", message: "SQRT requires a non-negative real" }
          };
        }
        return replaceTop(state, Math.sqrt(x));
      });
```

- [ ] **Step 4: Run arithmetic and stack tests**

Run: `npm test -- tests/core-stack.test.ts tests/core-arithmetic.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core.ts tests/core-arithmetic.test.ts
git commit -m "feat: add real arithmetic commands"
```

---

### Task 5: Persistent Session and Trace

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
  it("persists stack state across execute calls", () => {
    const session = new CalculatorSession();
    expect(session.execute("2 3 +")).toMatchObject({ ok: true });
    expect(session.execute("DUP")).toMatchObject({ ok: true });
    expect(session.getStack()).toEqual([
      { level: 2, value: { kind: "real", value: 5 } },
      { level: 1, value: { kind: "real", value: 5 } }
    ]);
  });

  it("stops execution on the first failing token and keeps prior successful tokens", () => {
    const session = new CalculatorSession();
    const result = session.execute("2 0 / 9");
    expect(result).toEqual({
      ok: false,
      error: { code: "DivisionByZero", message: "/ cannot divide by zero" },
      stack: [
        { level: 2, value: { kind: "real", value: 2 } },
        { level: 1, value: { kind: "real", value: 0 } }
      ],
      trace: [
        { token: "2", ok: true, before: [], after: [{ kind: "real", value: 2 }] },
        { token: "0", ok: true, before: [{ kind: "real", value: 2 }], after: [{ kind: "real", value: 2 }, { kind: "real", value: 0 }] },
        {
          token: "/",
          ok: false,
          before: [{ kind: "real", value: 2 }, { kind: "real", value: 0 }],
          after: [{ kind: "real", value: 2 }, { kind: "real", value: 0 }],
          error: { code: "DivisionByZero", message: "/ cannot divide by zero" }
        }
      ]
    });
  });

  it("clears stack and trace", () => {
    const session = new CalculatorSession();
    session.execute("2 3 +");
    session.clear();
    expect(session.getStack()).toEqual([]);
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
  value: StackValue;
};

export type TraceEntry =
  | { token: string; ok: true; before: StackValue[]; after: StackValue[] }
  | { token: string; ok: false; before: StackValue[]; after: StackValue[]; error: CalculatorError };

export type ExecuteResult =
  | { ok: true; stack: StackEntry[]; trace: TraceEntry[] }
  | { ok: false; error: CalculatorError; stack: StackEntry[]; trace: TraceEntry[] };
```

Create `src/session.ts`:

```ts
import { applyToken } from "./core.js";
import { parseInput } from "./parser.js";
import type { CalculatorState, ExecuteResult, StackEntry, StackValue, TraceEntry } from "./types.js";

const cloneStack = (stack: StackValue[]): StackValue[] => stack.map((value) => ({ ...value }));

const tokenLabel = (token: { kind: "literal"; value: StackValue } | { kind: "command"; name: string }): string =>
  token.kind === "literal" ? String(token.value.value) : token.name;

export class CalculatorSession {
  private state: CalculatorState = { stack: [] };
  private trace: TraceEntry[] = [];

  execute(input: string): ExecuteResult {
    const parsed = parseInput(input);
    this.trace = [];

    if (!parsed.ok) {
      return { ok: false, error: parsed.error, stack: this.getStack(), trace: this.trace };
    }

    for (const token of parsed.tokens) {
      const before = cloneStack(this.state.stack);
      const result = applyToken(this.state, token);
      this.state = result.state;
      const after = cloneStack(this.state.stack);

      if (!result.ok) {
        this.trace.push({ token: tokenLabel(token), ok: false, before, after, error: result.error });
        return { ok: false, error: result.error, stack: this.getStack(), trace: this.getTrace() };
      }

      this.trace.push({ token: tokenLabel(token), ok: true, before, after });
    }

    return { ok: true, stack: this.getStack(), trace: this.getTrace() };
  }

  getStack(): StackEntry[] {
    return this.state.stack
      .map((value, index, values) => ({ level: values.length - index, value: { ...value } }))
      .reverse();
  }

  getTrace(): TraceEntry[] {
    return this.trace.map((entry) => ({
      ...entry,
      before: cloneStack(entry.before),
      after: cloneStack(entry.after)
    }));
  }

  clear(): void {
    this.state = { stack: [] };
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
git commit -m "feat: add persistent calculator session"
```

---

### Task 6: Manual-Style Conformance Fixtures

**Files:**
- Create: `tests/conformance/manual-basic.test.ts`
- Create: `README.md`

- [ ] **Step 1: Write conformance tests**

Create `tests/conformance/manual-basic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CalculatorSession } from "../../src/session.js";

type ManualExample = {
  source: string;
  input: string;
  expectedStack: Array<{ level: number; value: { kind: "real"; value: number } }>;
};

const examples: ManualExample[] = [
  {
    source: "Project seed example: basic RPN addition",
    input: "2 3 +",
    expectedStack: [{ level: 1, value: { kind: "real", value: 5 } }]
  },
  {
    source: "Project seed example: stack duplication and square",
    input: "4 DUP SQ",
    expectedStack: [
      { level: 2, value: { kind: "real", value: 4 } },
      { level: 1, value: { kind: "real", value: 16 } }
    ]
  }
];

describe("manual-style conformance examples", () => {
  it.each(examples)("$source", ({ input, expectedStack }) => {
    const session = new CalculatorSession();
    expect(session.execute(input)).toMatchObject({ ok: true });
    expect(session.getStack()).toEqual(expectedStack);
  });
});
```

- [ ] **Step 2: Run conformance tests to verify they pass against current behavior**

Run: `npm test -- tests/conformance/manual-basic.test.ts`

Expected: PASS. This task adds the conformance harness using seed examples. Future manual examples should be added as new fixture entries with chapter, section, and page labels.

- [ ] **Step 3: Add README**

Create `README.md`:

```md
# rpn50

`rpn50` is a clean-room HP 50g-inspired RPN calculator engine with a persistent stack and an MCP interface.

It is not a ROM emulator and does not execute HP firmware. The goal is manual-compatible behavior for selected user-visible features, starting with real-number RPN arithmetic.

## Commands

- `npm test`: run tests.
- `npm run typecheck`: run TypeScript checks.
- `npm run build`: compile TypeScript.
- `npm run mcp`: run the MCP stdio server after building.

## Milestone 1 Scope

- Real-number stack.
- Stack commands: `DUP`, `DROP`, `SWAP`, `OVER`, `CLEAR`.
- Arithmetic commands: `+`, `-`, `*`, `/`, `NEG`, `INV`, `SQ`, `SQRT`.
- Persistent calculator session.
- MCP tools: `execute`, `get_stack`, `clear`, `get_trace`.

## Clean-Room Rule

Use public manuals and observable behavior as specifications. Do not copy HP ROM code, firmware internals, or proprietary emulator implementation details.
```

- [ ] **Step 4: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/conformance/manual-basic.test.ts README.md
git commit -m "test: add manual-style conformance harness"
```

---

### Task 7: MCP Server Tool Handlers

**Files:**
- Create: `src/mcp/server.ts`
- Create: `tests/mcp-server.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write MCP handler tests**

Create `tests/mcp-server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createCalculatorTools } from "../src/mcp/server.js";

describe("MCP calculator tool handlers", () => {
  it("executes commands against one persistent session", async () => {
    const tools = createCalculatorTools();
    expect(await tools.execute({ input: "2 3 +" })).toMatchObject({ ok: true });
    expect(await tools.execute({ input: "DUP" })).toMatchObject({ ok: true });
    expect(await tools.get_stack({})).toEqual({
      stack: [
        { level: 2, value: { kind: "real", value: 5 } },
        { level: 1, value: { kind: "real", value: 5 } }
      ]
    });
  });

  it("clears stack and trace through the tool surface", async () => {
    const tools = createCalculatorTools();
    await tools.execute({ input: "2 3 +" });
    await tools.clear({});
    expect(await tools.get_stack({})).toEqual({ stack: [] });
    expect(await tools.get_trace({})).toEqual({ trace: [] });
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
    clear: async (_args: Record<string, never>) => {
      session.clear();
      return { ok: true };
    },
    get_trace: async (_args: Record<string, never>) => ({ trace: session.getTrace() })
  };
}

export function createServer(session = new CalculatorSession()): McpServer {
  const server = new McpServer({ name: "rpn50", version: "0.1.0" });
  const tools = createCalculatorTools(session);

  server.tool("execute", { input: z.string() }, async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await tools.execute(args), null, 2) }]
  }));

  server.tool("get_stack", {}, async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await tools.get_stack(args), null, 2) }]
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
git commit -m "feat: expose calculator through MCP tools"
```

---

### Task 8: Final Verification

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

Expected: PASS and compiled files appear under `dist/`.

- [ ] **Step 4: Inspect git status**

Run: `git status --short`

Expected: no uncommitted source changes except generated `dist/` if the project does not ignore it. If `dist/` appears, add a `.gitignore` containing `dist/` and commit it with message `chore: ignore build output`.

---

## Self-Review

- Spec coverage: Tasks cover TypeScript setup, parser, real-number stack, stack commands, arithmetic commands, persistent session, trace, conformance harness, MCP tools, README, and final verification. Deferred GUI, symbolic, exact arithmetic, units, matrices, and multi-session support remain out of scope as specified.
- Placeholder scan: The plan contains concrete commands, file paths, test bodies, and implementation snippets. The conformance task uses explicit seed examples and defines how future manual references should be added.
- Type consistency: Shared types flow from `StackValue` to `CalculatorState`, `Token`, `ApplyResult`, `ExecuteResult`, and MCP handler return values. Function names are consistent across tests and implementation steps.
