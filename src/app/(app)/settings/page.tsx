import CsvUpload from "@/components/CsvUpload";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <main className="p-6 text-sm flex flex-col gap-4">
      <h1 className="text-lg font-bold">설정</h1>
      <p>ETF 모드: 손익 = (매도가 − 매수가) × 수량 − 수수료. 수수료는 체결마다 0.004896% 자동 계산(매수·매도 양방향).</p>
      <p>차트는 코스피200 선물 1분봉을 참고용으로 표시합니다.</p>
      <p>스크린샷 버킷: Supabase Dashboard → Storage에서 private 버킷 <code>screenshots</code> 1회 생성 필요.</p>
      <CsvUpload />
    </main>
  );
}
