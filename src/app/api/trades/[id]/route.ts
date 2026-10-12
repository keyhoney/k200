import { z } from "zod";

const PatchBody = z.object({
  strategyName: z.string().max(100).nullable().optional(),
  setupGrade: z.enum(["A", "B", "C", "D"]).nullable().optional(),
  entryReason: z.string().max(5000).nullable().optional(),
  exitReason: z.string().max(5000).nullable().optional(),
  tradeNote: z.string().max(5000).nullable().optional(),
  ruleFollowed: z.boolean().nullable().optional(),
  screenshotPath: z.string().max(500).nullable().optional(),
});

// PATCH /api/trades/[id] — 원본 체결은 수정하지 않고 복기 필드만 수정 (Agnet.md 금지사항 준수).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json: unknown = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const p = parsed.data;
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
