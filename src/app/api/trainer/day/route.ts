import { z } from "zod";
import { loadTrainerDay, TRAINER_MIN_BARS } from "@/lib/trainerData";
import { trainerErrorResponse } from "@/lib/trainerResponse";

export const dynamic = "force-dynamic";

const Query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

// GET /api/trainer/day?date=2026-11-10 — 해당 일자 1분봉 (최근월물, 08:45 기준 분 오프셋)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ date: url.searchParams.get("date") });
  if (!parsed.success) {
    return Response.json({ error: "invalid date, expected YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const data = await loadTrainerDay(parsed.data.date);
    if (data.bars.length < TRAINER_MIN_BARS) {
      return Response.json(
        { ...data, error: `${parsed.data.date} 봉 데이터가 부족합니다 (${data.bars.length}개).` },
        { status: 404 },
      );
    }
    return Response.json(data);
  } catch (err) {
    return trainerErrorResponse(err);
  }
}
