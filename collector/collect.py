# -*- coding: utf-8 -*-
"""KOSPI200 선물 1분봉 수집기 (KIS Open API → Supabase).

주문 기능 없음. 국내선물옵션 시세 API만 사용.
TR/필드 출처: kospi200-futures-chart/backend/kis_client.py (동작 검증됨)
  TIME_API=/uapi/domestic-futureoption/v1/quotations/inquire-time-fuopchartprice
  TR=FHKIF03020200, params FID_COND_MRKT_DIV_CODE=F / FID_INPUT_ISCD / FID_HOUR_CLS_CODE=60(1분)
  rows: stck_bsop_date, stck_cntg_hour, futs_oprc/hgpr/lwpr/prpr, cntg_vol
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
import urllib.request
import zipfile
from datetime import datetime, timedelta, timezone

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from krx_holidays import is_krx_holiday

KST = timezone(timedelta(hours=9))
KIS_BASE = "https://openapi.koreainvestment.com:9443"
TOKEN_URL = f"{KIS_BASE}/oauth2/tokenP"
TIME_API = "/uapi/domestic-futureoption/v1/quotations/inquire-time-fuopchartprice"
TR_TIME = "FHKIF03020200"
MASTER_URL = "https://new.real.download.dws.co.kr/common/master/fo_idx_code_mts.mst.zip"

LOG = logging.getLogger("collect")

# KOSPI200 선물 정규장 마감 15:45 KST. 이 시각에서 과거로 거슬러 올라가며 수집한다.
SESSION_CLOSE_HHMMSS = "154500"
# --tail 백필 구간 시작(15:31). 기존에 15:30까지만 받아둔 날짜를 메울 때 사용한다.
TAIL_START_HHMMSS = "153100"

SECRET_PATTERNS: list[str] = []


def mask(s: str) -> str:
    for pat in SECRET_PATTERNS:
        if pat:
            s = s.replace(pat, "***")
    return s


def get_env(name: str, required: bool = True) -> str:
    v = os.environ.get(name, "")
    if required and not v:
        raise SystemExit(f"missing env {name}")
    return v


# ---------------- KIS auth ----------------
def kis_token(app_key: str, app_secret: str) -> str:
    r = requests.post(
        TOKEN_URL,
        json={"grant_type": "client_credentials", "appkey": app_key, "appsecret": app_secret},
        headers={"Content-Type": "application/json"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def kis_headers(app_key: str, app_secret: str, token: str, tr_id: str) -> dict:
    return {
        "Content-Type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": app_key,
        "appsecret": app_secret,
        "tr_id": tr_id,
        "custtype": "P",
    }


class KISRetryable(Exception):
    pass


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=2, min=2, max=30),
       retry=retry_if_exception_type(KISRetryable))
def kis_time_page(session: requests.Session, headers: dict, code: str,
                  cursor: datetime) -> list[dict]:
    params = {
        "FID_COND_MRKT_DIV_CODE": "F",
        "FID_INPUT_ISCD": code,
        "FID_HOUR_CLS_CODE": "60",
        "FID_PW_DATA_INCU_YN": "N",
        "FID_FAKE_TICK_INCU_YN": "N",
        "FID_INPUT_DATE_1": cursor.strftime("%Y%m%d"),
        "FID_INPUT_HOUR_1": cursor.strftime("%H%M%S"),
    }
    r = session.get(KIS_BASE + TIME_API, headers=headers, params=params, timeout=20)
    if r.status_code != 200:
        raise KISRetryable(f"http {r.status_code}")
    body = r.json()
    if body.get("rt_cd") != "0":
        # rate limit / transient → retry, else hard fail
        msg = mask(f"{body.get('msg_cd')} {body.get('msg1')}")
        if body.get("msg_cd") in ("EGW00123",):
            raise KISRetryable(msg)
        raise RuntimeError(f"KIS error {msg}")
    return body.get("output2") or []


# ---------------- normalize / validate ----------------
def to_float(v) -> float:
    try:
        if v is None or v == "":
            return 0.0
        return float(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def normalize_rows(rows: list[dict]) -> list[dict]:
    """KIS output2 rows → minute bars (epoch seconds KST wall time)."""
    out: list[dict] = []
    for r in rows:
        d = str(r.get("stck_bsop_date", ""))
        h = str(r.get("stck_cntg_hour", ""))
        if not (d.isdigit() and len(d) == 8 and h.isdigit() and len(h) == 6):
            continue
        try:
            ts = int(datetime.strptime(d + h, "%Y%m%d%H%M%S").replace(tzinfo=KST).timestamp())
            o, hi, lo, c = (to_float(r.get(k)) for k in ("futs_oprc", "futs_hgpr", "futs_lwpr", "futs_prpr"))
            v = int(to_float(r.get("cntg_vol")))
            if o == 0 and c == 0:
                continue
            bar = {"time": ts, "open": o, "high": hi, "low": lo, "close": c, "volume": v}
            if valid_bar(bar):
                out.append(bar)
        except (TypeError, ValueError):
            continue
    return out


def valid_bar(b: dict) -> bool:
    return (b["high"] >= b["low"] and b["high"] >= b["open"] and b["high"] >= b["close"]
            and b["low"] <= b["open"] and b["low"] <= b["close"] and b["volume"] >= 0)


def sort_dedup(bars: list[dict]) -> list[dict]:
    seen: dict[int, dict] = {}
    for b in bars:
        prev = seen.get(b["time"])
        if prev is None or b["volume"] >= prev["volume"]:
            seen[b["time"]] = b
    return sorted(seen.values(), key=lambda b: b["time"])


# ---------------- master / front month ----------------
FUT_CODE_RE = re.compile(r"^101[A-Z0-9]\d{2}$|^[A-Z0-9]{6,8}$")


def parse_master_text(text: str) -> list[dict]:
    """fo_idx_code_mts.mst 파싱. 코스피200 선물 행 추출.
    실제 행 예: '1|A01612|KR4A016C0004|F 202612| |00000.00|1|2001|KOSPI200'
    parts[1]=KIS 단축코드(FID_INPUT_ISCD용, 예 A01612=26년12월물), parts[3]=월물명.
    만기일 정본은 Supabase futures_contracts이므로 여기서는 symbol 목록만 추출한다.
    (주의: 101X12 형식은 구 차트앱 별칭으로 KIS API에 통하지 않는다.)"""
    out: list[dict] = []
    for line in text.splitlines():
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 4 and re.fullmatch(r"[A-Z]\d{5}", parts[1] or "") and "KOSPI200" in line:
            out.append({"symbol": parts[1], "name": parts[3] or parts[1]})
            continue
        if len(parts) < 4:
            # 고정폭 폴백: 코드 후보 탐색
            m = re.search(r"101[A-Z]\d{2}", line)
            if m:
                out.append({"symbol": m.group(0), "name": line.strip()[:60]})
            continue
        code = parts[1] if len(parts) > 1 else ""
        if code.startswith("101") and len(code) >= 5:
            name = parts[3] if len(parts) > 3 else code
            expiry = ""
            for p in parts:
                if re.fullmatch(r"\d{8}", p):
                    expiry = p  # 만기일 후보 (YYYYMMDD)
            out.append({"symbol": code, "name": name, "expiry_raw": expiry})
    # 중복 제거 (symbol 기준)
    seen: dict[str, dict] = {}
    for c in out:
        seen.setdefault(c["symbol"], c)
    return sorted(seen.values(), key=lambda c: c["symbol"])


def download_master(cache_dir: str) -> list[dict]:
    os.makedirs(cache_dir, exist_ok=True)
    zp = os.path.join(cache_dir, "fo_idx_code_mts.mst.zip")
    urllib.request.urlretrieve(MASTER_URL, zp)
    with zipfile.ZipFile(zp) as z:
        z.extractall(cache_dir)
    mst = os.path.join(cache_dir, "fo_idx_code_mts.mst")
    with open(mst, encoding="cp949", errors="replace") as f:
        return parse_master_text(f.read())


def select_front_month(contracts: list[dict], trading_date: str) -> dict | None:
    """trading_date(YYYY-MM-DD) <= expiry 중 만기 최소. 만기당일은 만기월물 유지."""
    cands = [c for c in contracts if c.get("expiry_date", "") >= trading_date]
    cands.sort(key=lambda c: c["expiry_date"])
    return cands[0] if cands else None


# ---------------- fetch one day ----------------
def fetch_day_bars(session: requests.Session, headers: dict, code: str, ymd: str, *,
                   start_hhmmss: str = SESSION_CLOSE_HHMMSS,
                   stop_hhmmss: str | None = None) -> list[dict]:
    """해당 일자 1분봉을 start_hhmmss에서 과거로 수집한다.

    stop_hhmmss를 주면 그 시각(포함)보다 과거 봉은 버리고, 페이지도 거기서 멈춘다.
    (--tail 백필에서 15:31~15:45만 받기 위한 용도)
    """
    date_compact = ymd.replace("-", "")
    cursor = datetime.strptime(date_compact + start_hhmmss, "%Y%m%d%H%M%S")
    stop_compact = date_compact + stop_hhmmss if stop_hhmmss else None
    bars: list[dict] = []
    for _ in range(100):
        rows = kis_time_page(session, headers, code, cursor)
        if not rows:
            break
        page_keys: list[str] = []
        for r in rows:
            d = str(r.get("stck_bsop_date", ""))
            h = str(r.get("stck_cntg_hour", ""))
            if not (d.isdigit() and len(d) == 8 and h.isdigit() and len(h) == 6):
                continue
            page_keys.append(d + h)
        bars.extend(normalize_rows(rows))
        if not page_keys:
            break
        oldest = min(page_keys)
        if stop_compact and oldest <= stop_compact:
            break
        cursor = datetime.strptime(oldest, "%Y%m%d%H%M%S") - timedelta(seconds=1)
    # 해당 거래일(일자 prefix) 봉만 유지: KST 날짜 기준
    day_bars = [b for b in bars
                if datetime.fromtimestamp(b["time"], tz=KST).strftime("%Y-%m-%d") == ymd]
    if stop_hhmmss:
        day_bars = [b for b in day_bars
                    if datetime.fromtimestamp(b["time"], tz=KST).strftime("%H%M%S") >= stop_hhmmss]
    return sort_dedup(day_bars)


# ---------------- supabase ----------------
def supa_headers(svc: str) -> dict:
    return {"apikey": svc, "Authorization": f"Bearer {svc}", "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"}


def supa_upsert(base: str, svc: str, table: str, rows: list[dict], on_conflict: str) -> dict:
    import json as _json
    r = requests.post(f"{base}/rest/v1/{table}?on_conflict={on_conflict}",
                      headers=supa_headers(svc),
                      data=_json.dumps(rows), timeout=30)
    r.raise_for_status()
    return {"status": r.status_code}


def run(trading_date: str, dry_run: bool = False, force: bool = False,
        *, only_tail: bool = False) -> int:
    return run_dates([trading_date], dry_run=dry_run, force=force, only_tail=only_tail)


def run_dates(trading_dates: list[str], dry_run: bool = False, force: bool = False,
              *, only_tail: bool = False) -> int:
    """여러 거래일을 한 번에 수집한다. 토큰/월물 목록은 배치당 1회만 준비한다."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    t0 = time.time()
    app_key = get_env("KIS_APP_KEY")
    app_secret = get_env("KIS_APP_SECRET")
    sb_url = get_env("SUPABASE_URL")
    sb_svc = get_env("SUPABASE_SERVICE_ROLE_KEY")
    for s in (app_key, app_secret, sb_svc):
        SECRET_PATTERNS.append(s)

    token = kis_token(app_key, app_secret)
    session = requests.Session()
    headers = kis_headers(app_key, app_secret, token, TR_TIME)

    try:
        master = download_master(os.path.join(os.path.dirname(__file__), ".cache"))
    except Exception as e:  # master는 심볼 경고용 — 실패해도 DB 정본으로 계속 진행
        LOG.warning("master download failed: %s", mask(str(e)))
        master = []
    # 만기일 정보는 Supabase futures_contracts를 정본으로 사용, master는 심볼 목록용.
    # --tail은 기존 봉의 contract_id를 우선하므로 비활성 월물도 후보에 포함한다.
    contracts = load_contracts(sb_url, sb_svc, active_only=not only_tail)
    rc = 0
    total = len(trading_dates)
    for i, trading_date in enumerate(trading_dates, 1):
        LOG.info("[%d/%d] %s%s", i, total, trading_date, " (tail)" if only_tail else "")
        rc |= collect_one(session, headers, sb_url, sb_svc, trading_date, contracts, master,
                          dry_run=dry_run, force=force, only_tail=only_tail)
        if i < total:
            time.sleep(0.5)  # KIS 호출 제한 여유
    LOG.info("batch done in %.1fs dates=%d", time.time() - t0, total)
    return rc


def collect_one(session: requests.Session, headers: dict, sb_url: str, sb_svc: str,
                trading_date: str, contracts: list[dict], master: list[dict], *,
                dry_run: bool = False, force: bool = False, only_tail: bool = False) -> int:
    # 평일 체크 (KST)
    wd = datetime.strptime(trading_date, "%Y-%m-%d").weekday()
    if not force and wd >= 5:
        LOG.info("skip weekend %s", trading_date)
        if not dry_run:
            record_run(sb_url, sb_svc, trading_date, None, "SKIPPED", 0, 0, "weekend")
        return 0

    # KRX 휴장일 체크 (공휴일 + 12/31 연말휴장)
    if not force and is_krx_holiday(trading_date):
        LOG.info("skip KRX holiday %s", trading_date)
        if not dry_run:
            record_run(sb_url, sb_svc, trading_date, None, "SKIPPED", 0, 0, "krx holiday")
        return 0

    if only_tail:
        # 이미 수집된 날짜의 마지막 봉과 같은 월물에 15:31~15:45를 덧붙인다.
        contract_id = existing_contract_id(sb_url, sb_svc, trading_date)
        if contract_id is None:
            msg = "no existing bars for date; skip tail backfill"
            LOG.warning("%s %s", trading_date, msg)
            if not dry_run:
                record_run(sb_url, sb_svc, trading_date, None, "WARNING", 0, 0, msg)
            return 1
        front = next((c for c in contracts if c.get("id") == contract_id), None)
        if not front:
            msg = f"contract id {contract_id} not found in futures_contracts"
            LOG.error("%s %s", trading_date, mask(msg))
            if not dry_run:
                record_run(sb_url, sb_svc, trading_date, None, "WARNING", 0, 0, msg)
            return 1
    else:
        front = select_front_month(contracts, trading_date)
        if not front:
            msg = "no front month contracts in DB"
            LOG.error(mask(msg))
            if not dry_run:
                record_run(sb_url, sb_svc, trading_date, None, "FAILED", 0, 0, msg)
            return 1

    # master에 해당 심볼이 없으면 경고만 (DB 정본 우선)
    if not any(m.get("symbol") == front["symbol"] for m in master):
        LOG.warning(mask(f"front {front['symbol']} not in master file"))

    bars = fetch_day_bars(session, headers, front["symbol"], trading_date,
                          stop_hhmmss=TAIL_START_HHMMSS if only_tail else None)
    LOG.info("fetched %d bars for %s %s", len(bars), trading_date, mask(front["symbol"]))

    # 검증: 시간 오름차순, 기존보다 축소 여부 (tail은 부분 수집이라 축소 검사 제외)
    times = [b["time"] for b in bars]
    assert times == sorted(times), "bars not ascending"
    status = "SUCCESS"
    err: str | None = None
    if only_tail and not bars:
        status = "WARNING"
        err = f"no bars in tail window {TAIL_START_HHMMSS}-{SESSION_CLOSE_HHMMSS}"
        LOG.warning("%s %s", trading_date, err)
    elif not only_tail:
        existing = count_existing(sb_url, sb_svc, front["id"], trading_date)
        if bars and existing and len(bars) < existing:
            status = "WARNING"
            LOG.warning("new bars %d < existing %d, skip overwrite", len(bars), existing)

    if dry_run:
        LOG.info("dry-run: skip upsert")
        return 0

    inserted = 0
    if status == "SUCCESS" and bars:
        rows = [{
            "contract_id": front["id"],
            "trading_date": trading_date,
            "bar_time": datetime.fromtimestamp(b["time"], tz=KST).isoformat(),
            "open": b["open"], "high": b["high"], "low": b["low"], "close": b["close"],
            "volume": b["volume"], "source": "kis",
        } for b in bars]
        supa_upsert(sb_url, sb_svc, "minute_bars", rows, "contract_id,bar_time")
        inserted = len(rows)

    record_run(sb_url, sb_svc, trading_date, front["symbol"], status, len(bars), inserted,
               err or (None if bars else "empty response"),
               bars[0]["time"] if bars else None, bars[-1]["time"] if bars else None)
    LOG.info("%s done status=%s inserted=%d", trading_date, status, inserted)
    return 0 if status in ("SUCCESS", "SKIPPED") else 1


def load_contracts(sb_url: str, svc: str, *, active_only: bool = True) -> list[dict]:
    url = f"{sb_url}/rest/v1/futures_contracts?select=id,symbol,contract_name,expiry_date"
    if active_only:
        url += "&is_active=eq.true"
    r = requests.get(url, headers={"apikey": svc, "Authorization": f"Bearer {svc}"}, timeout=20)
    r.raise_for_status()
    return r.json()


def existing_contract_id(sb_url: str, svc: str, trading_date: str) -> int | None:
    """해당 일자 마지막 봉의 contract_id (tail 백필을 같은 월물에 붙이기 위함)."""
    r = requests.get(
        f"{sb_url}/rest/v1/minute_bars?select=contract_id&trading_date=eq.{trading_date}"
        "&order=bar_time.desc&limit=1",
        headers={"apikey": svc, "Authorization": f"Bearer {svc}"}, timeout=20)
    if r.status_code != 200:
        return None
    rows = r.json()
    if not rows:
        return None
    try:
        return int(rows[0]["contract_id"])
    except (KeyError, TypeError, ValueError):
        return None


def count_existing(sb_url: str, svc: str, contract_id: int, trading_date: str) -> int:
    r = requests.get(
        f"{sb_url}/rest/v1/minute_bars?select=id&contract_id=eq.{contract_id}&trading_date=eq.{trading_date}&limit=1",
        headers={"apikey": svc, "Authorization": f"Bearer {svc}", "Prefer": "count=exact"},
        timeout=20)
    if r.status_code != 200:
        return 0
    cr = r.headers.get("Content-Range", "")
    try:
        return int(cr.split("/")[1])
    except (IndexError, ValueError):
        return 0


def record_run(sb_url: str, svc: str, trading_date: str, symbol: str | None, status: str,
               requested: int, inserted: int, err: str | None,
               first: int | None = None, last: int | None = None) -> None:
    from datetime import timezone as _tz
    now = datetime.now(_tz.utc).isoformat()
    body = {
        "source": "kis", "trading_date": trading_date, "contract_symbol": symbol,
        "started_at": now, "finished_at": now,
        "requested_count": requested, "inserted_count": inserted, "updated_count": 0,
        "first_bar_time": datetime.fromtimestamp(first, tz=KST).isoformat() if first else None,
        "last_bar_time": datetime.fromtimestamp(last, tz=KST).isoformat() if last else None,
        "status": status, "error_message": mask(err) if err else None,
    }
    requests.post(f"{sb_url}/rest/v1/collection_runs", headers={
        "apikey": svc, "Authorization": f"Bearer {svc}", "Content-Type": "application/json"},
        json=body, timeout=20).raise_for_status()
    if status == "FAILED":
        raise SystemExit(f"collection failed: {mask(err or '')}")


DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_date(value: str) -> str:
    if not DATE_RE.match(value):
        raise ValueError(f"invalid date {value!r} (YYYY-MM-DD)")
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as e:
        raise ValueError(f"invalid date {value!r} (YYYY-MM-DD)") from e
    return value


def parse_dates_file(path: str) -> list[str]:
    """한 줄에 하나(또는 공백/쉼표 구분) YYYY-MM-DD. 빈 줄과 # 주석 허용."""
    dates: list[str] = []
    seen: set[str] = set()
    with open(path, encoding="utf-8") as f:
        for lineno, raw in enumerate(f, 1):
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            for token in re.split(r"[\s,]+", line):
                if not token:
                    continue
                try:
                    validate_date(token)
                except ValueError as e:
                    raise ValueError(f"{path}:{lineno}: {e}") from e
                if token not in seen:
                    seen.add(token)
                    dates.append(token)
    return dates


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="거래일 YYYY-MM-DD (생략 시 오늘)")
    ap.add_argument("--dates-file",
                    help="거래일 목록 파일 (한 줄에 YYYY-MM-DD 하나, # 주석 허용)")
    ap.add_argument("--tail", action="store_true",
                    help=f"15:31~15:45({TAIL_START_HHMMSS}-{SESSION_CLOSE_HHMMSS}) 구간만 "
                         "수집해 기존 데이터에 추가")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true",
                    help="주말/KRX 휴장일 스킵을 무시하고 수집 시도")
    a = ap.parse_args(argv)

    dates: list[str] = []
    try:
        if a.date:
            dates.append(validate_date(a.date))
        if a.dates_file:
            dates.extend(parse_dates_file(a.dates_file))
    except (OSError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    if not dates:
        dates = [datetime.now(KST).strftime("%Y-%m-%d")]
    dates = list(dict.fromkeys(dates))  # 입력 순서 유지하며 중복 제거

    try:
        return run_dates(dates, a.dry_run, a.force, only_tail=a.tail)
    except SystemExit as e:
        print(mask(str(e)), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
