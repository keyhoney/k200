import { z } from "zod";

const Row = z.object({
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), // "09:00:00" 또는 "09:00"
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().int().nonnegative(),
  open_interest: z.number().int().nonnegative().optional(),
});

const Body = z.object({
  tradingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contractSymbol: z.string().min(4).max(20),
  rows: z.array(Row).min(1).max(2000),
});

// POST /api/admin/bars — CSV 수동 보완 (Agnet.md §14). source='manual_csv'.
// Service Role로 저장하므로 SUPABASE_SERVICE_ROLE_KEY 필요 (서버 전용, Pages 등록 금지).
export async function POST(req: Request) {
  const json: unknown = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { tradingDate, contractSymbol, rows } = parsed.data;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (!user.user) return Response.json({ error: "unauthorized" }, { status: 401 });

    const svcUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!svcUrl || !svc) return Response.json({ error: "server missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

    // 월물 확인
    const cRes = await fetch(
      `${svcUrl}/rest/v1/futures_contracts?select=id&symbol=eq.${encodeURIComponent(contractSymbol)}&limit=1`,
      { headers: { apikey: svc, Authorization: `Bearer ${svc}` } },
    );
    const contracts = (await cRes.json()) as Array<{ id: number }>;
    const contract = contracts[0];
    if (!contract) return Response.json({ error: `unknown contract symbol: ${contractSymbol}` }, { status: 404 });

    // 검증: OHLC 무결성
    for (const r of rows) {
      if (!(r.high >= r.low && r.high >= r.open && r.high >= r.close && r.low <= r.open && r.low <= r.close)) {
        return Response.json({ error: `invalid OHLC at ${r.time}` }, { status: 422 });
      }
    }

    const payload = rows.map((r) => {
      const t = r.time.length === 5 ? `${r.time}:00` : r.time;
      return {
        contract_id: contract.id,
        trading_date: tradingDate,
        bar_time: `${tradingDate}T${t}+09:00`,
        open: r.open, high: r.high, low: r.low, close: r.close,
        volume: r.volume, open_interest: r.open_interest ?? null,
        source: "manual_csv",
      };
    });
    const uRes = await fetch(
      `${svcUrl}/rest/v1/minute_bars?on_conflict=contract_id,bar_time`,
      {
        method: "POST",
        headers: {
          apikey: svc, Authorization: `Bearer ${svc}`,
          "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(payload),
      },
    );
    if (!uRes.ok) throw new Error(`upsert failed: ${await uRes.text()}`);
    return Response.json({ ok: true, count: payload.length }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "import failed" }, { status: 500 });
  }
}
