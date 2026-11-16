import { describe, expect, it } from "vitest";
import type { Bar } from "./bars";
import {
  countTradingDates,
  minuteRowsToBars,
  normalizeTrainerDays,
  roundPrice,
  toTrainerBars,
  TRAINER_MIN_BARS,
  trainerBaseEpoch,
} from "./trainerData";

const makeBar = (time: number, o: number, h: number, l: number, c: number, v = 1): Bar => ({
  time,
  open: o,
  high: h,
  low: l,
  close: c,
  volume: v,
});

describe("trainerBaseEpoch", () => {
  it("해당 일자 08:45 KST를 초 단위로 돌려준다", () => {
    const base = trainerBaseEpoch("2026-11-10");
    expect(new Date(base * 1000).toISOString()).toBe("2026-11-09T23:45:00.000Z");
  });
});

describe("roundPrice", () => {
  it("소수점 2자리로 반올림한다", () => {
    expect(roundPrice(400.1234)).toBe(400.12);
    expect(roundPrice(400.5678)).toBe(400.57);
    expect(roundPrice(400)).toBe(400);
  });
});

describe("toTrainerBars", () => {
  const date = "2026-11-10";
  const base = trainerBaseEpoch(date);

  it("봉 시각을 08:45 기준 분 오프셋으로 변환하고 가격을 2자리로 맞춘다", () => {
    const bars = [
      makeBar(base + 15 * 60, 400.1234, 400.5678, 399.9, 400.4444, 12), // 09:00
      makeBar(base + 16 * 60, 400.5, 401, 400.4, 400.9, 7.6), // 09:01
    ];
    expect(toTrainerBars(bars, date)).toEqual([
      [15, 400.12, 400.57, 399.9, 400.44, 12],
      [16, 400.5, 401, 400.4, 400.9, 8],
    ]);
  });

  it("정렬 후 중복 분은 마지막(거래량 큰) 봉만 남긴다", () => {
    const bars = [
      makeBar(base + 20 * 60, 2, 2, 2, 2, 5),
      makeBar(base + 10 * 60, 4, 4, 4, 4, 4),
      makeBar(base + 20 * 60, 3, 3, 3, 3, 9),
    ];
    const out = toTrainerBars(bars, date);
    expect(out.map((b) => b[0])).toEqual([10, 20]);
    expect(out[1][5]).toBe(9);
  });

  it("08:45 이전·15:30 이후 봉과 잘못된 OHLC 봉은 버린다", () => {
    const bars = [
      makeBar(base - 60, 1, 1, 1, 1),
      makeBar(base + 5 * 60, 10, 9, 11, 10), // high < low → 무효
      makeBar(base + 6 * 60, 3, 4, 2, 3),
      makeBar(base + 406 * 60, 3, 3, 3, 3), // 15:31
    ];
    expect(toTrainerBars(bars, date).map((b) => b[0])).toEqual([6]);
  });

  it("날짜가 잘못되면 빈 배열", () => {
    expect(toTrainerBars([makeBar(base, 1, 1, 1, 1)], "not-a-date")).toEqual([]);
  });
});

describe("normalizeTrainerDays", () => {
  it("봉이 부족한 날짜를 제외하고 최신순으로 정렬한다", () => {
    const rows = [
      { trading_date: "2026-11-09", bar_count: 300 },
      { trading_date: "2026-11-10", bar_count: 390 },
      { trading_date: "2026-11-08", bar_count: 10 },
    ];
    expect(normalizeTrainerDays(rows)).toEqual([
      { date: "2026-11-10", count: 390 },
      { date: "2026-11-09", count: 300 },
    ]);
  });

  it("문자열 bar_count와 중복 날짜를 처리한다", () => {
    const rows = [
      { trading_date: "2026-11-10", bar_count: "200" },
      { trading_date: "2026-11-10", bar_count: "390" },
    ];
    expect(normalizeTrainerDays(rows)).toEqual([{ date: "2026-11-10", count: 200 }]);
  });

  it("minBars 기준을 조정할 수 있다", () => {
    const rows = [{ trading_date: "2026-11-10", bar_count: TRAINER_MIN_BARS - 1 }];
    expect(normalizeTrainerDays(rows)).toEqual([]);
    expect(normalizeTrainerDays(rows, 10)).toEqual([{ date: "2026-11-10", count: TRAINER_MIN_BARS - 1 }]);
  });

  it("형식이 잘못되면 빈 배열", () => {
    expect(normalizeTrainerDays(null)).toEqual([]);
    expect(normalizeTrainerDays([{ trading_date: "20261110", bar_count: 300 }])).toEqual([]);
  });
});

describe("countTradingDates", () => {
  it("날짜별 봉 수를 세고 유효하지 않은 행은 무시한다", () => {
    const counts = countTradingDates([
      { trading_date: "2026-11-10" },
      { trading_date: "2026-11-10" },
      { trading_date: "2026-11-11" },
      { trading_date: "20261112" },
      { trading_date: null },
      null,
    ]);
    expect(counts.get("2026-11-10")).toBe(2);
    expect(counts.get("2026-11-11")).toBe(1);
    expect(counts.has("20261112")).toBe(false);
  });

  it("배열이 아니면 빈 맵", () => {
    expect(countTradingDates(null).size).toBe(0);
    expect(countTradingDates("x").size).toBe(0);
  });
});

describe("minuteRowsToBars", () => {
  it("PostgREST 행을 Bar로 변환한다 (숫자 문자열 허용)", () => {
    expect(
      minuteRowsToBars([
        {
          bar_time: "2026-11-10T09:00:00+09:00",
          open: "400.10",
          high: "400.50",
          low: "399.90",
          close: "400.30",
          volume: "12",
        },
      ]),
    ).toEqual([
      {
        time: Math.floor(new Date("2026-11-10T09:00:00+09:00").getTime() / 1000),
        open: 400.1,
        high: 400.5,
        low: 399.9,
        close: 400.3,
        volume: 12,
      },
    ]);
  });

  it("형식이 잘못된 행은 빈 배열", () => {
    expect(minuteRowsToBars([{ bar_time: "2026-11-10T09:00:00+09:00", open: -1 }])).toEqual([]);
  });
});
