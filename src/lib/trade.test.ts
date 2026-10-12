import { describe, expect, it } from "vitest";
import { validateTrade } from "./tradeSchema";
import { toMarkers } from "./markers";

const base = {
  tradingDate: "2026-10-12",
  contractId: 1,
  direction: "LONG" as const,
  executions: [
    { type: "ENTRY" as const, executedAt: "2026-10-12T09:32:00+09:00", price: 350.15, quantity: 1, fee: 0 },
    { type: "EXIT" as const, executedAt: "2026-10-12T09:41:00+09:00", price: 350.65, quantity: 1, fee: 0 },
  ],
};

describe("trade validation", () => {
  it("accepts valid long", () => {
    expect(validateTrade(base)).toBeNull();
  });
  it("rejects exit qty overflow", () => {
    const bad = {
      ...base,
      executions: [
        { type: "ENTRY" as const, executedAt: "2026-10-12T09:32:00+09:00", price: 350, quantity: 1, fee: 0 },
        { type: "EXIT" as const, executedAt: "2026-10-12T09:41:00+09:00", price: 350, quantity: 2, fee: 0 },
      ],
    };
    expect(validateTrade(bad)?.message).toMatch("청산 수량");
  });
  it("rejects exit before entry", () => {
    const bad = {
      ...base,
      executions: [
        { type: "ENTRY" as const, executedAt: "2026-10-12T09:41:00+09:00", price: 350, quantity: 1, fee: 0 },
        { type: "EXIT" as const, executedAt: "2026-10-12T09:32:00+09:00", price: 350, quantity: 1, fee: 0 },
      ],
    };
    expect(validateTrade(bad)?.message).toMatch("빠를 수 없습니다");
  });
});

describe("markers", () => {
  it("maps LONG/SHORT labels", () => {
    const m = toMarkers([
      { direction: "LONG", type: "ENTRY", executedAt: "2026-10-12T09:32:00+09:00" },
      { direction: "LONG", type: "EXIT", executedAt: "2026-10-12T09:41:00+09:00" },
      { direction: "SHORT", type: "ENTRY", executedAt: "2026-10-12T10:00:00+09:00" },
      { direction: "SHORT", type: "EXIT", executedAt: "2026-10-12T10:05:00+09:00" },
    ]);
    expect(m.map((x) => x.text)).toEqual(["L1", "LX1", "S1", "SX1"]);
    expect(m[0].position).toBe("belowBar");
    expect(m[1].position).toBe("aboveBar");
  });
});
