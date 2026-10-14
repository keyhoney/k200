"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const sb = createClient();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <div className="card p-6 md:p-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white shadow-md">K</span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">K200 Trading Journal</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">코스피200 선물 매매 복기 일지</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            이메일
            <input
              className={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            비밀번호
            <input
              className={input}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button
            type="button"
            className="text-xs text-zinc-500 underline self-start hover:text-zinc-700"
            onClick={() => setShow((v) => !v)}
          >
            {show ? "비밀번호 숨기기" : "비밀번호 표시"}
          </button>
          {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
          <button className={btnPrimary} disabled={busy}>
            {busy ? "로그인 중…" : "로그인"}
          </button>
        </form>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">회원가입은 공개하지 않음. 관리자가 Supabase에서 1명 생성.</p>
      </div>
    </main>
  );
}
