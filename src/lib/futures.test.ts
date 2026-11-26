import { describe, expect, it } from "vitest";
import {
  buildFuturesExecutions,
  calcFuturesFee,
  calcFuturesTrade,
  FUTURES_FEE_RATE,
  MINI_K200_MULTIPLIER,
} from "./futures";

describe("mini K200 futures fee", () => {
  it("applies 0.00185% of contract value per side, rounded to won", () => {
    // 350.15pt x 50,000원 x 2계약 = 35,015,000원 -> 0.00185% = 647.7원 -> 648원
    expect(calcFuturesFee(350.15, 2)).toBe(648);
    expect(FUTURES_FEE_RATE).toBeCloseTo(0.0000185, 10);
    expect(MINI_K200_MULTIPLIER).toBe(50_000);
  });

  it("zero for invalid input", () => {
    expect(calcFuturesFee(0, 1)).toBe(0);
    expect(calcFuturesFee(350, 0)).toBe(0);
  });
});

describe("mini K200 futures pnl", () => {
  it("long profits when price rises", () => {
    const r = calcFuturesTrade("LONG", [
      { type: "ENTRY", price: 350.15, quantity: 1 },
      { type: "EXIT", price: 350.65, quantity: 1 },
    ]);
    // 0.50pt x 50,000원 = 25,000원, 수수료 324 + 324 = 648원
    expect(r.points).toBeCloseTo(0.5, 10);
    expect(r.gross).toBe(25_000);
    expect(r.fee).toBe(648);
    expect(r.net).toBe(24_352);
  });

  it("short profits when price falls", () => {
    const r = calcFuturesTrade("SHORT", [
      { type: "ENTRY", price: 350.65, quantity: 1 },
      { type: "EXIT", price: 350.15, quantity: 1 },
    ]);
    expect(r.points).toBeCloseTo(0.5, 10);
    expect(r.gross).toBe(25_000);
    expect(r.net).toBe(24_352);
  });

  it("short loses when price rises", () => {
    const r = calcFuturesTrade("SHORT", [
      { type: "ENTRY", price: 350.15, quantity: 1 },
      { type: "EXIT", price: 350.65, quantity: 1 },
    ]);
    expect(r.gross).toBe(-25_000);
    expect(r.net).toBeLessThan(0);
  });

  it("multiplies by contract count", () => {
    const r = calcFuturesTrade("LONG", [
      { type: "ENTRY", price: 350.0, quantity: 2 },
      { type: "EXIT", price: 350.02, quantity: 2 },
    ]);
    // 0.02pt(1틱) x 50,000원 x 2계약 = 2,000원
    expect(r.gross).toBe(2_000);
  });

  it("averages split entries", () => {
    const r = calcFuturesTrade("LONG", [
      { type: "ENTRY", price: 350.1, quantity: 1 },
      { type: "ENTRY", price: 350.3, quantity: 1 },
      { type: "EXIT", price: 350.5, quantity: 2 },
    ]);
    expect(r.avgEntry).toBeCloseTo(350.2, 10);
    expect(r.gross).toBe(30_000);
    expect(r.net).toBe(r.gross - r.fee);
  });

  it("explicit fee overrides auto calc", () => {
    const r = calcFuturesTrade("LONG", [
      { type: "ENTRY", price: 350.15, quantity: 1, fee: 1_000 },
      { type: "EXIT", price: 350.65, quantity: 1, fee: 1_000 },
    ]);
    expect(r.fee).toBe(2_000);
    expect(r.net).toBe(23_000);
  });
});

describe("buildFuturesExecutions", () => {
  it("builds entry+exit with same qty and both-side auto fees", () => {
    const execs = buildFuturesExecutions({ entryPrice: 350.15, quantity: 1, exitPrice: 350.65 });
    expect(execs).toHaveLength(2);
    expect(execs[0]).toMatchObject({ type: "ENTRY", price: 350.15, quantity: 1, fee: 324 });
    expect(execs[1]).toMatchObject({ type: "EXIT", price: 350.65, quantity: 1, fee: 324 });
    expect(calcFuturesTrade("LONG", execs).net).toBe(24_352);
  });
});
