import type { RplObject } from "./types.js";

export type StyleToken = "number" | "string" | "program" | "list" | "tagged" | "name" | "success" | "error" | "warning" | "dim" | "focus";

export type StyleOptions = {
  color: boolean;
};

const ANSI: Record<StyleToken, [string, string]> = {
  number: ["\u001b[36m", "\u001b[39m"],
  string: ["\u001b[32m", "\u001b[39m"],
  program: ["\u001b[33m", "\u001b[39m"],
  list: ["\u001b[34m", "\u001b[39m"],
  tagged: ["\u001b[35m", "\u001b[39m"],
  name: ["\u001b[2m", "\u001b[22m"],
  success: ["\u001b[32m", "\u001b[39m"],
  error: ["\u001b[31m", "\u001b[39m"],
  warning: ["\u001b[33m", "\u001b[39m"],
  dim: ["\u001b[2m", "\u001b[22m"],
  focus: ["\u001b[7m", "\u001b[27m"]
};

export function styleObjectKind(kind: RplObject["kind"]): StyleToken {
  switch (kind) {
    case "real":
      return "number";
    case "string":
      return "string";
    case "program":
      return "program";
    case "list":
      return "list";
    case "tagged":
      return "tagged";
    case "name":
    case "quotedName":
      return "name";
  }
}

export function styleText(text: string, token: StyleToken, options: StyleOptions): string {
  if (!options.color) return text;
  const [open, close] = ANSI[token];
  return `${open}${text}${close}`;
}
