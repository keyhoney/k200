import { describe, expect, it } from "vitest";
import { buildDashboardSummary, type DashboardTrade } from "./dashboard";

const trades: DashboardTrade[] = [
  {
    id: "a",
    tradingDate: "2026-10-12",
    direction: "LONG",
    executions: [
      { type: "ENTRY", executedAt: "2026-10-12T09:32:00+09:00", price: 15000, quantity: 10, fee: 7 },
      { type: "EXIT", executedAt: "2026-10-12T09:41:00+09:00", price: 15200, quantity: 10, fee: 7 },
    ],
  },
  {
    id: "b",
    tradingDate: "2026-10-12",
    direction: "SHORT",
    executions: [
      { type: "ENTRY", executedAt: "2026-10-12T10:00:00+09:00", price: 8000, quantity: 20, fee: 8 },
      { type: "EXIT", executedAt: "2026-10-12T10:05:00+09:00", price: 7900, quantity: 20, fee: 8 },
    ],
  },
  {
    id: "c",
    tradingDate: "2026-10-05",
    direction: "LONG",
    executions: [
      { type: "ENTRY", executedAt: "2026-10-05T09:32:00+09:00", price: 15000, quantity: 10, fee: 7 },
      { type: "EXIT", executedAt: "2026-10-05T09:41:00+09:00", price: 14900, quantity: 10, fee: 7 },
    ],
  },
];

describe("buildDashboardSummary", () => {
  it("splits today vs month and labels products", () => {
    const d = buildDashboardSummary(trades, "2026-10-12");
    expect(d.todayCount).toBe(2);
    // a: (15200-15000)*10-14=1986, b: (7900-8000)*20-16=-2016 → today -30
    expect(d.todayNet).toBe(-30);
    expect(d.month.count).toBe(3);
    expect(Object.keys(d.byProduct).sort()).toEqual(["레버리지", "인버스2X"]);
    expect(d.recent).toHaveLength(3);
    expect(d.recent[0].id).toBe("a");
  });

  it("empty input yields zeros", () => {
    const d = buildDashboardSummary([], "2026-10-12");
    expect(d.todayNet).toBe(0);
    expect(d.month.count).toBe(0);
    expect(d.recent).toEqual([]);
  });
});
