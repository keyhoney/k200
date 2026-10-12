import { describe, expect, it } from "vitest";
import { calcTrade, weightedAvg } from "./pnl";

describe("pnl", () => {
  it("long profit", () => {
    const r = calcTrade(
      "LONG",
      [
        { type: "ENTRY", price: 350.15, quantity: 1 },
        { type: "EXIT", price: 350.65, quantity: 1 },
      ],
      250000,
    );
    expect(r.points).toBeCloseTo(0.5, 10);
    expect(r.gross).toBe(125000);
    expect(r.net).toBe(125000);
  });

  it("short profit mirrors long", () => {
    const r = calcTrade(
      "SHORT",
      [
        { type: "ENTRY", price: 350.65, quantity: 1 },
        { type: "EXIT", price: 350.15, quantity: 1 },
      ],
      250000,
    );
    expect(r.gross).toBe(125000);
  });

  it("split entry average", () => {
    const { avg, qty } = weightedAvg([
      { price: 350.1, quantity: 1 },
      { price: 350.3, quantity: 1 },
    ]);
    expect(qty).toBe(2);
    expect(avg).toBeCloseTo(350.2, 10);
  });

  it("fee deducted", () => {
    const r = calcTrade(
      "LONG",
      [
        { type: "ENTRY", price: 350, quantity: 1, fee: 5000 },
        { type: "EXIT", price: 351, quantity: 1, fee: 5000 },
      ],
      250000,
    );
    expect(r.gross).toBe(250000);
    expect(r.net).toBe(240000);
  });
});
