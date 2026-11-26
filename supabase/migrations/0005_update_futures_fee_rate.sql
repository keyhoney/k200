-- Update existing mini KOSPI200 futures fee settings to 0.00185% per side.
insert into app_settings (key, value)
values ('futures_fee_rate', '{"value": 0.0000185}')
on conflict (key) do update
set value = excluded.value;
