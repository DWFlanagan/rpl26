import type { CalculatorError, ParseResult, RplObject } from "./types.js";

const REAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const INVALID_NUMERIC_PATTERN = /^[+-]?[.\d]+(?:[eE][+-]?[.\d]*)?$/;
const SIMPLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

type LexToken = { text: string };

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
      let closed = false;
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
          closed = true;
          tokens.push({ text });
          break;
        }
      }
      if (!closed) {
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

function parseObjects(
  tokens: LexToken[],
  stop: string | undefined
): { objects: RplObject[]; index: number } | CalculatorError {
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
      const source = tokens
        .slice(index, index + consumed)
        .map((token) => token.text)
        .join(" ");
      objects.push({ kind: "program", body: nested.objects, source });
      index += consumed;
      continue;
    }

    if (text === "{") {
      const nested = parseObjects(tokens.slice(index + 1), "}");
      if ("code" in nested) return nested;
      const consumed = nested.index + 1;
      const source = tokens
        .slice(index, index + consumed)
        .map((token) => token.text)
        .join(" ");
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
      const value = Number(text);
      if (!Number.isFinite(value)) {
        return { code: "InvalidToken", message: `Invalid token: ${text}` };
      }
      objects.push({ kind: "real", value, source: text });
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
