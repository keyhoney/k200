import type { ReactNode } from "react";

// 공용 UI 토큰 — 새 의존성 없이 카드·버튼·입력·뱃지 톤 통일.
// 한국 시장 관례: 이익=빨강, 손실=파랑.

export const page = "mx-auto w-full max-w-6xl p-4 md:p-8 flex flex-col gap-4 md:gap-5 text-sm";
export const pageTitle = "text-xl md:text-2xl font-extrabold tracking-tight";
export const pageSub = "text-xs text-zinc-500 dark:text-zinc-400";
export const sectionTitle = "text-sm font-bold tracking-tight";
export const cardPad = "card p-4 md:p-5 flex flex-col gap-3";

export const btnPrimary =
  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400";
export const btnGhost =
  "rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50";
export const btnMini =
  "rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 text-xs transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50";

export const input =
  "mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm shadow-sm transition placeholder:text-zinc-400";
export const label = "text-xs font-medium text-zinc-600 dark:text-zinc-300 flex flex-col gap-1";

export function pnlText(net: number): string {
  if (net > 0) return "text-red-600 dark:text-red-400";
  if (net < 0) return "text-blue-600 dark:text-blue-400";
  return "text-zinc-500";
}

export function pnlBadge(net: number): string {
  if (net > 0)
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900";
  if (net < 0)
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
  return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
}

export function Badge({ tone, children }: { tone: "long" | "short" | "neutral"; children: ReactNode }) {
  const color =
    tone === "long"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
      : tone === "short"
        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
        : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${color}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "profit" | "loss" | "neutral" }) {
  const color = tone === "profit" ? pnlText(1) : tone === "loss" ? pnlText(-1) : "";
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`tnum text-xl md:text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
      {children}
    </div>
  );
}

export const th = "py-2 pr-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
export const td = "py-2 pr-3 align-top";
export const trBorder = "border-b border-zinc-200/70 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition";
