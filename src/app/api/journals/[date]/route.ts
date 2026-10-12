import { z } from "zod";

const JournalBody = z.object({
  premarketPlan: z.string().max(5000).nullable().optional(),
  marketSummary: z.string().max(5000).nullable().optional(),
  goodPoints: z.string().max(5000).nullable().optional(),
  badPoints: z.string().max(5000).nullable().optional(),
  lessonLearned: z.string().max(5000).nullable().optional(),
  nextSessionPlan: z.string().max(5000).nullable().optional(),
  confidenceScore: z.number().int().min(1).max(5).nullable().optional(),
  concentrationScore: z.number().int().min(1).max(5).nullable().optional(),
  disciplineScore: z.number().int().min(1).max(5).nullable().optional(),
  satisfactionScore: z.number().int().min(1).max(5).nullable().optional(),
});

// GET /api/journals/[date]
export async function GET(_req: Request, ctx: { params: Promise<{ date: string }> }) {
  const { date } = await ctx.params;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { data } = await sb
      .from("daily_journals")
      .select("*")
      .eq("user_id", user.user.id)
      .eq("trading_date", date)
      .maybeSingle();
    return Response.json({ journal: data ?? null });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "query failed" }, { status: 500 });
  }
}

// PUT /api/journals/[date] — 날짜별 독립 저장 (upsert user+date).
export async function PUT(req: Request, ctx: { params: Promise<{ date: string }> }) {
  const { date } = await ctx.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "invalid date" }, { status: 400 });
  }
  const json: unknown = await req.json().catch(() => null);
  const parsed = JournalBody.safeParse(json);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });
    const p = parsed.data;
    const { error } = await sb.from("daily_journals").upsert(
      {
        user_id: user.user.id,
        trading_date: date,
        premarket_plan: p.premarketPlan ?? null,
        market_summary: p.marketSummary ?? null,
        good_points: p.goodPoints ?? null,
        bad_points: p.badPoints ?? null,
        lesson_learned: p.lessonLearned ?? null,
        next_session_plan: p.nextSessionPlan ?? null,
        confidence_score: p.confidenceScore ?? null,
        concentration_score: p.concentrationScore ?? null,
        discipline_score: p.disciplineScore ?? null,
        satisfaction_score: p.satisfactionScore ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,trading_date" },
    );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "save failed" }, { status: 500 });
  }
}
