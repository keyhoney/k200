import { describe, expect, it } from "vitest";
import { pivotBySlot, slotOf, type StatTrade } from "./stats";

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
