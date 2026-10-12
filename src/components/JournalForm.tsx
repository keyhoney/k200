"use client";

import { useEffect, useState } from "react";

const FIELDS = [
  ["premarketPlan", "장전 계획"],
  ["marketSummary", "당일 시장 해석"],
  ["goodPoints", "잘한 점"],
  ["badPoints", "잘못한 점"],
  ["lessonLearned", "교훈"],
  ["nextSessionPlan", "다음 계획"],
] as const;

const SCORES = [
  ["confidenceScore", "자신감"],
  ["concentrationScore", "집중도"],
  ["disciplineScore", "규칙준수"],
  ["satisfactionScore", "만족도"],
] as const;

type Journal = Record<string, string | number | null>;

export default function JournalForm({ date }: { date: string }) {
  const [form, setForm] = useState<Journal>({});
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/journals/${date}`)
      .then((r) => r.json())
      .then((j: { journal?: Record<string, unknown> | null }) => {
        if (!j.journal) return;
        const src = j.journal as Record<string, unknown>;
        const map: Journal = {
          premarketPlan: (src.premarket_plan as string) ?? "",
          marketSummary: (src.market_summary as string) ?? "",
          goodPoints: (src.good_points as string) ?? "",
          badPoints: (src.bad_points as string) ?? "",
          lessonLearned: (src.lesson_learned as string) ?? "",
          nextSessionPlan: (src.next_session_plan as string) ?? "",
          confidenceScore: (src.confidence_score as number) ?? null,
          concentrationScore: (src.concentration_score as number) ?? null,
          disciplineScore: (src.discipline_score as number) ?? null,
          satisfactionScore: (src.satisfaction_score as number) ?? null,
        };
        setForm(map);
      })
      .catch(() => undefined);
  }, [date]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
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
        body: JSON.stringify(form),
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
      {FIELDS.map(([k, label]) => (
        <label key={k} className="text-xs">{label}
          <textarea
            className="mt-1 w-full rounded border px-2 py-1"
            rows={2}
            value={(form[k] as string) ?? ""}
            onChange={(e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true); }}
          />
        </label>
      ))}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {SCORES.map(([k, label]) => (
          <label key={k} className="text-xs">{label} (1-5)
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={form[k] == null ? "" : String(form[k])}
              onChange={(e) => { setForm((f) => ({ ...f, [k]: e.target.value === "" ? null : Number(e.target.value) })); setDirty(true); }}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500">5점: 계획과 실행 일치 / 1점: 거의 지키지 못함</p>
      <button onClick={save} disabled={busy} className="rounded border px-3 py-1 disabled:opacity-50">
        {busy ? "저장 중…" : "일지 저장"}
      </button>
      {dirty && <p className="text-[11px] text-amber-600">저장되지 않은 변경사항 있음</p>}
      {msg && <p className="text-[11px]">{msg}</p>}
    </div>
  );
}
