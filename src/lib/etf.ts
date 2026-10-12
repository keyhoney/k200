// ETF(코스피200 레버리지 / 인버스2X) 손익 계산.
// 선물 calcTrade와 달리 승수 없이 (매도가 - 매수가) x 수량 - 수수료.
// 방향(LONG=레버리지, SHORT=인버스2X)은 종목 구분용이며 손익 부호에는 영향 없음.
// 수수료는 매수·매도 각 체결마다 자동 계산: round(가격 x 수량 x FEE_RATE).
// 금액은 원 단위 정수, 가격은 소수 2자리 반올림 후 정수틱 연산(AGENTS.md 규칙 5).

import { weightedAvg } from "./pnl";

export const ETF_FEE_RATE = 0.00004896; // 0.004896%
export const ETF_MULTIPLIER = 1;

export type ETFDirection = "LONG" | "SHORT";

export const ETF_LABEL: Record<ETFDirection, string> = {
  LONG: "레버리지",
  SHORT: "인버스2X",
};

export interface ETFExecutionLike {
  type: "ENTRY" | "EXIT";
  price: number;
  quantity: number;
  fee?: number | null;
}

export function calcExecutionFee(price: number, quantity: number, rate = ETF_FEE_RATE): number {
  if (!(price > 0) || !(quantity > 0)) return 0;
  return Math.round(price * quantity * rate);
}

// 한 줄 입력(진입+청산, 청산수량=진입수량) → trade_executions 2건으로 변환.
// 수수료 미지정 시 매수·매도 각자 0.004896% 자동 계산.
export interface ETFSingleTradeInput {
  entryPrice: number;
  quantity: number;
  exitPrice: number;
  entryFee?: number | null;
  exitFee?: number | null;
}

export function buildETFExecutions(input: ETFSingleTradeInput, rate = ETF_FEE_RATE): ETFExecutionLike[] {
  return [
    {
      type: "ENTRY",
      price: input.entryPrice,
      quantity: input.quantity,
      fee: input.entryFee ?? calcExecutionFee(input.entryPrice, input.quantity, rate),
    },
    {
      type: "EXIT",
      price: input.exitPrice,
      quantity: input.quantity,
      fee: input.exitFee ?? calcExecutionFee(input.exitPrice, input.quantity, rate),
    },
  ];
}

export function calcETFTrade(
  executions: ETFExecutionLike[],
  rate = ETF_FEE_RATE,
) {
  const entries = executions.filter((e) => e.type === "ENTRY");
  const exits = executions.filter((e) => e.type === "EXIT");
  const e = weightedAvg(entries.map((x) => ({ price: x.price, quantity: x.quantity })));
  const x = weightedAvg(exits.map((v) => ({ price: v.price, quantity: v.quantity })));
  const qty = Math.min(e.qty, x.qty);
  // 정수틱 차액 x 수량 (승수 1)
  const toTicks = (p: number): number => Math.round(p * 100);
  const diffTicks = toTicks(x.avg) - toTicks(e.avg);
  const gross = Math.round((diffTicks * qty) / 100);
  const buyAmount = entries.reduce((a, b) => a + Math.round(b.price * b.quantity), 0);
  const sellAmount = exits.reduce((a, b) => a + Math.round(b.price * b.quantity), 0);
  const fee = executions.reduce(
    (a, b) => a + (b.fee != null ? Math.round(b.fee) : calcExecutionFee(b.price, b.quantity, rate)),
    0,
  );
  const net = gross - fee;
  return {
    avgEntry: e.avg,
    avgExit: x.avg,
    entryQty: e.qty,
    exitQty: x.qty,
    points: diffTicks / 100,
    buyAmount,
    sellAmount,
    gross,
    fee,
    net,
    returnRate: buyAmount > 0 ? (net / buyAmount) * 100 : 0,
  };
}
