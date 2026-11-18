"""Fixture 기반 테스트 — 실제 API 호출 없음."""
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from collect import (
    KST,
    TAIL_START_HHMMSS,
    normalize_rows,
    sort_dedup,
    valid_bar,
    select_front_month,
    parse_master_text,
    parse_dates_file,
    fetch_day_bars,
)
from krx_holidays import is_krx_holiday

import pytest


class FakeResponse:
    def __init__(self, rows):
        self.status_code = 200
        self._rows = rows

    def json(self):
        return {"rt_cd": "0", "output2": self._rows}


class FakeSession:
    """KIS 응답을 페이지 단위로 돌려주고 요청 파라미터를 기록한다."""

    def __init__(self, pages):
        self.pages = list(pages)
        self.calls = []

    def get(self, url, headers=None, params=None, timeout=None):
        self.calls.append(dict(params or {}))
        rows = self.pages.pop(0) if self.pages else []
        return FakeResponse(rows)


def minute_row(hhmmss: str, price: float = 350.0, volume: int = 1) -> dict:
    return {
        "stck_bsop_date": "20261118", "stck_cntg_hour": hhmmss,
        "futs_oprc": str(price), "futs_hgpr": str(price + 0.05),
        "futs_lwpr": str(price - 0.05), "futs_prpr": str(price),
        "cntg_vol": str(volume),
    }


def test_normalize_and_dedup():
    rows = [
        {"stck_bsop_date": "20261012", "stck_cntg_hour": "090000",
         "futs_oprc": "350.10", "futs_hgpr": "350.25", "futs_lwpr": "349.90",
         "futs_prpr": "350.20", "cntg_vol": "1234"},
        {"stck_bsop_date": "20261012", "stck_cntg_hour": "090000",
         "futs_oprc": "350.10", "futs_hgpr": "350.25", "futs_lwpr": "349.90",
         "futs_prpr": "350.20", "cntg_vol": "1234"},
        {"stck_bsop_date": "20261012", "stck_cntg_hour": "090100",
         "futs_oprc": "350.20", "futs_hgpr": "349.00", "futs_lwpr": "350.50",  # invalid
         "futs_prpr": "350.10", "cntg_vol": "10"},
        {"stck_bsop_date": "bad", "stck_cntg_hour": "090200",
         "futs_oprc": "1", "futs_hgpr": "1", "futs_lwpr": "1", "futs_prpr": "1", "cntg_vol": "1"},
    ]
    bars = sort_dedup(normalize_rows(rows))
    assert len(bars) == 1
    assert bars[0]["open"] == 350.10 and bars[0]["volume"] == 1234


def test_valid_bar():
    assert valid_bar({"open": 1, "high": 2, "low": 1, "close": 2, "volume": 0})
    assert not valid_bar({"open": 1, "high": 0, "low": 1, "close": 2, "volume": 0})


def test_front_month_rollover():
    contracts = [
        {"symbol": "101X12", "expiry_date": "2026-12-10"},
        {"symbol": "101X09", "expiry_date": "2026-09-10"},
    ]
    assert select_front_month(contracts, "2026-09-10")["symbol"] == "101X09"  # 만기당일 유지
    assert select_front_month(contracts, "2026-09-11")["symbol"] == "101X12"  # 다음날 롤오버
    assert select_front_month(contracts, "2026-12-11") is None


def test_master_parse_tolerant():
    text = "1|101X12|xxx|코스피200 선물 26.12|...|20261210|\n9|junk|line\n"
    out = parse_master_text(text)
    assert out and out[0]["symbol"] == "101X12"


def test_master_parse_real_format():
    text = (
        "1|A01612|KR4A016C0004|F 202612| |00000.00|1|2001|KOSPI200\n"
        "1|A01703|KR4A01730006|F 202703| |00000.00|2|2001|KOSPI200\n"
        "7|A04610|KR4A046A0000|VKOSPI F 202610| |00000.00|1|0503|VKOSPI\n"
    )
    out = parse_master_text(text)
    syms = [c["symbol"] for c in out]
    assert "A01612" in syms and "A01703" in syms
    assert "A04610" not in syms  # VKOSPI 제외


def test_fetch_day_bars_starts_at_1545_close():
    session = FakeSession([[]])
    fetch_day_bars(session, {}, "A01612", "2026-11-18")
    assert session.calls[0]["FID_INPUT_HOUR_1"] == "154500"


def test_fetch_day_bars_includes_1545_bar():
    session = FakeSession([[minute_row("154400"), minute_row("154500", 351.0, 7)]])
    bars = fetch_day_bars(session, {}, "A01612", "2026-11-18")
    assert len(bars) == 2
    last = datetime.fromtimestamp(bars[-1]["time"], tz=KST)
    assert last.strftime("%H:%M") == "15:45"
    assert bars[-1]["volume"] == 7


def test_fetch_day_bars_tail_window_only():
    session = FakeSession([[
        minute_row("154500"),
        minute_row("154400"),
        minute_row("153100"),
        minute_row("153000"),
        minute_row("152900"),
    ]])
    bars = fetch_day_bars(session, {}, "A01612", "2026-11-18",
                          stop_hhmmss=TAIL_START_HHMMSS)
    times = [datetime.fromtimestamp(b["time"], tz=KST).strftime("%H:%M") for b in bars]
    assert times == ["15:31", "15:44", "15:45"]
    # 15:31보다 과거까지 한 페이지에 왔으므로 추가 페이지 호출 없이 끝난다.
    assert len(session.calls) == 1


def test_parse_dates_file_ignores_blank_and_comments(tmp_path):
    path = tmp_path / "dates.md"
    path.write_text(
        "2026-11-17\n"
        "# 주석\n"
        "\n"
        "2026-11-16, 2026-11-17\n",
        encoding="utf-8",
    )
    assert parse_dates_file(str(path)) == ["2026-11-17", "2026-11-16"]


def test_parse_dates_file_rejects_invalid_date(tmp_path):
    path = tmp_path / "dates.md"
    path.write_text("2026-11-17\n2026/11/16\n", encoding="utf-8")
    with pytest.raises(ValueError):
        parse_dates_file(str(path))


def test_krx_holiday():
    assert is_krx_holiday("2026-10-09")      # 한글날
    assert is_krx_holiday("2026-09-24")      # 추석 연휴
    assert is_krx_holiday("2026-12-31")      # 연말휴장 (공휴일 아님)
    assert is_krx_holiday("2026-06-03")      # 대통령 선거일
    assert is_krx_holiday("2027-01-01")      # 신정
    assert not is_krx_holiday("2026-10-12")  # 월요일 개장일
    assert not is_krx_holiday("2027-01-04")  # 월요일 개장일
