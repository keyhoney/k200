// 거래일(YYYY-MM-DD) 헬퍼 — KST 자정 기준 파싱으로 브라우저 TZ 함정 방지.
// 주말·양력 고정 공휴일은 선택 불가/이동 스킵. 설·추석 등 음력 휴일은
// 하드코딩하지 않고 "차트 데이터 없음" 안내로 처리 (collector/krx_holidays.py 참조).

export function parseYmd(ymd: string): Date {
  return new Date(`${ymd}T12:00:00+09:00`);
}

export function toYmd(d: Date): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function isWeekend(ymd: string): boolean {
  const day = parseYmd(ymd).getUTCDay(); // KST 정오 기준이므로 UTC 요일 == KST 요일
  return day === 0 || day === 6;
}

// 양력 고정 공휴일 + KRX 연말휴장(12/31). 음력(설·추석·부처님오신날) 제외.
const FIXED_HOLIDAYS = new Set([
  "01-01", // 신정
  "03-01", // 삼일절
  "05-05", // 어린이날
  "06-06", // 현충일
  "08-15", // 광복절
  "10-03", // 개천절
  "10-09", // 한글날
  "12-25", // 크리스마스
  "12-31", // 연말휴장
]);

export function isFixedHoliday(ymd: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) && FIXED_HOLIDAYS.has(ymd.slice(5));
}

export function isNonTradingDay(ymd: string): boolean {
  return isWeekend(ymd) || isFixedHoliday(ymd);
}

// 주말·고정휴장을 건너뛰고 delta 거래일 이동 (최대 30일 탐색, 무한루프 방지)
export function shiftTradingDay(ymd: string, delta: number): string {
  if (delta === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const step = delta > 0 ? 1 : -1;
  let d = parseYmd(ymd);
  let moved = 0;
  for (let i = 0; i < 30; i++) {
    d = new Date(d.getTime() + step * 24 * 3600 * 1000);
    const next = toYmd(d);
    if (isNonTradingDay(next)) continue;
    moved += 1;
    if (moved >= Math.abs(delta)) return next;
  }
  return ymd;
}
