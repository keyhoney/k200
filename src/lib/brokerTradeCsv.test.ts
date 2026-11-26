import { describe, expect, it } from "vitest";
import { parseBrokerTradeCsv } from "./brokerTradeCsv";

describe("broker trade CSV import", () => {
  it("orders fills by time and normalizes correction rows before FIFO matching", () => {
    const csv = [
      '"주문일","주문번호","원주문","구분","매매구분","종목번호","종목명","주문수량","주문지수","주문잔량","주문시각","체결수량","평균단가","체결금액"',
      '"2026/11/26","12","","지정가","매도정정","A05612","미니 F 202612","2","101.50","0","10:02:00","2","101.50","10,150,000"',
      '"2026/11/26","11","","지정가","매수","A05612","미니 F 202612","2","100.00","0","10:01:00","2","100.00","10,000,000"',
      '"2026/11/26","13","","지정가","매수정정","A05612","미니 F 202612","1","101.00","0","10:03:00","1","101.00","5,050,000"',
    ].join("\r\n");

    const result = parseBrokerTradeCsv(csv);

    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      tradingDate: "2026-11-26",
      direction: "LONG",
      executions: [
        { type: "ENTRY", executedAt: "2026-11-26T10:01:00+09:00", price: 100, quantity: 2 },
        { type: "EXIT", executedAt: "2026-11-26T10:02:00+09:00", price: 101.5, quantity: 2, memo: expect.stringContaining("매도정정") },
      ],
    });
    expect(result.trades[0].executions[0].memo).toContain("CSV_IMPORT:2026-11-26:3:2:2");
    expect(result.unmatched).toEqual([{ tradingDate: "2026-11-26", side: "BUY", quantity: 1 }]);
  });

  it("supports the required columns without a time column and preserves file order", () => {
    const csv = [
      "주문일,매매구분,체결수량,평균단가",
      "2026/11/26,매도,1,100.25",
      "2026/11/26,매수,1,101.00",
      "2026/11/26,매수,0,0",
    ].join("\n");

    const result = parseBrokerTradeCsv(csv);

    expect(result.hasMissingTimes).toBe(true);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].direction).toBe("SHORT");
    expect(result.trades[0].executions[0].executedAt).toBe("2026-11-26T09:00:00+09:00");
    expect(result.trades[0].executions[1].executedAt).toBe("2026-11-26T09:00:01+09:00");
  });

  it("matches split fills FIFO and reports the unmatched remainder", () => {
    const csv = [
      "주문일,주문번호,매매구분,주문시각,체결수량,평균단가",
      "2026/11/26,21,매수,09:00:00,2,100",
      "2026/11/26,22,매수,09:01:00,1,101",
      "2026/11/26,23,매도,09:02:00,2,102",
      "2026/11/26,24,매도,09:03:00,2,99",
    ].join("\n");

    const result = parseBrokerTradeCsv(csv);

    expect(result.trades).toHaveLength(2);
    expect(result.trades.map((trade) => trade.executions[0].memo)).toEqual([
      expect.stringContaining("주문번호 21"),
      expect.stringContaining("주문번호 22"),
    ]);
    expect(result.trades[1].executions.map((execution) => execution.quantity)).toEqual([1, 1]);
    expect(result.unmatched).toEqual([{ tradingDate: "2026-11-26", side: "SELL", quantity: 1 }]);
  });

  it("rejects CSVs missing required columns and invalid fills", () => {
    expect(() => parseBrokerTradeCsv("date,type,qty,price\n2026-11-26,매수,1,100")).toThrow("필수 열");
    expect(() => parseBrokerTradeCsv("주문일,매매구분,체결수량,평균단가\n2026/11/26,매수,-1,100")).toThrow("체결수량");
    expect(() => parseBrokerTradeCsv("주문일,매매구분,체결수량,평균단가\n2026/11/26,매수,0,0")).toThrow("체결수량이 1 이상");
  });
});
