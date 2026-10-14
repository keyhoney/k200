// 체결 → 차트 마커 변환 (Agnet.md §7.2)
// LONG+ENTRY: 아래 녹색▲ L1.. / LONG+EXIT: 위 파랑● LX1.. / SHORT+ENTRY: 위 빨강▼ S1.. / SHORT+EXIT: 아래 주황● SX1..
import type { TradeMarker } from "@/components/KChart";

export interface MarkerInput {
  direction: "LONG" | "SHORT";
  type: "ENTRY" | "EXIT";
  executedAt: string; // ISO with offset
  tradeIndex?: number;
  tradeId?: string;
}

export function toMarkers(
  executions: MarkerInput[],
  perTradeNumbering = true,
): TradeMarker[] {
  const counters = { L: 0, LX: 0, S: 0, SX: 0 };
  return executions.map((e) => {
    const time = Math.floor(new Date(e.executedAt).getTime() / 1000);
    void perTradeNumbering;
    if (e.direction === "LONG" && e.type === "ENTRY") {
      counters.L += 1;
      return { time, position: "belowBar", color: "#16a34a", shape: "arrowUp", text: `L${counters.L}` } as TradeMarker;
    }
    if (e.direction === "LONG" && e.type === "EXIT") {
      counters.LX += 1;
      return { time, position: "aboveBar", color: "#2563eb", shape: "circle", text: `LX${counters.LX}` } as TradeMarker;
    }
    if (e.direction === "SHORT" && e.type === "ENTRY") {
      counters.S += 1;
      return { time, position: "aboveBar", color: "#dc2626", shape: "arrowDown", text: `S${counters.S}` } as TradeMarker;
    }
    counters.SX += 1;
    return { time, position: "belowBar", color: "#ea580c", shape: "circle", text: `SX${counters.SX}` } as TradeMarker;
  });
}
