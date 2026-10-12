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

## GitHub Secrets

`KIS_APP_KEY`, `KIS_APP_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
→ Actions `collect-k200` (KST 16:17 본수집 + 16:37 검증, 수동 dispatch 지원).

## 테스트

```powershell
cd collector
python -m pytest test_collect.py -v   # fixture 기반, 네트워크 없음
```
