import { describe, expect, it } from "vitest";
import type { RplObject } from "../src/types.js";

describe("shared RPL types", () => {
  it("represents real-number objects", () => {
    const value: RplObject = { kind: "real", value: 42 };
    expect(value).toEqual({ kind: "real", value: 42 });
  });
});
