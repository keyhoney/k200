// 통계 집계 (Agnet.md §12) — 투자조언 문구 생성 금지, 집계 서술만.
import { calcETFTrade } from "./etf";
import { calcTrade, type Direction } from "./pnl";

export interface StatTrade {
  direction: Direction;
  executions: Array<{ type: "ENTRY" | "EXIT"; price: number; quantity: number; fee?: number }>;
  strategyName?: string | null;
  setupGrade?: string | null;
  ruleFollowed?: boolean | null;
  executedAt?: string; // 최초 진입 시각 (시간대/요일 분류용)
  tradingDate?: string; // YYYY-MM-DD (요일 폴백용)
  exitAt?: string; // 최종 청산 시각 (보유시간용)
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

// ETF(레버리지/인버스2X) 집계 — 승수 없이 (매도가-매수가)x수량-수수료.
// LONG/SHORT는 종목 구분용이며 손익 부호에 영향 없음.
export function etfNet(t: StatTrade): number {
  return calcETFTrade(t.executions).net;
}

export function summarizeETF(trades: StatTrade[]): StatsSummary {
  const nets = trades.map(etfNet);
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

export function groupByETF<T extends StatTrade>(
  trades: T[],
  key: (t: T) => string,
): Record<string, StatsSummary> {
  const groups: Record<string, T[]> = {};
  for (const t of trades) {
    const k = key(t);
    (groups[k] ??= []).push(t);
  }
  const out: Record<string, StatsSummary> = {};
  for (const [k, v] of Object.entries(groups)) out[k] = summarizeETF(v);
  return out;
}

// 진입 시각 기준 30분 슬롯 × 종목 피벗 (정규장 09:00~15:30, KST).
// 서버 TZ에 관계없이 ISO 오프셋을 KST로 환산して 버킷팅.
export const SLOT_START_MIN = 9 * 60;
export const SLOT_END_MIN = 15 * 60 + 30;
export const SLOT_LEN_MIN = 30;

export function kstParts(iso: string): { h: number; m: number } {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

export function slotLabel(startMin: number): string {
  const f = (v: number) =>
    `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
  return `${f(startMin)}-${f(startMin + SLOT_LEN_MIN)}`;
}

export function slotOf(iso: string | undefined): string {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "기타";
  const { h, m } = kstParts(iso);
  const t = h * 60 + m;
  if (t < SLOT_START_MIN || t >= SLOT_END_MIN) return "기타";
  return slotLabel(SLOT_START_MIN + Math.floor((t - SLOT_START_MIN) / SLOT_LEN_MIN) * SLOT_LEN_MIN);
}

export interface SlotCell {
  count: number;
  net: number;
}

export interface SlotRow {
  slot: string;
  lev: SlotCell;
  inv: SlotCell;
}

export function pivotBySlot(trades: StatTrade[]): SlotRow[] {
  const rows: SlotRow[] = [];
  for (let s = SLOT_START_MIN; s < SLOT_END_MIN; s += SLOT_LEN_MIN) {
    rows.push({ slot: slotLabel(s), lev: { count: 0, net: 0 }, inv: { count: 0, net: 0 } });
  }
  const other: SlotRow = { slot: "기타", lev: { count: 0, net: 0 }, inv: { count: 0, net: 0 } };
  let hasOther = false;
  for (const t of trades) {
    const key = slotOf(t.executedAt);
    const row = rows.find((r) => r.slot === key);
    const target = row ?? other;
    if (!row) hasOther = true;
    const cell = t.direction === "LONG" ? target.lev : target.inv;
    cell.count += 1;
    cell.net += etfNet(t);
  }
  return hasOther ? [...rows, other] : rows;
}

// 요일(KST) · 연속 손익 · 보유시간 · 인사이트 — 집계 서술만, 추천 문구 금지.
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayOf(t: StatTrade): string {
  const iso = t.executedAt;
  if (iso && !Number.isNaN(new Date(iso).getTime())) {
    const kst = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
    return WEEKDAY[kst.getUTCDay()] + "요일";
  }
  if (t.tradingDate && /^\d{4}-\d{2}-\d{2}$/.test(t.tradingDate)) {
    const d = new Date(`${t.tradingDate}T12:00:00+09:00`);
    if (!Number.isNaN(d.getTime())) return WEEKDAY[new Date(d.getTime() + 9 * 3600 * 1000).getUTCDay()] + "요일";
  }
  return "기타";
}

export function holdingBucket(t: StatTrade): string {
  if (!t.executedAt || !t.exitAt) return "기타";
  const ms = new Date(t.exitAt).getTime() - new Date(t.executedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return "기타";
  const m = ms / 60000;
  if (m <= 5) return "~5분";
  if (m <= 15) return "5~15분";
  if (m <= 30) return "15~30분";
  return "30분+";
}

export interface Streaks {
  maxWinStreak: number;
  maxLossStreak: number;
}

export function calcStreaks(netsInOrder: number[]): Streaks {
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let w = 0;
  let l = 0;
  for (const n of netsInOrder) {
    if (n > 0) { w += 1; l = 0; }
    else if (n < 0) { l += 1; w = 0; }
    else { w = 0; l = 0; }
    maxWinStreak = Math.max(maxWinStreak, w);
    maxLossStreak = Math.max(maxLossStreak, l);
  }
  return { maxWinStreak, maxLossStreak };
}

export function avgNet(s: StatsSummary): number {
  return s.count ? s.net / s.count : 0;
}

// 과거 기록의 단순 집계 서술 (투자 조언 아님).
export function buildInsights(input: {
  byRule: Record<string, StatsSummary>;
  byDirection: Record<string, StatsSummary>;
  streaks: Streaks;
}): string[] {
  const out: string[] = [];
  const rTrue = input.byRule["지킴"];
  const rFalse = input.byRule["어김"];
  if (rTrue && rFalse && rTrue.count > 0 && rFalse.count > 0) {
    out.push(
      `규칙 준수 거래 ${rTrue.count}건 평균 ${Math.round(avgNet(rTrue)).toLocaleString()}원 / 미준수 ${rFalse.count}건 평균 ${Math.round(avgNet(rFalse)).toLocaleString()}원`,
    );
  }
  const l = input.byDirection["LONG"];
  const s = input.byDirection["SHORT"];
  if (l && s && l.count > 0 && s.count > 0) {
    out.push(
      `LONG ${l.count}건 평균 ${Math.round(avgNet(l)).toLocaleString()}원 / SHORT ${s.count}건 평균 ${Math.round(avgNet(s)).toLocaleString()}원`,
    );
  }
  if (input.streaks.maxLossStreak >= 2) out.push(`최대 연속 손실 ${input.streaks.maxLossStreak}회 기록 있음`);
  if (input.streaks.maxWinStreak >= 2) out.push(`최대 연속 이익 ${input.streaks.maxWinStreak}회 기록 있음`);
  return out;
}
