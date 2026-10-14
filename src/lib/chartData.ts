import type { SupabaseClient } from "@supabase/supabase-js";
import { sortDedup, type Bar } from "./bars";

export interface ChartContract {
  id: number | null;
  symbol: string;
  name: string;
  expiryDate: string;
}

export interface ChartTradeExecution {
  type: "ENTRY" | "EXIT";
  executedAt: string;
  price: number;
  quantity: number;
  fee: number;
  memo?: string | null;
}

export interface ChartTrade {
  id: string;
  direction: "LONG" | "SHORT";
  strategyName?: string | null;
  setupGrade?: string | null;
  entryReason?: string | null;
  exitReason?: string | null;
  executions: ChartTradeExecution[];
}

export interface ChartData {
  tradingDate: string;
  contract: ChartContract;
  bars: Bar[];
  trades: ChartTrade[];
  // DEMO 합성 폴백 없음 — 봉이 없으면 bars=[] + source="none"으로 안내 UI 표시.
  source: "supabase" | "none";
}

// Route Handler와 Server Component가 공유 — 자기 자신 fetch 금지.
// NOTE: 반드시 쿠키 기반 서버 클라이언트로 조회해야 RLS(authenticated)가 통과한다.
// publishable 키 단독 createClient는 anon 롤이 되어 시세 테이블 SELECT가 0건이 된다.
export async function getChartData(date: string): Promise<ChartData> {
  const noContract: ChartContract = { id: null, symbol: "-", name: "월물 정보 없음", expiryDate: date };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { tradingDate: date, contract: noContract, bars: [], trades: [], source: "none" };
  }
  try {
    const { createClient } = await import("./supabase/server");
    const sb = await createClient();
    const { data: contracts } = await sb
      .from("futures_contracts")
      .select("id,symbol,contract_name,expiry_date")
      .eq("is_active", true);
    const rows = (contracts ?? []) as Array<{ id: number; symbol: string; contract_name: string; expiry_date: string }>;
    const front = rows.filter((c) => date <= c.expiry_date).sort((a, b) => (a.expiry_date < b.expiry_date ? -1 : 1))[0];
    if (!front) {
      return { tradingDate: date, contract: noContract, bars: [], trades: await loadTrades(sb, date), source: "none" };
    }
    const [{ data: bars }, trades] = await Promise.all([
      sb
        .from("minute_bars")
        .select("bar_time,open,high,low,close,volume")
        .eq("contract_id", front.id)
        .eq("trading_date", date)
        .order("bar_time", { ascending: true }),
      loadTrades(sb, date),
    ]);
    const mapped = ((bars ?? []) as Array<{ bar_time: string; open: number; high: number; low: number; close: number; volume: number }>).map((b) => ({
      time: Math.floor(new Date(b.bar_time as string).getTime() / 1000),
      open: Number(b.open),
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
      volume: Number(b.volume),
    }));
    return {
      tradingDate: date,
      contract: { id: front.id, symbol: front.symbol, name: front.contract_name, expiryDate: front.expiry_date },
      bars: sortDedup(mapped),
      trades,
      source: bars && bars.length > 0 ? "supabase" : "none",
    };
  } catch {
    return { tradingDate: date, contract: noContract, bars: [], trades: [], source: "none" };
  }
}

// 해당 날짜의 사용자 거래는 봉 유무와 무관하게 조회 (복기 목록 유지).
async function loadTrades(
  sb: SupabaseClient,
  date: string,
): Promise<ChartTrade[]> {
  const { data } = await sb
    .from("trades")
    .select("id,direction,strategy_name,setup_grade,entry_reason,exit_reason,trade_executions(execution_type,executed_at,price,quantity,fee,memo)")
    .eq("trading_date", date)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Array<{
    id: string; direction: "LONG" | "SHORT"; strategy_name: string | null;
    setup_grade: string | null; entry_reason: string | null; exit_reason: string | null;
    trade_executions: Array<{ execution_type: "ENTRY" | "EXIT"; executed_at: string; price: number; quantity: number; fee: number; memo: string | null }>;
  }>;
  return rows.map((t) => ({
    id: t.id,
    direction: t.direction,
    strategyName: t.strategy_name,
    setupGrade: t.setup_grade,
    entryReason: t.entry_reason,
    exitReason: t.exit_reason,
    executions: t.trade_executions.map((e) => ({
      type: e.execution_type,
      executedAt: e.executed_at,
      price: Number(e.price),
      quantity: e.quantity,
      fee: Number(e.fee ?? 0),
      memo: e.memo,
    })),
  }));
}
