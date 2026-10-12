"use client";

import { useState } from "react";

interface Stats {
  overall: { count: number; wins: number; losses: number; winRate: number; net: number; profitFactor: number | null };
  bySlot: Array<{ slot: string; lev: { count: number; net: number }; inv: { count: number; net: number } }>;
}

function SlotTable({ rows }: { rows: Stats["bySlot"] }) {
  const cell = (c: { count: number; net: number }) =>
    c.count === 0 ? "—" : `${c.net.toLocaleString()}원 (${c.count})`;
  const tot = (pick: (r: Stats["bySlot"][number]) => { count: number; net: number }) =>
    rows.reduce(
      (a, r) => ({ count: a.count + pick(r).count, net: a.net + pick(r).net }),
      { count: 0, net: 0 },
    );
  const totLev = tot((r) => r.lev);
  const totInv = tot((r) => r.inv);
  const totAll = { count: totLev.count + totInv.count, net: totLev.net + totInv.net };
  return (
    <table className="w-full">
      <thead>
        <tr className="text-left border-b">
          <th className="py-1">시간대</th>
          <th className="text-right">레버리지</th>
          <th className="text-right">인버스2X</th>
          <th className="text-right">합계</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const count = r.lev.count + r.inv.count;
          const net = r.lev.net + r.inv.net;
          return (
            <tr key={r.slot} className="border-b">
              <td className="py-1">{r.slot}</td>
              <td className="text-right">{cell(r.lev)}</td>
              <td className="text-right">{cell(r.inv)}</td>
              <td className="text-right font-semibold">{count === 0 ? "—" : `${net.toLocaleString()}원 (${count})`}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 font-bold">
          <td className="py-1">합계</td>
          <td className="text-right">{cell(totLev)}</td>
          <td className="text-right">{cell(totInv)}</td>
          <td className="text-right">{cell(totAll)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export default function StatsClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [s, setS] = useState<Stats | null>(null);

  async function load() {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const res = await fetch(`/api/stats?${p.toString()}`);
    if (res.ok) setS((await res.json()) as Stats);
  }

  return (
    <main className="p-6 flex flex-col gap-4 text-sm">
      <h1 className="text-lg font-bold">통계</h1>
      <div className="flex gap-2 items-end text-xs">
        <label>시작<input type="date" className="mt-1 rounded border px-2 py-1" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>종료<input type="date" className="mt-1 rounded border px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button onClick={load} className="rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black">조회</button>
      </div>
      {s && (
        <>
          <div className="rounded border p-3 text-xs">
            전체 {s.overall.count}건 · 승 {s.overall.wins} / 패 {s.overall.losses} · 승률 {s.overall.winRate.toFixed(1)}% · 순손익 {s.overall.net.toLocaleString()}원 · PF {s.overall.profitFactor?.toFixed(2) ?? "—"}
          </div>
          <div className="rounded border p-3 text-xs">
            <h3 className="font-bold mb-2">시간대 × 종목 (진입 시각 기준, KST 30분 단위)</h3>
            <SlotTable rows={s.bySlot} />
          </div>
        </>
      )}
    </main>
  );
}
