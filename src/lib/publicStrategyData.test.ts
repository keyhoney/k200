import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPublicStrategyDay, loadPublicStrategyDays } from "./trainerData";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

describe("public strategy market data", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://market-data.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-key");
    createClient.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("loads available dates through an anonymous, non-persisting client", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ trading_date: "2026-11-10", bar_count: 390 }],
      error: null,
    });
    createClient.mockReturnValue({ rpc });

    await expect(loadPublicStrategyDays()).resolves.toMatchObject({
      days: [{ date: "2026-11-10", count: 390 }],
      source: "sql_rpc",
    });
    expect(createClient).toHaveBeenCalledWith(
      "https://market-data.example",
      "public-key",
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    expect(rpc).toHaveBeenCalledWith("strategy_public_days");
  });

  it("loads validated bars using the public date RPC", async () => {
    const rows = Array.from({ length: 90 }, (_, minute) => ({
      bar_time: new Date(Date.parse("2026-11-09T23:45:00Z") + minute * 60_000).toISOString(),
      open: 400,
      high: 401,
      low: 399,
      close: 400.5,
      volume: 10,
    }));
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    createClient.mockReturnValue({ rpc });

    const result = await loadPublicStrategyDay("2026-11-10");

    expect(rpc).toHaveBeenCalledWith("strategy_public_day", { requested_date: "2026-11-10" });
    expect(result.bars).toHaveLength(90);
    expect(result.bars[0]).toEqual([0, 400, 401, 399, 400.5, 10]);
  });

  it("reports when the public RPC migration has not been applied", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    createClient.mockReturnValue({ rpc });

    await expect(loadPublicStrategyDays()).rejects.toMatchObject({
      name: "TrainerDataError",
      status: 503,
      message: expect.stringContaining("0003_strategy_public_market_data.sql"),
    });
  });
});
