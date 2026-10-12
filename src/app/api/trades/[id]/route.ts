import { TradePatchSchema } from "@/lib/tradePatch";
import { validateTrade } from "@/lib/tradeSchema";

// PATCH /api/trades/[id] — 복기 필드 수정 + 본인의 체결 수동 정정.
// 체결 정정은 Zod + validateTrade 검증을 거쳐 trades 방향 갱신 후 체결을 통째로 교체.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json: unknown = await req.json().catch(() => null);
  const parsed = TradePatchSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const p = parsed.data;

    if (p.executions !== undefined || p.direction !== undefined) {
      if (p.executions === undefined || p.direction === undefined) {
        return Response.json({ error: "direction과 executions를 함께 보내야 합니다." }, { status: 400 });
      }
      const { data: trade, error: fErr } = await sb
        .from("trades")
        .select("id,trading_date,contract_id")
        .eq("id", id)
        .eq("user_id", user.user.id)
        .single();
      if (fErr || !trade) return Response.json({ error: "trade not found" }, { status: 404 });
      const t = trade as { id: string; trading_date: string; contract_id: number };
      const vErr = validateTrade({
        tradingDate: t.trading_date,
        contractId: t.contract_id,
        direction: p.direction,
        executions: p.executions,
      });
      if (vErr) return Response.json({ error: vErr.message }, { status: 422 });
      const { error: uErr } = await sb
        .from("trades")
        .update({ direction: p.direction, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.user.id);
      if (uErr) throw uErr;
      const { error: dErr } = await sb.from("trade_executions").delete().eq("trade_id", id);
      if (dErr) throw dErr;
      const { error: iErr } = await sb.from("trade_executions").insert(
        p.executions.map((e, i) => ({
          trade_id: id,
          execution_type: e.type,
          executed_at: e.executedAt,
          price: e.price,
          quantity: e.quantity,
          fee: e.fee,
          memo: e.memo ?? null,
          sort_order: i,
        })),
      );
      if (iErr) throw iErr;
      return Response.json({ ok: true });
    }

    const { error } = await sb
      .from("trades")
      .update({
        strategy_name: p.strategyName ?? undefined,
        setup_grade: p.setupGrade ?? undefined,
        entry_reason: p.entryReason ?? undefined,
        exit_reason: p.exitReason ?? undefined,
        trade_note: p.tradeNote ?? undefined,
        rule_followed: p.ruleFollowed ?? undefined,
        screenshot_path: p.screenshotPath ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.user.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "update failed" }, { status: 500 });
  }
}

// DELETE /api/trades/[id] — 확인은 클라이언트에서, 통계에서 즉시 제외 (cascade로 체결 삭제).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { error } = await sb.from("trades").delete().eq("id", id).eq("user_id", user.user.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "delete failed" }, { status: 500 });
  }
}
