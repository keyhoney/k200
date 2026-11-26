import { describe, expect, it } from "vitest";
import { defaultDrafts, draftsToBody, previewDrafts } from "./splitTrade";

describe("splitTrade", () => {
  it("builds body with auto fee for split entries", () => {
    const drafts = [
      { key: 1, type: "ENTRY" as const, dt: "2026-10-12T09:32", price: "350.10", qty: "1" },
      { key: 2, type: "ENTRY" as const, dt: "2026-10-12T09:35", price: "350.30", qty: "1" },
      { key: 3, type: "EXIT" as const, dt: "2026-10-12T09:41", price: "350.50", qty: "2" },
    ];
    const body = draftsToBody("2026-10-12", 1, "LONG", drafts);
    expect("error" in body).toBe(false);
    if (!("error" in body)) {
      expect(body.executions).toHaveLength(3);
      expect(body.executions[0].fee).toBeGreaterThan(0);
    }
  });

  it("rejects exit qty exceeding entries", () => {
    const drafts = defaultDrafts("2026-10-12").map((d) =>
      d.type === "EXIT" ? { ...d, price: "350.10", qty: "99" } : { ...d, price: "350.10" },
    );
    const body = draftsToBody("2026-10-12", 1, "LONG", drafts);
    expect("error" in body).toBe(true);
  });

  it("previews weighted average for splits", () => {
    const p = previewDrafts("LONG", [
      { key: 1, type: "ENTRY", dt: "2026-10-12T09:32", price: "350.10", qty: "1" },
      { key: 2, type: "ENTRY", dt: "2026-10-12T09:35", price: "350.30", qty: "1" },
      { key: 3, type: "EXIT", dt: "2026-10-12T09:41", price: "350.50", qty: "2" },
    ]);
    expect(p?.avgEntry).toBeCloseTo(350.2, 10);
    expect(p?.gross).toBe(30_000);
    expect(p?.net).toBeGreaterThan(0);
  });

  it("previews short pnl with the opposite sign", () => {
    const p = previewDrafts("SHORT", [
      { key: 1, type: "ENTRY", dt: "2026-10-12T09:32", price: "350.50", qty: "1" },
      { key: 2, type: "EXIT", dt: "2026-10-12T09:41", price: "350.30", qty: "1" },
    ]);
    expect(p?.points).toBeCloseTo(0.2, 10);
    expect(p?.gross).toBe(10_000);
  });
});
