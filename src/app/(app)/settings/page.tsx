import CsvUpload from "@/components/CsvUpload";
import { page, pageSub, pageTitle, sectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const NOTES = [
  { t: "선물 손익", d: "미니 코스피200 선물 기준. 롱 = (청산가 − 진입가) × 50,000원 × 계약수, 숏 = (진입가 − 청산가) × 50,000원 × 계약수. 수수료는 체결금액의 0.00185%를 진입·청산 각각 자동 계산합니다." },
  { t: "차트", d: "코스피200 선물 1분봉을 표시합니다. 차트를 클릭하면 시각과 가격(봉 종가)이 거래 입력의 빈 칸에 반영됩니다." },
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
