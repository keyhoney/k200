import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  return (
    <main className="p-6 flex flex-col gap-4">
      <h1 className="text-xl font-bold">대시보드</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        {["오늘 손익", "월 누적", "월 거래수", "월 승률", "규칙준수율"].map((t) => (
          <div key={t} className="rounded border p-3">
            <div className="text-xs text-zinc-500">{t}</div>
            <div className="text-lg font-semibold">—</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 text-sm">
        <Link className="rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black" href={`/review/${today}`}>
          오늘 일지 작성
        </Link>
        <Link className="rounded border px-3 py-1" href={`/review/${today}`}>오늘 차트 보기</Link>
        <Link className="rounded border px-3 py-1" href="/trades">과거 거래 검색</Link>
      </div>
      <p className="text-xs text-zinc-500">집계 API는 Phase 5-6에서 연결. 현재 골격만 제공.</p>
    </main>
  );
}
