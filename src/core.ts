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

const real = (value: number): RplObject => ({ kind: "real", value });

const typeMismatch = (state: CalculatorState, command: string): EvaluateResult => ({
  ok: false,
  state: cloneState(state),
  error: { code: "TypeMismatch", message: `${command} requires real arguments` }
});

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

function applyBuiltin(state: CalculatorState, name: string): EvaluateResult | undefined {
  const next = cloneState(state);

  switch (name) {
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
