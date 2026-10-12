"use client";

import { useState } from "react";

interface Stats {
  overall: { count: number; wins: number; losses: number; winRate: number; net: number; profitFactor: number | null };
  byDirection: Record<string, { count: number; net: number }>;
  byStrategy: Record<string, { count: number; net: number }>;
  byGrade: Record<string, { count: number; net: number }>;
  byRule: Record<string, { count: number; net: number }>;
  bySession: Record<string, { count: number; net: number }>;
  insights: string[];
}

function Block({ title, data }: { title: string; data: Record<string, { count: number; net: number }> }) {
  return (
    <div className="rounded border p-3 text-xs">
      <h3 className="font-bold mb-2">{title}</h3>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex justify-between"><span>{k} ({v.count})</span><span>{v.net.toLocaleString()}원</span></div>
      ))}
    </div>
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
          <div className="grid md:grid-cols-3 gap-3">
            <Block title="방향별" data={s.byDirection} />
            <Block title="전략별" data={s.byStrategy} />
            <Block title="등급별" data={s.byGrade} />
            <Block title="규칙별" data={s.byRule} />
            <Block title="시간대별" data={s.bySession} />
          </div>
          {s.insights.map((i) => <p key={i} className="text-xs text-zinc-600 dark:text-zinc-400">{i}</p>)}
        </>
      )}
    </main>
  );
}
