import CsvUpload from "@/components/CsvUpload";
import { page, pageSub, pageTitle, sectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const NOTES = [
  { t: "ETF 손익", d: "손익 = (매도가 − 매수가) × 수량 − 수수료. 수수료는 체결마다 0.004896% 자동 계산(매수·매도 양방향)." },
  { t: "차트", d: "코스피200 선물 1분봉을 참고용으로 표시합니다. 거래 가격은 ETF 체결가를 직접 입력하세요." },
  { t: "스크린샷", d: "Supabase Dashboard → Storage에서 private 버킷 screenshots 1회 생성 필요." },
];

export default function SettingsPage() {
  return (
    <main className={page}>
      <div>
        <h1 className={pageTitle}>설정</h1>
        <p className={pageSub}>계산 규칙과 데이터 보완</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {NOTES.map((n) => (
          <div key={n.t} className="card p-4">
            <h2 className={`${sectionTitle} mb-1`}>{n.t}</h2>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{n.d}</p>
          </div>
        ))}
      </div>
      <CsvUpload />
    </main>
  );
}
