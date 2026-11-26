import { describe, expect, it } from "vitest";
import { buildDashboardSummary, type DashboardTrade } from "./dashboard";

const trades: DashboardTrade[] = [
  {
    id: "a",
    tradingDate: "2026-10-12",
    direction: "LONG",
    executions: [
      { type: "ENTRY", executedAt: "2026-10-12T09:32:00+09:00", price: 350.15, quantity: 1, fee: 350 },
      { type: "EXIT", executedAt: "2026-10-12T09:41:00+09:00", price: 350.65, quantity: 1, fee: 351 },
    ],
  },
  {
    id: "b",
    tradingDate: "2026-10-12",
    direction: "SHORT",
    executions: [
      { type: "ENTRY", executedAt: "2026-10-12T10:00:00+09:00", price: 350.65, quantity: 2, fee: 701 },
      { type: "EXIT", executedAt: "2026-10-12T10:05:00+09:00", price: 350.15, quantity: 2, fee: 700 },
    ],
  },
  {
    id: "c",
    tradingDate: "2026-10-05",
    direction: "LONG",
    executions: [
      { type: "ENTRY", executedAt: "2026-10-05T09:32:00+09:00", price: 350.15, quantity: 1, fee: 350 },
      { type: "EXIT", executedAt: "2026-10-05T09:41:00+09:00", price: 350.05, quantity: 1, fee: 350 },
    ],
  },
];

describe("buildDashboardSummary", () => {
  it("splits today vs month and labels directions", () => {
    const d = buildDashboardSummary(trades, "2026-10-12");
    expect(d.todayCount).toBe(2);
    // a: 0.50pt x 50,000 - 701 = 24,299 / b: 0.50pt x 50,000 x 2 - 1,401 = 48,599 → today 72,898
    expect(d.todayNet).toBe(72_898);
    expect(d.month.count).toBe(3);
    expect(Object.keys(d.byDirection).sort()).toEqual(["롱", "숏"].sort());
    expect(d.recent).toHaveLength(3);
    expect(d.recent[0].id).toBe("a");
    expect(d.recent[0].directionLabel).toBe("롱");
  });

  it("empty input yields zeros", () => {
    const d = buildDashboardSummary([], "2026-10-12");
    expect(d.todayNet).toBe(0);
    expect(d.month.count).toBe(0);
    expect(d.recent).toEqual([]);
  });
});
