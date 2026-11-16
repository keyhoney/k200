# Database

- 마이그레이션: `supabase/migrations/0001_init.sql` (9 테이블 + app_settings + RLS), `0002_trainer_days.sql` (트레이닝 일자 목록 함수)
- 트레이너 일자 목록: `trainer_days()` RPC 우선 사용, 미적용 시(PGRST202) 앱이 `minute_bars`를 id 순 페이징으로 직접 집계하는 폴백으로 동작 (동일 결과, 성능은 RPC가 유리)
- 핵심: `minute_bars(contract_id, bar_time)` unique upsert, `trades` ↔ `trade_executions(ENTRY/EXIT)` 분리, 원본 체결 보존
- 승수: `app_settings.k200_contract_multiplier` 정본 (기본 250000), env는 fallback
- 적용: Supabase Dashboard → SQL Editor에서 0001 → 0002 순서로 실행 → Auth에서 사용자 1명 생성
- 롤백: 마이그레이션 하단 주석 참조 (사용자 확인 없이 실행 금지)
- 트레이닝: `/trainer` → `/trainer/index.html` (public) 가 `/api/trainer/days`, `/api/trainer/day?date=` 로 봉을 조회
