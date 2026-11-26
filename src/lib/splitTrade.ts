// 분할 진입/청산 초안 관리 — TradeForm/TradeEditForm 공용 순수 로직.
import { calcFuturesFee, calcFuturesTrade, type FuturesDirection } from "./futures";
import { validateTrade, type TradeBody } from "./tradeSchema";

export interface DraftExecution {
  key: number;
  type: "ENTRY" | "EXIT";
  dt: string; // datetime-local "YYYY-MM-DDTHH:mm"
  price: string;
  qty: string;
  memo?: string;
}

export const toISO = (dt: string): string =>
  dt.length === 16 ? `${dt}:00+09:00` : `${dt}+09:00`;

let seq = 1;
export function nextKey(): number {
  seq += 1;
  return seq;
}

export function defaultDrafts(tradingDate: string): DraftExecution[] {
  return [
    { key: nextKey(), type: "ENTRY", dt: `${tradingDate}T09:32`, price: "", qty: "1" },
    { key: nextKey(), type: "EXIT", dt: `${tradingDate}T09:41`, price: "", qty: "1" },
  ];
}

// 초안 → TradeBody (수수료 자동 계산, 원본 메모 보존)
export function draftsToBody(
  tradingDate: string,
  contractId: number,
  direction: FuturesDirection,
  drafts: DraftExecution[],
  extra?: Partial<TradeBody>,
): TradeBody | { error: string } {
  const executions: TradeBody["executions"] = [];
  for (const [i, d] of drafts.entries()) {
    const n = i + 1;
    if (!d.dt) return { error: `${n}번째 체결: 시각을 입력하세요.` };
    const price = Number(d.price);
    const qty = Number(d.qty);
    if (!(price > 0)) return { error: `${n}번째 체결: 가격을 입력하세요.` };
    if (!Number.isInteger(qty) || qty < 1) return { error: `${n}번째 체결: 수량은 1 이상의 정수(계약).` };
    executions.push({
      type: d.type,
      executedAt: toISO(d.dt),
      price,
      quantity: qty,
      fee: calcFuturesFee(price, qty),
      memo: d.memo?.trim() ? d.memo : undefined,
    });
  }
  const body: TradeBody = { tradingDate, contractId, direction, executions, ...extra };
  const v = validateTrade(body);
  if (v) return { error: v.message };
  return body;
}

export function previewDrafts(
  direction: FuturesDirection,
  drafts: DraftExecution[],
): ReturnType<typeof calcFuturesTrade> | null {
  const executions = drafts.map((d) => ({ type: d.type, price: Number(d.price), quantity: Number(d.qty) }));
  if (executions.some((p) => !(p.price > 0) || !Number.isInteger(p.quantity) || p.quantity < 1)) return null;
  if (!executions.some((p) => p.type === "ENTRY") || !executions.some((p) => p.type === "EXIT")) return null;
  try {
    return calcFuturesTrade(direction, executions);
  } catch {
    return null;
  }
}
