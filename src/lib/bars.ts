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
