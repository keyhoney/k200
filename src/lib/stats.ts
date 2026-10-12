// 통계 집계 (Agnet.md §12) — 투자조언 문구 생성 금지, 집계 서술만.
import { calcTrade, type Direction } from "./pnl";

export interface StatTrade {
  direction: Direction;
  executions: Array<{ type: "ENTRY" | "EXIT"; price: number; quantity: number; fee?: number }>;
  strategyName?: string | null;
  setupGrade?: string | null;
  ruleFollowed?: boolean | null;
  executedAt?: string; // 최초 진입 시각 (시간대/요일 분류용)
}

export interface StatsSummary {
  count: number;
  wins: number;
  losses: number;
  flats: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  net: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  maxWin: number;
  maxLoss: number;
}

export function summarize(trades: StatTrade[], multiplier: number): StatsSummary {
  const nets = trades.map(
    (t) => calcTrade(t.direction, t.executions, multiplier).net,
  );
  const wins = nets.filter((n) => n > 0);
  const losses = nets.filter((n) => n < 0);
  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  return {
    count: nets.length,
    wins: wins.length,
    losses: losses.length,
    flats: nets.length - wins.length - losses.length,
    winRate: nets.length ? (wins.length / nets.length) * 100 : 0,
    grossProfit,
    grossLoss,
    net: grossProfit - grossLoss,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    maxWin: wins.length ? Math.max(...wins) : 0,
    maxLoss: losses.length ? Math.min(...losses) : 0,
  };
}

export function groupBy<T extends StatTrade>(
  trades: T[],
  key: (t: T) => string,
  multiplier: number,
): Record<string, StatsSummary> {
  const groups: Record<string, T[]> = {};
  for (const t of trades) {
    const k = key(t);
    (groups[k] ??= []).push(t);
  }
  const out: Record<string, StatsSummary> = {};
  for (const [k, v] of Object.entries(groups)) out[k] = summarize(v, multiplier);
  return out;
}
