import { TradeBodySchema, validateTrade } from "@/lib/tradeSchema";

// POST /api/trades — 체결 검증 후 trades + trade_executions 저장 (RLS로 본인 행만).
export async function POST(req: Request) {
  const json: unknown = await req.json().catch(() => null);
  const parsed = TradeBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const vErr = validateTrade(b);
  if (vErr) return Response.json({ error: vErr.message }, { status: 422 });

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });

    const { data: trade, error: tErr } = await sb
      .from("trades")
      .insert({
        user_id: user.user.id,
        contract_id: b.contractId,
        trading_date: b.tradingDate,
        direction: b.direction,
        strategy_name: b.strategyName ?? null,
        setup_grade: b.setupGrade ?? null,
        entry_reason: b.entryReason ?? null,
        exit_reason: b.exitReason ?? null,
        trade_note: b.tradeNote ?? null,
        rule_followed: b.ruleFollowed ?? null,
        screenshot_path: b.screenshotPath ?? null,
      })
      .select("id")
      .single();
    if (tErr || !trade) throw tErr ?? new Error("trade insert failed");

    const { error: eErr } = await sb.from("trade_executions").insert(
      b.executions.map((e, i) => ({
        trade_id: (trade as { id: string }).id,
        execution_type: e.type,
        executed_at: e.executedAt,
        price: e.price,
        quantity: e.quantity,
        fee: e.fee,
        memo: e.memo ?? null,
        sort_order: i,
      })),
    );
    if (eErr) throw eErr;
    return Response.json({ id: (trade as { id: string }).id }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "insert failed" }, { status: 500 });
  }
}

// GET /api/trades?from=&to=&direction=&profit=&grade=&rule=&q=
// Agnet.md §11 검색 조건의 서버 측 최소 구현.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const direction = url.searchParams.get("direction");
  const grade = url.searchParams.get("grade");
  const rule = url.searchParams.get("rule"); // 'true' | 'false'
  const q = url.searchParams.get("q");
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });
    let query = sb
      .from("trades")
      .select(
        "id,trading_date,direction,strategy_name,setup_grade,rule_followed,entry_reason,exit_reason,trade_executions(execution_type,executed_at,price,quantity,fee)",
      )
      .eq("user_id", user.user.id)
      .order("trading_date", { ascending: false });
    if (from) query = query.gte("trading_date", from);
    if (to) query = query.lte("trading_date", to);
    if (direction === "LONG" || direction === "SHORT") query = query.eq("direction", direction);
    if (grade) query = query.eq("setup_grade", grade);
    if (rule === "true") query = query.eq("rule_followed", true);
    if (rule === "false") query = query.eq("rule_followed", false);
    if (q) query = query.or(`entry_reason.ilike.%${q}%,exit_reason.ilike.%${q}%,strategy_name.ilike.%${q}%`);
    const { data, error } = await query.limit(200);
    if (error) throw error;
    return Response.json({ trades: data ?? [] });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "query failed" }, { status: 500 });
  }
}
