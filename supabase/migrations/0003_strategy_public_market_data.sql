-- Public, read-only market-data RPCs for the strategy backtest.
-- No access to trades, journals, profiles, or collection status is granted.

create or replace function public.strategy_public_days()
returns table (trading_date date, bar_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select mb.trading_date, count(*)::bigint
  from public.minute_bars mb
  group by mb.trading_date
  order by mb.trading_date desc;
$$;

create or replace function public.strategy_public_day(requested_date date)
returns table (
  bar_time timestamptz,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select mb.bar_time, mb.open, mb.high, mb.low, mb.close, mb.volume
  from public.minute_bars mb
  join public.futures_contracts fc on fc.id = mb.contract_id
  where fc.id = (
    select candidate.id
    from public.futures_contracts candidate
    where candidate.is_active = true
      and requested_date <= candidate.expiry_date
    order by candidate.expiry_date
    limit 1
  )
    and mb.trading_date = requested_date
  order by mb.bar_time;
$$;

revoke all on function public.strategy_public_days() from public;
revoke all on function public.strategy_public_day(date) from public;
grant execute on function public.strategy_public_days() to anon;
grant execute on function public.strategy_public_day(date) to anon;

notify pgrst, 'reload schema';
