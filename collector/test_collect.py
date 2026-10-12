"""Fixture 기반 테스트 — 실제 API 호출 없음."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from collect import normalize_rows, sort_dedup, valid_bar, select_front_month, parse_master_text
from krx_holidays import is_krx_holiday


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


def test_krx_holiday():
    assert is_krx_holiday("2026-10-09")      # 한글날
    assert is_krx_holiday("2026-09-24")      # 추석 연휴
    assert is_krx_holiday("2026-12-31")      # 연말휴장 (공휴일 아님)
    assert is_krx_holiday("2026-06-03")      # 대통령 선거일
    assert is_krx_holiday("2027-01-01")      # 신정
    assert not is_krx_holiday("2026-10-12")  # 월요일 개장일
    assert not is_krx_holiday("2027-01-04")  # 월요일 개장일
