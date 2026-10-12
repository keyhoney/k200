"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KChart from "./KChart";
import TradeForm from "./TradeForm";
import TradeEditForm, { isSimpleEditable } from "./TradeEditForm";
import JournalForm from "./JournalForm";
import { toMarkers } from "@/lib/markers";
import { aggregateBars } from "@/lib/bars";
import { calcETFTrade, ETF_LABEL } from "@/lib/etf";
import type { ChartData } from "@/lib/chartData";

export default function ReviewClient({ initial }: { initial: ChartData }) {
  const router = useRouter();
  const [data, setData] = useState<ChartData>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);

  const markers = useMemo(
    () =>
      toMarkers(
        data.trades.flatMap((t) =>
          t.executions.map((e) => ({ direction: t.direction, type: e.type, executedAt: e.executedAt })),
        ),
      ),
    [data.trades],
  );
  const bars3m = useMemo(() => aggregateBars(data.bars, 3), [data.bars]);
  // 3분봉 마커는 3분 버킷 시작으로 내림 (버킷에 봉이 없으면 마커가 표시되지 않음)
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

  function savedEdit() {
    setEditingId(null);
    refresh();
  }

  async function removeTrade(id: string) {
    if (!confirm("이 거래를 삭제할까요? 통계에서 즉시 제외됩니다.")) return;
    await fetch(`/api/trades/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <main className="p-6 flex flex-col gap-4">
      <header className="flex items-center gap-3 text-sm">
        <h1 className="text-lg font-bold">{data.tradingDate} 복기</h1>
        <span className="rounded border px-2 py-0.5 text-xs">
          {data.contract.name} ({data.contract.symbol})
        </span>
        <span className="text-xs text-zinc-500">source: {data.source}</span>
      </header>
      <h2 className="text-sm font-bold">1분봉</h2>
      <KChart bars={data.bars} markers={markers} />
      <h2 className="text-sm font-bold">3분봉 <span className="font-normal text-zinc-500">(1분봉 합성)</span></h2>
      <KChart bars={bars3m} markers={markers3m} />
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="rounded border p-4 text-sm flex flex-col gap-2">
            <h2 className="font-bold">거래 목록 ({data.trades.length})</h2>
            {data.trades.length === 0 && <p className="text-xs text-zinc-500">아직 입력된 거래가 없습니다.</p>}
            {data.trades.map((t) => {
              const r = calcETFTrade(t.executions.map((e) => ({ type: e.type, price: e.price, quantity: e.quantity, fee: e.fee })));
              const entries = t.executions.filter((e) => e.type === "ENTRY");
              const exits = t.executions.filter((e) => e.type === "EXIT");
              const fmtT = (iso: string) =>
                new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });
              const firstEntry = entries.map((e) => e.executedAt).sort()[0];
              const lastExit = exits.map((e) => e.executedAt).sort().at(-1);
              return (
                <div key={t.id} className="rounded border p-2 text-xs flex items-center justify-between gap-2">
                  <span>
                    [{ETF_LABEL[t.direction] ?? t.direction}] {firstEntry ? fmtT(firstEntry) : "—"} → {lastExit ? fmtT(lastExit) : "—"} · {r.avgEntry.toLocaleString()}원 → {r.avgExit.toLocaleString()}원 · {r.net.toLocaleString()}원 ({r.returnRate.toFixed(2)}%)
                  </span>
                  <span className="flex gap-2 shrink-0">
                    {isSimpleEditable(t) && (
                      <button className="underline" onClick={() => setEditingId(t.id)}>수정</button>
                    )}
                    <button className="underline" onClick={() => removeTrade(t.id)}>삭제</button>
                  </span>
                </div>
              );
            })}
          </div>
          {(() => {
            const editing = data.trades.find((t) => t.id === editingId);
            if (!editingId || !editing) return null;
            if (!isSimpleEditable(editing)) {
              return (
                <div className="rounded border p-3 text-xs">
                  <p>분할 체결이 포함된 거래는 여기서 수정할 수 없습니다. 삭제 후 다시 입력해 주세요.</p>
                  <button className="underline mt-1" onClick={() => setEditingId(null)}>닫기</button>
                </div>
              );
            }
            return <TradeEditForm trade={editing} onSaved={savedEdit} onCancel={() => setEditingId(null)} />;
          })()}
          <TradeForm tradingDate={data.tradingDate} contractId={data.contract.id} onSaved={refresh} />
        </div>
        <JournalForm date={data.tradingDate} />
      </section>
    </main>
  );
}
