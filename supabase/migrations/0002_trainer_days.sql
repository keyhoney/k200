-- K200 Trading Journal — 0002 trainer days
-- 트레이닝 페이지(/trainer)가 사용할 "1분봉이 있는 거래일" 목록.
-- minute_bars를 클라이언트에서 전부 훑지 않도록 날짜별 집계로 내려준다.
-- Apply in Supabase SQL Editor after 0001_init.sql.

create or replace function trainer_days()
returns table (trading_date date, bar_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select mb.trading_date, count(*)::bigint as bar_count
  from public.minute_bars mb
  group by mb.trading_date
  order by mb.trading_date desc;
$$;

-- 시세 읽기와 동일하게 로그인 사용자만 실행 가능 (RLS도 invoker로 적용됨)
revoke all on function trainer_days() from public;
grant execute on function trainer_days() to authenticated;

-- Rollback (manual only):
-- drop function if exists trainer_days();
