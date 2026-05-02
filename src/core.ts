import type { CalculatorState, EvaluateResult, EvaluationObserver, LocalBindings, RplObject } from "./types.js";
import { formatObject } from "./format.js";
export { BUILTIN_NAMES } from "./words.js";

export const cloneObject = (object: RplObject): RplObject => {
  switch (object.kind) {
    case "program":
      return { ...object, body: object.body.map(cloneObject) };
    case "list":
      return { ...object, items: object.items.map(cloneObject) };
    case "tagged":
      return { ...object, value: cloneObject(object.value) };
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
const nameOf = (object: RplObject): string | undefined => (object.kind === "name" ? object.name : undefined);
const LOOP_LIMIT = 10000;

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

function requireRange(state: CalculatorState, command: string, length: number): { ok: true; start: number; end: number } | { ok: false; result: EvaluateResult } {
  const start = integerValue(state.stack[state.stack.length - 2]);
  const end = integerValue(state.stack[state.stack.length - 1]);
  if (start === undefined || end === undefined) {
    return { ok: false, result: invalidOperation(state, `${command} requires integer indexes`) };
  }
  if (start < 1 || end < start || end > length) {
    return { ok: false, result: invalidOperation(state, `${command} index out of range`) };
  }
  return { ok: true, start, end };
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
    case "tagged":
      return { kind: "tagged", tag: object.tag, value: comparableObject(object.value) };
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
          : object.kind === "name" && object.name === "START"
            ? evaluateStartLoop(current, program.body, index, locals, observer)
            : object.kind === "name" && object.name === "FOR"
              ? evaluateForLoop(current, program.body, index, locals, observer)
              : object.kind === "name" && object.name === "WHILE"
                ? evaluateWhileLoop(current, program.body, index, locals, observer)
                : object.kind === "name" && object.name === "DO"
                  ? evaluateDoLoop(current, program.body, index, locals, observer)
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
  const thenIndex = findTopLevelMarker(body, ifIndex + 1, ["THEN"]);
  if (thenIndex === undefined) {
    return {
      result: invalidOperation(state, "IF requires THEN"),
      nextIndex: ifIndex
    };
  }

  const branchEnd = findTopLevelMarker(body, thenIndex + 1, ["ELSE", "END"]);
  if (branchEnd === undefined) {
    return {
      result: invalidOperation(state, "IF requires END"),
      nextIndex: body.length - 1
    };
  }
  const elseIndex = isName(body[branchEnd], "ELSE") ? branchEnd : undefined;
  const endIndex = elseIndex === undefined ? branchEnd : findTopLevelMarker(body, elseIndex + 1, ["END"]);
  if (endIndex === undefined) {
    return {
      result: invalidOperation(state, "IF requires END"),
      nextIndex: body.length - 1
    };
  }

  const testResult = evaluateProgram(state, { kind: "program", body: body.slice(ifIndex + 1, thenIndex) }, observer, locals);
  if (!testResult.ok) return { result: testResult, nextIndex: endIndex };

  const truth = popTruth(testResult.state, "IF");
  if (!truth.ok) return { result: truth.result, nextIndex: endIndex };

  const trueBody = body.slice(thenIndex + 1, elseIndex ?? endIndex);
  const falseBody = elseIndex === undefined ? [] : body.slice(elseIndex + 1, endIndex);
  const selectedBody = truth.value !== 0 ? trueBody : falseBody;
  const result = evaluateProgram(truth.state, { kind: "program", body: selectedBody }, observer, locals);
  return { result, nextIndex: endIndex };
}

function findTopLevelMarker(body: RplObject[], startIndex: number, markers: string[]): number | undefined {
  let depth = 0;

  for (let index = startIndex; index < body.length; index += 1) {
    const name = nameOf(body[index]);
    if (name === undefined) continue;
    if (depth === 0 && markers.includes(name)) return index;

    if (isBlockOpener(name)) {
      depth += 1;
      continue;
    }
    if (depth > 0 && isBlockCloser(name)) {
      depth -= 1;
    }
  }

  return undefined;
}

function isBlockOpener(name: string): boolean {
  return name === "IF" || name === "START" || name === "FOR" || name === "WHILE" || name === "DO";
}

function isBlockCloser(name: string): boolean {
  return name === "END" || name === "NEXT" || name === "STEP";
}

function popTruth(state: CalculatorState, command: string): { ok: true; state: CalculatorState; value: number } | { ok: false; result: EvaluateResult } {
  if (state.stack.length < 1) return { ok: false, result: underflow(state, command, 1) };
  const next = cloneState(state);
  const condition = next.stack.pop() as RplObject;
  if (condition.kind !== "real") {
    return { ok: false, result: typeError(state, `${command} requires a real truth value`) };
  }
  return { ok: true, state: next, value: condition.value };
}

function popReal(state: CalculatorState, command: string): { ok: true; state: CalculatorState; value: number } | { ok: false; result: EvaluateResult } {
  if (state.stack.length < 1) return { ok: false, result: underflow(state, command, 1) };
  const next = cloneState(state);
  const object = next.stack.pop() as RplObject;
  if (object.kind !== "real") return { ok: false, result: typeError(state, `${command} requires a real argument`) };
  return { ok: true, state: next, value: object.value };
}

function popLoopBounds(
  state: CalculatorState,
  command: string
): { ok: true; state: CalculatorState; start: number; finish: number } | { ok: false; result: EvaluateResult } {
  if (state.stack.length < 2) return { ok: false, result: underflow(state, command, 2) };
  const next = cloneState(state);
  const finish = next.stack.pop() as RplObject;
  const start = next.stack.pop() as RplObject;
  if (start.kind !== "real" || finish.kind !== "real") {
    return { ok: false, result: typeError(state, `${command} requires real loop bounds`) };
  }
  return { ok: true, state: next, start: start.value, finish: finish.value };
}

function shouldRepeat(counter: number, finish: number, step: number): boolean {
  return step > 0 ? counter <= finish : counter >= finish;
}

function evaluateStartLoop(
  state: CalculatorState,
  body: RplObject[],
  startIndex: number,
  locals: LocalBindings,
  observer?: EvaluationObserver
): { result: EvaluateResult; nextIndex: number } {
  const endIndex = findTopLevelMarker(body, startIndex + 1, ["NEXT", "STEP"]);
  if (endIndex === undefined) {
    return { result: invalidOperation(state, "START requires NEXT or STEP"), nextIndex: body.length - 1 };
  }

  const bounds = popLoopBounds(state, "START");
  if (!bounds.ok) return { result: bounds.result, nextIndex: endIndex };

  const loopBody = body.slice(startIndex + 1, endIndex);
  const stepped = isName(body[endIndex], "STEP");
  let current = bounds.state;
  let counter = bounds.start;

  for (let iterations = 0; iterations < LOOP_LIMIT; iterations += 1) {
    const bodyResult = evaluateProgram(current, { kind: "program", body: loopBody }, observer, locals);
    if (!bodyResult.ok) return { result: bodyResult, nextIndex: endIndex };
    current = bodyResult.state;

    if (!stepped) {
      counter += 1;
      if (!shouldRepeat(counter, bounds.finish, 1)) return { result: { ok: true, state: current }, nextIndex: endIndex };
      continue;
    }

    const step = popReal(current, "STEP");
    if (!step.ok) return { result: step.result, nextIndex: endIndex };
    if (step.value === 0) return { result: invalidOperation(current, "STEP requires a non-zero increment"), nextIndex: endIndex };
    current = step.state;
    counter += step.value;
    if (!shouldRepeat(counter, bounds.finish, step.value)) return { result: { ok: true, state: current }, nextIndex: endIndex };
  }

  return { result: invalidOperation(state, "Loop iteration limit exceeded"), nextIndex: endIndex };
}

function evaluateForLoop(
  state: CalculatorState,
  body: RplObject[],
  forIndex: number,
  locals: LocalBindings,
  observer?: EvaluationObserver
): { result: EvaluateResult; nextIndex: number } {
  const counterName = body[forIndex + 1];
  if (counterName?.kind !== "name") {
    return { result: invalidOperation(state, "FOR requires a loop variable name"), nextIndex: forIndex };
  }

  const endIndex = findTopLevelMarker(body, forIndex + 2, ["NEXT", "STEP"]);
  if (endIndex === undefined) {
    return { result: invalidOperation(state, "FOR requires NEXT or STEP"), nextIndex: body.length - 1 };
  }

  const bounds = popLoopBounds(state, "FOR");
  if (!bounds.ok) return { result: bounds.result, nextIndex: endIndex };

  const loopBody = body.slice(forIndex + 2, endIndex);
  const stepped = isName(body[endIndex], "STEP");
  let current = bounds.state;
  let counter = bounds.start;

  for (let iterations = 0; iterations < LOOP_LIMIT; iterations += 1) {
    const bodyResult = evaluateProgram(current, { kind: "program", body: loopBody }, observer, {
      ...locals,
      [counterName.name]: real(counter)
    });
    if (!bodyResult.ok) return { result: bodyResult, nextIndex: endIndex };
    current = bodyResult.state;

    if (!stepped) {
      counter += 1;
      if (!shouldRepeat(counter, bounds.finish, 1)) return { result: { ok: true, state: current }, nextIndex: endIndex };
      continue;
    }

    const step = popReal(current, "STEP");
    if (!step.ok) return { result: step.result, nextIndex: endIndex };
    if (step.value === 0) return { result: invalidOperation(current, "STEP requires a non-zero increment"), nextIndex: endIndex };
    current = step.state;
    counter += step.value;
    if (!shouldRepeat(counter, bounds.finish, step.value)) return { result: { ok: true, state: current }, nextIndex: endIndex };
  }

  return { result: invalidOperation(state, "Loop iteration limit exceeded"), nextIndex: endIndex };
}

function evaluateWhileLoop(
  state: CalculatorState,
  body: RplObject[],
  whileIndex: number,
  locals: LocalBindings,
  observer?: EvaluationObserver
): { result: EvaluateResult; nextIndex: number } {
  const repeatIndex = findTopLevelMarker(body, whileIndex + 1, ["REPEAT"]);
  if (repeatIndex === undefined) {
    return { result: invalidOperation(state, "WHILE requires REPEAT"), nextIndex: whileIndex };
  }

  const endIndex = findTopLevelMarker(body, repeatIndex + 1, ["END"]);
  if (endIndex === undefined) {
    return { result: invalidOperation(state, "WHILE requires END"), nextIndex: body.length - 1 };
  }

  const testBody = body.slice(whileIndex + 1, repeatIndex);
  const loopBody = body.slice(repeatIndex + 1, endIndex);
  let current = cloneState(state);

  for (let iterations = 0; iterations < LOOP_LIMIT; iterations += 1) {
    const testResult = evaluateProgram(current, { kind: "program", body: testBody }, observer, locals);
    if (!testResult.ok) return { result: testResult, nextIndex: endIndex };
    const truth = popTruth(testResult.state, "WHILE");
    if (!truth.ok) return { result: truth.result, nextIndex: endIndex };
    current = truth.state;
    if (truth.value === 0) return { result: { ok: true, state: current }, nextIndex: endIndex };

    const bodyResult = evaluateProgram(current, { kind: "program", body: loopBody }, observer, locals);
    if (!bodyResult.ok) return { result: bodyResult, nextIndex: endIndex };
    current = bodyResult.state;
  }

  return { result: invalidOperation(state, "Loop iteration limit exceeded"), nextIndex: endIndex };
}

function evaluateDoLoop(
  state: CalculatorState,
  body: RplObject[],
  doIndex: number,
  locals: LocalBindings,
  observer?: EvaluationObserver
): { result: EvaluateResult; nextIndex: number } {
  const untilIndex = findTopLevelMarker(body, doIndex + 1, ["UNTIL"]);
  if (untilIndex === undefined) {
    return { result: invalidOperation(state, "DO requires UNTIL"), nextIndex: doIndex };
  }

  const endIndex = findTopLevelMarker(body, untilIndex + 1, ["END"]);
  if (endIndex === undefined) {
    return { result: invalidOperation(state, "DO requires END"), nextIndex: body.length - 1 };
  }

  const loopBody = body.slice(doIndex + 1, untilIndex);
  const testBody = body.slice(untilIndex + 1, endIndex);
  let current = cloneState(state);

  for (let iterations = 0; iterations < LOOP_LIMIT; iterations += 1) {
    const bodyResult = evaluateProgram(current, { kind: "program", body: loopBody }, observer, locals);
    if (!bodyResult.ok) return { result: bodyResult, nextIndex: endIndex };

    const testResult = evaluateProgram(bodyResult.state, { kind: "program", body: testBody }, observer, locals);
    if (!testResult.ok) return { result: testResult, nextIndex: endIndex };
    const truth = popTruth(testResult.state, "DO");
    if (!truth.ok) return { result: truth.result, nextIndex: endIndex };
    current = truth.state;
    if (truth.value !== 0) return { result: { ok: true, state: current }, nextIndex: endIndex };
  }

  return { result: invalidOperation(state, "Loop iteration limit exceeded"), nextIndex: endIndex };
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
    case "HEAD": {
      if (next.stack.length < 1) return underflow(state, "HEAD", 1);
      const object = next.stack.pop() as RplObject;
      if (object.kind === "string") {
        if (object.value.length === 0) return invalidOperation(state, "HEAD requires a non-empty string");
        next.stack.push({ kind: "string", value: Array.from(object.value)[0] ?? "" });
        return { ok: true, state: next };
      }
      if (object.kind === "list") {
        if (object.items.length === 0) return invalidOperation(state, "HEAD requires a non-empty list");
        next.stack.push(cloneObject(object.items[0]));
        return { ok: true, state: next };
      }
      return typeError(state, "HEAD requires a list or string");
    }
    case "TRIL": {
      if (next.stack.length < 1) return underflow(state, "TRIL", 1);
      const object = next.stack.pop() as RplObject;
      if (object.kind === "string") {
        if (object.value.length === 0) return invalidOperation(state, "TRIL requires a non-empty string");
        next.stack.push({ kind: "string", value: Array.from(object.value).slice(1).join("") });
        return { ok: true, state: next };
      }
      if (object.kind === "list") {
        if (object.items.length === 0) return invalidOperation(state, "TRIL requires a non-empty list");
        next.stack.push({ kind: "list", items: object.items.slice(1).map(cloneObject) });
        return { ok: true, state: next };
      }
      return typeError(state, "TRIL requires a list or string");
    }
    case "SUB": {
      if (next.stack.length < 3) return underflow(state, "SUB", 3);
      const target = next.stack[next.stack.length - 3];
      const length = target.kind === "string" ? Array.from(target.value).length : target.kind === "list" ? target.items.length : undefined;
      if (length === undefined) return typeError(state, "SUB requires a list or string with start and end indexes");
      const range = requireRange(next, "SUB", length);
      if (!range.ok) return range.result;
      next.stack.pop();
      next.stack.pop();
      next.stack.pop();
      if (target.kind === "string") {
        next.stack.push({ kind: "string", value: Array.from(target.value).slice(range.start - 1, range.end).join("") });
      } else if (target.kind === "list") {
        next.stack.push({ kind: "list", items: target.items.slice(range.start - 1, range.end).map(cloneObject) });
      }
      return { ok: true, state: next };
    }
    case "POS": {
      if (next.stack.length < 2) return underflow(state, "POS", 2);
      const needle = next.stack.pop() as RplObject;
      const haystack = next.stack.pop() as RplObject;
      if (haystack.kind === "string") {
        if (needle.kind !== "string") return typeError(state, "POS requires a string substring for string search");
        const index = haystack.value.indexOf(needle.value);
        next.stack.push(real(index < 0 ? 0 : index + 1));
        return { ok: true, state: next };
      }
      if (haystack.kind === "list") {
        const index = haystack.items.findIndex((item) => structurallyEqual(item, needle));
        next.stack.push(real(index < 0 ? 0 : index + 1));
        return { ok: true, state: next };
      }
      return typeError(state, "POS requires a list or string");
    }
    case "CHR": {
      if (next.stack.length < 1) return underflow(state, "CHR", 1);
      const code = integerValue(next.stack[next.stack.length - 1]);
      if (code === undefined || code < 0) return invalidOperation(state, "CHR requires a non-negative integer character code");
      next.stack.pop();
      next.stack.push({ kind: "string", value: String.fromCodePoint(code) });
      return { ok: true, state: next };
    }
    case "NUM": {
      if (next.stack.length < 1) return underflow(state, "NUM", 1);
      const object = next.stack.pop() as RplObject;
      if (object.kind !== "string") return typeError(state, "NUM requires a string");
      const first = Array.from(object.value)[0];
      if (first === undefined) return invalidOperation(state, "NUM requires a non-empty string");
      next.stack.push(real(first.codePointAt(0) ?? 0));
      return { ok: true, state: next };
    }
    case "->STR": {
      if (next.stack.length < 1) return underflow(state, "->STR", 1);
      const object = next.stack.pop() as RplObject;
      next.stack.push({ kind: "string", value: formatObject(object) });
      return { ok: true, state: next };
    }
    case "->TAG": {
      if (next.stack.length < 2) return underflow(state, "->TAG", 2);
      const tagObject = next.stack.pop() as RplObject;
      const value = next.stack.pop() as RplObject;
      if (tagObject.kind !== "string" && tagObject.kind !== "quotedName") {
        return typeError(state, "->TAG requires a string or quoted name tag");
      }
      next.stack.push({ kind: "tagged", tag: tagObject.kind === "string" ? tagObject.value : tagObject.name, value: cloneObject(value) });
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
