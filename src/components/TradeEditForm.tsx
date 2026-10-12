"use client";

import { useState } from "react";
import { buildETFExecutions, calcETFTrade, ETF_LABEL, type ETFDirection } from "@/lib/etf";
import type { ChartTrade } from "@/lib/chartData";

const toISO = (dt: string) => (dt.length === 16 ? `${dt}:00+09:00` : `${dt}+09:00`);
const toDtLocal = (iso: string) => iso.slice(0, 16);

// 단일 매매 수정 (진입 1건 + 청산 1건, 동일 수량인 경우만).
// 분할 체결이 포함된 거래는 데이터 손실 방지를 위해 수정 대상에서 제외.
export function isSimpleEditable(t: ChartTrade): boolean {
  const entries = t.executions.filter((e) => e.type === "ENTRY");
  const exits = t.executions.filter((e) => e.type === "EXIT");
  return (
    t.executions.length === 2 &&
    entries.length === 1 &&
    exits.length === 1 &&
    entries[0].quantity === exits[0].quantity
  );
}

export default function TradeEditForm({
  trade,
  onSaved,
  onCancel,
}: {
  trade: ChartTrade;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const entry = trade.executions.find((e) => e.type === "ENTRY");
  const exit = trade.executions.find((e) => e.type === "EXIT");
  const [product, setProduct] = useState<ETFDirection>(trade.direction);
  const [qty, setQty] = useState(String(entry?.quantity ?? 10));
  const [entryDt, setEntryDt] = useState(entry ? toDtLocal(entry.executedAt) : "");
  const [entryPrice, setEntryPrice] = useState(entry ? String(entry.price) : "");
  const [exitDt, setExitDt] = useState(exit ? toDtLocal(exit.executedAt) : "");
  const [exitPrice, setExitPrice] = useState(exit ? String(exit.price) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!entry || !exit) return null;

  const entryMemo = entry.memo ?? undefined;
  const exitMemo = exit.memo ?? undefined;

  const ep = Number(entryPrice);
  const xp = Number(exitPrice);
  const q = Number(qty);
  const preview =
    ep > 0 && xp > 0 && Number.isInteger(q) && q >= 1
      ? calcETFTrade(buildETFExecutions({ entryPrice: ep, quantity: q, exitPrice: xp }))
      : null;

  async function submit() {
    setError("");
    if (!(ep > 0) || !(xp > 0)) {
      setError("진입·청산 가격을 입력하세요.");
      return;
    }
    if (!Number.isInteger(q) || q < 1) {
      setError("수량은 1 이상의 정수(주)를 입력하세요.");
      return;
    }
    if (!entryDt || !exitDt) {
      setError("진입·청산 시각을 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const execs = buildETFExecutions({ entryPrice: ep, quantity: q, exitPrice: xp });
      const res = await fetch(`/api/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: product,
          executions: [
            { type: "ENTRY", executedAt: toISO(entryDt), price: ep, quantity: q, fee: execs[0].fee ?? 0, memo: entryMemo },
            { type: "EXIT", executedAt: toISO(exitDt), price: xp, quantity: q, fee: execs[1].fee ?? 0, memo: exitMemo },
          ],
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: unknown } | null;
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : `수정 실패(${res.status})`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border-2 p-3 flex flex-col gap-2 text-sm">
      <h3 className="font-bold text-xs">거래 수정</h3>
      <div className="grid grid-cols-2 gap-2 items-end">
        <label className="text-xs">종목
          <select className="mt-1 w-full rounded border px-2 py-1" value={product} onChange={(e) => setProduct(e.target.value as ETFDirection)}>
            <option value="LONG">{ETF_LABEL.LONG}(상승)</option>
            <option value="SHORT">{ETF_LABEL.SHORT}(하락)</option>
          </select>
        </label>
        <label className="text-xs">수량(주)
          <input className="mt-1 w-full rounded border px-2 py-1" type="number" min={1} step={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 items-end">
        <label className="text-xs">진입 시간
          <input className="mt-1 w-full rounded border px-2 py-1" type="datetime-local" value={entryDt} onChange={(e) => setEntryDt(e.target.value)} />
        </label>
        <label className="text-xs">진입 가격(원)
          <input className="mt-1 w-full rounded border px-2 py-1" type="number" step="1" min={1} value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 items-end">
        <label className="text-xs">청산 시간
          <input className="mt-1 w-full rounded border px-2 py-1" type="datetime-local" value={exitDt} onChange={(e) => setExitDt(e.target.value)} />
        </label>
        <label className="text-xs">청산 가격(원)
          <input className="mt-1 w-full rounded border px-2 py-1" type="number" step="1" min={1} value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
        </label>
      </div>
      {preview && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          순손익 {preview.net.toLocaleString()}원 ({preview.returnRate.toFixed(2)}%) · 수수료 {preview.fee.toLocaleString()}원
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="rounded bg-black px-4 py-1 text-white disabled:opacity-50 dark:bg-white dark:text-black">
          {busy ? "저장 중…" : "수정 저장"}
        </button>
        <button onClick={onCancel} className="rounded border px-4 py-1">취소</button>
      </div>
    </div>
  );
}
