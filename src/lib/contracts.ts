// 최근월물 선택 (Agnet.md §13.4): tradingDate <= expiry 중 만기일 최소.
// 만기 당일은 만기 월물 유지, 다음 영업일부터 자동 롤오버.

export interface ContractLike {
  symbol: string;
  expiry_date: string; // YYYY-MM-DD
}

export function selectFrontMonth<T extends ContractLike>(
  contracts: T[],
  tradingDate: string,
): T | null {
  const cands = contracts
    .filter((c) => tradingDate <= c.expiry_date)
    .sort((a, b) => (a.expiry_date < b.expiry_date ? -1 : 1));
  return cands[0] ?? null;
}
