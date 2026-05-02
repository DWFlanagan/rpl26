import type { CalculatorState, EvaluateResult, EvaluationObserver, LocalBindings, RplObject } from "./types.js";

export const BUILTIN_NAMES = [
  "EVAL",
  "STO",
  "+",
  "-",
  "*",
  "/",
  "NEG",
  "INV",
  "SQ",
  "SQRT",
  "DUP",
  "DUP2",
  "DROP",
  "DROP2",
  "SWAP",
  "OVER",
  "ROT",
  "PICK",
  "CLEAR",
  "->LIST",
  "LIST->",
  "SIZE",
  "GET",
  "TRUE",
  "FALSE",
  "==",
  "<>",
  "<",
  ">",
  "<=",
  ">=",
  "IF",
  "THEN",
  "ELSE",
  "END"
];

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

const real = (value: number): RplObject => ({ kind: "real", value });

const sourceOf = (object: RplObject): string => object.source ?? object.kind;
const isName = (object: RplObject, name: string): boolean => object.kind === "name" && object.name === name;

const typeMismatch = (state: CalculatorState, command: string): EvaluateResult => ({
  ok: false,
  state: cloneState(state),
  error: { code: "TypeMismatch", message: `${command} requires real arguments` }
});

const invalidOperation = (state: CalculatorState, message: string): EvaluateResult => ({
  ok: false,
  state: cloneState(state),
  error: { code: "InvalidOperation", message }
});

const typeError = (state: CalculatorState, message: string): EvaluateResult => ({
  ok: false,
  state: cloneState(state),
  error: { code: "TypeMismatch", message }
});

function integerValue(object: RplObject): number | undefined {
  return object.kind === "real" && Number.isInteger(object.value) ? object.value : undefined;
}

const push = (state: CalculatorState, object: RplObject): EvaluateResult => ({
  ok: true,
  state: { ...cloneState(state), stack: [...state.stack.map(cloneObject), cloneObject(object)] }
});

const replaceTop = (state: CalculatorState, value: number): EvaluateResult => ({
  ok: true,
  state: { ...cloneState(state), stack: [...state.stack.slice(0, -1).map(cloneObject), real(value)] }
});

const replaceTopTwo = (state: CalculatorState, value: number): EvaluateResult => ({
  ok: true,
  state: { ...cloneState(state), stack: [...state.stack.slice(0, -2).map(cloneObject), real(value)] }
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

function booleanResult(state: CalculatorState, value: boolean): EvaluateResult {
  return replaceTopTwo(state, value ? 1 : 0);
}

function comparableObject(object: RplObject): unknown {
  switch (object.kind) {
    case "program":
      return { kind: "program", body: object.body.map(comparableObject) };
    case "list":
      return { kind: "list", items: object.items.map(comparableObject) };
    case "real":
      return { kind: "real", value: object.value };
    case "name":
      return { kind: "name", name: object.name };
    case "quotedName":
      return { kind: "quotedName", name: object.name };
    case "string":
      return { kind: "string", value: object.value };
  }
}

function structurallyEqual(left: RplObject, right: RplObject): boolean {
  return JSON.stringify(comparableObject(left)) === JSON.stringify(comparableObject(right));
}

function binaryObject(state: CalculatorState, command: string, fn: (x: RplObject, y: RplObject) => EvaluateResult): EvaluateResult {
  if (state.stack.length < 2) return underflow(state, command, 2);
  const x = state.stack[state.stack.length - 2];
  const y = state.stack[state.stack.length - 1];
  return fn(x, y);
}

function evaluateProgram(
  state: CalculatorState,
  program: Extract<RplObject, { kind: "program" }>,
  observer?: EvaluationObserver,
  locals: LocalBindings = {}
): EvaluateResult {
  let current = cloneState(state);
  for (let index = 0; index < program.body.length; index += 1) {
    const object = program.body[index];
    const before = current.stack.map(cloneObject);
    const special =
      object.kind === "name" && object.name === "->"
        ? bindLocals(current, program.body, index, locals, observer)
        : object.kind === "name" && object.name === "IF"
          ? evaluateConditional(current, program.body, index, locals, observer)
          : undefined;
    const result = special?.result ?? evaluateObject(current, object, observer, locals);
    current = result.state;
    const after = current.stack.map(cloneObject);

    if (!result.ok) {
      observer?.({ source: sourceOf(object), ok: false, before, after, error: result.error });
      return { ...result, state: cloneState(state) };
    }

    observer?.({ source: sourceOf(object), ok: true, before, after });
    if (special !== undefined) {
      index = special.nextIndex;
    }
  }
  return { ok: true, state: current };
}

function evaluateConditional(
  state: CalculatorState,
  body: RplObject[],
  ifIndex: number,
  locals: LocalBindings,
  observer?: EvaluationObserver
): { result: EvaluateResult; nextIndex: number } {
  if (!isName(body[ifIndex + 1], "THEN")) {
    return {
      result: invalidOperation(state, "IF requires THEN"),
      nextIndex: ifIndex
    };
  }

  const branchEnd = findConditionalEnd(body, ifIndex + 2);
  if (branchEnd === undefined) {
    return {
      result: invalidOperation(state, "IF requires END"),
      nextIndex: body.length - 1
    };
  }

  if (state.stack.length < 1) {
    return { result: underflow(state, "IF", 1), nextIndex: branchEnd.endIndex };
  }

  const next = cloneState(state);
  const condition = next.stack.pop() as RplObject;
  if (condition.kind !== "real") {
    return { result: typeError(state, "IF requires a real truth value"), nextIndex: branchEnd.endIndex };
  }

  const trueBody = body.slice(ifIndex + 2, branchEnd.elseIndex ?? branchEnd.endIndex);
  const falseBody = branchEnd.elseIndex === undefined ? [] : body.slice(branchEnd.elseIndex + 1, branchEnd.endIndex);
  const selectedBody = condition.value !== 0 ? trueBody : falseBody;
  const result = evaluateProgram(next, { kind: "program", body: selectedBody }, observer, locals);
  if (!result.ok) return { result: { ...result, state: cloneState(state) }, nextIndex: branchEnd.endIndex };
  return { result, nextIndex: branchEnd.endIndex };
}

function findConditionalEnd(body: RplObject[], startIndex: number): { elseIndex?: number; endIndex: number } | undefined {
  let depth = 0;
  let elseIndex: number | undefined;

  for (let index = startIndex; index < body.length; index += 1) {
    const object = body[index];
    if (isName(object, "IF")) {
      depth += 1;
      continue;
    }
    if (isName(object, "END")) {
      if (depth === 0) return { elseIndex, endIndex: index };
      depth -= 1;
      continue;
    }
    if (depth === 0 && elseIndex === undefined && isName(object, "ELSE")) {
      elseIndex = index;
    }
  }

  return undefined;
}

function bindLocals(
  state: CalculatorState,
  body: RplObject[],
  arrowIndex: number,
  locals: LocalBindings,
  observer?: EvaluationObserver
): { result: EvaluateResult; nextIndex: number } {
  const names: string[] = [];
  let bodyIndex = arrowIndex + 1;

  while (bodyIndex < body.length && body[bodyIndex].kind === "name") {
    names.push((body[bodyIndex] as Extract<RplObject, { kind: "name" }>).name);
    bodyIndex += 1;
  }

  const localBody = body[bodyIndex];
  if (names.length === 0 || localBody?.kind !== "program") {
    return {
      result: {
        ok: false,
        state: cloneState(state),
        error: { code: "InvalidOperation", message: "-> requires local names followed by a program" }
      },
      nextIndex: bodyIndex
    };
  }

  if (state.stack.length < names.length) {
    return { result: underflow(state, "->", names.length), nextIndex: bodyIndex };
  }

  const next = cloneState(state);
  const values = next.stack.splice(next.stack.length - names.length, names.length);
  const localValues = Object.fromEntries(names.map((name, index) => [name, cloneObject(values[index])]));
  const result = evaluateProgram(next, localBody, observer, { ...locals, ...localValues });
  return { result, nextIndex: bodyIndex };
}

function applyBuiltin(state: CalculatorState, name: string, observer?: EvaluationObserver, locals: LocalBindings = {}): EvaluateResult | undefined {
  const next = cloneState(state);

  switch (name) {
    case "EVAL": {
      if (next.stack.length < 1) return underflow(state, "EVAL", 1);
      const object = next.stack.pop() as RplObject;
      if (object.kind === "program") {
        const result = evaluateProgram(next, object, observer, locals);
        if (!result.ok) return { ...result, state: cloneState(state) };
        return result;
      }
      return evaluateObject(next, object, observer, locals);
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
    case "+":
      return binaryReal(state, "+", (x, y) => replaceTopTwo(state, x + y));
    case "-":
      return binaryReal(state, "-", (x, y) => replaceTopTwo(state, x - y));
    case "*":
      return binaryReal(state, "*", (x, y) => replaceTopTwo(state, x * y));
    case "/":
      return binaryReal(state, "/", (x, y) => {
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
      return unaryReal(state, "NEG", (x) => replaceTop(state, -x));
    case "INV":
      return unaryReal(state, "INV", (x) => {
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
      return unaryReal(state, "SQ", (x) => replaceTop(state, x * x));
    case "SQRT":
      return unaryReal(state, "SQRT", (x) => {
        if (x < 0) {
          return {
            ok: false,
            state: cloneState(state),
            error: { code: "InvalidOperation", message: "SQRT requires a non-negative real" }
          };
        }
        return replaceTop(state, Math.sqrt(x));
      });
    case "DUP": {
      if (next.stack.length < 1) return underflow(state, "DUP", 1);
      next.stack.push(cloneObject(next.stack[next.stack.length - 1]));
      return { ok: true, state: next };
    }
    case "DUP2": {
      if (next.stack.length < 2) return underflow(state, "DUP2", 2);
      next.stack.push(cloneObject(next.stack[next.stack.length - 2]), cloneObject(next.stack[next.stack.length - 1]));
      return { ok: true, state: next };
    }
    case "DROP": {
      if (next.stack.length < 1) return underflow(state, "DROP", 1);
      next.stack.pop();
      return { ok: true, state: next };
    }
    case "DROP2": {
      if (next.stack.length < 2) return underflow(state, "DROP2", 2);
      next.stack.pop();
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
    case "ROT": {
      if (next.stack.length < 3) return underflow(state, "ROT", 3);
      const z = next.stack.pop() as RplObject;
      const y = next.stack.pop() as RplObject;
      const x = next.stack.pop() as RplObject;
      next.stack.push(y, z, x);
      return { ok: true, state: next };
    }
    case "PICK": {
      if (next.stack.length < 1) return underflow(state, "PICK", 1);
      const count = integerValue(next.stack[next.stack.length - 1]);
      if (count === undefined || count < 1) return invalidOperation(state, "PICK requires a positive integer level");
      next.stack.pop();
      if (next.stack.length < count) return underflow(state, "PICK", count + 1);
      next.stack.push(cloneObject(next.stack[next.stack.length - count]));
      return { ok: true, state: next };
    }
    case "CLEAR":
      return { ok: true, state: { stack: [], variables: next.variables } };
    case "->LIST": {
      if (next.stack.length < 1) return underflow(state, "->LIST", 1);
      const count = integerValue(next.stack[next.stack.length - 1]);
      if (count === undefined || count < 0) return invalidOperation(state, "->LIST requires a non-negative integer count");
      next.stack.pop();
      if (next.stack.length < count) return underflow(state, "->LIST", count + 1);
      const items = next.stack.splice(next.stack.length - count, count);
      next.stack.push({ kind: "list", items: items.map(cloneObject) });
      return { ok: true, state: next };
    }
    case "LIST->": {
      if (next.stack.length < 1) return underflow(state, "LIST->", 1);
      const object = next.stack.pop() as RplObject;
      if (object.kind !== "list") return typeError(state, "LIST-> requires a list");
      next.stack.push(...object.items.map(cloneObject), real(object.items.length));
      return { ok: true, state: next };
    }
    case "SIZE": {
      if (next.stack.length < 1) return underflow(state, "SIZE", 1);
      const object = next.stack.pop() as RplObject;
      if (object.kind !== "list") return typeError(state, "SIZE requires a list");
      next.stack.push(real(object.items.length));
      return { ok: true, state: next };
    }
    case "GET": {
      if (next.stack.length < 2) return underflow(state, "GET", 2);
      const index = integerValue(next.stack[next.stack.length - 1]);
      const object = next.stack[next.stack.length - 2];
      if (object.kind !== "list") return typeError(state, "GET requires a list and index");
      if (index === undefined || index < 1 || index > object.items.length) return invalidOperation(state, "GET index out of range");
      next.stack.pop();
      next.stack.pop();
      next.stack.push(cloneObject(object.items[index - 1]));
      return { ok: true, state: next };
    }
    case "TRUE":
      return push(state, real(1));
    case "FALSE":
      return push(state, real(0));
    case "==":
      return binaryObject(state, "==", (x, y) => booleanResult(state, structurallyEqual(x, y)));
    case "<>":
      return binaryObject(state, "<>", (x, y) => booleanResult(state, !structurallyEqual(x, y)));
    case "<":
      return binaryReal(state, "<", (x, y) => booleanResult(state, x < y));
    case ">":
      return binaryReal(state, ">", (x, y) => booleanResult(state, x > y));
    case "<=":
      return binaryReal(state, "<=", (x, y) => booleanResult(state, x <= y));
    case ">=":
      return binaryReal(state, ">=", (x, y) => booleanResult(state, x >= y));
    default:
      return undefined;
  }
}

export function evaluateObject(
  state: CalculatorState,
  object: RplObject,
  observer?: EvaluationObserver,
  locals: LocalBindings = {}
): EvaluateResult {
  if (object.kind !== "name") {
    return push(state, object);
  }

  const builtin = applyBuiltin(state, object.name, observer, locals);
  if (builtin !== undefined) return builtin;

  const local = locals[object.name];
  if (local !== undefined) {
    return push(state, local);
  }

  const variable = state.variables[object.name];
  if (variable !== undefined) {
    if (variable.kind === "program") {
      return evaluateProgram(state, variable, observer);
    }
    return push(state, variable);
  }

  return {
    ok: false,
    state: cloneState(state),
    error: { code: "UndefinedName", message: `Undefined name: ${object.name}` }
  };
}
