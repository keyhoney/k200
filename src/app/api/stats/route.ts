import { z } from "zod";
import { summarizeETF, pivotBySlot } from "@/lib/stats";
import { ETF_MULTIPLIER } from "@/lib/etf";

const Query = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// GET /api/stats?from=&to= — 기본 통계 + 종목별/시간대별 분류 (ETF 모드).
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

    // ETF 모드: 승수 1, 수수료는 체결 저장값(입력 시 0.004896% 자동 계산).
    const multiplier = ETF_MULTIPLIER;

    let query = sb
      .from("trades")
      .select(
        "direction,trade_executions(execution_type,executed_at,price,quantity,fee)",
      )
      .eq("user_id", user.user.id)
      .limit(1000);
    if (parsed.data.from) query = query.gte("trading_date", parsed.data.from);
    if (parsed.data.to) query = query.lte("trading_date", parsed.data.to);
    const { data, error } = await query;
    if (error) throw error;

    const trades = ((data ?? []) as Array<{
      direction: "LONG" | "SHORT";
      trade_executions: Array<{ execution_type: "ENTRY" | "EXIT"; executed_at: string; price: number; quantity: number; fee: number }>;
    }>).map((t) => ({
      direction: t.direction,
      executedAt: t.trade_executions[0]?.executed_at,
      executions: t.trade_executions.map((e) => ({
        type: e.execution_type,
        price: Number(e.price),
        quantity: e.quantity,
        fee: Number(e.fee),
      })),
    }));

    const overall = summarizeETF(trades);

    // 진입 시각 기준 30분 슬롯 × 종목 피벗
    const bySlot = pivotBySlot(trades);

    return Response.json({ overall, bySlot, multiplier });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "stats failed" }, { status: 500 });
  }
}
