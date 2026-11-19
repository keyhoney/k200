import { loadPublicStrategyDays } from "@/lib/trainerData";
import { strategyErrorResponse } from "@/lib/strategyResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await loadPublicStrategyDays(), {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error) {
    return strategyErrorResponse(error);
  }
}
