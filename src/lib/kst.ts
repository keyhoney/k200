// Asia/Seoul 고정 시각 포맷 — 차트 시간축이 브라우저/서버 TZ에 흔들리지 않게.
const fmt = (o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", hour12: false, ...o });

export function formatKSTTime(ms: number): string {
  return fmt({ hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

export function formatKSTDate(ms: number): string {
  return fmt({ month: "2-digit", day: "2-digit" }).format(new Date(ms));
}
