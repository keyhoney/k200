import { describe, expect, it } from "vitest";
import { TradePatchSchema } from "./tradePatch";
import { isSimpleEditable } from "@/components/TradeEditForm";
import type { ChartTrade } from "@/lib/chartData";

const trade = (execs: ChartTrade["executions"]): ChartTrade => ({
  id: "t1",
  direction: "LONG",
  executions: execs,
});

describe("TradePatchSchema", () => {
  it("accepts direction + entry/exit executions", () => {
    const r = TradePatchSchema.safeParse({
      direction: "LONG",
      executions: [
        { type: "ENTRY", executedAt: "2026-10-12T09:32:00+09:00", price: 15000, quantity: 10, fee: 7 },
        { type: "EXIT", executedAt: "2026-10-12T09:41:00+09:00", price: 15200, quantity: 10, fee: 7 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-positive price and zero quantity", () => {
    const r = TradePatchSchema.safeParse({
      direction: "LONG",
      executions: [
        { type: "ENTRY", executedAt: "2026-10-12T09:32:00+09:00", price: 0, quantity: 10 },
        { type: "EXIT", executedAt: "2026-10-12T09:41:00+09:00", price: 15200, quantity: 0 },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("still accepts review-only patch", () => {
    expect(TradePatchSchema.safeParse({ tradeNote: "메모" }).success).toBe(true);
  });
});

describe("isSimpleEditable", () => {
  it("allows single entry+exit with equal qty", () => {
    expect(
      isSimpleEditable(
        trade([
          { type: "ENTRY", executedAt: "2026-10-12T09:32:00+09:00", price: 15000, quantity: 10, fee: 7 },
          { type: "EXIT", executedAt: "2026-10-12T09:41:00+09:00", price: 15200, quantity: 10, fee: 7 },
        ]),
      ),
    ).toBe(true);
  });

  it("blocks split executions", () => {
    expect(
      isSimpleEditable(
        trade([
          { type: "ENTRY", executedAt: "2026-10-12T09:32:00+09:00", price: 15000, quantity: 10, fee: 7 },
          { type: "ENTRY", executedAt: "2026-10-12T09:33:00+09:00", price: 15100, quantity: 10, fee: 7 },
          { type: "EXIT", executedAt: "2026-10-12T09:41:00+09:00", price: 15200, quantity: 20, fee: 15 },
        ]),
      ),
    ).toBe(false);
  });
});
