import Link from "next/link";
import { getDashboardData, todayKST } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = todayKST();
  const d = await getDashboardData(today);
  const cards = [
    { label: "오늘 순손익", value: `${d.todayNet.toLocaleString()}원 (${d.todayCount}건)` },
    { label: "월 누적 순손익", value: `${d.month.net.toLocaleString()}원` },
    { label: "월 거래수", value: `${d.month.count}건` },
    { label: "월 승률", value: `${d.month.winRate.toFixed(1)}%` },
  ];
  return (
    <main className="p-6 flex flex-col gap-4">
      <header className="flex items-center gap-3 text-sm">
        <h1 className="text-xl font-bold">대시보드</h1>
        <span className="text-xs text-zinc-500">{d.monthStart} ~ {d.today} · {d.source}</span>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {cards.map((c) => (
          <div key={c.label} className="rounded border p-3">
            <div className="text-xs text-zinc-500">{c.label}</div>
            <div className="text-lg font-semibold">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <div className="rounded border p-3">
          <h2 className="font-bold mb-2 text-xs">종목별 (이번 달)</h2>
          {Object.keys(d.byProduct).length === 0 && <p className="text-xs text-zinc-500">기록 없음</p>}
          {Object.entries(d.byProduct).map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <span>{k} ({v.count})</span><span>{v.net.toLocaleString()}원</span>
            </div>
          ))}
        </div>
        <div className="rounded border p-3">
          <h2 className="font-bold mb-2 text-xs">최근 매매</h2>
          {d.recent.length === 0 && <p className="text-xs text-zinc-500">아직 입력된 거래가 없습니다.</p>}
          {d.recent.map((t) => (
            <div key={t.id} className="flex justify-between text-xs border-b py-1">
              <span>{t.tradingDate} [{t.product}]</span>
              <span>{t.net.toLocaleString()}원 <Link className="underline ml-1" href={`/review/${t.tradingDate}`}>복기</Link></span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 text-sm">
        <Link className="rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black" href={`/review/${today}`}>
          오늘 일지 작성
        </Link>
        <Link className="rounded border px-3 py-1" href={`/review/${today}`}>오늘 차트 보기</Link>
        <Link className="rounded border px-3 py-1" href="/trades">과거 거래 검색</Link>
        <Link className="rounded border px-3 py-1" href="/stats">통계</Link>
        <Link className="rounded border px-3 py-1" href="/journals">일지 목록</Link>
      </div>
    </main>
  );
}
