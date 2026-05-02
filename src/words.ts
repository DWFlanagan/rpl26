export type WordCategory = "core" | "stack" | "math" | "list" | "string" | "object" | "logic" | "control";

export type WordMetadata = {
  name: string;
  category: WordCategory;
  stack: string;
  description: string;
  source: string;
};

const word = (metadata: WordMetadata): WordMetadata => metadata;

export const WORDS: Record<string, WordMetadata> = {
  EVAL: word({
    name: "EVAL",
    category: "core",
    stack: "program|object -> ...",
    description: "Evaluate a program object or evaluate the object in level 1.",
    source: "rpl26 Milestone 1"
  }),
  STO: word({
    name: "STO",
    category: "core",
    stack: "object 'name' ->",
    description: "Store an object in a global variable.",
    source: "rpl26 Milestone 1"
  }),
  "+": word({ name: "+", category: "math", stack: "real real -> real", description: "Add two real numbers.", source: "rpl26 Milestone 1" }),
  "-": word({
    name: "-",
    category: "math",
    stack: "real real -> real",
    description: "Subtract level 1 from level 2.",
    source: "rpl26 Milestone 1"
  }),
  "*": word({ name: "*", category: "math", stack: "real real -> real", description: "Multiply two real numbers.", source: "rpl26 Milestone 1" }),
  "/": word({
    name: "/",
    category: "math",
    stack: "real real -> real",
    description: "Divide level 2 by level 1.",
    source: "rpl26 Milestone 1"
  }),
  NEG: word({ name: "NEG", category: "math", stack: "real -> real", description: "Negate a real number.", source: "rpl26 Milestone 1" }),
  INV: word({ name: "INV", category: "math", stack: "real -> real", description: "Invert a real number.", source: "rpl26 Milestone 1" }),
  SQ: word({ name: "SQ", category: "math", stack: "real -> real", description: "Square a real number.", source: "rpl26 Milestone 1" }),
  SQRT: word({
    name: "SQRT",
    category: "math",
    stack: "real -> real",
    description: "Return the square root of a non-negative real number.",
    source: "rpl26 Milestone 1"
  }),
  DUP: word({ name: "DUP", category: "stack", stack: "object -> object object", description: "Duplicate level 1.", source: "rpl26 Milestone 1" }),
  DUP2: word({
    name: "DUP2",
    category: "stack",
    stack: "object object -> object object object object",
    description: "Duplicate levels 2 and 1.",
    source: "rpl26 Milestone 2"
  }),
  DROP: word({ name: "DROP", category: "stack", stack: "object ->", description: "Drop level 1.", source: "rpl26 Milestone 1" }),
  DROP2: word({ name: "DROP2", category: "stack", stack: "object object ->", description: "Drop levels 2 and 1.", source: "rpl26 Milestone 2" }),
  SWAP: word({
    name: "SWAP",
    category: "stack",
    stack: "object1 object2 -> object2 object1",
    description: "Swap levels 2 and 1.",
    source: "rpl26 Milestone 1"
  }),
  OVER: word({ name: "OVER", category: "stack", stack: "object1 object2 -> object1 object2 object1", description: "Copy level 2.", source: "rpl26 Milestone 1" }),
  ROT: word({
    name: "ROT",
    category: "stack",
    stack: "object1 object2 object3 -> object2 object3 object1",
    description: "Rotate level 3 to level 1.",
    source: "rpl26 Milestone 2"
  }),
  PICK: word({ name: "PICK", category: "stack", stack: "... n -> ... object", description: "Copy the requested stack level.", source: "rpl26 Milestone 2" }),
  CLEAR: word({ name: "CLEAR", category: "stack", stack: "... ->", description: "Clear the stack.", source: "rpl26 Milestone 1" }),
  "->LIST": word({ name: "->LIST", category: "list", stack: "objects... n -> list", description: "Collect objects into a list.", source: "rpl26 Milestone 2" }),
  "LIST->": word({ name: "LIST->", category: "list", stack: "list -> elements... n", description: "Expand a list and push its count.", source: "rpl26 Milestone 2" }),
  SIZE: word({ name: "SIZE", category: "list", stack: "list -> real", description: "Return list length.", source: "rpl26 Milestone 2" }),
  GET: word({ name: "GET", category: "list", stack: "list index -> object", description: "Get a one-based list element.", source: "rpl26 Milestone 2" }),
  TRUE: word({ name: "TRUE", category: "logic", stack: "-> 1", description: "Push true as real 1.", source: "rpl26 Milestone 2" }),
  FALSE: word({ name: "FALSE", category: "logic", stack: "-> 0", description: "Push false as real 0.", source: "rpl26 Milestone 2" }),
  "==": word({ name: "==", category: "logic", stack: "object object -> 0|1", description: "Compare objects structurally.", source: "rpl26 Milestone 2" }),
  "<>": word({ name: "<>", category: "logic", stack: "object object -> 0|1", description: "Return whether objects differ structurally.", source: "rpl26 Milestone 2" }),
  "<": word({ name: "<", category: "logic", stack: "real real -> 0|1", description: "Compare real numbers.", source: "rpl26 Milestone 2" }),
  ">": word({ name: ">", category: "logic", stack: "real real -> 0|1", description: "Compare real numbers.", source: "rpl26 Milestone 2" }),
  "<=": word({ name: "<=", category: "logic", stack: "real real -> 0|1", description: "Compare real numbers.", source: "rpl26 Milestone 2" }),
  ">=": word({ name: ">=", category: "logic", stack: "real real -> 0|1", description: "Compare real numbers.", source: "rpl26 Milestone 2" }),
  IF: word({ name: "IF", category: "control", stack: "IF test THEN body END", description: "Begin an HP-style conditional.", source: "HP 48G control-flow notes" }),
  THEN: word({ name: "THEN", category: "control", stack: "IF test THEN body END", description: "Separate conditional test from true clause.", source: "HP 48G control-flow notes" }),
  ELSE: word({ name: "ELSE", category: "control", stack: "IF test THEN true ELSE false END", description: "Separate true and false conditional clauses.", source: "HP 48G control-flow notes" }),
  END: word({ name: "END", category: "control", stack: "control delimiter", description: "End a structured program form.", source: "HP 48G control-flow notes" }),
  START: word({ name: "START", category: "control", stack: "start finish START body NEXT|STEP", description: "Begin an anonymous definite loop.", source: "HP 48G control-flow notes" }),
  NEXT: word({ name: "NEXT", category: "control", stack: "loop delimiter", description: "End a definite loop with step 1.", source: "HP 48G control-flow notes" }),
  STEP: word({ name: "STEP", category: "control", stack: "increment STEP", description: "End a definite loop with a supplied increment.", source: "HP 48G control-flow notes" }),
  FOR: word({ name: "FOR", category: "control", stack: "start finish FOR name body NEXT|STEP", description: "Begin a named definite loop.", source: "HP 48G control-flow notes" }),
  WHILE: word({ name: "WHILE", category: "control", stack: "WHILE test REPEAT body END", description: "Begin a pre-test loop.", source: "HP 48G control-flow notes" }),
  REPEAT: word({ name: "REPEAT", category: "control", stack: "WHILE test REPEAT body END", description: "Separate while-loop test and body.", source: "HP 48G control-flow notes" }),
  DO: word({ name: "DO", category: "control", stack: "DO body UNTIL test END", description: "Begin a post-test loop.", source: "HP 48G control-flow notes" }),
  UNTIL: word({ name: "UNTIL", category: "control", stack: "DO body UNTIL test END", description: "Separate do-loop body and exit test.", source: "HP 48G control-flow notes" }),
  HEAD: word({ name: "HEAD", category: "object", stack: "list|string -> object|string", description: "Return the first list element or first string character.", source: "HP 48G object library notes" }),
  TRIL: word({ name: "TRIL", category: "object", stack: "list|string -> list|string", description: "Return all but the first list element or string character.", source: "HP 48G object library notes" }),
  SUB: word({ name: "SUB", category: "object", stack: "list|string start end -> list|string", description: "Extract a one-based inclusive subrange.", source: "HP 48G object library notes" }),
  POS: word({ name: "POS", category: "object", stack: "list|string object|string -> real", description: "Return a one-based position, or zero when not found.", source: "HP 48G object library notes" }),
  CHR: word({ name: "CHR", category: "string", stack: "real -> string", description: "Convert a character code to a one-character string.", source: "HP 48G object library notes" }),
  NUM: word({ name: "NUM", category: "string", stack: "string -> real", description: "Return the code for the first character of a string.", source: "HP 48G object library notes" }),
  "->STR": word({ name: "->STR", category: "object", stack: "object -> string", description: "Convert an object to display string form.", source: "HP 48G object library notes" }),
  "->TAG": word({ name: "->TAG", category: "object", stack: "object name|string -> tagged", description: "Create a tagged object.", source: "HP 48G object library notes" })
};

export const BUILTIN_NAMES = Object.keys(WORDS);

export function listWords(): string[] {
  return [...BUILTIN_NAMES].sort();
}

export function describeWord(name: string): string | undefined {
  const metadata = WORDS[name];
  if (metadata === undefined) return undefined;
  return `${metadata.name}\nCategory: ${metadata.category}\nStack: ${metadata.stack}\nSource: ${metadata.source}\n${metadata.description}`;
}
