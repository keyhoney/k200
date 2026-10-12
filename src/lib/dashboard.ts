// 대시보드 집계 — ETF 모드. 순수 집계(buildDashboardSummary)는 테스트 가능.
import { calcETFTrade, ETF_LABEL } from "./etf";
import { groupByETF, summarizeETF, type StatsSummary } from "./stats";

export interface DashboardExecution {
  type: "ENTRY" | "EXIT";
  executedAt: string;
  price: number;
  quantity: number;
  fee: number;
}

export interface DashboardTrade {
  id: string;
  tradingDate: string;
  direction: "LONG" | "SHORT";
  executions: DashboardExecution[];
}

export interface DashboardRecent {
  id: string;
  tradingDate: string;
  product: string;
  net: number;
}

export interface DashboardSummary {
  today: string;
  monthStart: string;
  todayNet: number;
  todayCount: number;
  month: StatsSummary;
  byProduct: Record<string, StatsSummary>;
  recent: DashboardRecent[];
  source: "supabase" | "DEMO";
}

export function todayKST(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function buildDashboardSummary(
  trades: DashboardTrade[],
  today: string,
  source: "supabase" | "DEMO" = "supabase",
): DashboardSummary {
  const monthStart = `${today.slice(0, 7)}-01`;
  const statTrades = trades.map((t) => ({
    direction: t.direction,
    executedAt: t.executions[0]?.executedAt,
    executions: t.executions.map((e) => ({
      type: e.type,
      price: e.price,
      quantity: e.quantity,
      fee: e.fee,
    })),
  }));
  const todays = trades.filter((t) => t.tradingDate === today);
  const todayNet = todays.reduce(
    (a, t) => a + calcETFTrade(t.executions.map((e) => ({ type: e.type, price: e.price, quantity: e.quantity, fee: e.fee }))).net,
    0,
  );
  const byProductRaw = groupByETF(statTrades, (t) => t.direction);
  const byProduct = Object.fromEntries(
    Object.entries(byProductRaw).map(([k, v]) => [ETF_LABEL[k as "LONG" | "SHORT"] ?? k, v]),
  );
  return {
    today,
    monthStart,
    todayNet,
    todayCount: todays.length,
    month: summarizeETF(statTrades),
    byProduct,
    recent: trades.slice(0, 10).map((t) => ({
      id: t.id,
      tradingDate: t.tradingDate,
      product: ETF_LABEL[t.direction] ?? t.direction,
      net: calcETFTrade(t.executions.map((e) => ({ type: e.type, price: e.price, quantity: e.quantity, fee: e.fee }))).net,
    })),
    source,
  };
}

export function emptyDashboard(today: string): DashboardSummary {
  return buildDashboardSummary([], today, "DEMO");
}

// Server Component용 — 쿠키 기반 서버 클라이언트로 조회 (RLS 통과).
export async function getDashboardData(today: string): Promise<DashboardSummary> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const { createClient } = await import("./supabase/server");
      const sb = await createClient();
      const { data: user } = await sb.auth.getUser();
      if (!user.user) return emptyDashboard(today);
      const monthStart = `${today.slice(0, 7)}-01`;
      const { data, error } = await sb
        .from("trades")
        .select("id,trading_date,direction,trade_executions(execution_type,executed_at,price,quantity,fee)")
        .eq("user_id", user.user.id)
        .gte("trading_date", monthStart)
        .order("trading_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const trades = ((data ?? []) as Array<{
        id: string;
        trading_date: string;
        direction: "LONG" | "SHORT";
        trade_executions: Array<{ execution_type: "ENTRY" | "EXIT"; executed_at: string; price: number; quantity: number; fee: number }>;
      }>).map((t) => ({
        id: t.id,
        tradingDate: t.trading_date,
        direction: t.direction,
        executions: t.trade_executions.map((e) => ({
          type: e.execution_type,
          executedAt: e.executed_at,
          price: Number(e.price),
          quantity: e.quantity,
          fee: Number(e.fee ?? 0),
        })),
      }));
      return buildDashboardSummary(trades, today, "supabase");
    } catch {
      return emptyDashboard(today);
    }
  }
  return emptyDashboard(today);
}
