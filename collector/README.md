# Collector

KIS 실전 전용. 국내선물옵션 시세 API만 사용, 주문 없음.

## 확인된 값 (재검증됨)

- `POST https://openapi.koreainvestment.com:9443/oauth2/tokenP` 토큰 발급
- `GET /uapi/domestic-futureoption/v1/quotations/inquire-time-fuopchartprice` + `tr_id=FHKIF03020200`
- params: `FID_COND_MRKT_DIV_CODE=F`, `FID_INPUT_ISCD=<월물>`, `FID_HOUR_CLS_CODE=60`,
  `FID_PW_DATA_INCU_YN=N`, `FID_FAKE_TICK_INCU_YN=N`, `FID_INPUT_DATE_1`, `FID_INPUT_HOUR_1`
- rows: `stck_bsop_date/stck_cntg_hour/futs_oprc/futs_hgpr/futs_lwpr/futs_prpr/cntg_vol`
- 월물 목록: `fo_idx_code_mts.mst.zip` (심볼 목록용), 만기일 정본은 Supabase `futures_contracts`
- 최근월물: `trading_date <= expiry` 중 최소 만기 (만기당일 유지, 익일 롤오버)

## 실행

```powershell
$env:KIS_APP_KEY="..."; $env:KIS_APP_SECRET="..."
$env:SUPABASE_URL="https://..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."
python collector/collect.py --date 2026-10-12 --dry-run   # 저장 생략
python collector/collect.py --date 2026-10-12             # upsert
```

주말은 자동 SKIPPED. 실패 시 `collection_runs`에 FAILED 기록 후 Actions 실패 종료.

## 15:31~15:45 구간 채우기 (기존 수집일 백필)

15:30까지만 받아둔 날짜는 `--tail`로 마감 구간만 다시 받아 덧붙인다.
`--dates-file`은 한 줄에 `YYYY-MM-DD` 하나 형식이며, 빈 줄과 `#` 주석을 허용한다.
(예: `collector/data.md`)

```powershell
python collector/collect.py --dates-file collector/data.md --tail --dry-run  # 대상/건수 확인
python collector/collect.py --dates-file collector/data.md --tail            # 실제 upsert
```

- 기존 봉이 있는 날짜만 처리하고, 그 날짜 마지막 봉과 같은 `contract_id`에 15:31~15:45를 넣는다.
- 기존 봉이 없는 날짜는 건너뛰고 `collection_runs`에 WARNING을 남긴 뒤 다음 날짜로 넘어간다.
- upsert라서 같은 날짜를 다시 실행해도 중복되지 않는다. 15:45 봉이 이미 있으면 그대로 덮어쓴다.
- KIS 호출 제한을 피하려고 날짜 사이에 0.5초씩 쉰다.

## GitHub Secrets

`KIS_APP_KEY`, `KIS_APP_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
→ Actions `collect-k200` (수동 dispatch 지원). `dates_file=collector/data.md`, `tail=true`로
실행하면 GitHub Actions에서도 마감 구간을 한 번에 백필한다. (파일을 먼저 커밋해야 한다.)

주말·KRX 휴장일(공휴일 + 12/31 연말휴장)은 자동 SKIPPED. `--force`로 무시 가능.

## 테스트

```powershell
cd collector
python -m pytest test_collect.py -v   # fixture 기반, 네트워크 없음
```
