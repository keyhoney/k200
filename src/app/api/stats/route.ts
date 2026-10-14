import { z } from "zod";
import { buildInsights, calcStreaks, etfNet, groupByETF, holdingBucket, summarizeETF, pivotBySlot, weekdayOf } from "@/lib/stats";
import { ETF_MULTIPLIER } from "@/lib/etf";

const Query = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// GET /api/stats?from=&to= — 기본 통계 + 분류별 집계 (ETF 모드, 집계 서술만).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) return Response.json({ error: "invalid query" }, { status: 400 });
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });

    const multiplier = ETF_MULTIPLIER;

    let query = sb
      .from("trades")
      .select(
        "trading_date,direction,setup_grade,rule_followed,trade_executions(execution_type,executed_at,price,quantity,fee)",
      )
      .eq("user_id", user.user.id)
      .order("trading_date", { ascending: true })
      .limit(1000);
    if (parsed.data.from) query = query.gte("trading_date", parsed.data.from);
    if (parsed.data.to) query = query.lte("trading_date", parsed.data.to);
    const { data, error } = await query;
    if (error) throw error;

    const trades = ((data ?? []) as Array<{
      trading_date: string;
      direction: "LONG" | "SHORT";
      setup_grade: string | null;
      rule_followed: boolean | null;
      trade_executions: Array<{ execution_type: "ENTRY" | "EXIT"; executed_at: string; price: number; quantity: number; fee: number }>;
    }>).map((t) => {
      const entries = t.trade_executions.filter((e) => e.execution_type === "ENTRY").map((e) => e.executed_at).sort();
      const exits = t.trade_executions.filter((e) => e.execution_type === "EXIT").map((e) => e.executed_at).sort();
      return {
        direction: t.direction,
        setupGrade: t.setup_grade,
        ruleFollowed: t.rule_followed,
        tradingDate: t.trading_date,
        executedAt: entries[0],
        exitAt: exits.at(-1),
        executions: t.trade_executions.map((e) => ({
          type: e.execution_type,
          price: Number(e.price),
          quantity: e.quantity,
          fee: Number(e.fee),
        })),
      };
    });

    const overall = summarizeETF(trades);
    const bySlot = pivotBySlot(trades);
    const byDirection = groupByETF(trades, (t) => t.direction);
    const byWeekday = groupByETF(trades, weekdayOf);
    const byGrade = groupByETF(trades, (t) => t.setupGrade ?? "미지정");
    const byRule = groupByETF(trades, (t) => (t.ruleFollowed == null ? "미기록" : t.ruleFollowed ? "지킴" : "어김"));
    const byHolding = groupByETF(trades, holdingBucket);
    const streaks = calcStreaks(trades.map(etfNet));
    const insights = buildInsights({ byRule, byDirection, streaks });

    return Response.json({ overall, bySlot, byDirection, byWeekday, byGrade, byRule, byHolding, streaks, insights, multiplier });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "stats failed" }, { status: 500 });
  }
}
