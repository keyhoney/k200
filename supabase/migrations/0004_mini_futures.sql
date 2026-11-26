-- K200 Trading Journal — 0004 mini KOSPI200 futures
-- 매매일지를 ETF(레버리지/인버스)에서 미니 코스피200 선물 롱/숏 계약으로 전환한다.
-- 앱 계산 상수는 src/lib/futures.ts 이며, 이 설정값은 참조/운영 기록용 정본이다.
--   계약당 포인트 가치: 50,000원/pt
--   수수료: 체결금액의 0.00185% (진입·청산 각각)
-- Apply in Supabase SQL Editor after 0003.

insert into app_settings (key, value) values
  ('mini_k200_contract_multiplier', '{"value": 50000}'),
  ('futures_fee_rate', '{"value": 0.0000185}')
on conflict (key) do nothing;

-- Rollback (manual only, 사용자 확인 없이 실행 금지):
-- delete from app_settings where key in ('mini_k200_contract_multiplier', 'futures_fee_rate');
