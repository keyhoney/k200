# Database

- 마이그레이션: `supabase/migrations/0001_init.sql` (9 테이블 + app_settings + RLS), `0002_trainer_days.sql` (트레이닝 일자 목록 함수), `0003_strategy_public_market_data.sql`, `0004_mini_futures.sql` (미니 코스피200 선물 설정), `0005_update_futures_fee_rate.sql` (기존 수수료 설정 갱신)
- 트레이너 일자 목록: `trainer_days()` RPC 우선 사용, 미적용 시(PGRST202) 앱이 `minute_bars`를 id 순 페이징으로 직접 집계하는 폴백으로 동작 (동일 결과, 성능은 RPC가 유리)
- 핵심: `minute_bars(contract_id, bar_time)` unique upsert, `trades` ↔ `trade_executions(ENTRY/EXIT)` 분리, 원본 체결 보존
- 손익: 미니 코스피200 선물 기준. `app_settings.mini_k200_contract_multiplier` = 50000원/pt, `app_settings.futures_fee_rate` = 0.0000185(0.00185%). 앱 계산 상수는 `src/lib/futures.ts`가 정본이며 설정값과 동일하게 유지한다.
- 적용: Supabase Dashboard → SQL Editor에서 미적용 마이그레이션을 번호순으로 실행 → Auth에서 사용자 1명 생성
- 롤백: 마이그레이션 하단 주석 참조 (사용자 확인 없이 실행 금지)
- 트레이닝: `/trainer` → `/trainer/index.html` (public) 가 `/api/trainer/days`, `/api/trainer/day?date=` 로 봉을 조회
