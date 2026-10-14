"use client";

import { useState } from "react";
import { btnGhost, cardPad, input, label, sectionTitle } from "@/components/ui";

// Agnet.md §14 형식: trading_date,time,open,high,low,close,volume,open_interest
// trading_date,time,open,high,low,close,volume,open_interest
// 2026-10-12,09:00:00,350.10,350.25,349.90,350.20,1234,45678
export default function CsvUpload() {
  const [symbol, setSymbol] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [payload, setPayload] = useState<{ tradingDate: string; rows: unknown[] } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(f: File | undefined) {
    if (!f) return;
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const header = lines[0]?.toLowerCase() ?? "";
    const start = header.includes("trading_date") ? 1 : 0;
    const rows: Array<Record<string, unknown>> = [];
    let date = "";
    for (const line of lines.slice(start, start + 2000)) {
      const [d, t, o, h, l, c, v, oi] = line.split(",");
      if (!d || !t) continue;
      date = d.trim();
      rows.push({
        time: t.trim(), open: Number(o), high: Number(h), low: Number(l),
        close: Number(c), volume: Number(v), open_interest: oi ? Number(oi) : undefined,
      });
    }
    setPreview(lines.slice(start, start + 5));
    setPayload({ tradingDate: date, rows });
    setMsg(`${rows.length}건 미리보기 (헤더 제외)`);
  }

  async function save() {
    if (!payload || !symbol) {
      setMsg("월물 심볼을 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradingDate: payload.tradingDate, contractSymbol: symbol, rows: payload.rows }),
      });
      const json = (await res.json()) as { error?: unknown; count?: number };
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "저장 실패");
      setMsg(`저장됨 ${json.count}건 (source=manual_csv)`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardPad}>
      <h2 className={sectionTitle}>시세 CSV 수동 보완</h2>
      <label className={label}>월물 심볼 (예: 101X12)
        <input className={`${input} tnum`} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
      </label>
      <input type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-xs file:mr-2 file:rounded-lg file:border file:border-zinc-300 dark:file:border-zinc-700 file:px-3 file:py-1.5 file:text-xs file:bg-white dark:file:bg-zinc-900" />
      {preview.length > 0 && <pre className="thin-scroll text-[11px] tnum bg-zinc-100 dark:bg-zinc-900 p-3 rounded-xl overflow-auto border border-zinc-200 dark:border-zinc-800">{preview.join("\n")}</pre>}
      <button onClick={save} disabled={busy || !payload} className={`${btnGhost} self-start`}>
        {busy ? "저장 중…" : "유효성 검사 후 저장"}
      </button>
      {msg && <p className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</p>}
    </div>
  );
}
