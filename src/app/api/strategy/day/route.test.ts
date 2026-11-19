import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { loadPublicStrategyDay } = vi.hoisted(() => ({
  loadPublicStrategyDay: vi.fn(),
}));

vi.mock("@/lib/trainerData", () => ({
  loadPublicStrategyDay,
  TRAINER_MIN_BARS: 90,
}));
vi.mock("@/lib/strategyResponse", () => ({
  strategyErrorResponse: () => Response.json({ error: "failed" }, { status: 500 }),
}));

describe("GET /api/strategy/day", () => {
  beforeEach(() => loadPublicStrategyDay.mockReset());

  it("validates the requested date", async () => {
    const response = await GET(new Request("https://example.test/api/strategy/day?date=invalid"));

    expect(response.status).toBe(400);
    expect(loadPublicStrategyDay).not.toHaveBeenCalled();
  });

  it("returns public bars for a date without requiring a session", async () => {
    const bars = Array.from({ length: 90 }, () => [0, 400, 401, 399, 400, 10]);
    loadPublicStrategyDay.mockResolvedValue({ date: "2026-11-10", bars, source: "supabase" });

    const response = await GET(new Request("https://example.test/api/strategy/day?date=2026-11-10"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60, s-maxage=300");
    expect(await response.json()).toMatchObject({ date: "2026-11-10", bars, source: "supabase" });
  });

  it("returns 404 when the day does not contain enough market data", async () => {
    loadPublicStrategyDay.mockResolvedValue({ date: "2026-11-10", bars: [], source: "none" });

    const response = await GET(new Request("https://example.test/api/strategy/day?date=2026-11-10"));

    expect(response.status).toBe(404);
  });
});
