"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const on = saved ? saved === "dark" : prefers;
      setDark(on);
      document.documentElement.classList.toggle("dark", on);
    } catch { /* ignore */ }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch { /* ignore */ }
  }

  return (
    <button onClick={toggle} className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-pressed={dark} aria-label="다크모드 전환">
      {dark ? "☀ 라이트" : "☾ 다크"}
    </button>
  );
}
