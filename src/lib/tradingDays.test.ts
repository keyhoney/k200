import { describe, expect, it } from "vitest";
import { isFixedHoliday, isNonTradingDay, isWeekend, shiftTradingDay } from "./tradingDays";

describe("tradingDays", () => {
  it("detects weekends regardless of server TZ", () => {
    expect(isWeekend("2026-10-10")).toBe(true); // 토
    expect(isWeekend("2026-10-11")).toBe(true); // 일
    expect(isWeekend("2026-10-12")).toBe(false); // 월
  });

  it("detects fixed holidays and year-end close", () => {
    expect(isFixedHoliday("2026-01-01")).toBe(true);
    expect(isFixedHoliday("2026-12-31")).toBe(true);
    expect(isFixedHoliday("2026-10-12")).toBe(false);
    expect(isNonTradingDay("2026-10-11")).toBe(true);
  });

  it("skips weekends and fixed holidays when shifting", () => {
    // 2026-10-09(금)는 한글날 — 목 → 월, 월 → 목
    expect(shiftTradingDay("2026-10-08", 1)).toBe("2026-10-12");
    expect(shiftTradingDay("2026-10-12", -1)).toBe("2026-10-08");
    expect(shiftTradingDay("2026-10-12", 1)).toBe("2026-10-13");
  });

  it("returns input on invalid date or zero delta", () => {
    expect(shiftTradingDay("oops", 1)).toBe("oops");
    expect(shiftTradingDay("2026-10-12", 0)).toBe("2026-10-12");
  });
});
