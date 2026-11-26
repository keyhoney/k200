import { calcFuturesFee, type FuturesDirection } from "./futures";
import type { TradeBody } from "./tradeSchema";

type Side = "BUY" | "SELL";

interface CsvExecution {
  tradingDate: string;
  side: Side;
  sourceType: string;
  orderNumber: string;
  sourceRow: number;
  executedAt: string;
  price: number;
  quantity: number;
}

export interface ImportedTrade {
  tradingDate: string;
  direction: FuturesDirection;
  executions: TradeBody["executions"];
}

export interface TradeCsvImportPlan {
  trades: ImportedTrade[];
  unmatched: Array<{ tradingDate: string; side: Side; quantity: number }>;
  hasMissingTimes: boolean;
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      record.push(field);
      if (record.some((value) => value.trim() !== "")) records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("CSV 따옴표가 닫히지 않았습니다.");
  record.push(field);
  if (record.some((value) => value.trim() !== "")) records.push(record);
  return records;
}

function parseDate(value: string): string {
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(value.trim());
  if (!match) throw new Error(`날짜 형식이 올바르지 않습니다: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error(`날짜가 올바르지 않습니다: ${value}`);
  }
  return `${match[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseTime(value: string): string | null {
  if (!value.trim()) return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) throw new Error(`주문시각 형식이 올바르지 않습니다: ${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  if (hour > 23 || minute > 59 || second > 59) throw new Error(`주문시각이 올바르지 않습니다: ${value}`);
  return `${String(hour).padStart(2, "0")}:${match[2]}:${String(second).padStart(2, "0")}`;
}

function parseNumber(value: string, label: string, sourceRow: number): number {
  const parsed = Number(value.trim().replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${sourceRow}행 ${label} 값이 올바르지 않습니다.`);
  }
  return parsed;
}

function toExecution(
  type: "ENTRY" | "EXIT",
  source: CsvExecution,
  quantity: number,
  importKey: string,
): TradeBody["executions"][number] {
  const memoParts = [
    `CSV_IMPORT:${importKey}`,
    "매매내역 CSV",
    `원본 매매구분 ${source.sourceType}`,
    `CSV ${source.sourceRow}행`,
    `원본 체결수량 ${source.quantity}`,
    `평균단가 ${source.price}`,
  ];
  if (source.orderNumber) memoParts.push(`주문번호 ${source.orderNumber}`);
  return {
    type,
    executedAt: source.executedAt,
    price: source.price,
    quantity,
    fee: calcFuturesFee(source.price, quantity),
    memo: memoParts.join(" · "),
  };
}

export function parseBrokerTradeCsv(text: string): TradeCsvImportPlan {
  const records = parseCsvRecords(text);
  if (records.length < 2) throw new Error("매매 내역이 들어 있는 CSV 파일을 선택하세요.");

  const headers = records[0].map((header) => header.trim().replace(/^\uFEFF/, ""));
  const required = ["주문일", "매매구분", "체결수량", "평균단가"];
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const missing = required.filter((header) => !indexes.has(header));
  if (missing.length > 0) throw new Error(`필수 열을 찾을 수 없습니다: ${missing.join(", ")}`);
  const timeIndex = indexes.get("주문시각");
  const orderNumberIndex = indexes.get("주문번호");
  const dateIndex = indexes.get("주문일")!;
  const sideIndex = indexes.get("매매구분")!;
  const quantityIndex = indexes.get("체결수량")!;
  const priceIndex = indexes.get("평균단가")!;

  const rows: CsvExecution[] = [];
  let hasMissingTimes = timeIndex === undefined;
  for (const [index, record] of records.slice(1).entries()) {
    const sourceRow = index + 2;
    const dateValue = record[dateIndex] ?? "";
    const sideValue = record[sideIndex]?.trim() ?? "";
    const quantityValue = record[quantityIndex] ?? "";
    const priceValue = record[priceIndex] ?? "";
    if (![dateValue, sideValue, quantityValue, priceValue].some((value) => value.trim())) continue;

    const quantity = Number(quantityValue.trim().replace(/,/g, ""));
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error(`${sourceRow}행 체결수량 값이 올바르지 않습니다.`);
    }
    if (quantity === 0) continue;
    if (!Number.isInteger(quantity)) throw new Error(`${sourceRow}행 체결수량은 정수여야 합니다.`);
    const side: Side | null =
      sideValue === "매수" || sideValue === "매수정정" ? "BUY" :
      sideValue === "매도" || sideValue === "매도정정" ? "SELL" : null;
    if (!side) throw new Error(`${sourceRow}행 매매구분을 확인하세요: ${sideValue}`);
    const tradingDate = parseDate(dateValue);
    const parsedTime = timeIndex === undefined ? null : parseTime(record[timeIndex] ?? "");
    if (parsedTime === null) hasMissingTimes = true;
    const fallbackSeconds = index;
    const fallback = new Date(Date.UTC(2000, 0, 1, 9, 0, fallbackSeconds)).toISOString().slice(11, 19);
    const time = parsedTime ?? fallback;

    rows.push({
      tradingDate,
      side,
      sourceType: sideValue,
      orderNumber: orderNumberIndex === undefined ? "" : (record[orderNumberIndex] ?? "").trim(),
      sourceRow,
      executedAt: `${tradingDate}T${time}+09:00`,
      price: parseNumber(priceValue, "평균단가", sourceRow),
      quantity,
    });
  }
  if (rows.length === 0) throw new Error("체결수량이 1 이상인 매매 내역이 없습니다.");
  if (rows.length > 2000) throw new Error("한 번에 최대 2,000건까지 가져올 수 있습니다.");

  rows.sort((a, b) =>
    a.tradingDate.localeCompare(b.tradingDate) ||
    a.executedAt.localeCompare(b.executedAt) ||
    a.sourceRow - b.sourceRow
  );

  const trades: ImportedTrade[] = [];
  const unmatched: TradeCsvImportPlan["unmatched"] = [];
  let currentDate = "";
  let openLots: Array<{ source: CsvExecution; remaining: number }> = [];

  const collectUnmatched = () => {
    const quantities = new Map<Side, number>();
    for (const lot of openLots) {
      if (lot.remaining === 0) continue;
      quantities.set(lot.source.side, (quantities.get(lot.source.side) ?? 0) + lot.remaining);
    }
    for (const [side, quantity] of quantities) unmatched.push({ tradingDate: currentDate, side, quantity });
  };

  for (const row of rows) {
    if (row.tradingDate !== currentDate) {
      if (currentDate) collectUnmatched();
      currentDate = row.tradingDate;
      openLots = [];
    }

    let remaining = row.quantity;
    for (const lot of openLots) {
      if (remaining === 0) break;
      if (lot.remaining === 0 || lot.source.side === row.side) continue;

      const matched = Math.min(remaining, lot.remaining);
      const direction: FuturesDirection = lot.source.side === "BUY" ? "LONG" : "SHORT";
      const importKey = `${row.tradingDate}:${lot.source.sourceRow}:${row.sourceRow}:${matched}`;
      trades.push({
        tradingDate: row.tradingDate,
        direction,
        executions: [
          toExecution("ENTRY", lot.source, matched, importKey),
          toExecution("EXIT", row, matched, importKey),
        ],
      });
      lot.remaining -= matched;
      remaining -= matched;
    }
    if (remaining > 0) openLots.push({ source: row, remaining });
  }
  if (currentDate) collectUnmatched();

  return { trades, unmatched, hasMissingTimes };
}
