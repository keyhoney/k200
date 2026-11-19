import { TrainerDataError } from "./trainerData";

export function strategyErrorResponse(error: unknown): Response {
  if (error instanceof TrainerDataError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "전략 백테스트 데이터를 불러오지 못했습니다." }, { status: 500 });
}
