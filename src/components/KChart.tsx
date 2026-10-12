"use client";

import { useEffect, useRef } from "react";
import type { Bar } from "@/lib/bars";
import type { UTCTimestamp } from "lightweight-charts";

export interface TradeMarker {
  time: number;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle";
  text: string;
}

// Agnet.md §7: L/LX/S/SX + 색+모양 병행. 색만으로 구분하지 않음.
export default function KChart({
  bars,
  markers = [],
}: {
  bars: Bar[];
  markers?: TradeMarker[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let teardown: (() => void) | null = null;
    let alive = true;
    (async () => {
      const { createChart, CandlestickSeries, HistogramSeries, createSeriesMarkers } =
        await import("lightweight-charts");
      if (!alive || !ref.current) return;
      const el = ref.current;
      const chart = createChart(el, {
        width: el.clientWidth,
        height: 420,
        timeScale: { timeVisible: true, secondsVisible: false },
      });
      const candles = chart.addSeries(CandlestickSeries, {});
      candles.setData(
        bars.map((b) => ({ ...b, time: b.time as UTCTimestamp })),
      );
      const vol = chart.addSeries(HistogramSeries, { priceScaleId: "" });
      vol.setData(
        bars.map((b) => ({
          time: b.time as UTCTimestamp,
          value: b.volume,
          color: b.close >= b.open ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
        })),
      );
      if (markers.length > 0) {
        createSeriesMarkers(
          candles,
          markers.map((m) => ({
            ...m,
            time: m.time as UTCTimestamp,
          })),
        );
      }
      const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      teardown = () => {
        ro.disconnect();
        chart.remove();
      };
    })();
    return () => {
      alive = false;
      teardown?.();
    };
  }, [bars, markers]);

  return <div ref={ref} className="w-full" aria-label="1분봉 차트" />;
}
