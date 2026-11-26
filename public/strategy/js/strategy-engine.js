const DEFAULTS = {
  wmaPeriod: 20,
  atrPeriod: 14,
  rMin: 2.5,
  rMax: 4,
  contactTolerance: 0.2,
  longSlope: 0.05,
  shortSlope: -0.05,
  entryStart: 45,
  entryEnd: 385,
  forceExit: 409,
  quantity: 2,
  pointValue: 50000,
  tick: 0.02,
  feeRate: 0.0000185,
  signalValidMinutes: 15,
  originalMaxHold: 60,
  reentryMaxHold: 30,
  reentryWatchMinutes: 30,
  firstTargetR: 0.55,
  protectR: 0.15,
  trailStartR: 1.5,
  trailAtrMultiple: 0.25,
  reentryStopR: 0.25,
  reentryTouch: 0.02,
  allowReentry: true,
};

const roundPrice = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const roundWon = (value) => Math.round(value);
const toCents = (price) => Math.round(price * 100);
const addPoints = (price, points) => (toCents(price) + Math.round(points * 100)) / 100;

export function calculateWma(values, period) {
  const result = Array(values.length).fill(null);
  if (!Number.isInteger(period) || period < 1) return result;
  const divisor = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i++) {
    let total = 0;
    for (let j = 0; j < period; j++) total += values[i - period + 1 + j] * (j + 1);
    result[i] = Math.round((total / divisor) * 10000) / 10000;
  }
  return result;
}

export function aggregateCompleted3m(bars) {
  const groups = new Map();
  for (const bar of bars) {
    const minute = Math.round(bar.time / 60);
    const startMinute = Math.floor(minute / 3) * 3;
    const group = groups.get(startMinute) ?? [];
    group.push(bar);
    groups.set(startMinute, group);
  }
  const result = [];
  for (const [startMinute, group] of groups) {
    group.sort((a, b) => a.time - b.time);
    if (
      group.length !== 3 ||
      group[0].time !== startMinute * 60 ||
      group[1].time !== (startMinute + 1) * 60 ||
      group[2].time !== (startMinute + 2) * 60
    ) continue;
    result.push({
      time: startMinute * 60,
      endTime: (startMinute + 3) * 60,
      startMinute,
      endMinute: startMinute + 3,
      open: group[0].open,
      high: Math.max(...group.map((bar) => bar.high)),
      low: Math.min(...group.map((bar) => bar.low)),
      close: group[2].close,
      volume: group.reduce((sum, bar) => sum + bar.volume, 0),
    });
  }
  return result.sort((a, b) => a.time - b.time);
}

function calculateAtr(bars, period) {
  const result = Array(bars.length).fill(null);
  const ranges = bars.map((bar, i) => {
    if (i === 0) return bar.high - bar.low;
    const previousClose = bars[i - 1].close;
    return Math.max(bar.high - bar.low, Math.abs(bar.high - previousClose), Math.abs(bar.low - previousClose));
  });
  for (let i = period - 1; i < bars.length; i++) {
    const average = ranges.slice(i - period + 1, i + 1).reduce((sum, range) => sum + range, 0) / period;
    result[i] = Math.round(average * 10000) / 10000;
  }
  return result;
}

function normalizedConfig(config) {
  const result = { ...DEFAULTS, ...config };
  for (const key of ["wmaPeriod", "atrPeriod", "quantity", "pointValue"]) {
    if (!Number.isInteger(result[key]) || result[key] <= 0) {
      throw new Error(`전략 설정 ${key} 값은 양의 정수여야 합니다.`);
    }
  }
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof DEFAULTS[key] === "number" && (!Number.isFinite(result[key]) || result[key] < 0 && !["shortSlope"].includes(key))) {
      throw new Error(`전략 설정 ${key} 값이 올바르지 않습니다.`);
    }
  }
  if (
    result.rMin > result.rMax ||
    result.tick <= 0 ||
    result.entryStart > result.entryEnd ||
    result.forceExit <= result.entryEnd ||
    typeof result.allowReentry !== "boolean"
  ) {
    throw new Error("전략 설정의 손익비, 틱 또는 거래 시간이 올바르지 않습니다.");
  }
  return result;
}

function entryPrice(bar, wma, side, cfg) {
  const base = bar.low <= wma && wma <= bar.high
    ? wma
    : Math.abs(bar.low - wma) < Math.abs(bar.high - wma) ? bar.low : bar.high;
  return addPoints(base, side === "LONG" ? cfg.tick : -cfg.tick);
}

function adverseStopPrice(bar, side, stop, tick) {
  const level = side === "LONG" ? Math.min(stop, bar.open) : Math.max(stop, bar.open);
  return addPoints(level, side === "LONG" ? -tick : tick);
}

export class WmaStrategyEngine {
  constructor(bars1m, config = {}) {
    this.bars = [...bars1m].sort((a, b) => a.time - b.time);
    this.cfg = normalizedConfig(config);
  }

  run() {
    const cfg = this.cfg;
    const bars = this.bars;
    if (!bars.length) return this.emptyResult();
    const closes = bars.map((bar) => bar.close);
    const wma1 = calculateWma(closes, cfg.wmaPeriod);
    const atr1 = calculateAtr(bars, cfg.atrPeriod);
    const bars3 = aggregateCompleted3m(bars);
    const wma3 = calculateWma(bars3.map((bar) => bar.close), cfg.wmaPeriod);
    const trades = [];
    const events = [];
    const positions = [];
    const signalHistory = [];
    let currentSignal = null;
    let position = null;
    let reentryWatch = null;
    let nextPositionId = 1;
    let nextSignalId = 1;
    let bar3Index = -1;
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    const emitExit = (p, bar, price, reason, quantity) => {
      const direction = p.side === "LONG" ? 1 : -1;
      const gross = roundWon((toCents(price) - toCents(p.entry)) * direction * quantity * cfg.pointValue / 100);
      const entryFee = cfg.feeRate * toCents(p.entry) * cfg.pointValue * quantity / 100;
      const exitFee = cfg.feeRate * toCents(price) * cfg.pointValue * quantity / 100;
      const fee = roundWon(entryFee + exitFee);
      const net = gross - fee;
      const fill = {
        tradeId: p.id,
        type: p.type,
        side: p.side,
        reentryNumber: p.reentryNumber,
        entryTime: p.entryTime,
        entryPrice: p.entry,
        exitTime: bar.time,
        exitPrice: price,
        quantity,
        reason,
        gross,
        fee,
        net,
        r: p.r,
      };
      trades.push(fill);
      events.push({
        type: "EXIT",
        side: p.side,
        time: bar.time,
        price,
        quantity,
        reason,
        tradeId: p.id,
        label: `${p.side === "LONG" ? "L" : "S"}X${p.type === "REENTRY" ? p.reentryNumber : ""}`,
      });
      p.realizedNet += net;
      p.remaining -= quantity;
      equity += net;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
      if (p.remaining === 0) {
        positions.push({
          id: p.id,
          type: p.type,
          side: p.side,
          reentryNumber: p.reentryNumber,
          entryTime: p.entryTime,
          exitTime: bar.time,
          entryPrice: p.entry,
          net: p.realizedNet,
          reason,
        });
      }
    };

    const createPosition = (side, bar, price, i, r, atr, type, reentryNumber, originId) => {
      const p = {
        id: `T${nextPositionId++}`,
        type,
        side,
        reentryNumber,
        originId,
        entry: roundPrice(price),
        entryTime: bar.time,
        entryMinute: Math.round(bar.time / 60),
        entryIndex: i,
        r,
        atr,
        remaining: cfg.quantity,
        firstDone: false,
        firstExitIndex: -1,
        trailActive: false,
        trailLine: null,
        favorableExtreme: side === "LONG" ? -Infinity : Infinity,
        realizedNet: 0,
      };
      position = p;
      events.push({
        type: "ENTRY",
        side,
        time: bar.time,
        price: p.entry,
        quantity: cfg.quantity,
        tradeId: p.id,
        label: type === "REENTRY" ? `재진입 ${reentryNumber}` : side === "LONG" ? "원 롱" : "원 숏",
      });
      return p;
    };

    const closeRemaining = (p, bar, reason, fillPrice = bar.close) => {
      const price = addPoints(fillPrice, p.side === "LONG" ? -cfg.tick : cfg.tick);
      emitExit(p, bar, price, reason, p.remaining);
    };

    const completedReversal = (side, index, minute) => {
      const current = bars3[index];
      const value = wma3[index];
      if (value == null || index < 1 || current.endMinute > minute) return false;
      const slope = value - (wma3[index - 1] ?? value);
      return side === "LONG"
        ? current.close < value && slope <= 0
        : current.close > value && slope >= 0;
    };

    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const minute = Math.round(bar.time / 60);
      const minuteOfDay = (minute + 9 * 60) % 1440;
      const w = wma1[i];
      const atr = atr1[i];

      while (bar3Index + 1 < bars3.length && bars3[bar3Index + 1].endMinute <= minute) {
        bar3Index++;
        const index = bar3Index;
        if (index < 1 || wma3[index] == null || wma3[index - 1] == null) continue;
        const previous = bars3[index - 1];
        const current = bars3[index];
        if (current.startMinute - previous.startMinute !== 3) continue;
        let side = null;
        if (previous.close <= wma3[index - 1] && current.close > wma3[index]) side = "LONG";
        else if (previous.close >= wma3[index - 1] && current.close < wma3[index]) side = "SHORT";
        if (side) {
          currentSignal = {
            id: nextSignalId++,
            side,
            confirmedMinute: current.endMinute,
            consumed: false,
          };
          signalHistory.push({ ...currentSignal });
        }
      }

      const minutesFromOpen = minuteOfDay - (8 * 60 + 45);
      const allowedEntryTime = minutesFromOpen >= cfg.entryStart && minutesFromOpen <= cfg.entryEnd;
      const signalValid = currentSignal && !currentSignal.consumed &&
        minute - currentSignal.confirmedMinute >= 0 &&
        minute - currentSignal.confirmedMinute <= cfg.signalValidMinutes;
      const contact = w != null && bar.low <= w + cfg.contactTolerance && bar.high >= w - cfg.contactTolerance;
      const slope1 = i > 0 && w != null && wma1[i - 1] != null ? w - wma1[i - 1] : null;
      const primarySide = signalValid && allowedEntryTime && contact && atr != null
        ? currentSignal.side === "LONG" && slope1 >= cfg.longSlope ||
          currentSignal.side === "SHORT" && slope1 <= cfg.shortSlope ? currentSignal.side : null
        : null;

      if (position && position.type === "REENTRY" && primarySide) {
        const p = position;
        closeRemaining(p, bar, "원 전략 신호");
        position = null;
        reentryWatch = null;
        continue;
      }

      if (!position && primarySide) {
        const side = currentSignal.side;
        currentSignal.consumed = true;
        reentryWatch = null;
        const r = Math.max(cfg.rMin, Math.min(cfg.rMax, atr));
        createPosition(side, bar, entryPrice(bar, w, side, cfg), i, r, atr, "ORIGINAL", 0, null);
      }

      if (position) {
        const p = position;
        const elapsed = minute - p.entryMinute;
        const forceExit = minutesFromOpen >= cfg.forceExit;
        if (forceExit) {
          closeRemaining(p, bar, "당일 강제청산");
          if (p.type === "REENTRY") reentryWatch = null;
          position = null;
          continue;
        }

        const stopDistance = p.type === "REENTRY" ? cfg.reentryStopR * p.r : p.r;
        const initialStop = addPoints(p.entry, p.side === "LONG" ? -stopDistance : stopDistance);
        const target = addPoints(p.entry, p.side === "LONG" ? cfg.firstTargetR * p.r : -cfg.firstTargetR * p.r);
        const stopHit = p.side === "LONG" ? bar.low <= initialStop : bar.high >= initialStop;
        const targetHit = p.side === "LONG" ? bar.high >= target : bar.low <= target;

        if (!p.firstDone) {
          if (stopHit) {
            emitExit(p, bar, adverseStopPrice(bar, p.side, initialStop, cfg.tick), "최초 손절", p.remaining);
            position = null;
            reentryWatch = null;
            continue;
          }
          if (targetHit) {
            const targetFill = addPoints(target, p.side === "LONG" ? -cfg.tick : cfg.tick);
            emitExit(p, bar, targetFill, "1차 목표", 1);
            p.firstDone = true;
            p.firstExitIndex = i;
            p.favorableExtreme = p.side === "LONG"
              ? Math.max(p.favorableExtreme, bar.high)
              : Math.min(p.favorableExtreme, bar.low);
            continue;
          }
        } else {
          const protectedStop = addPoints(p.entry, p.side === "LONG" ? cfg.protectR * p.r : -cfg.protectR * p.r);
          const protectionApplies = i > p.firstExitIndex;
          const protectHit = protectionApplies &&
            (p.side === "LONG" ? bar.low <= protectedStop : bar.high >= protectedStop);
          const activation = addPoints(p.entry, p.side === "LONG" ? cfg.trailStartR * p.r : -cfg.trailStartR * p.r);
          const activationHit = p.side === "LONG" ? bar.high >= activation : bar.low <= activation;
          if (!p.trailActive && activationHit) {
            p.trailActive = true;
            p.trailLine = activation;
          }
          if (p.side === "LONG") p.trailLine = p.trailActive
            ? Math.max(p.trailLine, activation, addPoints(p.favorableExtreme, -p.atr * cfg.trailAtrMultiple))
            : null;
          else p.trailLine = p.trailActive
            ? Math.min(p.trailLine, activation, addPoints(p.favorableExtreme, p.atr * cfg.trailAtrMultiple))
            : null;
          const trailHit = p.trailActive &&
            (p.side === "LONG" ? bar.low <= p.trailLine : bar.high >= p.trailLine);
          if (trailHit || protectHit) {
            const useTrail = trailHit;
            const stop = useTrail ? p.trailLine : protectedStop;
            emitExit(p, bar, adverseStopPrice(bar, p.side, stop, cfg.tick),
              useTrail ? "트레일링 청산" : "이익 보호 손절", p.remaining);
            const canContinueChain = p.type === "REENTRY"
              ? p.realizedNet > 0
              : useTrail;
            reentryWatch = canContinueChain && cfg.allowReentry && minutesFromOpen < cfg.entryEnd
              ? {
                side: p.side,
                originId: p.originId ?? p.id,
                r: p.r,
                atr: p.atr,
                reentryNumber: p.reentryNumber + 1,
                untilMinute: minute + cfg.reentryWatchMinutes,
              }
              : null;
            position = null;
            continue;
          }
        }

        const reversal = p.type === "ORIGINAL" && completedReversal(p.side, bar3Index, minute);
        const maxHold = p.type === "REENTRY" ? cfg.reentryMaxHold : cfg.originalMaxHold;
        if (reversal || elapsed >= maxHold) {
          const reason = reversal ? "3분봉 반대 전환" : "보유시간 만료";
          closeRemaining(p, bar, reason);
          const chainContinues = p.type === "REENTRY" && p.realizedNet > 0 &&
            cfg.allowReentry && minutesFromOpen < cfg.entryEnd;
          reentryWatch = chainContinues
            ? {
              side: p.side,
              originId: p.originId,
              r: p.r,
              atr: p.atr,
              reentryNumber: p.reentryNumber + 1,
              untilMinute: minute + cfg.reentryWatchMinutes,
            }
            : null;
          position = null;
          continue;
        }
        p.favorableExtreme = p.side === "LONG"
          ? Math.max(p.favorableExtreme, bar.high)
          : Math.min(p.favorableExtreme, bar.low);
        continue;
      }

      if (reentryWatch) {
        if (minute >= reentryWatch.untilMinute || minutesFromOpen >= cfg.entryEnd) {
          reentryWatch = null;
        } else if (primarySide) {
          reentryWatch = null;
        } else if (w != null && i >= 3 && wma1[i - 3] != null) {
          const side = reentryWatch.side;
          const touch = addPoints(w, side === "LONG" ? cfg.reentryTouch : -cfg.reentryTouch);
          const trend = side === "LONG" ? w > wma1[i - 3] : w < wma1[i - 3];
          if (trend && bar.low <= touch && touch <= bar.high) {
            const watch = reentryWatch;
            createPosition(side, bar, touch, i, watch.r, watch.atr, "REENTRY", watch.reentryNumber, watch.originId);
            position.favorableExtreme = side === "LONG" ? bar.high : bar.low;
            reentryWatch = null;
          }
        }
      }
    }

    if (position) closeRemaining(position, bars[bars.length - 1], "데이터 종료");
    const totalNet = trades.reduce((sum, trade) => sum + trade.net, 0);
    const winners = positions.filter((item) => item.net > 0).length;
    return {
      bars1: bars,
      bars3,
      wma1,
      wma3,
      atr1,
      trades,
      events,
      positions,
      signalHistory,
      stats: {
        total: positions.length,
        wins: winners,
        losses: positions.filter((item) => item.net < 0).length,
        winRate: positions.length ? winners / positions.length : 0,
        netPnl: totalNet,
        maxDrawdown,
      },
    };
  }

  emptyResult() {
    return {
      bars1: [],
      bars3: [],
      wma1: [],
      wma3: [],
      atr1: [],
      trades: [],
      events: [],
      positions: [],
      signalHistory: [],
      stats: { total: 0, wins: 0, losses: 0, winRate: 0, netPnl: 0, maxDrawdown: 0 },
    };
  }
}
