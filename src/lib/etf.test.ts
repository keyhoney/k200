import { describe, expect, it } from "vitest";
import { calcETFTrade, calcExecutionFee, ETF_FEE_RATE } from "./etf";

describe("etf fee", () => {
  it("applies 0.004896% per side rounded to won", () => {
    // 15,000원 x 100주 = 1,500,000원 -> 73.44원 -> 73원
    expect(calcExecutionFee(15000, 100)).toBe(73);
    expect(ETF_FEE_RATE).toBeCloseTo(0.00004896, 10);
  });

  it("zero for invalid input", () => {
    expect(calcExecutionFee(0, 10)).toBe(0);
    expect(calcExecutionFee(10000, 0)).toBe(0);
  });
});

describe("etf pnl", () => {
  it("leverage buy->sell profit minus both-side fees", () => {
    const r = calcETFTrade([
      { type: "ENTRY", price: 15000, quantity: 10 },
      { type: "EXIT", price: 15200, quantity: 10 },
    ]);
    // gross = 200 x 10 = 2000, fee = round(150000*rate)=7 + round(152000*rate)=7 -> 14
    expect(r.gross).toBe(2000);
    expect(r.fee).toBe(14);
    expect(r.net).toBe(1986);
    expect(r.buyAmount).toBe(150000);
    expect(r.sellAmount).toBe(152000);
  });

  it("inverse2x uses same buy->sell math (price rise = profit)", () => {
    const r = calcETFTrade([
      { type: "ENTRY", price: 8000, quantity: 20 },
      { type: "EXIT", price: 8200, quantity: 20 },
    ]);
    expect(r.gross).toBe(4000);
    expect(r.net).toBe(r.gross - r.fee);
  });

  it("loss when sell below buy", () => {
    const r = calcETFTrade([
      { type: "ENTRY", price: 15000, quantity: 10 },
      { type: "EXIT", price: 14800, quantity: 10 },
    ]);
    expect(r.gross).toBe(-2000);
    expect(r.net).toBeLessThan(0);
  });

  it("split entries averaged", () => {
    const r = calcETFTrade([
      { type: "ENTRY", price: 15000, quantity: 10 },
      { type: "ENTRY", price: 15200, quantity: 10 },
      { type: "EXIT", price: 15300, quantity: 20 },
    ]);
    expect(r.avgEntry).toBeCloseTo(15100, 10);
    expect(r.gross).toBe(4000);
  });

  it("explicit fee overrides auto calc", () => {
    const r = calcETFTrade([
      { type: "ENTRY", price: 15000, quantity: 10, fee: 100 },
      { type: "EXIT", price: 15200, quantity: 10, fee: 100 },
    ]);
    expect(r.fee).toBe(200);
    expect(r.net).toBe(1800);
  });
});

describe("buildETFExecutions", () => {
  it("builds entry+exit with same qty and both-side auto fees", async () => {
    const { buildETFExecutions } = await import("./etf");
    const execs = buildETFExecutions({ entryPrice: 15000, quantity: 10, exitPrice: 15200 });
    expect(execs).toHaveLength(2);
    expect(execs[0]).toMatchObject({ type: "ENTRY", price: 15000, quantity: 10, fee: 7 });
    expect(execs[1]).toMatchObject({ type: "EXIT", price: 15200, quantity: 10, fee: 7 });
    const r = calcETFTrade(execs);
    expect(r.net).toBe(1986);
  });
});
