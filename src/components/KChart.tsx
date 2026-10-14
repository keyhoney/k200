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
  tradeId?: string;
}

export interface TradeLine {
  tradeId: string;
  direction: "LONG" | "SHORT";
  entryTime: number;
  exitTime: number;
}

// Agnet.md §7: L/LX/S/SX + 색+모양 병행. 색만으로 구분하지 않음.
// 주의: 차트는 선물 1분봉, 거래는 ETF(레버리지/인버스2X)라 가격 스케일이 다르다.
// 따라서 진입·청산 가격을 차트에 그리지 않는다 — 시간 기반(마커·구간)만 표시.
export default function KChart({
  bars,
  markers = [],
  lines = [],
  onSelectTrade,
  onPickBar,
  selectedTradeId,
}: {
  bars: Bar[];
  markers?: TradeMarker[];
  lines?: TradeLine[];
  onSelectTrade?: (tradeId: string) => void;
  onPickBar?: (bar: Bar) => void;
  selectedTradeId?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{ fit: () => void; focusRange: (a: number, b: number) => void } | null>(null);
  const cbRef = useRef({ onSelectTrade, onPickBar });
  cbRef.current = { onSelectTrade, onPickBar };
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
        upColor: "#ef4444",
        downColor: "#3b82f6",
        borderUpColor: "#ef4444",
        borderDownColor: "#3b82f6",
        wickUpColor: "#ef4444",
        wickDownColor: "#3b82f6",
      });
      candles.setData(bars.map((b) => ({ ...b, time: b.time as UTCTimestamp })));
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
      const times = bars.map((b) => b.time);
      const closes = bars.map((b) => b.close);
      if (showSma) {
        const smaLine = chart.addSeries(LineSeries, {
          priceScaleId: "right", color: "#f59e0b", lineWidth: 1,
          priceLineVisible: false, crosshairMarkerVisible: false,
        });
        smaLine.setData(toLineData(times, sma(closes, 20)).map((p) => ({ ...p, time: p.time as UTCTimestamp })));
      }
      if (showWma) {
        const wmaLine = chart.addSeries(LineSeries, {
          priceScaleId: "right", color: "#8b5cf6", lineWidth: 1,
          priceLineVisible: false, crosshairMarkerVisible: false,
        });
        wmaLine.setData(toLineData(times, wma(closes, 20)).map((p) => ({ ...p, time: p.time as UTCTimestamp })));
      }
      // 진입·청산 가격선은 그리지 않음 (선물 차트 vs ETF 체결가 스케일 불일치).
      // 거래별 시간 구간 이동은 focusRange(전체 보기/거래 구간 보기)로 제공.
      if (markers.length > 0) {
        createSeriesMarkers(
          candles,
          markers.map((m) => ({ ...m, time: m.time as UTCTimestamp })),
        );
      }
      chart.timeScale().fitContent();
      chartRef.current = {
        fit: () => chart.timeScale().fitContent(),
        focusRange: (a: number, b: number) => {
          const pad = Math.max(120, Math.floor((b - a) * 0.2));
          chart.timeScale().setVisibleRange({ from: (a - pad) as UTCTimestamp, to: (b + pad) as UTCTimestamp });
        },
      };
      // 클릭: 마커 시간과 일치하면 거래 선택, 아니면 봉 선택(입력 자동채움)
      chart.subscribeClick((param) => {
        const t = param.time;
        if (typeof t !== "number") return;
        const hit = markers.find((m) => m.time === t && m.tradeId);
        if (hit?.tradeId) {
          cbRef.current.onSelectTrade?.(hit.tradeId);
          return;
        }
        const bar = bars.find((b) => b.time === t);
        if (bar) cbRef.current.onPickBar?.(bar);
      });
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

  const selected = lines.find((l) => l.tradeId === selectedTradeId);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 text-xs flex-wrap items-center">
        <button type="button" onClick={() => setShowSma((v) => !v)}
          className={`rounded-lg border px-2.5 py-1 font-medium transition ${showSma ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" : "border-zinc-300 dark:border-zinc-700 opacity-50"}`} aria-pressed={showSma}>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: "#f59e0b" }} />SMA20
        </button>
        <button type="button" onClick={() => setShowWma((v) => !v)}
          className={`rounded-lg border px-2.5 py-1 font-medium transition ${showWma ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30" : "border-zinc-300 dark:border-zinc-700 opacity-50"}`} aria-pressed={showWma}>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: "#8b5cf6" }} />WMA20
        </button>
        <button type="button" onClick={() => chartRef.current?.fit()} className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800">전체 보기</button>
        <button type="button" disabled={!selected} onClick={() => selected && chartRef.current?.focusRange(selected.entryTime, selected.exitTime)}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50">거래 구간 보기</button>
        <span className="text-zinc-400 dark:text-zinc-500 text-[11px]">선물 참고용 차트 · 마커 클릭 시 상세 열림 · 차트 클릭 시 시각만 입력에 반영(ETF 가격은 직접 입력)</span>
      </div>
      <div ref={ref} className="w-full" aria-label="1분봉 차트" />
    </div>
  );
}
