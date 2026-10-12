"use client";

import { useState } from "react";
import Link from "next/link";
import { calcTrade } from "@/lib/pnl";

interface Row {
  id: string;
  trading_date: string;
  direction: "LONG" | "SHORT";
  strategy_name: string | null;
  setup_grade: string | null;
  rule_followed: boolean | null;
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
    <main className="p-6 flex flex-col gap-4 text-sm">
      <h1 className="text-lg font-bold">거래 검색</h1>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs">시작<input type="date" className="mt-1 rounded border px-2 py-1" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs">종료<input type="date" className="mt-1 rounded border px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="text-xs">방향
          <select className="mt-1 rounded border px-2 py-1" value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="">전체</option><option value="LONG">롱</option><option value="SHORT">숏</option>
          </select>
        </label>
        <label className="text-xs">키워드<input className="mt-1 rounded border px-2 py-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="전략/메모" /></label>
        <button onClick={search} className="rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black">검색</button>
        <span className="text-xs text-zinc-500">{msg}</span>
      </div>
      <table className="w-full text-xs">
        <thead><tr className="text-left border-b"><th>날짜</th><th>방향</th><th>전략</th><th>등급</th><th>순손익</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const pnl = calcTrade(r.direction, r.trade_executions.map((e) => ({ type: e.execution_type, price: Number(e.price), quantity: e.quantity, fee: Number(e.fee) })), 250000);
            return (
              <tr key={r.id} className="border-b">
                <td>{r.trading_date}</td><td>{r.direction}</td><td>{r.strategy_name ?? "—"}</td><td>{r.setup_grade ?? "—"}</td>
                <td>{pnl.net.toLocaleString()}</td>
                <td><Link className="underline" href={`/review/${r.trading_date}`}>차트로</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
