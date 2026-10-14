"use client";

import { useState } from "react";
import { ETF_LABEL, type ETFDirection, calcExecutionFee } from "@/lib/etf";
import { previewDrafts, toISO, type DraftExecution } from "@/lib/splitTrade";
import type { ChartTrade } from "@/lib/chartData";
import { btnMini, btnPrimary, input, label, pnlText } from "@/components/ui";

const toDtLocal = (iso: string) => iso.slice(0, 16);

// 분할 포함 전 거래 수정 가능 — 체결 리스트 통째 교체 + 복기 필드 동시 저장.
// 구 isSimpleEditable 호환용: 인자를 받아도 항상 true (분할 차단 해제).
export function isSimpleEditable(_t?: ChartTrade): boolean {
  void _t;
  return true;
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
  const [product, setProduct] = useState<ETFDirection>(trade.direction);
  const [drafts, setDrafts] = useState<DraftExecution[]>(() =>
    trade.executions.map((e, i) => ({
      key: i,
      type: e.type,
      dt: toDtLocal(e.executedAt),
      price: String(e.price),
      qty: String(e.quantity),
      memo: e.memo ?? "",
    })),
  );
  const [strategyName, setStrategyName] = useState(trade.strategyName ?? "");
  const [setupGrade, setSetupGrade] = useState(trade.setupGrade ?? "");
  const [entryReason, setEntryReason] = useState(trade.entryReason ?? "");
  const [exitReason, setExitReason] = useState(trade.exitReason ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = previewDrafts(drafts);

  function setDraft(key: number, patch: Partial<DraftExecution>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  async function submit() {
    setError("");
    if (drafts.length < 2) {
      setError("진입과 청산을 각각 1건 이상 입력해야 합니다.");
      return;
    }
    const executions = [];
    for (const [i, d] of drafts.entries()) {
      const price = Number(d.price);
      const qty = Number(d.qty);
      if (!d.dt || !(price > 0) || !Number.isInteger(qty) || qty < 1) {
        setError(`${i + 1}번째 체결을 확인하세요.`);
        return;
      }
      executions.push({
        type: d.type,
        executedAt: toISO(d.dt),
        price,
        quantity: qty,
        fee: calcExecutionFee(price, qty),
        memo: d.memo?.trim() ? d.memo : undefined,
      });
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction: product,
          executions,
          strategyName: strategyName.trim() ? strategyName.trim() : null,
          setupGrade: setupGrade !== "" ? setupGrade : null,
          entryReason: entryReason.trim() ? entryReason.trim() : null,
          exitReason: exitReason.trim() ? exitReason.trim() : null,
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
    <div className="card p-4 flex flex-col gap-2.5 text-sm border-indigo-300 dark:border-indigo-800">
      <h3 className="text-xs font-bold">거래 수정 <span className="font-normal text-zinc-500">분할 포함 {drafts.length}건</span></h3>
      <div className="grid grid-cols-2 gap-2 items-end">
        <label className={label}>종목
          <select className={input} value={product} onChange={(e) => setProduct(e.target.value as ETFDirection)}>
            <option value="LONG">{ETF_LABEL.LONG}(상승)</option>
            <option value="SHORT">{ETF_LABEL.SHORT}(하락)</option>
          </select>
        </label>
        <label className={label}>셋업 등급
          <select className={input} value={setupGrade} onChange={(e) => setSetupGrade(e.target.value)}>
            <option value="">—</option>
            {["A", "B", "C", "D"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
      </div>
      {drafts.map((d, i) => (
        <div key={d.key} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-2">
          <label className={label}>#{i + 1} 구분
            <select className={input} value={d.type} onChange={(e) => setDraft(d.key, { type: e.target.value as "ENTRY" | "EXIT" })}>
              <option value="ENTRY">진입</option>
              <option value="EXIT">청산</option>
            </select>
          </label>
          <label className={label}>시각
            <input className={`${input} tnum`} type="datetime-local" value={d.dt} onChange={(e) => setDraft(d.key, { dt: e.target.value })} />
          </label>
          <label className={label}>가격(원)
            <input className={`${input} tnum`} type="number" min={1} value={d.price} onChange={(e) => setDraft(d.key, { price: e.target.value })} />
          </label>
          <label className={label}>수량(주)
            <input className={`${input} tnum`} type="number" min={1} step={1} value={d.qty} onChange={(e) => setDraft(d.key, { qty: e.target.value })} />
          </label>
          <button type="button" className="text-xs text-zinc-400 hover:text-zinc-600 underline justify-self-end" onClick={() => setDrafts((p) => (p.length <= 2 ? p : p.filter((x) => x.key !== d.key)))}>삭제</button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" className={btnMini} onClick={() => setDrafts((p) => [...p, { key: Math.max(...p.map((x) => x.key)) + 1, type: "ENTRY", dt: drafts[0]?.dt ?? "", price: "", qty: "10" }])}>+ 진입</button>
        <button type="button" className={btnMini} onClick={() => setDrafts((p) => [...p, { key: Math.max(...p.map((x) => x.key)) + 1, type: "EXIT", dt: drafts[0]?.dt ?? "", price: "", qty: "10" }])}>+ 청산</button>
      </div>
      <label className={label}>전략명
        <input className={input} value={strategyName} maxLength={100} onChange={(e) => setStrategyName(e.target.value)} />
      </label>
      <label className={label}>진입 이유
        <textarea className={`${input} min-h-[3rem]`} value={entryReason} onChange={(e) => setEntryReason(e.target.value)} />
      </label>
      <label className={label}>청산 이유
        <textarea className={`${input} min-h-[3rem]`} value={exitReason} onChange={(e) => setExitReason(e.target.value)} />
      </label>
      {preview && (
        <p className="tnum text-xs text-zinc-600 dark:text-zinc-400">
          순손익 <span className={`font-bold ${pnlText(preview.net)}`}>{preview.net.toLocaleString()}원 ({preview.returnRate.toFixed(2)}%)</span> · 수수료 {preview.fee.toLocaleString()}원
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className={btnPrimary}>
          {busy ? "저장 중…" : "수정 저장"}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm">취소</button>
      </div>
    </div>
  );
}
