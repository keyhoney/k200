import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { loadPublicStrategyDays } = vi.hoisted(() => ({
  loadPublicStrategyDays: vi.fn(),
}));

vi.mock("@/lib/trainerData", () => ({ loadPublicStrategyDays }));
vi.mock("@/lib/strategyResponse", () => ({
  strategyErrorResponse: () => Response.json({ error: "failed" }, { status: 500 }),
}));

describe("GET /api/strategy/days", () => {
  beforeEach(() => loadPublicStrategyDays.mockReset());

  it("returns public strategy dates without requiring a session", async () => {
    const result = { days: [{ date: "2026-11-10", count: 390 }], source: "sql_rpc" };
    loadPublicStrategyDays.mockResolvedValue(result);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60, s-maxage=300");
    expect(await response.json()).toEqual(result);
  });
});
