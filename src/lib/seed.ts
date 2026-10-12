// DEMO 합성 1분봉 — 실제 데이터와 혼동 금지 (Agnet.md §19.4). 차트 선행 개발용.
import type { Bar } from "./bars";

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoBars(dateYmd: string, seed = 7): Bar[] {
  // KST 09:00 시작 6.5h = 390 bars
  const [y, m, d] = dateYmd.split("-").map(Number);
  const start = Math.floor(Date.UTC(y, m - 1, d, 0, 0, 0) / 1000); // 09:00 KST = 00:00 UTC
  const rnd = mulberry(seed);
  let px = 350;
  const bars: Bar[] = [];
  for (let i = 0; i < 390; i++) {
    const drift = (rnd() - 0.5) * 0.3;
    const open = px;
    const close = +(open + drift).toFixed(2);
    const high = Math.max(open, close) + +((rnd() * 0.08).toFixed(2));
    const low = Math.min(open, close) - +((rnd() * 0.08).toFixed(2));
    bars.push({
      time: start + i * 60,
      open,
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close,
      volume: 200 + Math.floor(rnd() * 1500),
    });
    px = close;
  }
  return bars;
}
