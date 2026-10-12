"use client";

import { useEffect, useRef, useState } from "react";
import type { Bar } from "@/lib/bars";
import { wma, sma, toLineData } from "@/lib/indicators";
import { formatKSTDate, formatKSTTime } from "@/lib/kst";
import type { TickMarkType, Time, UTCTimestamp } from "lightweight-charts";

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
  const [showSma, setShowSma] = useState(true);
  const [showWma, setShowWma] = useState(true);

  useEffect(() => {
    let teardown: (() => void) | null = null;
    let alive = true;
    (async () => {
      const { createChart, CandlestickSeries, HistogramSeries, LineSeries, createSeriesMarkers } =
        await import("lightweight-charts");
      if (!alive || !ref.current) return;
      const el = ref.current;
      // 시간축·크로스헤어 모두 Asia/Seoul 고정 (브라우저 TZ 무관).
      // TickMarkType: 0 Year, 1 Month, 2 DayOfMonth, 3 Time, 4 TimeWithSeconds
      const kstTick = (time: Time, tickMarkType: TickMarkType): string | null => {
        if (typeof time !== "number") return null;
        const ms = time * 1000;
        return tickMarkType >= 3 ? formatKSTTime(ms) : formatKSTDate(ms);
      };
      const chart = createChart(el, {
        width: el.clientWidth,
        height: 420,
        timeScale: { timeVisible: true, secondsVisible: false, tickMarkFormatter: kstTick },
        localization: { timeFormatter: (t: number) => formatKSTTime(t * 1000) },
      });
      const candles = chart.addSeries(CandlestickSeries, {
        priceScaleId: "right",
        // 한국식: 상승 붉은색, 하락 푸른색
        upColor: "#ef4444",
        downColor: "#3b82f6",
        borderUpColor: "#ef4444",
        borderDownColor: "#3b82f6",
        wickUpColor: "#ef4444",
        wickDownColor: "#3b82f6",
      });
      candles.setData(
        bars.map((b) => ({ ...b, time: b.time as UTCTimestamp })),
      );
      // 가격 스케일은 상단, 거래량은 하단 별도 스케일로 분리 (겹침 방지)
      chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.05, bottom: 0.32 } });
      const vol = chart.addSeries(HistogramSeries, {
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
      });
      vol.setData(
        bars.map((b) => ({
          time: b.time as UTCTimestamp,
          value: b.volume,
          color: b.close >= b.open ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.5)",
        })),
      );
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      // 이동평균선 (종가 기준, 가격 스케일 공유)
      const times = bars.map((b) => b.time);
      const closes = bars.map((b) => b.close);
      if (showSma) {
        const smaLine = chart.addSeries(LineSeries, {
          priceScaleId: "right",
          color: "#f59e0b",
          lineWidth: 1,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        });
        smaLine.setData(
          toLineData(times, sma(closes, 20)).map((p) => ({ ...p, time: p.time as UTCTimestamp })),
        );
      }
      if (showWma) {
        const wmaLine = chart.addSeries(LineSeries, {
          priceScaleId: "right",
          color: "#8b5cf6",
          lineWidth: 1,
          priceLineVisible: false,
          crosshairMarkerVisible: false,
        });
        wmaLine.setData(
          toLineData(times, wma(closes, 20)).map((p) => ({ ...p, time: p.time as UTCTimestamp })),
        );
      }
      if (markers.length > 0) {
        createSeriesMarkers(
          candles,
          markers.map((m) => ({
            ...m,
            time: m.time as UTCTimestamp,
          })),
        );
      }
      // 하루치 전체가 한 화면에 들어오도록 맞춤
      chart.timeScale().fitContent();
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
  }, [bars, markers, showSma, showWma]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setShowSma((v) => !v)}
          className={`rounded border px-2 py-0.5 ${showSma ? "" : "opacity-50"}`}
          aria-pressed={showSma}
        >
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#f59e0b" }} />
          SMA20
        </button>
        <button
          type="button"
          onClick={() => setShowWma((v) => !v)}
          className={`rounded border px-2 py-0.5 ${showWma ? "" : "opacity-50"}`}
          aria-pressed={showWma}
        >
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#8b5cf6" }} />
          WMA20
        </button>
      </div>
      <div ref={ref} className="w-full" aria-label="1분봉 차트" />
    </div>
  );
}
