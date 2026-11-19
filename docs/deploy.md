# 배포 (Cloudflare Pages `k200-trading-journal`)

1. Pages → Create → Framework: Next.js, Build: `npm run build`, Root: `K200TradingJournal/` (모노레포면 지정)
2. Env (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 등록
   - `SUPABASE_SERVICE_ROLE_KEY`, `KIS_*`는 Pages에 등록 금지 (GitHub Secrets 전용)
3. Supabase: `supabase/migrations/0001_init.sql`부터 `0003_strategy_public_market_data.sql`까지 순서대로 실행 → Auth 사용자 1명 생성 → Storage private 버킷 `screenshots` 생성
   - `0003_strategy_public_market_data.sql`은 전략 백테스트용 시장 데이터의 읽기 전용 RPC만 `anon` 역할에 공개합니다. 거래·일지·계정 테이블에는 공개 권한을 부여하지 않습니다.
4. GitHub Secrets 4종 등록 후 Actions `collect-k200` 수동 실행(`--dry-run` 먼저)으로 수집 확인
5. 브라우저에서 로그인 → 날짜 선택 → 1분봉 표시 → 명세 §23 13항목 대조

# 백업/복구

- 백업: Supabase Dashboard → Backups (일 자동) + `pg_dump` 수동 (`trades/trade_executions/daily_journals/minute_bars` 우선)
- 복구: 새 프로젝트에 `0001_init.sql` 적용 → 덤프 restore → Pages env 교체 → Actions 수동 수집 1회
- 재배포 기준: 이 문서만으로 처음부터 동일하게 복원 가능해야 함
