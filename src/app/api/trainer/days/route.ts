import { loadTrainerDays } from "@/lib/trainerData";
import { trainerErrorResponse } from "@/lib/trainerResponse";

export const dynamic = "force-dynamic";

// GET /api/trainer/days — 봉이 있는 거래일 목록 (최신순)
export async function GET() {
  try {
    const result = await loadTrainerDays();
    return Response.json(result);
  } catch (err) {
    return trainerErrorResponse(err);
  }
}
