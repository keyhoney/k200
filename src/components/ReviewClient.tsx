"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KChart, { type TradeLine } from "./KChart";
import TradeForm from "./TradeForm";
import TradeEditForm from "./TradeEditForm";
import JournalForm from "./JournalForm";
import { toMarkers } from "@/lib/markers";
import { aggregateBars, type Bar } from "@/lib/bars";
import { calcETFTrade, ETF_LABEL } from "@/lib/etf";
import type { ChartData } from "@/lib/chartData";
import { Badge, Empty, btnMini as btnMiniCls, cardPad as cardPadCls, page as pageCls, pnlText as pnlTextCls, sectionTitle as sectionTitleCls } from "@/components/ui";

function shiftDate(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00+09:00`);
  d.setDate(d.getDate() + delta);
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 10);
}

function barToDtLocal(bar: Bar): string {
  return new Date((bar.time + 9 * 3600) * 1000).toISOString().slice(0, 16);
}

export default function ReviewClient({ initial }: { initial: ChartData }) {
  const router = useRouter();
  const [data, setData] = useState<ChartData>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickedDt, setPickedDt] = useState<string | null>(null);

  useEffect(() => setData(initial), [initial]);

  // 날짜 전환 단축키: ←/→ 이동, Esc 선택 해제
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") router.push(`/review/${shiftDate(data.tradingDate, -1)}`);
      else if (e.key === "ArrowRight") router.push(`/review/${shiftDate(data.tradingDate, 1)}`);
      else if (e.key === "Escape") { setSelectedId(null); setEditingId(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [data.tradingDate, router]);

  const tradeStats = useMemo(() => {
    const map = new Map<string, { avgEntry: number; avgExit: number; net: number; firstEntry: string; lastExit: string }>();
    for (const t of data.trades) {
      const r = calcETFTrade(t.executions.map((e) => ({ type: e.type, price: e.price, quantity: e.quantity, fee: e.fee })));
      const entries = t.executions.filter((e) => e.type === "ENTRY").map((e) => e.executedAt).sort();
      const exits = t.executions.filter((e) => e.type === "EXIT").map((e) => e.executedAt).sort();
      map.set(t.id, { avgEntry: r.avgEntry, avgExit: r.avgExit, net: r.net, firstEntry: entries[0] ?? "", lastExit: exits.at(-1) ?? "" });
    }
    return map;
  }, [data.trades]);

  const markers = useMemo(
    () =>
      toMarkers(
        data.trades.flatMap((t) =>
          t.executions.map((e) => ({ direction: t.direction, type: e.type, executedAt: e.executedAt, tradeId: t.id })),
        ),
      ),
    [data.trades],
  );

  const lines: TradeLine[] = useMemo(
    () =>
      data.trades.flatMap((t) => {
        const s = tradeStats.get(t.id);
        if (!s || !s.firstEntry || !s.lastExit) return [];
        // 시간만 사용 — 가격(ETF 체결가)은 선물 차트 스케일과 달라 그리지 않음
        return [{
          tradeId: t.id,
          direction: t.direction,
          entryTime: Math.floor(new Date(s.firstEntry).getTime() / 1000),
          exitTime: Math.floor(new Date(s.lastExit).getTime() / 1000),
        }];
      }),
    [data.trades, tradeStats],
  );

  const bars3m = useMemo(() => aggregateBars(data.bars, 3), [data.bars]);
  const markers3m = useMemo(
    () => markers.map((m) => ({ ...m, time: m.time - (m.time % 180) })),
    [markers],
  );

  async function refresh() {
    const res = await fetch(`/api/chart?date=${data.tradingDate}`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as ChartData;
      setData(json);
    }
    router.refresh();
  }

  async function removeTrade(id: string) {
    if (!confirm("이 거래를 삭제할까요? 통계에서 즉시 제외됩니다.")) return;
    await fetch(`/api/trades/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    refresh();
  }

  const selected = data.trades.find((t) => t.id === (editingId ?? selectedId)) ?? data.trades.find((t) => t.id === selectedId);
  const fmtT = (iso: string) =>
    new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });

  return (
    <main className={pageCls}>
      <header className="card p-4 md:p-5 flex items-center gap-2 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <button className={btnMiniCls} onClick={() => router.push(`/review/${shiftDate(data.tradingDate, -1)}`)} aria-label="이전 거래일">◀</button>
          <h1 className="tnum text-lg md:text-xl font-extrabold tracking-tight">{data.tradingDate} 복기</h1>
          <button className={btnMiniCls} onClick={() => router.push(`/review/${shiftDate(data.tradingDate, 1)}`)} aria-label="다음 거래일">▶</button>
        </div>
        <input type="date" className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs shadow-sm" value={data.tradingDate}
          onChange={(e) => e.target.value && router.push(`/review/${e.target.value}`)} aria-label="날짜 선택" />
        <Badge tone="neutral">{data.contract.name} ({data.contract.symbol})</Badge>
        <span className="text-[11px] text-zinc-400">source: {data.source} · 단축키 ←/→ 날짜이동 · Esc 해제</span>
      </header>

      <div className="card p-4 md:p-5">
        <h2 className={`${sectionTitleCls} mb-2`}>1분봉 <span className="font-normal text-zinc-500">선물 참고용</span></h2>
        <KChart bars={data.bars} markers={markers} lines={lines}
          selectedTradeId={selectedId} onSelectTrade={(id) => { setSelectedId(id); setEditingId(null); }}
          onPickBar={(b) => setPickedDt(barToDtLocal(b))} />
      </div>

      <div className="card p-4 md:p-5">
        <h2 className={`${sectionTitleCls} mb-2`}>3분봉 <span className="font-normal text-zinc-500">(1분봉 합성)</span></h2>
        <KChart bars={bars3m} markers={markers3m} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2 items-start">
        <div className="flex flex-col gap-3">
          <div className={cardPadCls}>
            <h2 className={sectionTitleCls}>거래 목록 ({data.trades.length})</h2>
            {data.trades.length === 0 && <Empty>아직 입력된 거래가 없습니다.</Empty>}
            {data.trades.map((t) => {
              const r = calcETFTrade(t.executions.map((e) => ({ type: e.type, price: e.price, quantity: e.quantity, fee: e.fee })));
              const s = tradeStats.get(t.id);
              const sel = t.id === selectedId;
              return (
                <div key={t.id} className={`rounded-xl border p-2.5 text-xs flex items-center justify-between gap-2 transition ${sel ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}`}>
                  <button className="text-left flex-1 flex flex-col gap-1" onClick={() => { setSelectedId(sel ? null : t.id); setEditingId(null); }}
                    title={t.executions.map((e) => `${e.type} ${fmtT(e.executedAt)} ${e.price.toLocaleString()}원 x${e.quantity}${e.memo ? ` (${e.memo})` : ""}`).join("\n")}>
                    <span className="flex items-center gap-1.5">
                      <Badge tone={t.direction === "LONG" ? "long" : "short"}>{ETF_LABEL[t.direction] ?? t.direction}</Badge>
                      <span className="tnum text-zinc-500">{s?.firstEntry ? fmtT(s.firstEntry) : "—"} → {s?.lastExit ? fmtT(s.lastExit) : "—"}</span>
                    </span>
                    <span className="tnum">{r.avgEntry.toLocaleString()}원 → {r.avgExit.toLocaleString()}원 · <span className={`font-bold ${pnlTextCls(r.net)}`}>{r.net.toLocaleString()}원 ({r.returnRate.toFixed(2)}%)</span> · 체결 {t.executions.length}건</span>
                  </button>
                  <span className="flex gap-2 shrink-0">
                    <button className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium" onClick={() => { setEditingId(t.id); setSelectedId(t.id); }}>수정</button>
                    <button className="text-zinc-500 hover:underline" onClick={() => removeTrade(t.id)}>삭제</button>
                  </span>
                </div>
              );
            })}
          </div>

          {selected && !editingId && (
            <div className="card p-4 text-xs flex flex-col gap-1.5 border-indigo-300 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">거래 상세 <Badge tone={selected.direction === "LONG" ? "long" : "short"}>{ETF_LABEL[selected.direction]}</Badge></h3>
                <button className="text-zinc-500 hover:underline" onClick={() => setSelectedId(null)}>닫기</button>
              </div>
              {selected.strategyName && <p>전략: {selected.strategyName}{selected.setupGrade ? ` (${selected.setupGrade})` : ""}</p>}
              {selected.executions.map((e, i) => (
                <p key={i} className="tnum">{e.type === "ENTRY" ? "진입" : "청산"} {fmtT(e.executedAt)} · {e.price.toLocaleString()}원 x{e.quantity}{e.memo ? ` · ${e.memo}` : ""}</p>
              ))}
              {selected.entryReason && <p>진입 이유: {selected.entryReason}</p>}
              {selected.exitReason && <p>청산 이유: {selected.exitReason}</p>}
              <div className="flex gap-2 mt-1">
                <button className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium" onClick={() => setEditingId(selected.id)}>수정</button>
                <button className="text-zinc-500 hover:underline" onClick={() => removeTrade(selected.id)}>삭제</button>
              </div>
            </div>
          )}

          {editingId && (() => {
            const editing = data.trades.find((t) => t.id === editingId);
            if (!editing) return null;
            return <TradeEditForm trade={editing} onSaved={() => { setEditingId(null); refresh(); }} onCancel={() => setEditingId(null)} />;
          })()}

          {pickedDt && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              차트 선택 시각: {pickedDt.replace("T", " ")} → 아래 입력에 반영됨 (가격은 ETF 체결가를 직접 입력)
              <button className="underline ml-2" onClick={() => setPickedDt(null)}>해제</button>
            </p>
          )}
          <TradeForm tradingDate={data.tradingDate} contractId={data.contract.id} onSaved={refresh}
            initialDt={pickedDt ?? undefined} />
        </div>
        <JournalForm date={data.tradingDate} />
      </section>
    </main>
  );
}
