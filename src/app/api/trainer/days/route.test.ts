import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { loadTrainerDays } = vi.hoisted(() => ({
  loadTrainerDays: vi.fn(),
}));

vi.mock("@/lib/trainerData", () => ({ loadTrainerDays }));

describe("GET /api/trainer/days", () => {
  beforeEach(() => {
    loadTrainerDays.mockReset();
  });

  it.each(["sql_rpc", "fallback"] as const)("returns the %s source", async (source) => {
    const days = [{ date: "2026-11-10", count: 390 }];
    loadTrainerDays.mockResolvedValue({ days, source });

    const response = await GET();

    expect(await response.json()).toEqual({ days, source });
  });
});
