import ReviewClient from "@/components/ReviewClient";
import { getChartData } from "@/lib/chartData";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const data = await getChartData(date);
  return <ReviewClient initial={data} />;
}
