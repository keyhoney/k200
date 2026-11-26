"use client";

import { useState } from "react";
import { btnGhost, cardPad, input, label, sectionTitle } from "@/components/ui";

interface BarRow {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  open_interest?: number;
}

export default function BarsCsvUpload() {
  const [symbol, setSymbol] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [payload, setPayload] = useState<{ tradingDate: string; rows: BarRow[] } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const header = lines[0]?.toLowerCase() ?? "";
    const start = header.includes("trading_date") ? 1 : 0;
    const rows: BarRow[] = [];
    let tradingDate = "";
    for (const line of lines.slice(start, start + 2000)) {
      const [date, time, open, high, low, close, volume, openInterest] = line.split(",");
      if (!date || !time) continue;
      tradingDate = date.trim();
      rows.push({
        time: time.trim(),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
        open_interest: openInterest ? Number(openInterest) : undefined,
      });
    }
    setPreview(lines.slice(start, start + 5));
    setPayload({ tradingDate, rows });
    setMsg(`${rows.length}건 미리보기 (헤더 제외)`);
  }

  async function save() {
    if (!payload || !symbol) {
      setMsg("월물 심볼을 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/bars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradingDate: payload.tradingDate, contractSymbol: symbol, rows: payload.rows }),
      });
      const result = (await response.json()) as { error?: unknown; count?: number };
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "저장 실패");
      setMsg(`저장됨 ${result.count}건 (source=manual_csv)`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardPad}>
      <h2 className={sectionTitle}>시세 CSV 수동 보완</h2>
      <label className={label}>월물 심볼 (예: 101X12)
        <input className={`${input} tnum`} value={symbol} onChange={(event) => setSymbol(event.target.value)} />
      </label>
      <input
        type="file"
        accept=".csv"
        onChange={(event) => void onFile(event.target.files?.[0])}
        className="text-xs file:mr-2 file:rounded-lg file:border file:border-zinc-300 dark:file:border-zinc-700 file:px-3 file:py-1.5 file:text-xs file:bg-white dark:file:bg-zinc-900"
      />
      {preview.length > 0 && (
        <pre className="thin-scroll overflow-auto rounded-xl border border-zinc-200 bg-zinc-100 p-3 text-[11px] tnum dark:border-zinc-800 dark:bg-zinc-900">
          {preview.join("\n")}
        </pre>
      )}
      <button onClick={save} disabled={busy || !payload} className={`${btnGhost} self-start`}>
        {busy ? "저장 중…" : "유효성 검사 후 저장"}
      </button>
      {msg && <p className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</p>}
    </div>
  );
}
