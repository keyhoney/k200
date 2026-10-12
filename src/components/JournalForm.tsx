"use client";

import { useEffect, useState } from "react";

const PLACEHOLDERS = [
  "[장전 계획] 오늘의 주요 가격대와 상승/하락 대응, 거래하지 않을 조건…",
  "[당일 시장 해석] 장중 흐름, 가장 잘한/잘못한 순간, 계획 준수 여부…",
  "[잘한 점] 계획대로 실행한 거래나 판단…",
  "[잘못한 점] 반복하면 안 될 실수나 감정적인 순간…",
  "[교훈] 다음 거래에서 반드시 기억할 점…",
  "[다음 계획] 다음 장에서 집중할 유형과 조건…",
].join("\n");

export default function JournalForm({ date }: { date: string }) {
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/journals/${date}`)
      .then((r) => r.json())
      .then((j: { journal?: Record<string, unknown> | null }) => {
        if (!j.journal) return;
        const src = j.journal as Record<string, unknown>;
        const parts = [
          (src.premarket_plan as string) ?? "",
          (src.market_summary as string) ?? "",
          (src.good_points as string) ?? "",
          (src.bad_points as string) ?? "",
          (src.lesson_learned as string) ?? "",
          (src.next_session_plan as string) ?? "",
        ];
        setText(parts.filter(Boolean).join("\n\n"));
      })
      .catch(() => undefined);
  }, [date]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function save() {
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(`/api/journals/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          premarketPlan: text,
          marketSummary: text,
          goodPoints: text,
          badPoints: text,
          lessonLearned: text,
          nextSessionPlan: text,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setDirty(false);
      setMsg("저장됨");
    } catch {
      setMsg("저장 실패 — 로그인 상태를 확인하세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border p-4 flex flex-col gap-2 text-sm">
      <h2 className="font-bold">일별 일지</h2>
      <textarea
        className="w-full rounded border px-2 py-1 min-h-[10rem]"
        placeholder={PLACEHOLDERS}
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
      />
      <button onClick={save} disabled={busy} className="rounded border px-3 py-1 disabled:opacity-50 self-start">
        {busy ? "저장 중…" : "일지 저장"}
      </button>
      {dirty && <p className="text-[11px] text-amber-600">저장되지 않은 변경사항 있음</p>}
      {msg && <p className="text-[11px]">{msg}</p>}
    </div>
  );
}
