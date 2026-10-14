// 분할 진입/청산 초안 관리 — TradeForm/TradeEditForm 공용 순수 로직.
import { buildETFExecutions, calcETFTrade, calcExecutionFee } from "./etf";
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
    { key: nextKey(), type: "ENTRY", dt: `${tradingDate}T09:32`, price: "", qty: "10" },
    { key: nextKey(), type: "EXIT", dt: `${tradingDate}T09:41`, price: "", qty: "10" },
  ];
}

// 초안 → TradeBody (수수료 자동 계산, 원본 메모 보존)
export function draftsToBody(
  tradingDate: string,
  contractId: number,
  direction: "LONG" | "SHORT",
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
    if (!Number.isInteger(qty) || qty < 1) return { error: `${n}번째 체결: 수량은 1 이상의 정수(주).` };
    executions.push({
      type: d.type,
      executedAt: toISO(d.dt),
      price,
      quantity: qty,
      fee: calcExecutionFee(price, qty),
      memo: d.memo?.trim() ? d.memo : undefined,
    });
  }
  const body: TradeBody = { tradingDate, contractId, direction, executions, ...extra };
  const v = validateTrade(body);
  if (v) return { error: v.message };
  return body;
}

export function previewDrafts(drafts: DraftExecution[]): ReturnType<typeof calcETFTrade> | null {
  const prices = drafts.map((d) => ({ type: d.type, price: Number(d.price), quantity: Number(d.qty) }));
  if (prices.some((p) => !(p.price > 0) || !Number.isInteger(p.quantity) || p.quantity < 1)) return null;
  if (!prices.some((p) => p.type === "ENTRY") || !prices.some((p) => p.type === "EXIT")) return null;
  try {
    return calcETFTrade(buildETFExecutionsFromDrafts(drafts));
  } catch {
    return null;
  }
}

function buildETFExecutionsFromDrafts(drafts: DraftExecution[]) {
  // calcETFTrade는 가중평균이므로 순서 무관 — fee는 자동 계산
  return drafts.map((d) => ({
    type: d.type as "ENTRY" | "EXIT",
    price: Number(d.price),
    quantity: Number(d.qty),
  }));
}

export { buildETFExecutions };
