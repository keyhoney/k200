const formatTime = (time) => {
  const date = new Date(time * 1000 + 9 * 60 * 60 * 1000);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
};

export class StrategyCharts {
  constructor() {
    if (!window.LightweightCharts) throw new Error("차트 라이브러리를 불러오지 못했습니다.");
    this.instances = [];
    this.oneMinute = this.create(document.getElementById("chart1"));
    this.threeMinute = this.create(document.getElementById("chart3"));
  }

  create(element) {
    const library = window.LightweightCharts;
    const chart = library.createChart(element, {
      width: element.clientWidth,
      height: element.clientHeight,
      layout: { background: { color: "#111827" }, textColor: "#a9b7cb" },
      grid: { vertLines: { color: "#202b3b" }, horzLines: { color: "#202b3b" } },
      rightPriceScale: { borderColor: "#344054" },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#344054",
        tickMarkFormatter: (time) => formatTime(Number(time)),
      },
      localization: { timeFormatter: formatTime, priceFormatter: (price) => price.toFixed(2) },
      crosshair: { mode: library.CrosshairMode.Normal },
    });
    const candles = chart.addSeries(library.CandlestickSeries, {
      upColor: "#ef5350", downColor: "#4b9bfa",
      borderUpColor: "#ef5350", borderDownColor: "#4b9bfa",
      wickUpColor: "#ef5350", wickDownColor: "#4b9bfa",
    });
    const wma = chart.addSeries(library.LineSeries, {
      color: "#b28cff", lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
    });
    const observer = new ResizeObserver(() => chart.applyOptions({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element);
    this.instances.push({ chart, candles, wma, observer });
    return { chart, candles, wma };
  }

  render(result) {
    const markers1 = result.events.map((event) => ({
      time: event.time,
      position: event.type === "ENTRY"
        ? event.side === "LONG" ? "belowBar" : "aboveBar"
        : event.side === "LONG" ? "aboveBar" : "belowBar",
      color: event.side === "LONG" ? "#ff7278" : "#69aaff",
      shape: event.type === "ENTRY"
        ? event.side === "LONG" ? "arrowUp" : "arrowDown"
        : "circle",
      text: event.label,
    })).sort((a, b) => a.time - b.time);
    this.setChart(this.oneMinute, result.bars1, result.wma1, markers1);

    const bars3 = result.bars3;
    const markers3 = markers1.map((marker) => {
      const start = bars3.find((bar) => marker.time >= bar.time && marker.time < bar.endTime);
      return start ? { ...marker, time: start.time } : null;
    }).filter(Boolean).sort((a, b) => a.time - b.time);
    this.setChart(this.threeMinute, bars3, result.wma3, markers3);
  }

  setChart(series, bars, averages, markers) {
    series.candles.setData(bars.map((bar) => ({
      time: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    })));
    series.wma.setData(bars.flatMap((bar, index) =>
      averages[index] == null ? [] : [{ time: bar.time, value: averages[index] }]));
    window.LightweightCharts.createSeriesMarkers(series.candles, markers);
    series.chart.timeScale().fitContent();
  }

  clear() {
    for (const series of [this.oneMinute, this.threeMinute]) {
      series.candles.setData([]);
      series.wma.setData([]);
      window.LightweightCharts.createSeriesMarkers(series.candles, []);
    }
  }

  destroy() {
    for (const { chart, observer } of this.instances) {
      observer.disconnect();
      chart.remove();
    }
  }
}
