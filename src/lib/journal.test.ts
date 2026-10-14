import { describe, expect, it } from "vitest";
import { EMPTY_JOURNAL, isJournalEmpty, journalFormToBody, journalRowToForm } from "./journal";

describe("journal helpers", () => {
  it("maps row fields separately without merging", () => {
    const s = journalRowToForm({
      premarket_plan: "plan",
      market_summary: "summary",
      good_points: "",
      bad_points: null,
      lesson_learned: "lesson",
      next_session_plan: "next",
      confidence_score: 4,
      concentration_score: 7, // out of range → null
      discipline_score: null,
      satisfaction_score: 2,
    });
    expect(s.premarketPlan).toBe("plan");
    expect(s.marketSummary).toBe("summary");
    expect(s.goodPoints).toBe("");
    expect(s.badPoints).toBe("");
    expect(s.confidenceScore).toBe(4);
    expect(s.concentrationScore).toBeNull();
    expect(s.satisfactionScore).toBe(2);
  });

  it("converts empty strings to null so saves do not duplicate", () => {
    const body = journalFormToBody({ ...EMPTY_JOURNAL, premarketPlan: "  ", goodPoints: "g" });
    expect(body.premarketPlan).toBeNull();
    expect(body.goodPoints).toBe("g");
  });

  it("detects empty state", () => {
    expect(isJournalEmpty(EMPTY_JOURNAL)).toBe(true);
    expect(isJournalEmpty({ ...EMPTY_JOURNAL, disciplineScore: 3 })).toBe(false);
  });
});
