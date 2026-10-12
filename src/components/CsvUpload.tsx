"use client";

import { useState } from "react";

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
    <div className="rounded border p-4 flex flex-col gap-2 text-sm">
      <h2 className="font-bold">시세 CSV 수동 보완</h2>
      <label className="text-xs">월물 심볼 (예: 101X12)
        <input className="mt-1 w-full rounded border px-2 py-1" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
      </label>
      <input type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-xs" />
      {preview.length > 0 && <pre className="text-[11px] bg-zinc-50 dark:bg-zinc-900 p-2 rounded overflow-auto">{preview.join("\n")}</pre>}
      <button onClick={save} disabled={busy || !payload} className="rounded border px-3 py-1 disabled:opacity-50">
        {busy ? "저장 중…" : "유효성 검사 후 저장"}
      </button>
      {msg && <p className="text-xs">{msg}</p>}
    </div>
  );
}
