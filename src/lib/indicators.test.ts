import { describe, expect, it } from "vitest";
import { wma, sma, toLineData } from "./indicators";

describe("sma", () => {
  it("averages last N closes", () => {
    expect(sma([10, 11, 12, 13, 14], 3)).toEqual([null, null, 11, 12, 13]);
  });

  it("all null when shorter than period", () => {
    expect(sma([1, 2, 3], 20)).toEqual([null, null, null]);
  });
});

describe("wma", () => {
  it("weights recent bars higher", () => {
    // period=3 denom=6, weight oldest=1..newest=3
    // idx2: (10*1+11*2+12*3)/6 = 68/6 = 11.3333
    // idx3: (11*1+12*2+13*3)/6 = 74/6 = 12.3333
    expect(wma([10, 11, 12, 13], 3)).toEqual([null, null, 11.3333, 12.3333]);
  });

  it("all null when shorter than period", () => {
    expect(wma([1, 2, 3], 20)).toEqual([null, null, null]);
  });
});

describe("toLineData", () => {
  it("drops leading nulls keeping times aligned", () => {
    expect(toLineData([100, 200, 300], [null, null, 11])).toEqual([{ time: 300, value: 11 }]);
  });
});
