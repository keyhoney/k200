import { z } from "zod";
import { loadPublicStrategyDay, TRAINER_MIN_BARS } from "@/lib/trainerData";
import { strategyErrorResponse } from "@/lib/strategyResponse";

export const dynamic = "force-dynamic";

const Query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = Query.safeParse({ date: url.searchParams.get("date") });
  if (!parsed.success) {
    return Response.json({ error: "invalid date, expected YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const data = await loadPublicStrategyDay(parsed.data.date);
    if (data.bars.length < TRAINER_MIN_BARS) {
      return Response.json(
        { ...data, error: `${parsed.data.date} 봉 데이터가 부족합니다 (${data.bars.length}개).` },
        { status: 404 },
      );
    }
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error) {
    return strategyErrorResponse(error);
  }
}
