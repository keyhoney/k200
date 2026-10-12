import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
  let rows: Array<{ trading_date: string; text: string }> = [];
  try {
    const sb = await createClient();
    const { data: user } = await sb.auth.getUser();
    if (user.user) {
      const { data } = await sb
        .from("daily_journals")
        .select("trading_date,premarket_plan,market_summary,good_points,bad_points,lesson_learned,next_session_plan")
        .eq("user_id", user.user.id)
        .order("trading_date", { ascending: false })
        .limit(50);
      rows = (data ?? []).map((r) => {
        const parts = [
          r.premarket_plan,
          r.market_summary,
          r.good_points,
          r.bad_points,
          r.lesson_learned,
          r.next_session_plan,
        ].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
        return { trading_date: r.trading_date, text: parts.join("\n\n") };
      });
    }
  } catch {
    rows = [];
  }
  return (
    <main className="p-6 flex flex-col gap-4 text-sm">
      <h1 className="text-xl font-bold">일지 목록</h1>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left border-b">
            <th>날짜</th><th>일지 내용</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.trading_date} className="border-b">
              <td className="whitespace-nowrap">{r.trading_date}</td>
              <td className="max-w-xl">
                {r.text ? (
                  <pre className="whitespace-pre-wrap break-words text-[11px] text-zinc-600 dark:text-zinc-400">
                    {r.text.slice(0, 200)}{r.text.length > 200 ? "…" : ""}
                  </pre>
                ) : (
                  <span className="text-zinc-400">기록 없음</span>
                )}
              </td>
              <td><Link className="underline" href={`/review/${r.trading_date}`}>보기</Link></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={3} className="text-zinc-400">아직 저장된 일지가 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}