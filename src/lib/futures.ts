// 미니 코스피200 선물 손익 계산.
// 계약당 포인트 가치 50,000원, 호가단위 0.02pt, 수수료 0.00185%(진입·청산 각각).
// 손익: LONG = (청산가 - 진입가) × 승수 × 수량, SHORT = (진입가 - 청산가) × 승수 × 수량.
// 가격은 소수 2자리 반올림 후 정수틱(0.01pt) 연산, 금액은 원 단위 정수 (AGENTS.md 규칙 5).

import { calcTrade, type Direction } from "./pnl";

export const MINI_K200_MULTIPLIER = 50_000; // 원/포인트 (계약당)
export const FUTURES_FEE_RATE = 0.0000185; // 0.00185% per side
export const FUTURES_TICK_POINTS = 0.02; // 미니 코스피200 최소 호가

export type FuturesDirection = Direction;

export const FUTURES_LABEL: Record<FuturesDirection, string> = {
  LONG: "롱",
  SHORT: "숏",
};

export function futuresLabel(direction: FuturesDirection): string {
  return FUTURES_LABEL[direction] ?? direction;
}

export interface FuturesExecutionLike {
  type: "ENTRY" | "EXIT";
  price: number;
  quantity: number;
  fee?: number | null;
}

// 수수료 = 체결금액(가격 × 승수 × 수량) × 0.00185%, 원 단위 반올림.
export function calcFuturesFee(
  price: number,
  quantity: number,
  rate = FUTURES_FEE_RATE,
  multiplier = MINI_K200_MULTIPLIER,
): number {
  if (!(price > 0) || !(quantity > 0)) return 0;
  return Math.round(price * multiplier * quantity * rate);
}

// 한 줄 입력(진입+청산, 청산수량=진입수량) → trade_executions 2건으로 변환.
export interface FuturesSingleTradeInput {
  entryPrice: number;
  quantity: number;
  exitPrice: number;
  entryFee?: number | null;
  exitFee?: number | null;
}

export function buildFuturesExecutions(
  input: FuturesSingleTradeInput,
  rate = FUTURES_FEE_RATE,
  multiplier = MINI_K200_MULTIPLIER,
): FuturesExecutionLike[] {
  return [
    {
      type: "ENTRY",
      price: input.entryPrice,
      quantity: input.quantity,
      fee: input.entryFee ?? calcFuturesFee(input.entryPrice, input.quantity, rate, multiplier),
    },
    {
      type: "EXIT",
      price: input.exitPrice,
      quantity: input.quantity,
      fee: input.exitFee ?? calcFuturesFee(input.exitPrice, input.quantity, rate, multiplier),
    },
  ];
}

// 방향을 반영한 손익. 수수료 미지정 체결은 자동 계산한다.
export function calcFuturesTrade(
  direction: FuturesDirection,
  executions: FuturesExecutionLike[],
  multiplier = MINI_K200_MULTIPLIER,
  rate = FUTURES_FEE_RATE,
) {
  const filled = executions.map((e) => ({
    type: e.type,
    price: e.price,
    quantity: e.quantity,
    fee: e.fee != null ? e.fee : calcFuturesFee(e.price, e.quantity, rate, multiplier),
  }));
  return calcTrade(direction, filled, multiplier);
}
