import { describe, expect, it } from "vitest";
import { aggregateBars, isAscending, sortDedup } from "./bars";

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

  it("aggregates 1m bars into 3m buckets", () => {
    const out = aggregateBars(
      [
        { time: 0, open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
        { time: 60, open: 10.5, high: 12, low: 10, close: 11, volume: 200 },
        { time: 120, open: 11, high: 11.5, low: 8, close: 9, volume: 300 },
        { time: 180, open: 9, high: 10, low: 9, close: 10, volume: 50 },
      ],
      3,
    );
    expect(out).toEqual([
      { time: 0, open: 10, high: 12, low: 8, close: 9, volume: 600 },
      { time: 180, open: 9, high: 10, low: 9, close: 10, volume: 50 },
    ]);
  });

  it("returns empty for empty input", () => {
    expect(aggregateBars([], 3)).toEqual([]);
  });
});
