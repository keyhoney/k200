import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let authed = false;
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    authed = !!data.user;
  } catch {
    authed = false;
  }
  if (!authed) redirect("/login");
  return (
    <div className="flex min-h-full">
      <nav className="w-48 shrink-0 border-r p-4 flex flex-col gap-2 text-sm">
        <Link className="font-bold" href="/dashboard">K200 Journal</Link>
        <Link href="/dashboard">대시보드</Link>
        <Link href="/trades">거래 목록</Link>
        <Link href="/stats">통계</Link>
        <Link href="/settings">설정</Link>
        <form action="/api/auth/signout" method="post" className="mt-auto">
          <button className="rounded border px-3 py-1" type="submit">로그아웃</button>
        </form>
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
