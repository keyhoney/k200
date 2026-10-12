import CsvUpload from "@/components/CsvUpload";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <main className="p-6 text-sm flex flex-col gap-4">
      <h1 className="text-lg font-bold">설정</h1>
      <p>계약승수: DB app_settings.k200_contract_multiplier가 정본 (기본 250000).</p>
      <p>스크린샷 버킷: Supabase Dashboard → Storage에서 private 버킷 <code>screenshots</code> 1회 생성 필요.</p>
      <CsvUpload />
    </main>
  );
}
