import { describe, expect, it } from "vitest";
import { aggregateCompleted3m, calculateWma, WmaStrategyEngine } from "./strategy-engine.js";

const start = Math.floor(new Date("2026-01-05T08:45:00+09:00").getTime() / 1000);

function bar(minute, close, low = close - 0.1, high = close + 0.1) {
  return {
    time: start + minute * 60,
    open: close,
    high,
    low,
    close,
    volume: 1,
  };
}

describe("WMA20 strategy backtest", () => {
  it("uses only complete, continuous three-minute candles", () => {
    const bars = [bar(0, 100), bar(1, 101), bar(2, 102), bar(3, 103), bar(5, 105)];

    expect(aggregateCompleted3m(bars)).toHaveLength(1);
    expect(aggregateCompleted3m(bars)[0]).toMatchObject({
      open: 100,
      high: 102.1,
      low: 99.9,
      close: 102,
    });
  });

  it("calculates a weighted average with greater weight on the latest close", () => {
    expect(calculateWma([10, 20, 40], 2)).toEqual([null, 16.6667, 33.3333]);
  });

  it("gives the initial stop priority when the stop and target occur in one candle", () => {
    const bars = [];
    for (let minute = 0; minute <= 51; minute++) {
      const group = Math.floor(minute / 3);
      let close = 100;
      if (group === 13) close = 101;
      if (group === 14) close = 100;
      if (group === 15) close = 101;
      if (minute === 48) close = 101.2;
      if (minute === 49) {
        bars.push(bar(minute, close, 98, 104));
        continue;
      }
      bars.push(bar(minute, close));
    }

    const result = new WmaStrategyEngine(bars, {
      wmaPeriod: 2,
      atrPeriod: 1,
      allowReentry: false,
    }).run();

    expect(result.events[0]).toMatchObject({ type: "ENTRY", side: "LONG" });
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      reason: "최초 손절",
      quantity: 2,
    });
    expect(result.trades[0].exitPrice).toBeLessThan(result.trades[0].entryPrice - 2.5);
    expect(result.trades[0].fee).toBe(
      Math.round((result.trades[0].entryPrice + result.trades[0].exitPrice) * 2 * 50000 * 0.00002),
    );
    expect(result.trades[0].net).toBeLessThan(0);
  });

  it("allows a same-direction WMA retest after the original trailing exit", () => {
    const bars = [];
    for (let minute = 0; minute <= 60; minute++) {
      const group = Math.floor(minute / 3);
      let close = 100;
      if (group === 13) close = 101;
      if (group === 14) close = 100;
      if (group === 15) close = 101;
      if (minute === 48) bars.push(bar(minute, 101.2, 101, 101.4));
      else if (minute === 49) bars.push(bar(minute, 102.8, 101, 103));
      else if (minute === 50) bars.push({ ...bar(minute, 105, 104.95, 105.2), open: 105.1 });
      else if (minute === 51) bars.push(bar(minute, 105.2, 104.85, 105.3));
      else if (minute === 52) bars.push(bar(minute, 105.4, 105.3, 105.6));
      else if (minute === 53) bars.push(bar(minute, 105.6, 105.4, 105.7));
      else bars.push(bar(minute, close));
    }

    const result = new WmaStrategyEngine(bars, {
      wmaPeriod: 2,
      atrPeriod: 1,
    }).run();

    const originalTrail = result.events.findIndex((event) => event.type === "EXIT" && event.reason === "트레일링 청산");
    const reentry = result.events.findIndex((event) => event.type === "ENTRY" && event.label === "재진입 1");
    expect(originalTrail).toBeGreaterThanOrEqual(0);
    expect(reentry).toBeGreaterThan(originalTrail);
    expect(result.positions.some((position) => position.type === "REENTRY")).toBe(true);
  });
});
