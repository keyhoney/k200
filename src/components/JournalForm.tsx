"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMPTY_JOURNAL,
  journalFormToBody,
  journalRowToForm,
  type JournalFormState,
} from "@/lib/journal";
import { btnPrimary, cardPad, input, label, sectionTitle } from "@/components/ui";

const TEXT_FIELDS: Array<{ key: keyof JournalFormState; label: string; placeholder: string }> = [
  { key: "premarketPlan", label: "장전 계획", placeholder: "오늘의 주요 가격대, 상승/하락 대응, 거래하지 않을 조건…" },
  { key: "marketSummary", label: "당일 시장 해석", placeholder: "장중 흐름, 가장 잘한/잘못한 순간, 계획 준수 여부…" },
  { key: "goodPoints", label: "잘한 점", placeholder: "계획대로 실행한 거래나 판단…" },
  { key: "badPoints", label: "잘못한 점", placeholder: "반복하면 안 될 실수나 감정적인 순간…" },
  { key: "lessonLearned", label: "교훈", placeholder: "다음 거래에서 반드시 기억할 점…" },
  { key: "nextSessionPlan", label: "다음 계획", placeholder: "다음 장에서 집중할 유형과 조건…" },
];

const SCORE_FIELDS: Array<{ key: "confidenceScore" | "concentrationScore" | "disciplineScore" | "satisfactionScore"; label: string }> = [
  { key: "confidenceScore", label: "자신감" },
  { key: "concentrationScore", label: "집중도" },
  { key: "disciplineScore", label: "규칙준수" },
  { key: "satisfactionScore", label: "만족도" },
];

const SCORE_HINT = "1: 계획을 거의 지키지 못함 · 3: 대체로 통제함 · 5: 계획과 실행이 일치함";

export default function JournalForm({ date }: { date: string }) {
  const [form, setForm] = useState<JournalFormState>({ ...EMPTY_JOURNAL });
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = `journal-draft:${date}`;
  const stateRef = useRef(form);
  stateRef.current = form;

  // 서버 값 로드 (임시저장 초안이 있으면 초안 우선)
  useEffect(() => {
    let cancelled = false;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as JournalFormState;
        if (!cancelled) {
          setForm({ ...EMPTY_JOURNAL, ...d });
          setDirty(true);
        }
      }
    } catch { /* ignore */ }
    fetch(`/api/journals/${date}`)
      .then((r) => r.json())
      .then((j: { journal?: Record<string, unknown> | null }) => {
        if (cancelled) return;
        // 초안이 없을 때만 서버 값 반영 (덮어쓰기 방지)
        try {
          if (!localStorage.getItem(draftKey) && j.journal) setForm(journalRowToForm(j.journal));
        } catch { /* ignore */ }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  function patch(p: Partial<JournalFormState>) {
    setForm((prev) => ({ ...prev, ...p }));
    setDirty(true);
    setMsg("");
    // 임시저장: 500ms debounce → localStorage
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ ...stateRef.current, ...p }));
        setAutoState("saved");
      } catch { /* ignore */ }
    }, 500);
    setAutoState("saving");
  }

  async function save() {
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(`/api/journals/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(journalFormToBody(form)),
      });
      if (!res.ok) throw new Error("저장 실패");
      setDirty(false);
      setMsg("저장됨");
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    } catch {
      setMsg("저장 실패 — 로그인 상태를 확인하세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardPad}>
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>일별 일지</h2>
        <span className="text-[11px] text-zinc-500">
          {autoState === "saving" ? "임시저장 중…" : autoState === "saved" ? "초안 임시저장됨" : ""}
        </span>
      </div>
      {TEXT_FIELDS.map((f) => (
        <label key={f.key} className={label}>
          <span className="font-semibold text-zinc-700 dark:text-zinc-200">{f.label}</span>
          <textarea
            className={`${input} min-h-[4rem]`}
            placeholder={f.placeholder}
            value={form[f.key] as string}
            onChange={(e) => patch({ [f.key]: e.target.value } as Partial<JournalFormState>)}
          />
        </label>
      ))}
      <fieldset className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
        <legend className="text-xs font-semibold px-1">점수 (1~5)</legend>
        <p className="text-[11px] text-zinc-500">{SCORE_HINT}</p>
        <div className="grid grid-cols-2 gap-2">
          {SCORE_FIELDS.map((s) => (
            <label key={s.key} className={label}>
              {s.label}
              <select
                className={input}
                value={form[s.key] ?? ""}
                onChange={(e) =>
                  patch({ [s.key]: e.target.value === "" ? null : Number(e.target.value) } as Partial<JournalFormState>)
                }
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}점</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>
      <button onClick={save} disabled={busy} className={`${btnPrimary} self-start`}>
        {busy ? "저장 중…" : "일지 저장"}
      </button>
      {dirty && <p className="text-[11px] text-amber-600">저장되지 않은 변경사항 있음</p>}
      {msg && <p className="text-[11px]">{msg}</p>}
    </div>
  );
}
