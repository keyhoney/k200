-- K200 Trading Journal — 0001 init
-- Spec: Agnet.md §5. Apply in Supabase SQL Editor in order.
-- Rollback: drop tables in reverse order (see bottom comment), never without user confirmation.

-- ---------- profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- futures_contracts ----------
create table if not exists futures_contracts (
  id bigint generated always as identity primary key,
  broker text not null,
  market text not null default 'KRX',
  product_code text not null,
  symbol text not null,
  contract_name text not null,
  expiry_date date not null,
  first_trade_date date,
  last_trade_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (broker, symbol)
);

-- ---------- minute_bars ----------
create table if not exists minute_bars (
  id bigint generated always as identity primary key,
  contract_id bigint not null references futures_contracts(id),
  trading_date date not null,
  bar_time timestamptz not null,
  open numeric(12, 4) not null,
  high numeric(12, 4) not null,
  low numeric(12, 4) not null,
  close numeric(12, 4) not null,
  volume bigint not null default 0,
  open_interest bigint,
  source text not null default 'kis',
  collected_at timestamptz not null default now(),
  unique (contract_id, bar_time),
  constraint minute_bar_price_check check (
    high >= low and high >= open and high >= close and low <= open and low <= close
  ),
  constraint minute_bar_volume_check check (volume >= 0)
);
create index if not exists idx_minute_bars_date on minute_bars (trading_date);
create index if not exists idx_minute_bars_contract_date on minute_bars (contract_id, trading_date, bar_time);

-- ---------- trades ----------
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contract_id bigint not null references futures_contracts(id),
  trading_date date not null,
  direction text not null check (direction in ('LONG', 'SHORT')),
  status text not null default 'CLOSED' check (status in ('OPEN', 'PARTIALLY_CLOSED', 'CLOSED', 'CANCELLED')),
  strategy_name text,
  setup_grade text check (setup_grade in ('A', 'B', 'C', 'D')),
  entry_reason text,
  exit_reason text,
  trade_note text,
  planned_stop_price numeric(12, 4),
  planned_target_price numeric(12, 4),
  actual_pnl numeric(14, 2),
  fee numeric(14, 2) not null default 0,
  rule_followed boolean,
  emotion_before text,
  emotion_during text,
  emotion_after text,
  screenshot_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_trades_user_date on trades (user_id, trading_date desc);

-- ---------- trade_executions ----------
create table if not exists trade_executions (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  execution_type text not null check (execution_type in ('ENTRY', 'EXIT')),
  executed_at timestamptz not null,
  price numeric(12, 4) not null check (price > 0),
  quantity integer not null check (quantity > 0),
  fee numeric(14, 2) not null default 0,
  memo text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_exec_trade on trade_executions (trade_id, sort_order, executed_at);

-- ---------- tags ----------
create table if not exists tags (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('STRATEGY', 'MARKET', 'EMOTION', 'MISTAKE')),
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, category, name)
);
create table if not exists trade_tags (
  trade_id uuid not null references trades(id) on delete cascade,
  tag_id bigint not null references tags(id) on delete cascade,
  primary key (trade_id, tag_id)
);

-- ---------- daily_journals ----------
create table if not exists daily_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_date date not null,
  contract_id bigint references futures_contracts(id),
  premarket_plan text,
  market_summary text,
  good_points text,
  bad_points text,
  lesson_learned text,
  next_session_plan text,
  confidence_score integer check (confidence_score between 1 and 5),
  concentration_score integer check (concentration_score between 1 and 5),
  discipline_score integer check (discipline_score between 1 and 5),
  satisfaction_score integer check (satisfaction_score between 1 and 5),
  daily_pnl numeric(14, 2),
  daily_fee numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, trading_date)
);

-- ---------- collection_runs ----------
create table if not exists collection_runs (
  id bigint generated always as identity primary key,
  source text not null,
  trading_date date not null,
  contract_symbol text,
  started_at timestamptz not null,
  finished_at timestamptz,
  requested_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  first_bar_time timestamptz,
  last_bar_time timestamptz,
  status text not null check (status in ('RUNNING', 'SUCCESS', 'WARNING', 'FAILED', 'SKIPPED')),
  error_message text,
  created_at timestamptz not null default now()
);

-- ---------- app_settings (contract multiplier lives here; env is fallback) ----------
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into app_settings (key, value) values ('k200_contract_multiplier', '{"value": 250000}')
on conflict (key) do nothing;

-- ================= RLS =================
alter table profiles enable row level security;
alter table futures_contracts enable row level security;
alter table minute_bars enable row level security;
alter table trades enable row level security;
alter table trade_executions enable row level security;
alter table tags enable row level security;
alter table trade_tags enable row level security;
alter table daily_journals enable row level security;
alter table collection_runs enable row level security;

-- profiles: own row only
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- market data: read for logged-in users, no client write (writes via service_role bypass RLS)
drop policy if exists fc_read on futures_contracts;
create policy fc_read on futures_contracts for select to authenticated using (true);
drop policy if exists mb_read on minute_bars;
create policy mb_read on minute_bars for select to authenticated using (true);

-- user data helper: trade must belong to caller
drop policy if exists trades_self on trades;
create policy trades_self on trades for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists exec_self on trade_executions;
create policy exec_self on trade_executions for all to authenticated
  using (exists (select 1 from trades t where t.id = trade_executions.trade_id and t.user_id = auth.uid()))
  with check (exists (select 1 from trades t where t.id = trade_executions.trade_id and t.user_id = auth.uid()));

drop policy if exists tags_self on tags;
create policy tags_self on tags for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tradetags_self on trade_tags;
create policy tradetags_self on trade_tags for all to authenticated
  using (exists (select 1 from trades t where t.id = trade_tags.trade_id and t.user_id = auth.uid()))
  with check (exists (select 1 from trades t where t.id = trade_tags.trade_id and t.user_id = auth.uid()));

drop policy if exists journals_self on daily_journals;
create policy journals_self on daily_journals for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- collection_runs: readable by authenticated (status dashboard), writable only by service_role (no client policy for insert/update)
drop policy if exists runs_read on collection_runs;
create policy runs_read on collection_runs for select to authenticated using (true);

-- Rollback (manual only):
-- drop table if exists collection_runs, daily_journals, trade_tags, tags, trade_executions, trades, minute_bars, futures_contracts, profiles, app_settings;
