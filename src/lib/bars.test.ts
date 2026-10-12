import { describe, expect, it } from "vitest";
import { isAscending, sortDedup } from "./bars";

describe("bars", () => {
  it("dedups and sorts ascending, drops invalid", () => {
    const out = sortDedup([
      { time: 3, open: 1, high: 2, low: 1, close: 2, volume: 1 },
      { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 0 },
      { time: 1, open: 1, high: 1, low: 1, close: 1, volume: 5 },
      { time: 2, open: 5, high: 1, low: 9, close: 5, volume: 1 }, // invalid
    ]);
    expect(out.map((b) => b.time)).toEqual([1, 3]);
    expect(isAscending(out)).toBe(true);
  });
});
