import Link from "next/link";
import { getDashboardData, todayKST } from "@/lib/dashboard";
import { Badge, Empty, page, pageSub, pageTitle, sectionTitle, StatCard, btnGhost, btnPrimary } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = todayKST();
  const d = await getDashboardData(today);
  return (
    <main className={page}>
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className={pageTitle}>대시보드</h1>
          <p className={pageSub}>{d.monthStart} ~ {d.today} · {d.source}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link className={btnPrimary} href={`/review/${today}`}>오늘 복기하기</Link>
          <Link className={btnGhost} href="/trades">과거 거래 검색</Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="오늘 순손익" value={`${d.todayNet.toLocaleString()}원`} sub={`${d.todayCount}건`} tone={d.todayNet > 0 ? "profit" : d.todayNet < 0 ? "loss" : "neutral"} />
        <StatCard label="월 누적 순손익" value={`${d.month.net.toLocaleString()}원`} tone={d.month.net > 0 ? "profit" : d.month.net < 0 ? "loss" : "neutral"} />
        <StatCard label="월 거래수" value={`${d.month.count}건`} />
        <StatCard label="월 승률" value={`${d.month.winRate.toFixed(1)}%`} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-4 md:p-5 flex flex-col gap-2">
          <h2 className={sectionTitle}>종목별 · 이번 달</h2>
          {Object.keys(d.byProduct).length === 0 && <Empty>기록 없음</Empty>}
          {Object.entries(d.byProduct).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800 py-1.5 text-xs last:border-0">
              <span className="flex items-center gap-2">
                <Badge tone={k === "LONG" ? "long" : k === "SHORT" ? "short" : "neutral"}>{k}</Badge>
                <span className="text-zinc-500">{v.count}건</span>
              </span>
              <span className={`tnum font-bold ${v.net > 0 ? "text-red-600 dark:text-red-400" : v.net < 0 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                {v.net.toLocaleString()}원
              </span>
            </div>
          ))}
        </div>
        <div className="card p-4 md:p-5 flex flex-col gap-2">
          <h2 className={sectionTitle}>최근 매매</h2>
          {d.recent.length === 0 && <Empty>아직 입력된 거래가 없습니다.</Empty>}
          {d.recent.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800 py-1.5 text-xs last:border-0">
              <span className="flex items-center gap-2">
                <span className="tnum text-zinc-500">{t.tradingDate}</span>
                <Badge tone={t.product === "LONG" ? "long" : t.product === "SHORT" ? "short" : "neutral"}>{t.product}</Badge>
              </span>
              <span className="flex items-center gap-2">
                <span className={`tnum font-bold ${t.net > 0 ? "text-red-600 dark:text-red-400" : t.net < 0 ? "text-blue-600 dark:text-blue-400" : ""}`}>
                  {t.net.toLocaleString()}원
                </span>
                <Link className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium" href={`/review/${t.tradingDate}`}>복기</Link>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 md:p-5">
        <h2 className={`${sectionTitle} mb-3`}>빠른 작업</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { href: `/review/${today}`, label: "오늘 일지 작성", desc: "차트 + 거래 + 메모" },
            { href: "/stats", label: "통계", desc: "방향·요일·등급별" },
            { href: "/journals", label: "일지 목록", desc: "최근 50일" },
            { href: "/settings", label: "데이터 보완", desc: "CSV 업로드" },
          ].map((a) => (
            <Link key={a.href + a.label} href={a.href} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 transition hover:border-indigo-400 hover:shadow-md dark:hover:border-indigo-500">
              <div className="text-sm font-bold">{a.label}</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
