import { test, expect } from "@playwright/test";

// Agnet.md §23 완료판정 2-3: 날짜 선택 → 1분봉 표시 (DEMO 폴백 허용).
test("chart API returns bars", async ({ request }) => {
  const res = await request.get("/api/chart?date=2026-10-12");
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { bars: unknown[]; source: string };
  expect(json.bars.length).toBeGreaterThan(100);
  expect(["DEMO", "supabase"]).toContain(json.source);
});

test("chart API rejects bad date", async ({ request }) => {
  const res = await request.get("/api/chart?date=bad");
  expect(res.status()).toBe(400);
});
