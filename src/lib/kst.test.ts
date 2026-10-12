import { describe, expect, it } from "vitest";
import { formatKSTDate, formatKSTTime } from "./kst";

describe("kst format", () => {
  it("formats UTC timestamp as KST", () => {
    // 00:00Z == 09:00KST
    expect(formatKSTTime(Date.UTC(2026, 9, 12, 0, 0, 0))).toBe("09:00");
    expect(formatKSTDate(Date.UTC(2026, 9, 12, 0, 0, 0))).toBe("10-12");
  });
});
