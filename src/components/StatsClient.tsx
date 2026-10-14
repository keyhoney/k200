"use client";

import { useState } from "react";
import { Badge, btnPrimary, cardPad, input, label, page, pageTitle, pnlText, sectionTitle, td as tdCls, th as thCls, trBorder as trCls } from "@/components/ui";

interface Stats {
  overall: { count: number; wins: number; losses: number; winRate: number; net: number; profitFactor: number | null };
  bySlot: Array<{ slot: string; lev: { count: number; net: number }; inv: { count: number; net: number } }>;
  byDirection?: Record<string, Stats["overall"]>;
  byWeekday?: Record<string, Stats["overall"]>;
  byGrade?: Record<string, Stats["overall"]>;
  byRule?: Record<string, Stats["overall"]>;
  byHolding?: Record<string, Stats["overall"]>;
  streaks?: { maxWinStreak: number; maxLossStreak: number };
  insights?: string[];
}

type Summary = Stats["overall"];

function SlotTable({ rows }: { rows: Stats["bySlot"] }) {
  const cell = (c: { count: number; net: number }) =>
    c.count === 0 ? <span className="text-zinc-400">—</span> : <span className="tnum">{c.net.toLocaleString()}원 <span className="text-zinc-400">({c.count})</span></span>;
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
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th className={thCls}>시간대</th>
          <th className={`${thCls} text-right`}>레버리지</th>
          <th className={`${thCls} text-right`}>인버스2X</th>
          <th className={`${thCls} text-right`}>합계</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const count = r.lev.count + r.inv.count;
          const net = r.lev.net + r.inv.net;
          return (
            <tr key={r.slot} className={trCls}>
              <td className={`${tdCls} tnum`}>{r.slot}</td>
              <td className={`${tdCls} text-right`}>{cell(r.lev)}</td>
              <td className={`${tdCls} text-right`}>{cell(r.inv)}</td>
              <td className={`${tdCls} text-right font-bold`}>{count === 0 ? <span className="text-zinc-400">—</span> : <span className="tnum">{net.toLocaleString()}원 <span className="font-normal text-zinc-400">({count})</span></span>}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-zinc-300 dark:border-zinc-700 font-bold">
          <td className={tdCls}>합계</td>
          <td className={`${tdCls} text-right`}>{cell(totLev)}</td>
          <td className={`${tdCls} text-right`}>{cell(totInv)}</td>
          <td className={`${tdCls} text-right tnum`}>{cell(totAll)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function GroupTable({ title, groups, order }: { title: string; groups?: Record<string, Summary>; order?: string[] }) {
  if (!groups || Object.keys(groups).length === 0) return null;
  const keys = order ? order.filter((k) => groups[k]) : Object.keys(groups);
  const rest = order ? Object.keys(groups).filter((k) => !order.includes(k)) : [];
  return (
    <div className="card p-4 md:p-5 text-xs">
      <h3 className={`${sectionTitle} mb-2`}>{title}</h3>
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className={thCls}>구분</th>
            <th className={`${thCls} text-right`}>건수</th>
            <th className={`${thCls} text-right`}>승률</th>
            <th className={`${thCls} text-right`}>순손익</th>
            <th className={`${thCls} text-right`}>PF</th>
          </tr>
        </thead>
        <tbody>
          {[...keys, ...rest].map((k) => {
            const g = groups[k];
            return (
              <tr key={k} className={trCls}>
                <td className={tdCls}><Badge tone={k === "LONG" ? "long" : k === "SHORT" ? "short" : "neutral"}>{k}</Badge></td>
                <td className={`${tdCls} text-right tnum`}>{g.count}</td>
                <td className={`${tdCls} text-right tnum`}>{g.winRate.toFixed(1)}%</td>
                <td className={`${tdCls} text-right tnum font-bold ${pnlText(g.net)}`}>{g.net.toLocaleString()}원</td>
                <td className={`${tdCls} text-right tnum`}>{g.profitFactor?.toFixed(2) ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
    <main className={page}>
      <h1 className={pageTitle}>통계</h1>
      <div className={cardPad}>
        <div className="flex gap-3 items-end text-xs flex-wrap">
          <label className={label}>시작<input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className={label}>종료<input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <button onClick={load} className={btnPrimary}>조회</button>
        </div>
      </div>
      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { l: "거래수", v: `${s.overall.count}건` },
              { l: "승 / 패", v: `${s.overall.wins} / ${s.overall.losses}` },
              { l: "승률", v: `${s.overall.winRate.toFixed(1)}%` },
              { l: "순손익", v: `${s.overall.net.toLocaleString()}원`, tone: s.overall.net > 0 ? "profit" as const : s.overall.net < 0 ? "loss" as const : "neutral" as const },
              { l: "Profit Factor", v: s.overall.profitFactor?.toFixed(2) ?? "—" },
            ].map((c) => (
              <div key={c.l} className="card p-3.5">
                <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{c.l}</div>
                <div className={`tnum text-lg font-extrabold tracking-tight ${c.tone === "profit" ? pnlText(1) : c.tone === "loss" ? pnlText(-1) : ""}`}>{c.v}</div>
              </div>
            ))}
          </div>
          {s.streaks && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">최대 연속이익 {s.streaks.maxWinStreak}회 · 최대 연속손실 {s.streaks.maxLossStreak}회</p>
          )}
          {s.insights && s.insights.length > 0 && (
            <div className="card p-4 md:p-5 text-xs border-indigo-200 dark:border-indigo-900">
              <h3 className={`${sectionTitle} mb-1.5`}>기록 집계</h3>
              <ul className="list-disc ml-4 flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
                {s.insights.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
              <p className="text-[11px] text-zinc-500 mt-1.5">과거 기록의 단순 집계이며 투자 조언이 아닙니다.</p>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            <GroupTable title="방향별" groups={s.byDirection} order={["LONG", "SHORT"]} />
            <GroupTable title="요일별" groups={s.byWeekday} order={["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일", "기타"]} />
            <GroupTable title="셋업 등급별" groups={s.byGrade} order={["A", "B", "C", "D", "미지정"]} />
            <GroupTable title="규칙준수별" groups={s.byRule} order={["지킴", "어김", "미기록"]} />
          </div>
          <GroupTable title="보유시간별" groups={s.byHolding} order={["~5분", "5~15분", "15~30분", "30분+", "기타"]} />
          <div className="card p-4 md:p-5 text-xs">
            <h3 className={`${sectionTitle} mb-2`}>시간대 × 종목 <span className="font-normal text-zinc-500">진입 시각 기준, KST 30분 단위</span></h3>
            <SlotTable rows={s.bySlot} />
          </div>
        </>
      )}
    </main>
  );
}
