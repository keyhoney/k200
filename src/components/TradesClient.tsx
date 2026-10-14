"use client";

import { useState } from "react";
import Link from "next/link";
import { calcETFTrade, ETF_LABEL } from "@/lib/etf";
import { formatKSTTime } from "@/lib/kst";
import { Badge, Empty, btnPrimary, cardPad, input, label, page, pageTitle, pnlBadge, td, th, trBorder } from "@/components/ui";

interface Row {
  id: string;
  trading_date: string;
  direction: "LONG" | "SHORT";
  trade_executions: Array<{ execution_type: "ENTRY" | "EXIT"; executed_at: string; price: number; quantity: number; fee: number }>;
}

export default function TradesClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [direction, setDirection] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");

  async function search() {
    setMsg("검색 중…");
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (direction) p.set("direction", direction);
    if (q) p.set("q", q);
    const res = await fetch(`/api/trades?${p.toString()}`);
    const json = (await res.json()) as { trades?: Row[]; error?: string };
    if (!res.ok) {
      setMsg(typeof json.error === "string" ? json.error : "검색 실패");
      return;
    }
    setRows(json.trades ?? []);
    setMsg(`${json.trades?.length ?? 0}건`);
  }

  return (
    <main className={page}>
      <h1 className={pageTitle}>거래 검색</h1>
      <div className={cardPad}>
        <div className="flex flex-wrap gap-3 items-end">
          <label className={label}>시작<input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className={label}>종료<input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className={label}>종목
            <select className={input} value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="">전체</option><option value="LONG">레버리지</option><option value="SHORT">인버스2X</option>
            </select>
          </label>
          <label className={label}>키워드<input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="키워드" /></label>
          <button onClick={search} className={btnPrimary}>검색</button>
          <span className="text-xs text-zinc-500 pb-2">{msg}</span>
        </div>
      </div>
      <div className="card p-2 md:p-4 overflow-x-auto thin-scroll">
        {rows.length === 0 ? (
          <div className="p-2"><Empty>조건을 입력하고 검색하세요.</Empty></div>
        ) : (
        <table className="w-full text-xs">
          <thead><tr className="border-b border-zinc-200 dark:border-zinc-800"><th className={th}>날짜</th><th className={th}>종목</th><th className={`${th} text-right`}>순손익</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const pnl = calcETFTrade(r.trade_executions.map((e) => ({ type: e.execution_type, price: Number(e.price), quantity: e.quantity, fee: Number(e.fee) })));
              const firstExec = r.trade_executions[0];
              const timeStr = firstExec ? formatKSTTime(new Date(firstExec.executed_at).getTime()) : "—";
              return (
                <tr key={r.id} className={trBorder}>
                  <td className={td}><span className="tnum">{r.trading_date}</span><br /><span className="text-[10px] text-zinc-400">{timeStr}</span></td>
                  <td className={td}><Badge tone={r.direction === "LONG" ? "long" : "short"}>{ETF_LABEL[r.direction] ?? r.direction}</Badge></td>
                  <td className={`${td} text-right`}>
                    <span className={`tnum inline-flex rounded-full border px-2 py-0.5 font-bold ${pnlBadge(pnl.net)}`}>{pnl.net.toLocaleString()}원</span>
                  </td>
                  <td className={`${td} text-right`}><Link className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium" href={`/review/${r.trading_date}`}>차트로</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </main>
  );
}
