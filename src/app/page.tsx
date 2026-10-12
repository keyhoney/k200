import Link from "next/link";

export const dynamic = "force-dynamic";

export default function Home() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return (
    <main className="mx-auto max-w-2xl flex-1 w-full p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">K200 Trading Journal</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        코스피200 선물 매매 복기 일지. 자동주문 없음. 수동 입력 + 1분봉 복기.
      </p>
      <div className="flex gap-3 text-sm">
        <Link className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black" href="/login">
          로그인
        </Link>
        <Link className="rounded border px-4 py-2" href="/dashboard">
          대시보드
        </Link>
        <Link className="rounded border px-4 py-2" href={`/review/${today}`}>
          오늘 복기 ({today})
        </Link>
      </div>
    </main>
  );
}
