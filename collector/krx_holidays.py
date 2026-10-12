# -*- coding: utf-8 -*-
"""KRX 휴장일 판정.

휴장일 = 관공서 공휴일(holidays KR, 대체공휴일·임시공휴일 포함) + 12/31 연말휴장.
주말은 여기서 보지 않는다 (run()의 weekday 체크가 담당).
"""
from __future__ import annotations

import datetime as _dt

import holidays

_KR = holidays.KR()  # 연도 미지정 → 조회 시점에 lazy 확장


def is_krx_holiday(date_str: str) -> bool:
    """YYYY-MM-DD → 휴장일 여부. 12/31은 공휴일이 아니어도 KRX 연말휴장."""
    y, m, d = (int(p) for p in date_str.split("-"))
    if m == 12 and d == 31:
        return True
    return _dt.date(y, m, d) in _KR
