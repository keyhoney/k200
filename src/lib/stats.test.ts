import { describe, expect, it } from "vitest";
import { buildInsights, calcStreaks, holdingBucket, pivotBySlot, slotOf, weekdayOf, type StatTrade } from "./stats";

const t = (direction: "LONG" | "SHORT", executedAt: string, net: number): StatTrade => ({
  direction,
  executedAt,
  // (exit-entry)*qty-fee == net 이 되도록 맞춤
  executions: [
    { type: "ENTRY", price: 10000, quantity: 1, fee: 0 },
    { type: "EXIT", price: 10000 + net, quantity: 1, fee: 0 },
  ],
});

describe("slotOf", () => {
  it("buckets KST entry time into 30-min slots", () => {
    expect(slotOf("2026-10-12T09:05:00+09:00")).toBe("09:00-09:30");
    expect(slotOf("2026-10-12T09:30:00+09:00")).toBe("09:30-10:00");
    expect(slotOf("2026-10-12T15:29:00+09:00")).toBe("15:00-15:30");
  });

  it("converts UTC input to KST before bucketing", () => {
    // 00:32Z == 09:32KST
    expect(slotOf("2026-10-12T00:32:00Z")).toBe("09:30-10:00");
  });

  it("falls back to 기타 outside market hours", () => {
    expect(slotOf("2026-10-12T08:59:00+09:00")).toBe("기타");
    expect(slotOf(undefined)).toBe("기타");
  });
});

describe("pivotBySlot", () => {
  it("splits rows by slot and columns by product", () => {
    const rows = pivotBySlot([
      t("LONG", "2026-10-12T09:05:00+09:00", 1000),
      t("SHORT", "2026-10-12T09:10:00+09:00", -500),
      t("LONG", "2026-10-12T10:05:00+09:00", 2000),
    ]);
    // 정규장 13슬롯, 기타 없음
    expect(rows).toHaveLength(13);
    const first = rows[0];
    expect(first.slot).toBe("09:00-09:30");
    expect(first.lev).toEqual({ count: 1, net: 1000 });
    expect(first.inv).toEqual({ count: 1, net: -500 });
    expect(rows[2]).toMatchObject({ slot: "10:00-10:30", lev: { count: 1, net: 2000 } });
    expect(rows[1].lev.count).toBe(0);
  });
});

describe("weekday / holding / streaks", () => {
  it("labels weekday in KST", () => {
    // 2026-10-12는 월요일
    expect(weekdayOf({ direction: "LONG", executedAt: "2026-10-12T09:05:00+09:00", executions: [] })).toBe("월요일");
    expect(weekdayOf({ direction: "LONG", tradingDate: "2026-10-12", executions: [] })).toBe("월요일");
  });

  it("buckets holding minutes", () => {
    const base = { direction: "LONG" as const, executions: [] };
    expect(holdingBucket({ ...base, executedAt: "2026-10-12T09:00:00+09:00", exitAt: "2026-10-12T09:04:00+09:00" })).toBe("~5분");
    expect(holdingBucket({ ...base, executedAt: "2026-10-12T09:00:00+09:00", exitAt: "2026-10-12T09:20:00+09:00" })).toBe("15~30분");
    expect(holdingBucket({ ...base })).toBe("기타");
  });

  it("computes streaks and insights without advice", () => {
    expect(calcStreaks([100, 200, -50, -60, -70, 10])).toEqual({ maxWinStreak: 2, maxLossStreak: 3 });
    const lines = buildInsights({
      byRule: {
        "지킴": { count: 2, wins: 2, losses: 0, flats: 0, winRate: 100, grossProfit: 200, grossLoss: 0, net: 200, avgWin: 100, avgLoss: 0, profitFactor: null, maxWin: 150, maxLoss: 0 },
        "어김": { count: 2, wins: 0, losses: 2, flats: 0, winRate: 0, grossProfit: 0, grossLoss: 200, net: -200, avgWin: 0, avgLoss: 100, profitFactor: 0, maxWin: 0, maxLoss: -150 },
      },
      byDirection: {},
      streaks: { maxWinStreak: 1, maxLossStreak: 3 },
    });
    expect(lines.join("\n")).toContain("규칙 준수");
    expect(lines.join("\n")).toContain("최대 연속 손실 3회");
  });
});
