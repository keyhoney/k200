import { z } from "zod";
import { summarize, groupBy } from "@/lib/stats";
import { calcTrade } from "@/lib/pnl";

const Query = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// GET /api/stats?from=&to= — 기본 통계 + 롱숏/전략/등급/규칙준수 분류 (Agnet.md §12).
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

    const multiplierRes = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "k200_contract_multiplier")
      .maybeSingle();
    const multiplier =
      Number((multiplierRes.data?.value as { value?: number } | null)?.value) ||
      Number(process.env.K200_CONTRACT_MULTIPLIER) ||
      250000;

    let query = sb
      .from("trades")
      .select(
        "direction,strategy_name,setup_grade,rule_followed,trade_executions(execution_type,executed_at,price,quantity,fee)",
      )
      .eq("user_id", user.user.id)
      .limit(1000);
    if (parsed.data.from) query = query.gte("trading_date", parsed.data.from);
    if (parsed.data.to) query = query.lte("trading_date", parsed.data.to);
    const { data, error } = await query;
    if (error) throw error;

    const trades = ((data ?? []) as Array<{
      direction: "LONG" | "SHORT";
      strategy_name: string | null;
      setup_grade: string | null;
      rule_followed: boolean | null;
      trade_executions: Array<{ execution_type: "ENTRY" | "EXIT"; executed_at: string; price: number; quantity: number; fee: number }>;
    }>).map((t) => ({
      direction: t.direction,
      strategyName: t.strategy_name,
      setupGrade: t.setup_grade,
      ruleFollowed: t.rule_followed,
      executedAt: t.trade_executions[0]?.executed_at,
      executions: t.trade_executions.map((e) => ({
        type: e.execution_type,
        price: Number(e.price),
        quantity: e.quantity,
        fee: Number(e.fee),
      })),
    }));

    const overall = summarize(trades, multiplier);
    const byDirection = groupBy(trades, (t) => t.direction, multiplier);
    const byStrategy = groupBy(trades, (t) => t.strategyName ?? "(미지정)", multiplier);
    const byGrade = groupBy(trades, (t) => t.setupGrade ?? "(미지정)", multiplier);
    const byRule = groupBy(trades, (t) => (t.ruleFollowed == null ? "(미기록)" : t.ruleFollowed ? "준수" : "위반"), multiplier);

    // 시간대별 (KST 오전/오후)
    const bySession = groupBy(
      trades,
      (t) => {
        if (!t.executedAt) return "(미상)";
        const h = new Date(t.executedAt).getHours();
        return h < 12 ? "오전" : "오후";
      },
      multiplier,
    );

    // 인사이트 문장 — 집계 서술만 (조언 금지)
    const insights: string[] = [];
    if (byRule["준수"] && byRule["위반"]) {
      const a = byRule["준수"].net / Math.max(1, byRule["준수"].count);
      const b = byRule["위반"].net / Math.max(1, byRule["위반"].count);
      insights.push(`규칙 준수 거래 평균 손익 ${Math.round(a).toLocaleString()}원 / 위반 ${Math.round(b).toLocaleString()}원 (과거 기록 집계)`);
    }
    void calcTrade;

    return Response.json({ overall, byDirection, byStrategy, byGrade, byRule, bySession, insights, multiplier });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "stats failed" }, { status: 500 });
  }
}
