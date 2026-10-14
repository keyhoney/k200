// 일지 폼 순수 헬퍼 — 6개 텍스트 필드 + 4개 점수 분리 관리 (JournalForm 붕괴 방지).
export interface JournalFields {
  premarketPlan: string;
  marketSummary: string;
  goodPoints: string;
  badPoints: string;
  lessonLearned: string;
  nextSessionPlan: string;
}

export interface JournalScores {
  confidenceScore: number | null;
  concentrationScore: number | null;
  disciplineScore: number | null;
  satisfactionScore: number | null;
}

export type JournalFormState = JournalFields & JournalScores;

export const EMPTY_JOURNAL: JournalFormState = {
  premarketPlan: "",
  marketSummary: "",
  goodPoints: "",
  badPoints: "",
  lessonLearned: "",
  nextSessionPlan: "",
  confidenceScore: null,
  concentrationScore: null,
  disciplineScore: null,
  satisfactionScore: null,
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function score(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
}

// snake_case API/DB 행 → 폼 상태 (필드별 분리, 합치기 금지)
export function journalRowToForm(row: Record<string, unknown> | null | undefined): JournalFormState {
  if (!row) return { ...EMPTY_JOURNAL };
  return {
    premarketPlan: str(row.premarket_plan),
    marketSummary: str(row.market_summary),
    goodPoints: str(row.good_points),
    badPoints: str(row.bad_points),
    lessonLearned: str(row.lesson_learned),
    nextSessionPlan: str(row.next_session_plan),
    confidenceScore: score(row.confidence_score),
    concentrationScore: score(row.concentration_score),
    disciplineScore: score(row.discipline_score),
    satisfactionScore: score(row.satisfaction_score),
  };
}

// 폼 상태 → PUT body (빈 문자열은 null로 보내 중복 증식 방지)
export function journalFormToBody(s: JournalFormState): Record<string, string | number | null> {
  const text = (v: string) => (v.trim() === "" ? null : v);
  return {
    premarketPlan: text(s.premarketPlan),
    marketSummary: text(s.marketSummary),
    goodPoints: text(s.goodPoints),
    badPoints: text(s.badPoints),
    lessonLearned: text(s.lessonLearned),
    nextSessionPlan: text(s.nextSessionPlan),
    confidenceScore: s.confidenceScore,
    concentrationScore: s.concentrationScore,
    disciplineScore: s.disciplineScore,
    satisfactionScore: s.satisfactionScore,
  };
}

export function isJournalEmpty(s: JournalFormState): boolean {
  return (
    !s.premarketPlan.trim() &&
    !s.marketSummary.trim() &&
    !s.goodPoints.trim() &&
    !s.badPoints.trim() &&
    !s.lessonLearned.trim() &&
    !s.nextSessionPlan.trim() &&
    s.confidenceScore == null &&
    s.concentrationScore == null &&
    s.disciplineScore == null &&
    s.satisfactionScore == null
  );
}
