"use client";

import { useMemo, useRef, useState } from "react";
import { buildETFExecutions, calcETFTrade, ETF_LABEL, type ETFDirection } from "@/lib/etf";
import { validateTrade, type TradeBody } from "@/lib/tradeSchema";

interface BulkRow {
  key: number;
  product: ETFDirection;
  entryDt: string; // datetime-local "YYYY-MM-DDTHH:mm"
  entryPrice: string;
  qty: string;
  exitDt: string;
  exitPrice: string;
}

const toISO = (dt: string) => (dt.length === 16 ? `${dt}:00+09:00` : `${dt}+09:00`);

// 한 줄 = 1매매: 종목(레버리지/인버스2X) + 진입 시간·가격·수량 + 청산 시간·가격.
// 청산 수량은 진입 수량과 동일. 진입/청산 이유·전략은 입력하지 않음(일별 일지에만 기록).
export default function TradeForm({
  tradingDate,
  contractId,
  onSaved,
}: {
  tradingDate: string;
  contractId: number | null;
  onSaved: () => void;
}) {
  const keySeq = useRef(1);
  const newRow = (entryDt: string, exitDt: string): BulkRow => ({
    key: keySeq.current++,
    product: "LONG",
    entryDt,
    entryPrice: "",
    qty: "10",
    exitDt,
    exitPrice: "",
  });
  const [rows, setRows] = useState<BulkRow[]>([
    { key: 0, product: "LONG", entryDt: `${tradingDate}T09:32`, entryPrice: "", qty: "10", exitDt: `${tradingDate}T09:41`, exitPrice: "" },
  ]);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function setRow(key: number, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function rowPreview(r: BulkRow) {
    const entryPrice = Number(r.entryPrice);
    const qty = Number(r.qty);
    const exitPrice = Number(r.exitPrice);
    if (!entryPrice || !qty || !exitPrice) return null;
    try {
      return calcETFTrade(buildETFExecutions({ entryPrice, quantity: qty, exitPrice }));
    } catch {
      return null;
    }
  }

  const total = useMemo(() => {
    let net = 0;
    let fee = 0;
    let count = 0;
    for (const r of rows) {
      const p = rowPreview(r);
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
    // 1) 전행 검증
    const bodies: Array<{ key: number; body: TradeBody }> = [];
    const errors: Record<number, string> = {};
    rows.forEach((r, i) => {
      const n = i + 1;
      const entryPrice = Number(r.entryPrice);
      const qty = Number(r.qty);
      const exitPrice = Number(r.exitPrice);
      if (!r.entryDt || !r.exitDt) {
        errors[r.key] = `${n}행: 진입·청산 시각을 입력하세요.`;
        return;
      }
      if (!(entryPrice > 0) || !(exitPrice > 0)) {
        errors[r.key] = `${n}행: 진입·청산 가격을 입력하세요.`;
        return;
      }
      if (!Number.isInteger(qty) || qty < 1) {
        errors[r.key] = `${n}행: 수량은 1 이상의 정수(주)를 입력하세요.`;
        return;
      }
      const body: TradeBody = {
        tradingDate,
        contractId,
        direction: r.product,
        executions: [
          { type: "ENTRY", executedAt: toISO(r.entryDt), price: entryPrice, quantity: qty, fee: 0 },
          { type: "EXIT", executedAt: toISO(r.exitDt), price: exitPrice, quantity: qty, fee: 0 },
        ],
      };
      // 수수료(0.004896%)는 매수·매도 각각 자동 계산
      const execs = buildETFExecutions({ entryPrice, quantity: qty, exitPrice });
      body.executions[0].fee = execs[0].fee ?? 0;
      body.executions[1].fee = execs[1].fee ?? 0;
      const v = validateTrade(body);
      if (v) {
        errors[r.key] = `${n}행: ${v.message}`;
        return;
      }
      bodies.push({ key: r.key, body });
    });
    setRowErrors(errors);
    if (bodies.length === 0) {
      setMsg("저장할 유효한 행이 없습니다.");
      return;
    }
    // 2) 행별 순차 저장
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
        if (res.ok) {
          ok += 1;
        } else {
          const json = (await res.json().catch(() => null)) as { error?: unknown } | null;
          const detail = typeof json?.error === "string" ? json.error : `저장 실패(${res.status})`;
          fail.push(`${rows.findIndex((r) => r.key === key) + 1}행: ${detail}`);
        }
      }
      if (ok > 0) onSaved();
      setMsg(
        fail.length === 0
          ? `${ok}건 저장됨 (차트 즉시 반영)`
          : `${ok}건 저장, ${fail.length}건 실패 — ${fail.join(" / ")}`,
      );
      if (fail.length === 0) {
        setRows([{ ...newRow(`${tradingDate}T10:00`, `${tradingDate}T10:05`), key: keySeq.current++ }]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border p-4 flex flex-col gap-3 text-sm">
      <h2 className="font-bold">새 거래 입력 (한 줄 = 1매매)</h2>
      <p className="text-xs text-zinc-500">청산 수량 = 진입 수량. 수수료 0.004896%는 매수·매도 각각 자동 반영. 차트는 선물 1분봉 참고용.</p>
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const p = rowPreview(r);
          return (
            <div key={r.key} className="rounded bg-zinc-50 dark:bg-zinc-900 p-2 flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2 items-end">
                <span className="text-xs text-zinc-500 self-center">#{i + 1}</span>
                <label className="text-xs">종목
                  <select className="mt-1 w-full rounded border px-2 py-1" value={r.product} onChange={(e) => setRow(r.key, { product: e.target.value as ETFDirection })}>
                    <option value="LONG">{ETF_LABEL.LONG}(상승)</option>
                    <option value="SHORT">{ETF_LABEL.SHORT}(하락)</option>
                  </select>
                </label>
                <label className="text-xs">수량(주)
                  <input className="mt-1 w-full rounded border px-2 py-1" type="number" min={1} step={1} value={r.qty} onChange={(e) => setRow(r.key, { qty: e.target.value })} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <label className="text-xs">진입 시간
                  <input className="mt-1 w-full rounded border px-2 py-1" type="datetime-local" value={r.entryDt} onChange={(e) => setRow(r.key, { entryDt: e.target.value })} />
                </label>
                <label className="text-xs">진입 가격(원)
                  <input className="mt-1 w-full rounded border px-2 py-1" type="number" step="1" min={1} value={r.entryPrice} placeholder="예: 15230" onChange={(e) => setRow(r.key, { entryPrice: e.target.value })} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <label className="text-xs">청산 시간
                  <input className="mt-1 w-full rounded border px-2 py-1" type="datetime-local" value={r.exitDt} onChange={(e) => setRow(r.key, { exitDt: e.target.value })} />
                </label>
                <label className="text-xs">청산 가격(원)
                  <input className="mt-1 w-full rounded border px-2 py-1" type="number" step="1" min={1} value={r.exitPrice} placeholder="예: 15310" onChange={(e) => setRow(r.key, { exitPrice: e.target.value })} />
                </label>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {p
                    ? `순손익 ${p.net.toLocaleString()}원 (${p.returnRate.toFixed(2)}%) · 수수료 ${p.fee.toLocaleString()}원`
                    : "가격·수량을 입력하면 손익 미리보기"}
                </span>
                <button type="button" className="text-xs underline" onClick={() => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.key !== r.key)))}>삭제</button>
              </div>
              {rowErrors[r.key] && <p className="text-xs text-red-600">{rowErrors[r.key]}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 items-center">
        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRows((p) => [...p, newRow(`${tradingDate}T10:00`, `${tradingDate}T10:05`)])}>+ 1매매 추가</button>
        <span className="text-xs text-zinc-500">
          {total.count > 0 ? `합계: 순손익 ${total.net.toLocaleString()}원 · 수수료 ${total.fee.toLocaleString()}원 (${total.count}건)` : "입력된 매매 없음"}
        </span>
      </div>
      {msg && <p className="text-xs">{msg}</p>}
      <button onClick={submit} disabled={busy || rows.length === 0} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">
        {busy ? "저장 중…" : `입력한 ${rows.length}건 저장 (차트 즉시 반영)`}
      </button>
    </div>
  );
}
