import { z } from "zod";
import { getChartData } from "@/lib/chartData";

const Query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

// GET /api/chart?date=2026-10-12
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ date: url.searchParams.get("date") });
  if (!parsed.success) {
    return Response.json({ error: "invalid date, expected YYYY-MM-DD" }, { status: 400 });
  }
  const data = await getChartData(parsed.data.date);
  return Response.json(data);
}
