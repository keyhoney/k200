import { z } from "zod";
import { ExecutionSchema } from "./tradeSchema";

// PATCH /api/trades/[id] body — 복기 필드 + 체결 수동 정정.
// route.ts가 아닌 별도 모듈에 두어 단위 테스트에서 import 가능하게 함
// (route.ts의 비핸들러 값 export는 Next 타입 검사를 깨뜨림).
export const TradePatchSchema = z.object({
  strategyName: z.string().max(100).nullable().optional(),
  setupGrade: z.enum(["A", "B", "C", "D"]).nullable().optional(),
  entryReason: z.string().max(5000).nullable().optional(),
  exitReason: z.string().max(5000).nullable().optional(),
  tradeNote: z.string().max(5000).nullable().optional(),
  ruleFollowed: z.boolean().nullable().optional(),
  screenshotPath: z.string().max(500).nullable().optional(),
  // 체결 수정 (사용자 본인의 수동 정정용 — 자동 수정 아님)
  direction: z.enum(["LONG", "SHORT"]).optional(),
  executions: z.array(ExecutionSchema).min(2).optional(),
});
export type TradePatch = z.infer<typeof TradePatchSchema>;
