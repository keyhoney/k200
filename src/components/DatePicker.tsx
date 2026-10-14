"use client";

import { useEffect, useRef, useState } from "react";
import { isFixedHoliday, isWeekend, parseYmd, toYmd } from "@/lib/tradingDays";
import { btnMini } from "@/components/ui";

// 주말·고정휴장 선택 불가 달력 팝오버 (native date input은 요일 비활성화 불가).
export default function DatePicker({ value, onChange }: { value: string; onChange: (ymd: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setCursor(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open ]);

  const cur = parseYmd(cursor);
  const year = cur.getUTCFullYear();
  const month = cur.getUTCMonth();
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = toYmd(new Date());

  const cells: Array<{ ymd: string; day: number } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ ymd: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d });
  }

  function moveMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setCursor(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`);
  }

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="날짜 선택"
        className="tnum rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs font-bold shadow-sm transition hover:border-indigo-400">
        📅 {value}
      </button>
      {open && (
        <div className="card absolute z-30 mt-1 w-64 p-3" role="dialog" aria-label="거래일 달력">
          <div className="flex items-center justify-between mb-2">
            <button type="button" className={btnMini} onClick={() => moveMonth(-1)} aria-label="이전 달">◀</button>
            <span className="tnum text-sm font-extrabold">{year}년 {month + 1}월</span>
            <button type="button" className={btnMini} onClick={() => moveMonth(1)} aria-label="다음 달">▶</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-zinc-400">
            {["일", "월", "화", "수", "목", "금", "토"].map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5 mt-1">
            {cells.map((c, i) =>
              c == null ? (
                <span key={`e${i}`} />
              ) : (() => {
                const disabled = isWeekend(c.ymd) || isFixedHoliday(c.ymd);
                const sel = c.ymd === value;
                const isToday = c.ymd === today;
                return (
                  <button
                    key={c.ymd}
                    type="button"
                    disabled={disabled}
                    onClick={() => { onChange(c.ymd); setOpen(false); }}
                    title={disabled ? "휴장일" : c.ymd}
                    aria-disabled={disabled}
                    className={`tnum rounded-md py-1 text-xs transition ${
                      sel
                        ? "bg-indigo-600 text-white font-bold"
                        : disabled
                          ? "text-zinc-300 dark:text-zinc-700 line-through cursor-not-allowed"
                          : "hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    } ${isToday && !sel ? "ring-1 ring-indigo-400" : ""}`}
                  >
                    {c.day}
                  </button>
                );
              })(),
            )}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">취소선 = 주말·휴장일(선택 불가)</p>
        </div>
      )}
    </div>
  );
}
