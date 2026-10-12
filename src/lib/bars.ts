// 1분봉 정규화/검증/변환 (Agnet.md §13.5-13.6). 원본 응답은 덮어쓰지 않고 새 배열 반환.
import { z } from "zod";

export const BarSchema = z.object({
  time: z.number().int(), // unix seconds (KST 기준 봉 시작)
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().int().nonnegative(),
});
export type Bar = z.infer<typeof BarSchema>;

export function isValidBar(b: Bar): boolean {
  return (
    b.high >= b.low &&
    b.high >= b.open &&
    b.high >= b.close &&
    b.low <= b.open &&
    b.low <= b.close &&
    b.volume >= 0
  );
}

export function sortDedup(bars: Bar[]): Bar[] {
  const seen = new Map<number, Bar>();
  for (const b of bars) {
    if (!isValidBar(b)) continue;
    const prev = seen.get(b.time);
    if (!prev || b.volume >= prev.volume) seen.set(b.time, b);
  }
  return [...seen.values()].sort((a, b) => a.time - b.time);
}

export function isAscending(bars: Bar[]): boolean {
  return bars.every((b, i) => i === 0 || bars[i - 1].time < b.time);
}

// N분봉 합성 — 연속된 1분봉을 minutes분 버킷으로 묶어 OHLCV 재계산.
// 버킷 경계는 epoch 기준 내림이며, 09:00 개장봉과 정렬됨 (09:00 KST=00:00 UTC).
export function aggregateBars(bars: Bar[], minutes: number): Bar[] {
  if (minutes <= 1) return [...bars];
  const width = minutes * 60;
  const out: Bar[] = [];
  for (const b of bars) {
    const bucket = Math.floor(b.time / width) * width;
    const last = out[out.length - 1];
    if (last && last.time === bucket) {
      last.high = Math.max(last.high, b.high);
      last.low = Math.min(last.low, b.low);
      last.close = b.close;
      last.volume += b.volume;
    } else {
      out.push({ time: bucket, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume });
    }
  }
  return out;
}
