"use client";

import { useMemo, useState } from "react";
import { calcTrade } from "@/lib/pnl";
import { validateTrade, warnPriceRange, type TradeBody } from "@/lib/tradeSchema";
import type { Bar } from "@/lib/bars";

interface Row {
  type: "ENTRY" | "EXIT";
  dt: string; // datetime-local "YYYY-MM-DDTHH:mm"
  price: string;
  qty: string;
  fee: string;
  memo: string;
}

const toISO = (dt: string) => (dt.length === 16 ? `${dt}:00+09:00` : `${dt}+09:00`);

export default function TradeForm({
  tradingDate,
  contractId,
  bars,
  onSaved,
}: {
  tradingDate: string;
  contractId: number | null;
  bars: Bar[];
  onSaved: () => void;
}) {
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [rows, setRows] = useState<Row[]>([
    { type: "ENTRY", dt: `${tradingDate}T09:32`, price: "", qty: "1", fee: "", memo: "" },
    { type: "EXIT", dt: `${tradingDate}T09:41`, price: "", qty: "1", fee: "", memo: "" },
  ]);
  const [entryReason, setEntryReason] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [strategyName, setStrategyName] = useState("");
  const [setupGrade, setSetupGrade] = useState("");
  const [ruleFollowed, setRuleFollowed] = useState<string>("");
  const [shotFile, setShotFile] = useState<File | null>(null);
  const [screenshotPath, setScreenshotPath] = useState("");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    try {
      const execs = rows
        .filter((r) => r.price && r.qty)
        .map((r) => ({
          type: r.type,
          price: Number(r.price),
          quantity: Number(r.qty),
          fee: Number(r.fee || 0),
        }));
      if (execs.length < 2) return null;
      return calcTrade(direction, execs, 250000);
    } catch {
      return null;
    }
  }, [rows, direction]);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setError("");
    setWarnings([]);
    if (contractId == null) {
      setError("DEMO 모드에서는 저장할 수 없습니다. Supabase에 월물/바를 먼저 적재하세요.");
      return;
    }
    const body: TradeBody = {
      tradingDate,
      contractId,
      direction,
      strategyName: strategyName || undefined,
      setupGrade: (setupGrade as "A" | "B" | "C" | "D" | undefined) || undefined,
      entryReason: entryReason || undefined,
      exitReason: exitReason || undefined,
      ruleFollowed: ruleFollowed === "" ? undefined : ruleFollowed === "true",
      screenshotPath: screenshotPath || undefined,
      executions: rows.map((r) => ({
        type: r.type,
        executedAt: toISO(r.dt),
        price: Number(r.price),
        quantity: Number(r.qty),
        fee: Number(r.fee || 0),
        memo: r.memo || undefined,
      })),
    };
    const v = validateTrade(body);
    if (v) {
      setError(v.message);
      return;
    }
    // 가격 범위 경고 (non-blocking)
    const warns: string[] = [];
    for (const e of body.executions) {
      const t = Math.floor(new Date(e.executedAt).getTime() / 1000);
      const w = warnPriceRange(e.price, t, bars);
      if (w && !warns.includes(w)) warns.push(w);
    }
    setWarnings(warns);
    setBusy(true);
    try {
      let shotPath = screenshotPath;
      if (shotFile) {
        const fd = new FormData();
        fd.set("file", shotFile);
        const up = await fetch("/api/uploads/screenshot", { method: "POST", body: fd });
        const uj = (await up.json()) as { path?: string; error?: string };
        if (!up.ok) throw new Error(uj.error ?? "스크린샷 업로드 실패");
        shotPath = uj.path ?? "";
        setScreenshotPath(shotPath);
      }
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, screenshotPath: shotPath || undefined }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : JSON.stringify(json.error ?? "저장 실패"));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border p-4 flex flex-col gap-3 text-sm">
      <h2 className="font-bold">새 거래 입력</h2>
      <div className="flex gap-2">
        {(["LONG", "SHORT"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`rounded border px-3 py-1 ${direction === d ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
          >
            {d === "LONG" ? "롱" : "숏"}
          </button>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end rounded bg-zinc-50 dark:bg-zinc-900 p-2">
          <label className="text-xs">구분
            <select className="mt-1 w-full rounded border px-2 py-1" value={r.type} onChange={(e) => setRow(i, { type: e.target.value as Row["type"] })}>
              <option value="ENTRY">진입</option>
              <option value="EXIT">청산</option>
            </select>
          </label>
          <label className="text-xs col-span-2">시각
            <input className="mt-1 w-full rounded border px-2 py-1" type="datetime-local" value={r.dt} onChange={(e) => setRow(i, { dt: e.target.value })} />
          </label>
          <label className="text-xs">가격
            <input className="mt-1 w-full rounded border px-2 py-1" type="number" step="0.01" value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} />
          </label>
          <label className="text-xs">수량
            <input className="mt-1 w-full rounded border px-2 py-1" type="number" min={1} step={1} value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
          </label>
          <button type="button" className="text-xs underline" onClick={() => setRows((p) => p.filter((_, j) => j !== i))}>삭제</button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRows((p) => [...p, { type: "ENTRY", dt: `${tradingDate}T10:00`, price: "", qty: "1", fee: "", memo: "" }])}>+ 진입 추가</button>
        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => setRows((p) => [...p, { type: "EXIT", dt: `${tradingDate}T10:05`, price: "", qty: "1", fee: "", memo: "" }])}>+ 청산 추가</button>
      </div>
      <label className="text-xs">진입 이유<textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={entryReason} onChange={(e) => setEntryReason(e.target.value)} /></label>
      <label className="text-xs">청산 이유<textarea className="mt-1 w-full rounded border px-2 py-1" rows={2} value={exitReason} onChange={(e) => setExitReason(e.target.value)} /></label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs">전략<input className="mt-1 w-full rounded border px-2 py-1" value={strategyName} onChange={(e) => setStrategyName(e.target.value)} placeholder="전고점 돌파" /></label>
        <label className="text-xs">등급
          <select className="mt-1 w-full rounded border px-2 py-1" value={setupGrade} onChange={(e) => setSetupGrade(e.target.value)}>
            <option value="">—</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
          </select>
        </label>
        <label className="text-xs">규칙준수
          <select className="mt-1 w-full rounded border px-2 py-1" value={ruleFollowed} onChange={(e) => setRuleFollowed(e.target.value)}>
            <option value="">—</option><option value="true">준수</option><option value="false">위반</option>
          </select>
        </label>
      </div>
      <label className="text-xs">스크린샷 (png/jpg/webp, 5MB 이하, 선택)
        <input type="file" accept=".png,.jpg,.jpeg,.webp" className="mt-1 w-full" onChange={(e) => setShotFile(e.target.files?.[0] ?? null)} />
      </label>
      {preview && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          미리보기: 평단 {preview.avgEntry} → {preview.avgExit} ({preview.points}pt) · 순손익 {preview.net.toLocaleString()}원
        </p>
      )}
      {warnings.map((w) => <p key={w} className="text-xs text-amber-600">{w}</p>)}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button onClick={submit} disabled={busy} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">
        {busy ? "저장 중…" : "저장 (차트 즉시 반영)"}
      </button>
    </div>
  );
}
