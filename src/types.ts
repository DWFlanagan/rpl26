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

export type CalculatorState = {
  stack: RplObject[];
  variables: Record<string, RplObject>;
};

export type EvaluateResult =
  | { ok: true; state: CalculatorState }
  | { ok: false; state: CalculatorState; error: CalculatorError };
