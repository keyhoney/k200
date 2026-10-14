"use client";

import { useMemo, useRef, useState } from "react";
import { ETF_LABEL, type ETFDirection } from "@/lib/etf";
import { defaultDrafts, draftsToBody, nextKey, previewDrafts, type DraftExecution } from "@/lib/splitTrade";
import { Badge, btnMini, btnPrimary, cardPad, input, label, pnlText, sectionTitle } from "@/components/ui";

interface TradeRow {
  key: number;
  product: ETFDirection;
  drafts: DraftExecution[];
}

const newRow = (tradingDate: string, key: number): TradeRow => ({
  key,
  product: "LONG",
  drafts: defaultDrafts(tradingDate),
});

// 한 줄 = 1매매, 체결 N건(분할 진입/청산) 지원. 수수료 자동 계산, 원본 메모 보존.
export default function TradeForm({
  tradingDate,
  contractId,
  onSaved,
  initialDt,
}: {
  tradingDate: string;
  contractId: number | null;
  onSaved: () => void;
  initialDt?: string;
}) {
  const keySeq = useRef(100);
  const [rows, setRows] = useState<TradeRow[]>(() => {
    const r = newRow(tradingDate, 0);
    if (initialDt) r.drafts[0].dt = initialDt;
    return [r];
  });
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // 차트 클릭 입력: 시각만 반영 (선물 봉 종가는 ETF 가격과 달라 가격 자동채움 안 함)
  const lastPick = useRef("");
  const pickKey = initialDt ?? "";
  if (pickKey !== lastPick.current && initialDt) {
    lastPick.current = pickKey;
    setRows((prev) => {
      const next = [...prev];
      const last = next[next.length - 1] ?? newRow(tradingDate, keySeq.current++);
      if (next.length === 0) next.push(last);
      const entry = last.drafts.find((d) => d.type === "ENTRY");
      if (entry && !entry.price) {
        entry.dt = initialDt;
      }
      return [...next];
    });
  }

  function setRow(key: number, patch: Partial<TradeRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function setDraft(rowKey: number, dKey: number, patch: Partial<DraftExecution>) {
    setRows((prev) =>
      prev.map((r) =>
        r.key === rowKey
          ? { ...r, drafts: r.drafts.map((d) => (d.key === dKey ? { ...d, ...patch } : d)) }
          : r,
      ),
    );
  }

  const total = useMemo(() => {
    let net = 0;
    let fee = 0;
    let count = 0;
    for (const r of rows) {
      const p = previewDrafts(r.drafts);
      if (p) {
        net += p.net;
        fee += p.fee;
        count += 1;
      }
    }
    return { net, fee, count };
  }, [rows]);

  async function submit() {
    setMsg("");
    setRowErrors({});
    if (contractId == null) {
      setMsg("DEMO 모드에서는 저장할 수 없습니다. Supabase에 월물/바를 먼저 적재하세요.");
      return;
    }
    const bodies: Array<{ key: number; body: Exclude<ReturnType<typeof draftsToBody>, { error: string }> }> = [];
    const errors: Record<number, string> = {};
    rows.forEach((r, i) => {
      const res = draftsToBody(tradingDate, contractId, r.product, r.drafts);
      if ("error" in res) errors[r.key] = `${i + 1}행: ${res.error}`;
      else bodies.push({ key: r.key, body: res });
    });
    setRowErrors(errors);
    if (bodies.length === 0) {
      setMsg("저장할 유효한 행이 없습니다.");
      return;
    }
    setBusy(true);
    try {
      let ok = 0;
      const fail: string[] = [];
      for (const { key, body } of bodies) {
        const res = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) ok += 1;
        else {
          const json = (await res.json().catch(() => null)) as { error?: unknown } | null;
          const detail = typeof json?.error === "string" ? json.error : `저장 실패(${res.status})`;
          fail.push(`${rows.findIndex((r) => r.key === key) + 1}행: ${detail}`);
        }
      }
      if (ok > 0) onSaved();
      setMsg(fail.length === 0 ? `${ok}건 저장됨 (차트 즉시 반영)` : `${ok}건 저장, ${fail.length}건 실패 — ${fail.join(" / ")}`);
      if (fail.length === 0) setRows([newRow(tradingDate, keySeq.current++)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardPad}>
      <h2 className={sectionTitle}>새 거래 입력 <span className="font-normal text-zinc-500">분할 체결 지원</span></h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">한 줄 = 1매매. 진입/청산 행을 여러 개 추가해 분할 진입·청산 가능. 수수료 0.004896% 자동 반영. 차트는 선물 참고용 — 가격은 ETF 체결가를 직접 입력.</p>
      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => {
          const p = previewDrafts(r.drafts);
          return (
            <div key={r.key} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-2.5 flex flex-col gap-2">
              <div className="flex gap-2 items-end">
                <span className="text-xs font-bold text-zinc-500 self-center">#{i + 1}</span>
                <Badge tone={r.product === "LONG" ? "long" : "short"}>{ETF_LABEL[r.product]}</Badge>
                <label className={`${label} ml-auto w-36`}>종목
                  <select className={input} value={r.product} onChange={(e) => setRow(r.key, { product: e.target.value as ETFDirection })}>
                    <option value="LONG">{ETF_LABEL.LONG}(상승)</option>
                    <option value="SHORT">{ETF_LABEL.SHORT}(하락)</option>
                  </select>
                </label>
              </div>
              {r.drafts.map((d) => (
                <div key={d.key} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-2">
                  <label className={label}>구분
                    <select className={input} value={d.type} onChange={(e) => setDraft(r.key, d.key, { type: e.target.value as "ENTRY" | "EXIT" })}>
                      <option value="ENTRY">진입</option>
                      <option value="EXIT">청산</option>
                    </select>
                  </label>
                  <label className={label}>시각
                    <input className={`${input} tnum`} type="datetime-local" value={d.dt} onChange={(e) => setDraft(r.key, d.key, { dt: e.target.value })} />
                  </label>
                  <label className={label}>가격(원)
                    <input className={`${input} tnum`} type="number" min={1} step={1} value={d.price} placeholder="예: 15230" onChange={(e) => setDraft(r.key, d.key, { price: e.target.value })} />
                  </label>
                  <label className={label}>수량(주)
                    <input className={`${input} tnum`} type="number" min={1} step={1} value={d.qty} onChange={(e) => setDraft(r.key, d.key, { qty: e.target.value })} />
                  </label>
                  <button type="button" className="text-xs text-zinc-400 hover:text-zinc-600 underline justify-self-end" onClick={() => setRow(r.key, { drafts: r.drafts.length <= 2 ? r.drafts : r.drafts.filter((x) => x.key !== d.key) })}>행삭제</button>
                </div>
              ))}
              <div className="flex gap-2 items-center flex-wrap">
                <button type="button" className={btnMini} onClick={() => setRow(r.key, { drafts: [...r.drafts, { key: nextKey(), type: "ENTRY", dt: `${tradingDate}T10:00`, price: "", qty: "10" }] })}>+ 진입</button>
                <button type="button" className={btnMini} onClick={() => setRow(r.key, { drafts: [...r.drafts, { key: nextKey(), type: "EXIT", dt: `${tradingDate}T10:05`, price: "", qty: "10" }] })}>+ 청산</button>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {p ? <span className="tnum">순손익 <span className={`font-bold ${pnlText(p.net)}`}>{p.net.toLocaleString()}원 ({p.returnRate.toFixed(2)}%)</span> · 수수료 {p.fee.toLocaleString()}원</span> : "체결을 입력하면 손익 미리보기"}
                </span>
                <button type="button" className="text-xs text-zinc-400 hover:text-zinc-600 underline ml-auto" onClick={() => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.key !== r.key)))}>매매삭제</button>
              </div>
              {rowErrors[r.key] && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-300">{rowErrors[r.key]}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <button type="button" className={btnMini} onClick={() => setRows((p) => [...p, newRow(tradingDate, keySeq.current++)])}>+ 1매매 추가</button>
        <span className="tnum text-xs text-zinc-500">
          {total.count > 0 ? <>합계: 순손익 <span className={`font-bold ${pnlText(total.net)}`}>{total.net.toLocaleString()}원</span> · 수수료 {total.fee.toLocaleString()}원 ({total.count}건)</> : "입력된 매매 없음"}
        </span>
      </div>
      {msg && <p className="text-xs">{msg}</p>}
      <button onClick={submit} disabled={busy || rows.length === 0} className={btnPrimary}>
        {busy ? "저장 중…" : `입력한 ${rows.length}건 저장 (차트 즉시 반영)`}
      </button>
    </div>
  );
}
