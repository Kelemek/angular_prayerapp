import { describe, it, expect } from "vitest";
import { shuffleCopy } from "./shuffle-copy";

describe("shuffleCopy", () => {
  it("returns a permutation with the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const output = shuffleCopy(input);

    expect(output).toHaveLength(input.length);
    expect([...output].sort()).toEqual([...input].sort());
    expect(output).not.toBe(input);
  });
});
