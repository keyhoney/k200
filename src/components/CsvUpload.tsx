"use client";

import { useState } from "react";
import { parseBrokerTradeCsv, type TradeCsvImportPlan } from "@/lib/brokerTradeCsv";
import { btnGhost, cardPad, sectionTitle } from "@/components/ui";

function decodeCsv(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("euc-kr").decode(bytes);
  }
}

export default function CsvUpload() {
  const [plan, setPlan] = useState<TradeCsvImportPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    setPlan(null);
    setFileName("");
    setMsg("");
    if (!file) return;
    try {
      const parsed = parseBrokerTradeCsv(decodeCsv(new Uint8Array(await file.arrayBuffer())));
      setPlan(parsed);
      setFileName(file.name);
      const unmatched = parsed.unmatched.reduce((sum, item) => sum + item.quantity, 0);
      setMsg(`${parsed.trades.length}건 매칭 · 미청산 ${unmatched}계약`);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "CSV를 읽지 못했습니다.");
    }
  }

  async function save() {
    if (!plan) return;
    setBusy(true);
    try {
      const dates = [...new Set(plan.trades.map((trade) => trade.tradingDate))];
      const contractIds = new Map<string, number>();
      for (const date of dates) {
        const response = await fetch(`/api/chart?date=${encodeURIComponent(date)}`);
        const chart = (await response.json()) as { contract?: { id: number | null }; error?: unknown };
        if (!response.ok || !chart.contract?.id) {
          throw new Error(`${date} 월물 정보를 찾을 수 없습니다. 해당 날짜의 선물 계약 데이터가 있는지 확인하세요.`);
        }
        contractIds.set(date, chart.contract.id);
      }

      let saved = 0;
      let duplicates = 0;
      const failures: string[] = [];
      const failedTrades: TradeCsvImportPlan["trades"] = [];
      for (const trade of plan.trades) {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...trade, contractId: contractIds.get(trade.tradingDate) }),
        });
        if (response.ok) {
          const result = (await response.json().catch(() => null)) as { duplicate?: boolean } | null;
          if (result?.duplicate) duplicates += 1;
          else saved += 1;
        } else {
          const result = (await response.json().catch(() => null)) as { error?: unknown } | null;
          const error = typeof result?.error === "string" ? result.error : `저장 실패 (${response.status})`;
          failures.push(`${trade.tradingDate}: ${error}`);
          failedTrades.push(trade);
        }
      }

      const skipped = plan.unmatched.reduce((sum, item) => sum + item.quantity, 0);
      const summary = `${saved}건 저장${duplicates ? ` · 중복 ${duplicates}건 건너뜀` : ""}`;
      setMsg(
        failures.length > 0
          ? `${summary}, ${failures.length}건 실패${skipped ? ` · 미청산 ${skipped}계약 미저장` : ""} — ${failures.join(" / ")}`
          : `${summary}${skipped ? ` · 미청산 ${skipped}계약 미저장` : ""}`,
      );
      if (saved + duplicates > 0) setPlan(failures.length === 0 ? null : { ...plan, trades: failedTrades });
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  const unmatchedQuantity = plan?.unmatched.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className={cardPad}>
      <h2 className={sectionTitle}>매매내역 CSV 가져오기</h2>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        주문일, 매매구분, 체결수량, 평균단가 열이 있는 CSV를 선택하세요. 매수정정·매도정정도 매수·매도로 처리하고, 날짜별 시간순 FIFO로 진입·청산을 매칭합니다.
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        이 업로더로 이미 저장된 매칭 거래는 원본 행 기준으로 중복 저장하지 않습니다.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => void onFile(event.target.files?.[0])}
        className="text-xs file:mr-2 file:rounded-lg file:border file:border-zinc-300 dark:file:border-zinc-700 file:px-3 file:py-1.5 file:text-xs file:bg-white dark:file:bg-zinc-900"
      />
      {fileName && <p className="text-xs text-zinc-500">{fileName}</p>}
      {plan && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 text-xs">
          <p>저장 예정 {plan.trades.length}건</p>
          {unmatchedQuantity > 0 && (
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              미청산 {unmatchedQuantity}계약은 거래로 저장하지 않습니다.
            </p>
          )}
          {plan.hasMissingTimes && (
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              주문시각이 없어 해당 행은 CSV 순서 기준으로 09:00부터 시각을 생성합니다.
            </p>
          )}
        </div>
      )}
      <button onClick={save} disabled={busy || !plan || plan.trades.length === 0} className={`${btnGhost} self-start`}>
        {busy ? "저장 중…" : "매칭된 거래 저장"}
      </button>
      {msg && <p className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</p>}
    </div>
  );
}
