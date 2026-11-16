// 트레이닝 API 공통 에러 응답 — route.ts는 라우트 핸들러만 export해야 하므로 별도 모듈.
import { TrainerDataError } from "./trainerData";

export function trainerErrorResponse(err: unknown): Response {
  if (err instanceof TrainerDataError) {
    return Response.json({ error: err.message, needsLogin: err.needsLogin }, { status: err.status });
  }
  return Response.json({ error: "훈련 데이터를 불러오지 못했습니다." }, { status: 500 });
}
