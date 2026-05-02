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
    ],
    [
      "local variable square program",
      "5 << -> x << x x * >> >> EVAL",
      [{ level: 1, value: { kind: "real", value: 25 } }]
    ],
    [
      "multiple local variables bind from deeper stack to top",
      "2 3 << -> x y << x y + >> >> EVAL",
      [{ level: 1, value: { kind: "real", value: 5 } }]
    ],
    [
      "stack utility duplicates two objects",
      "1 2 DUP2",
      [
        { level: 4, value: { kind: "real", value: 1 } },
        { level: 3, value: { kind: "real", value: 2 } },
        { level: 2, value: { kind: "real", value: 1 } },
        { level: 1, value: { kind: "real", value: 2 } }
      ]
    ],
    [
      "list construction from stack objects",
      "1 2 3 3 ->LIST",
      [{ level: 1, value: { kind: "list", items: [{ kind: "real", value: 1 }, { kind: "real", value: 2 }, { kind: "real", value: 3 }] } }]
    ],
    [
      "comparison produces real truth value",
      "2 3 <",
      [{ level: 1, value: { kind: "real", value: 1 } }]
    ],
    [
      "conditional selects true branch",
      "<< 2 3 < IF THEN 10 ELSE 20 END >> EVAL",
      [{ level: 1, value: { kind: "real", value: 10 } }]
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
      {
        level: 2,
        value: {
          kind: "list",
          items: [
            { kind: "real", value: 1, source: "1" },
            { kind: "real", value: 2, source: "2" },
            { kind: "real", value: 3, source: "3" }
          ],
          source: "{ 1 2 3 }"
        }
      },
      {
        level: 1,
        value: {
          kind: "list",
          items: [
            { kind: "real", value: 1, source: "1" },
            { kind: "real", value: 2, source: "2" },
            { kind: "real", value: 3, source: "3" }
          ],
          source: "{ 1 2 3 }"
        }
      }
    ]);
  });
});
