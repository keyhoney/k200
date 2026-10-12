// 이동평균선 계산 (차트 오버레이용, 종가 기준).
// 반환 배열은 입력과 같은 길이이며, 데이터 부족 구간은 null.

export interface LinePoint {
  time: number;
  value: number;
}

export function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period < 1) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) {
      // 부동소수점 오차 방지: 소수 4자리 반올림
      out[i] = Math.round((sum / period) * 10000) / 10000;
    }
  }
  return out;
}

export function wma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period < 1 || values.length < period) return out;
  // 최근 봉에 가장 큰 가중치: w = 1..period, 분모 = period*(period+1)/2
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += values[i - period + 1 + j] * (j + 1);
    out[i] = Math.round((sum / denom) * 10000) / 10000;
  }
  return out;
}

// null 구간을 제외하고 lightweight-charts LineSeries용 데이터로 변환.
export function toLineData(times: number[], series: Array<number | null>): LinePoint[] {
  const pts: LinePoint[] = [];
  for (let i = 0; i < times.length; i++) {
    const v = series[i];
    if (v != null && Number.isFinite(v)) pts.push({ time: times[i], value: v });
  }
  return pts;
}
