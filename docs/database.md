# Database

- 마이그레이션: `supabase/migrations/0001_init.sql` (9 테이블 + app_settings + RLS)
- 핵심: `minute_bars(contract_id, bar_time)` unique upsert, `trades` ↔ `trade_executions(ENTRY/EXIT)` 분리, 원본 체결 보존
- 승수: `app_settings.k200_contract_multiplier` 정본 (기본 250000), env는 fallback
- 적용: Supabase Dashboard → SQL Editor에서 0001 실행 → Auth에서 사용자 1명 생성
- 롤백: 마이그레이션 하단 주석 참조 (사용자 확인 없이 실행 금지)
