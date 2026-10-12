import { z } from "zod";

export const ExecutionSchema = z.object({
  type: z.enum(["ENTRY", "EXIT"]),
  executedAt: z.string().datetime({ offset: true }),
  price: z.number().positive(),
  quantity: z.number().int().min(1),
  fee: z.number().min(0).default(0),
  memo: z.string().max(2000).optional(),
});
export type TradeExecutionInput = z.infer<typeof ExecutionSchema>;

export const TradeBodySchema = z.object({
  tradingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contractId: z.number().int(),
  direction: z.enum(["LONG", "SHORT"]),
  strategyName: z.string().max(100).optional(),
  setupGrade: z.enum(["A", "B", "C", "D"]).optional(),
  entryReason: z.string().max(5000).optional(),
  exitReason: z.string().max(5000).optional(),
  tradeNote: z.string().max(5000).optional(),
  ruleFollowed: z.boolean().optional(),
  screenshotPath: z.string().max(500).optional(),
  executions: z.array(ExecutionSchema).min(2),
});
export type TradeBody = z.infer<typeof TradeBodySchema>;

export interface TradeValidationError {
  message: string;
}

// Agnet.md §8.3 — 저장을 막는 하드 검증. 가격범위 경고는 별도(warnPriceRange).
export function validateTrade(b: TradeBody): TradeValidationError | null {
  const entries = b.executions.filter((e) => e.type === "ENTRY");
  const exits = b.executions.filter((e) => e.type === "EXIT");
  if (entries.length === 0 || exits.length === 0) {
    return { message: "진입과 청산을 각각 1건 이상 입력해야 합니다." };
  }
  const entryQty = entries.reduce((a, e) => a + e.quantity, 0);
  const exitQty = exits.reduce((a, e) => a + e.quantity, 0);
  if (exitQty > entryQty) return { message: "청산 수량이 진입 수량보다 많습니다." };
  const firstEntry = Math.min(...entries.map((e) => new Date(e.executedAt).getTime()));
  for (const x of exits) {
    if (new Date(x.executedAt).getTime() < firstEntry) {
      return { message: "청산 시각은 진입 시각보다 빠를 수 없습니다." };
    }
  }
  for (const e of b.executions) {
    const d = new Date(e.executedAt);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    // KST 기준 날짜 비교 (서버 TZ=Asia/Seoul 전제 + offset 포함 ISO)
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (ymd !== b.tradingDate && kst !== b.tradingDate) {
      return { message: "거래일과 체결 시각의 날짜가 일치해야 합니다." };
    }
    if (d.getTime() > Date.now()) return { message: "미래 시각은 허용하지 않습니다." };
  }
  // 중복 체결 경고성 검사: 동일 시각+가격+수량 중복
  const keys = b.executions.map((e) => `${e.type}|${e.executedAt}|${e.price}|${e.quantity}`);
  if (new Set(keys).size !== keys.length) {
    return { message: "동일한 체결이 두 번 입력된 것으로 보입니다. 확인해 주세요." };
  }
  return null;
}

// 1분봉 범위 경고 (non-blocking, Agnet.md §8.3)
export function warnPriceRange(
  price: number,
  barTime: number,
  bars: Array<{ time: number; high: number; low: number }>,
): string | null {
  let best: { high: number; low: number } | null = null;
  let bestDiff = Infinity;
  for (const b of bars) {
    const d = Math.abs(b.time - barTime);
    if (d < bestDiff) {
      bestDiff = d;
      best = b;
    }
  }
  if (!best || bestDiff > 120) return null; // 2분 이상 떨어지면 경고 생략
  if (price > best.high || price < best.low) {
    return "실제 체결가격이 해당 1분봉의 고가·저가 범위를 벗어났습니다. 입력한 가격을 다시 확인해 주세요.";
  }
  return null;
}
