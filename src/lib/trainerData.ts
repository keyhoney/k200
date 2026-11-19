// 트레이닝 페이지(/trainer)용 데이터 로더.
// Supabase minute_bars → 트레이너 압축 포맷 [min, o, h, l, c, v].
// 트레이너는 08:45 KST를 0분으로 하는 상대 분(min)을 쓰므로 여기서 변환한다.
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sortDedup, type Bar } from "./bars";
import { selectFrontMonth } from "./contracts";

export const TRAINER_BASE_MINUTE = 8 * 60 + 45; // 08:45 KST = min 0
export const TRAINER_MIN_BARS = 90; // 리플레이(PRELOAD 75분)에 필요한 최소 봉 수
const MAX_MINUTE = 15 * 60 + 45 - TRAINER_BASE_MINUTE; // 15:45 KST = min 420 (정규장 마감)

export type TrainerBar = [number, number, number, number, number, number];

export interface TrainerDay {
  date: string;
  count: number;
}

export interface TrainerDaysResult {
  days: TrainerDay[];
  source: "sql_rpc" | "fallback";
}

export interface TrainerDayData {
  date: string;
  bars: TrainerBar[];
  source: "supabase" | "none";
}

export class TrainerDataError extends Error {
  status: number;
  needsLogin: boolean;
  constructor(message: string, status = 500, needsLogin = false) {
    super(message);
    this.name = "TrainerDataError";
    this.status = status;
    this.needsLogin = needsLogin;
  }
}

/* ---------- pure transforms (unit tested) ---------- */

export function trainerBaseEpoch(date: string): number {
  const hh = String(Math.floor(TRAINER_BASE_MINUTE / 60)).padStart(2, "0");
  const mm = String(TRAINER_BASE_MINUTE % 60).padStart(2, "0");
  return Math.floor(new Date(`${date}T${hh}:${mm}:00+09:00`).getTime() / 1000);
}

// 가격은 소수점 2자리로 반올림 (틱 0.02 계산 오차 방지)
export function roundPrice(value: number): number {
  const r = Math.round(value * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

export function toTrainerBar(bar: Bar, baseEpoch: number): TrainerBar | null {
  const min = Math.round((bar.time - baseEpoch) / 60);
  if (!Number.isFinite(min) || min < 0 || min > MAX_MINUTE) return null;
  const volume = Number.isFinite(bar.volume) ? Math.max(0, Math.round(bar.volume)) : 0;
  return [min, roundPrice(bar.open), roundPrice(bar.high), roundPrice(bar.low), roundPrice(bar.close), volume];
}

export function toTrainerBars(bars: Bar[], date: string): TrainerBar[] {
  const base = trainerBaseEpoch(date);
  if (!Number.isFinite(base)) return [];
  const byMinute = new Map<number, TrainerBar>();
  for (const bar of sortDedup(bars)) {
    const compact = toTrainerBar(bar, base);
    if (!compact) continue;
    byMinute.set(compact[0], compact); // 같은 분이 중복되면 뒤 값 우선
  }
  return [...byMinute.values()].sort((a, b) => a[0] - b[0]);
}

export const TrainerDayRowSchema = z.object({
  trading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bar_count: z.union([z.number(), z.string()]).transform((v) => Number(v)),
});

// 폴백에서 minute_bars의 trading_date만 모아 날짜별 봉 수를 센다 (REST 집계 불가 대비)
export function countTradingDates(rows: unknown): Map<string, number> {
  const counts = new Map<string, number>();
  if (!Array.isArray(rows)) return counts;
  for (const row of rows) {
    const d = (row as { trading_date?: unknown } | null | undefined)?.trading_date;
    if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  return counts;
}

export function normalizeTrainerDays(rows: unknown, minBars = TRAINER_MIN_BARS): TrainerDay[] {
  const parsed = z.array(TrainerDayRowSchema).safeParse(rows);
  if (!parsed.success) return [];
  const seen = new Set<string>();
  const out: TrainerDay[] = [];
  for (const row of parsed.data) {
    if (!Number.isFinite(row.bar_count) || row.bar_count < minBars) continue;
    if (seen.has(row.trading_date)) continue;
    seen.add(row.trading_date);
    out.push({ date: row.trading_date, count: row.bar_count });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const MinuteBarRowSchema = z.object({
  bar_time: z.string().min(1),
  open: z.coerce.number().positive(),
  high: z.coerce.number().positive(),
  low: z.coerce.number().positive(),
  close: z.coerce.number().positive(),
  volume: z.coerce.number().int().nonnegative(),
});

export function minuteRowsToBars(rows: unknown): Bar[] {
  const parsed = z.array(MinuteBarRowSchema).safeParse(rows);
  if (!parsed.success) return [];
  return parsed.data.map((row) => ({
    time: Math.floor(new Date(row.bar_time).getTime() / 1000),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
  }));
}

/* ---------- supabase (server only) ---------- */

async function serverClient(): Promise<SupabaseClient> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new TrainerDataError("Supabase 환경변수가 설정되지 않았습니다.", 500);
  }
  const { createClient } = await import("./supabase/server");
  const sb = await createClient();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) {
    throw new TrainerDataError("로그인이 필요합니다.", 401, true);
  }
  return sb;
}

async function publicMarketDataClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new TrainerDataError("Supabase 환경변수가 설정되지 않았습니다.", 500);
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// 0002 미적용 환경용 폴백: 이 Supabase 인스턴스는 REST 집계 함수가 차단되어 있어
// minute_bars를 id 순서로 페이징해(유니크 키라 페이지 경계 누락 없음) JS에서 날짜별 집계한다.
const TRAINER_DAYS_PAGE_SIZE = 1000;

async function loadTrainerDaysFallback(sb: SupabaseClient, minBars: number): Promise<TrainerDaysResult> {
  const { count, error: countError } = await sb
    .from("minute_bars")
    .select("id", { count: "exact", head: true });
  if (countError || count === null || count === undefined) {
    throw new TrainerDataError(
      "훈련 일자 목록을 불러오지 못했습니다. supabase/migrations/0002_trainer_days.sql 적용 여부를 확인해 주세요.",
      500,
    );
  }
  const fetchPage = (from: number) =>
    sb
      .from("minute_bars")
      .select("trading_date")
      .order("id", { ascending: true })
      .range(from, from + TRAINER_DAYS_PAGE_SIZE - 1);
  const pageCount = Math.ceil(count / TRAINER_DAYS_PAGE_SIZE);
  const results = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => fetchPage(i * TRAINER_DAYS_PAGE_SIZE)),
  );
  const counts = new Map<string, number>();
  for (const page of results) {
    if (page.error) {
      throw new TrainerDataError(
        "훈련 일자 목록을 불러오지 못했습니다. supabase/migrations/0002_trainer_days.sql 적용 여부를 확인해 주세요.",
        500,
      );
    }
    for (const [date, n] of countTradingDates(page.data)) {
      counts.set(date, (counts.get(date) ?? 0) + n);
    }
  }
  const rows = [...counts].map(([trading_date, bar_count]) => ({ trading_date, bar_count }));
  return { days: normalizeTrainerDays(rows, minBars), source: "fallback" };
}

// 봉이 있는 거래일 목록 — migration 0002의 trainer_days() 집계 함수 우선 사용,
// 함수가 아직 없으면(PGRST202) minute_bars 직접 집계로 폴백한다.
export async function loadTrainerDays(minBars = TRAINER_MIN_BARS): Promise<TrainerDaysResult> {
  const sb = await serverClient();
  const { data, error } = await sb.rpc("trainer_days");
  if (!error) {
    return { days: normalizeTrainerDays(data ?? [], minBars), source: "sql_rpc" };
  }
  if (error.code === "PGRST202") {
    return loadTrainerDaysFallback(sb, minBars);
  }
  throw new TrainerDataError("훈련 일자 목록을 불러오지 못했습니다.", 500);
}

export async function loadPublicStrategyDays(): Promise<TrainerDaysResult> {
  const sb = await publicMarketDataClient();
  const { data, error } = await sb.rpc("strategy_public_days");
  if (error) {
    const migrationMissing = error.code === "PGRST202" || error.code === "42883" || error.code === "42501";
    throw new TrainerDataError(
      migrationMissing
        ? "공개 전략 데이터베이스 설정을 확인해 주세요. supabase/migrations/0003_strategy_public_market_data.sql 적용이 필요합니다."
        : "공개 전략 거래일 조회에 실패했습니다.",
      migrationMissing ? 503 : 500,
    );
  }
  return { days: normalizeTrainerDays(data ?? []), source: "sql_rpc" };
}

export async function loadTrainerDay(date: string): Promise<TrainerDayData> {
  const sb = await serverClient();
  const { data: contracts, error: contractError } = await sb
    .from("futures_contracts")
    .select("id,symbol,expiry_date")
    .eq("is_active", true);
  if (contractError) throw new TrainerDataError("월물 정보를 불러오지 못했습니다.", 500);

  const rows = (contracts ?? []) as Array<{ id: number; symbol: string; expiry_date: string }>;
  const front = selectFrontMonth(rows, date);
  if (!front) return { date, bars: [], source: "none" };

  const { data: bars, error } = await sb
    .from("minute_bars")
    .select("bar_time,open,high,low,close,volume")
    .eq("contract_id", front.id)
    .eq("trading_date", date)
    .order("bar_time", { ascending: true });
  if (error) throw new TrainerDataError("봉 데이터를 불러오지 못했습니다.", 500);

  const mapped = minuteRowsToBars(bars ?? []);
  const compact = toTrainerBars(mapped, date);
  return { date, bars: compact, source: compact.length > 0 ? "supabase" : "none" };
}

export async function loadPublicStrategyDay(date: string): Promise<TrainerDayData> {
  const sb = await publicMarketDataClient();
  const { data, error } = await sb.rpc("strategy_public_day", { requested_date: date });
  if (error) {
    const migrationMissing = error.code === "PGRST202" || error.code === "42883" || error.code === "42501";
    throw new TrainerDataError(
      migrationMissing
        ? "공개 전략 데이터베이스 설정을 확인해 주세요. supabase/migrations/0003_strategy_public_market_data.sql 적용이 필요합니다."
        : "공개 전략 봉 데이터 조회에 실패했습니다.",
      migrationMissing ? 503 : 500,
    );
  }
  const parsed = z.array(MinuteBarRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    throw new TrainerDataError("공개 전략 봉 데이터 형식이 올바르지 않습니다.", 502);
  }
  const mapped = minuteRowsToBars(parsed.data);
  if (mapped.length !== parsed.data.length || mapped.some((bar) => !Number.isFinite(bar.time))) {
    throw new TrainerDataError("공개 전략 봉 데이터에 유효하지 않은 시각이 있습니다.", 502);
  }
  const compact = toTrainerBars(mapped, date);
  return { date, bars: compact, source: compact.length > 0 ? "supabase" : "none" };
}
