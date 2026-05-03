import type { CalculatorErrorCode, RplObject, StackEntry } from "../../src/types.js";

export type ConformanceStatus = "supported" | "deferred" | "intentional-divergence" | "needs-fix";

export type ExpectedError = {
  code: CalculatorErrorCode;
  message?: string;
};

export type ConformanceFixture = {
  id: string;
  title: string;
  input: string;
  status: ConformanceStatus;
  sourceNote: string;
  expectedStack?: StackEntry[];
  expectedVariables?: Record<string, RplObject>;
  expectedError?: ExpectedError;
  reason?: string;
};

const note = (anchor: string): string => `docs/superpowers/specs/2026-05-02-hp48g-conformance-notes.md#${anchor}`;
const controlNote = (anchor: string): string => `docs/superpowers/specs/2026-05-02-hp48g-control-flow-notes.md#${anchor}`;
const objectNote = (anchor: string): string => `docs/superpowers/specs/2026-05-02-hp48g-object-library-notes.md#${anchor}`;

export const CONFORMANCE_FIXTURES: ConformanceFixture[] = [
  {
    id: "m1-real-arithmetic-add",
    title: "real addition leaves one real result",
    input: "2 3 +",
    status: "supported",
    sourceNote: note("stack-and-arithmetic-examples"),
    expectedStack: [{ level: 1, value: { kind: "real", value: 5 } }]
  },
  {
    id: "m1-stack-swap",
    title: "SWAP exchanges levels 1 and 2",
    input: "1 2 SWAP",
    status: "supported",
    sourceNote: note("stack-and-arithmetic-examples"),
    expectedStack: [
      { level: 2, value: { kind: "real", value: 2, source: "2" } },
      { level: 1, value: { kind: "real", value: 1, source: "1" } }
    ]
  },
  {
    id: "m1-program-eval",
    title: "EVAL executes an inert program object",
    input: "<< 2 3 + >> EVAL",
    status: "supported",
    sourceNote: note("variables-and-program-evaluation-examples"),
    expectedStack: [{ level: 1, value: { kind: "real", value: 5 } }]
  },
  {
    id: "m1-stored-program",
    title: "stored program executes through its name",
    input: "<< 1 + >> 'INC' STO 41 INC",
    status: "supported",
    sourceNote: note("variables-and-program-evaluation-examples"),
    expectedStack: [{ level: 1, value: { kind: "real", value: 42 } }],
    expectedVariables: {
      INC: {
        kind: "program",
        body: [
          { kind: "real", value: 1, source: "1" },
          { kind: "name", name: "+", source: "+" }
        ],
        source: "<< 1 + >>"
      }
    }
  },
  {
    id: "m2-list-roundtrip",
    title: "objects collect into a list with ->LIST",
    input: "1 2 3 3 ->LIST",
    status: "supported",
    sourceNote: note("stack-and-arithmetic-examples"),
    expectedStack: [
      {
        level: 1,
        value: {
          kind: "list",
          items: [
            { kind: "real", value: 1, source: "1" },
            { kind: "real", value: 2, source: "2" },
            { kind: "real", value: 3, source: "3" }
          ]
        }
      }
    ]
  },
  {
    id: "m3-if-true-branch",
    title: "HP-style IF selects true branch",
    input: "<< IF 2 3 < THEN 10 ELSE 20 END >> EVAL",
    status: "supported",
    sourceNote: controlNote("conditional-structures"),
    expectedStack: [{ level: 1, value: { kind: "real", value: 10, source: "10" } }]
  },
  {
    id: "m3-for-loop-values",
    title: "FOR NEXT exposes loop counter values",
    input: "<< 1 3 FOR i i NEXT >> EVAL",
    status: "supported",
    sourceNote: controlNote("definite-loops"),
    expectedStack: [
      { level: 3, value: { kind: "real", value: 1 } },
      { level: 2, value: { kind: "real", value: 2 } },
      { level: 1, value: { kind: "real", value: 3 } }
    ]
  },
  {
    id: "m4-string-head-tril",
    title: "HEAD and TRIL split a string",
    input: "\"abc\" HEAD \"abc\" TRIL",
    status: "supported",
    sourceNote: objectNote("element-commands"),
    expectedStack: [
      { level: 2, value: { kind: "string", value: "a" } },
      { level: 1, value: { kind: "string", value: "bc" } }
    ]
  },
  {
    id: "m4-tagged-object",
    title: "->TAG creates a tagged object",
    input: "42 \"answer\" ->TAG",
    status: "supported",
    sourceNote: objectNote("tagged-objects"),
    expectedStack: [{ level: 1, value: { kind: "tagged", tag: "answer", value: { kind: "real", value: 42, source: "42" } } }]
  },
  {
    id: "error-undefined-name",
    title: "unknown executable names fail clearly",
    input: "NO_SUCH_NAME",
    status: "supported",
    sourceNote: note("variables-and-program-evaluation-examples"),
    expectedError: { code: "UndefinedName", message: "Undefined name: NO_SUCH_NAME" }
  },
  {
    id: "deferred-units-object",
    title: "unit objects remain outside the current object model",
    input: "1_m",
    status: "deferred",
    sourceNote: note("object-library-examples"),
    reason: "Units are explicitly reserved for Milestone 9 and require their own object model."
  },
  {
    id: "divergence-hp-character-set",
    title: "CHR and NUM use JavaScript code points for now",
    input: "65 CHR NUM",
    status: "intentional-divergence",
    sourceNote: objectNote("character-and-string-conversion"),
    reason: "Milestone 4 intentionally uses JavaScript code points until an HP 48 character table is audited."
  }
];
