"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "대시보드", icon: "◈" },
  { href: "/journals", label: "일지 목록", icon: "▤" },
  { href: "/trades", label: "거래 목록", icon: "≣" },
  { href: "/stats", label: "통계", icon: "▦" },
  { href: "/settings", label: "설정", icon: "⚙" },
];

function NavItems({ onNav }: { onNav?: () => void }) {
  const path = usePathname();
  return (
    <>
      {LINKS.map((l) => {
        const active = path === l.href || (l.href !== "/dashboard" && path.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNav}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-indigo-600/10 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/70"
            }`}
          >
            <span className={`text-xs ${active ? "" : "opacity-60"}`}>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </>
  );
}

export default function AppNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* 모바일 상단바 */}
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-zinc-200/70 dark:border-zinc-800 bg-[var(--surface)]/90 backdrop-blur px-4 py-2.5 text-sm md:hidden">
        <button className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="메뉴">
          {open ? "✕ 닫기" : "☰ 메뉴"}
        </button>
        <Link className="flex items-center gap-2 font-extrabold tracking-tight" href="/dashboard">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] text-white">K</span>
          K200 Journal
        </Link>
        <span className="ml-auto"><ThemeToggle /></span>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-b border-zinc-200/70 dark:border-zinc-800 bg-[var(--surface)] p-3 md:hidden">
          <NavItems onNav={() => setOpen(false)} />
          <form action="/api/auth/signout" method="post" className="pt-1">
            <button className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm" type="submit">로그아웃</button>
          </form>
        </nav>
      )}
      {/* 데스크톱 사이드바 */}
      <aside className="hidden w-60 shrink-0 md:flex flex-col gap-1 border-r border-zinc-200/70 dark:border-zinc-800 bg-[var(--surface)] p-4 sticky top-0 h-screen">
        <Link className="flex items-center gap-2.5 px-1 pb-4" href="/dashboard">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-sm">K</span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-tight">K200 Journal</span>
            <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">매매 복기 일지</span>
          </span>
        </Link>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 pb-1">메뉴</div>
        <NavItems />
        <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-zinc-200/70 dark:border-zinc-800">
          <ThemeToggle />
          <form action="/api/auth/signout" method="post">
            <button className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800" type="submit">로그아웃</button>
          </form>
        </div>
      </aside>
    </>
  );
}
