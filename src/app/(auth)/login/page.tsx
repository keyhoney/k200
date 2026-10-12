"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <main className="mx-auto max-w-sm flex-1 w-full p-8 flex flex-col gap-4">
      <h1 className="text-xl font-bold">K200 Trading Journal</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-sm">
          이메일
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="text-sm">
          비밀번호
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button
          type="button"
          className="text-xs underline self-start"
          onClick={() => setShow((v) => !v)}
        >
          {show ? "숨기기" : "표시"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          disabled={busy}
        >
          {busy ? "로그인 중…" : "로그인"}
        </button>
      </form>
      <p className="text-xs text-zinc-500">회원가입은 공개하지 않음. 관리자가 Supabase에서 1명 생성.</p>
    </main>
  );
}
