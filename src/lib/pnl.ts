// 손익 계산 — 부동소수점 오차 방지: 가격은 소수 2자리 반올림 후 정수틱(100x)으로 연산.
// multiplier(계약승수)는 DB app_settings가 정본, 인자로 주입 (Agnet.md §9.1).

export type Direction = "LONG" | "SHORT";

export interface ExecutionLike {
  type: "ENTRY" | "EXIT";
  price: number;
  quantity: number;
  fee?: number;
}

const toTicks = (p: number): number => Math.round(p * 100);

export function weightedAvg(
  items: Array<{ price: number; quantity: number }>,
): { avg: number; qty: number } {
  const qty = items.reduce((a, b) => a + b.quantity, 0);
  if (qty === 0) return { avg: 0, qty: 0 };
  const ticks = items.reduce((a, b) => a + toTicks(b.price) * b.quantity, 0);
  return { avg: Math.round(ticks / qty) / 100, qty };
}

export function calcTrade(
  direction: Direction,
  executions: ExecutionLike[],
  multiplier: number,
) {
  const entries = executions
    .filter((e) => e.type === "ENTRY")
    .map((e) => ({ price: e.price, quantity: e.quantity }));
  const exits = executions
    .filter((e) => e.type === "EXIT")
    .map((e) => ({ price: e.price, quantity: e.quantity }));
  const e = weightedAvg(entries);
  const x = weightedAvg(exits);
  const fee = executions.reduce((a, b) => a + (b.fee ?? 0), 0);
  const diffTicks = direction === "LONG" ? toTicks(x.avg) - toTicks(e.avg) : toTicks(e.avg) - toTicks(x.avg);
  // 포인트당 계약가치 = multiplier원. 0.01pt = 1틱 → gross = diffTicks/100 * multiplier * min(qty)
  const qty = Math.min(e.qty, x.qty);
  const gross = (diffTicks * multiplier * qty) / 100;
  return {
    avgEntry: e.avg,
    avgExit: x.avg,
    entryQty: e.qty,
    exitQty: x.qty,
    points: diffTicks / 100,
    gross: Math.round(gross),
    fee: Math.round(fee),
    net: Math.round(gross - fee),
  };
}
