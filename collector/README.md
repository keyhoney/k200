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

## 특별 세션 (수동)

연초 첫 거래일(09:45–15:45), 수능 시험일(09:45–16:45)처럼 정규장 시간이 조정되는 날은
자동 판정하지 않는다. 수동 실행에서 `special_session`을 `true`로 하고 수집 기준 시각을
직접 입력한다.

| 입력 | 예시 | 설명 |
| --- | --- | --- |
| `special_session` | `true` | 특별 세션 모드. 주말/휴장일 판정을 건너뛴다 |
| `session_close` | `16:45` | 이 시각부터 과거로 수집 (필수) |
| `session_open` | `09:45` | 로그 표시용. 생략하면 08:45 |

- `special_session=true`인데 `session_close`가 비어 있으면 실행을 중단한다.
- `special_session=false`이면 `session_open`/`session_close`는 무시되고 기본 08:45–15:45로 수집한다.

```powershell
# 2026-11-19 수능일: 16:45까지 수집
python collector/collect.py --date 2026-11-19 --special-session --session-close 16:45

# 2026-01-02 연초 첫 거래일: 개장만 09:45, 마감은 15:45
python collector/collect.py --date 2026-01-02 --special-session --session-open 09:45 --session-close 15:45
```

`special_session`에는 수집 기준이 되는 `session_close`가 반드시 필요하다.

Actions: `collect-k200` → Run workflow → `special_session` 체크, `session_close`에 `16:45` 입력.

## GitHub Secrets

`KIS_APP_KEY`, `KIS_APP_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
→ Actions `collect-k200` (수동 dispatch). 거래일 마감 후에 실행한다.

주말·KRX 휴장일(공휴일 + 12/31 연말휴장)은 자동 SKIPPED. `--force`로 무시 가능.

## 테스트

```powershell
cd collector
python -m pytest test_collect.py -v   # fixture 기반, 네트워크 없음
```
