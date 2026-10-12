"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import KChart from "./KChart";
import TradeForm from "./TradeForm";
import JournalForm from "./JournalForm";
import { toMarkers } from "@/lib/markers";
import { calcTrade } from "@/lib/pnl";
import type { ChartData } from "@/lib/chartData";

export default function ReviewClient({ initial }: { initial: ChartData }) {
  const router = useRouter();
  const [data, setData] = useState<ChartData>(initial);

  const markers = useMemo(
    () =>
      toMarkers(
        data.trades.flatMap((t) =>
          t.executions.map((e) => ({ direction: t.direction, type: e.type, executedAt: e.executedAt })),
        ),
      ),
    [data.trades],
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
      <KChart bars={data.bars} markers={markers} />
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="rounded border p-4 text-sm flex flex-col gap-2">
            <h2 className="font-bold">거래 목록 ({data.trades.length})</h2>
            {data.trades.length === 0 && <p className="text-xs text-zinc-500">아직 입력된 거래가 없습니다.</p>}
            {data.trades.map((t) => {
              const r = calcTrade(t.direction, t.executions.map((e) => ({ type: e.type, price: e.price, quantity: e.quantity })), 250000);
              return (
                <div key={t.id} className="rounded border p-2 text-xs flex items-center justify-between gap-2">
                  <span>
                    [{t.direction}] {t.strategyName ?? "—"} · {r.points}pt · {r.net.toLocaleString()}원 · 진입 {t.executions.filter((e) => e.type === "ENTRY").length}/청산 {t.executions.filter((e) => e.type === "EXIT").length}
                  </span>
                  <button className="underline" onClick={() => removeTrade(t.id)}>삭제</button>
                </div>
              );
            })}
          </div>
          <TradeForm tradingDate={data.tradingDate} contractId={data.contract.id} bars={data.bars} onSaved={refresh} />
        </div>
        <JournalForm date={data.tradingDate} />
      </section>
    </main>
  );
}
