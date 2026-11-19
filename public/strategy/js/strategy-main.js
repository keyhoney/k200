import {
  CONFIG_FIELDS,
  clearOverrides,
  downloadConfig,
  loadOverrides,
  saveOverrides,
} from "./strategy-config.js";

const money = (value) => `${Math.round(value).toLocaleString("ko-KR")}원`;
const price = (value) => Number(value).toFixed(2);
const percent = (value) => `${(value * 100).toFixed(1)}%`;

function showStatus(message, error = false) {
  const status = document.getElementById("status");
  status.hidden = !message;
  status.classList.toggle("error", error);
  status.textContent = message;
}

function setProgress(done, total) {
  document.getElementById("progress").style.width = total ? `${Math.round(done / total * 100)}%` : "0%";
}

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`서버 응답을 읽을 수 없습니다 (${response.status}).`);
  }
  if (!response.ok) {
    if (response.status === 401 || data?.needsLogin) throw new Error("로그인이 필요합니다. /login 에서 로그인한 뒤 새로고침하세요.");
    throw new Error(data?.error || `데이터 요청 실패 (${response.status}).`);
  }
  return data;
}

function mapBars(payload) {
  if (!Array.isArray(payload.bars)) throw new Error("서버 봉 데이터 형식이 올바르지 않습니다.");
  const base = Math.floor(new Date(`${payload.date}T08:45:00+09:00`).getTime() / 1000);
  return payload.bars.map((row) => {
    if (!Array.isArray(row) || row.length < 6 || !row.every((value) => Number.isFinite(Number(value)))) {
      throw new Error("유효하지 않은 봉 데이터가 포함되어 있습니다.");
    }
    return {
      time: base + Number(row[0]) * 60,
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[5]),
    };
  });
}

function setValue(element, value) {
  element.textContent = value;
  element.classList.toggle("positive", value.startsWith("+") || (Number(value.replace(/[^\d.-]/g, "")) > 0));
  element.classList.toggle("negative", value.startsWith("-") || (Number(value.replace(/[^\d.-]/g, "")) < 0));
  element.classList.toggle("flat", !element.classList.contains("positive") && !element.classList.contains("negative"));
}

function renderConfigFields(config) {
  const fields = document.getElementById("configFields");
  fields.replaceChildren();
  for (const [key, label, min, max, step] of CONFIG_FIELDS) {
    const wrapper = document.createElement("label");
    wrapper.className = "field";
    wrapper.textContent = label;
    const input = document.createElement("input");
    input.type = "number";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(config[key]);
    input.dataset.key = key;
    input.required = true;
    wrapper.append(input);
    fields.append(wrapper);
  }
  document.getElementById("allowReentry").checked = config.allowReentry !== false;
}

function readConfigFromForm(base) {
  const config = { ...base };
  for (const input of document.querySelectorAll("#configFields input")) {
    const value = Number(input.value);
    if (!Number.isFinite(value) || input.value.trim() === "" || value < Number(input.min) || value > Number(input.max)) {
      input.focus();
      throw new Error(`설정 범위 확인: ${input.parentElement.firstChild.textContent}`);
    }
    config[input.dataset.key] = Number.isInteger(Number(input.step)) ? Math.round(value) : value;
  }
  config.allowReentry = document.getElementById("allowReentry").checked;
  if (config.rMin > config.rMax) throw new Error("R 최솟값은 최댓값보다 클 수 없습니다.");
  if (config.entryStart > config.entryEnd || config.entryEnd >= config.forceExit) {
    throw new Error("진입 시작·종료 시각과 강제청산 시각의 순서를 확인하세요.");
  }
  return config;
}

function renderDayResult(date, result) {
  const { stats } = result;
  document.getElementById("summaryDate").textContent = date;
  setValue(document.getElementById("dayPnl"), money(stats.netPnl));
  document.getElementById("dayTrades").textContent = `${stats.total}회 · ${percent(stats.winRate)}`;
  setValue(document.getElementById("dayMdd"), money(-stats.maxDrawdown));
  const originalCount = result.positions.filter((position) => position.type === "ORIGINAL").length;
  const reentryCount = result.positions.filter((position) => position.type === "REENTRY").length;
  document.getElementById("dayTypes").textContent = `${originalCount}회 · ${reentryCount}회`;
  document.getElementById("fillCount").textContent = `${result.trades.length} 체결`;
  const tbody = document.getElementById("fills");
  tbody.replaceChildren();
  if (!result.trades.length) {
    tbody.innerHTML = '<tr><td class="empty" colspan="11">조건에 맞는 거래가 없습니다.</td></tr>';
    return;
  }
  for (const fill of [...result.trades].reverse()) {
    const row = document.createElement("tr");
    const values = [
      fill.type === "ORIGINAL" ? "원 거래" : `재진입 ${fill.reentryNumber}차`,
      fill.side === "LONG" ? "롱" : "숏",
      formatTime(fill.entryTime),
      price(fill.entryPrice),
      formatTime(fill.exitTime),
      price(fill.exitPrice),
      `${fill.quantity}계약`,
      fill.reason,
      money(fill.gross),
      money(fill.fee),
      money(fill.net),
    ];
    for (let i = 0; i < values.length; i++) {
      const cell = document.createElement("td");
      cell.textContent = values[i];
      if (i === 10) cell.className = fill.net > 0 ? "positive" : fill.net < 0 ? "negative" : "flat";
      if (i === 0) cell.style.textAlign = "left";
      row.append(cell);
    }
    tbody.append(row);
  }
}

function formatTime(epoch) {
  const date = new Date(epoch * 1000 + 9 * 60 * 60 * 1000);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function renderDashboard(rows) {
  const total = rows.reduce((sum, item) => sum + item.result.stats.netPnl, 0);
  const totalTrades = rows.reduce((sum, item) => sum + item.result.stats.total, 0);
  const wins = rows.reduce((sum, item) => sum + item.result.stats.wins, 0);
  const profitable = rows.filter((item) => item.result.stats.netPnl > 0).length;
  let equity = 0;
  let peak = 0;
  let mdd = 0;
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  for (const row of ordered) {
    equity += row.result.stats.netPnl;
    peak = Math.max(peak, equity);
    mdd = Math.max(mdd, peak - equity);
  }
  setValue(document.getElementById("allPnl"), money(total));
  setValue(document.getElementById("avgPnl"), money(rows.length ? total / rows.length : 0));
  document.getElementById("profitableDays").textContent = `${profitable} / ${rows.length}일`;
  document.getElementById("allWinRate").textContent = totalTrades ? percent(wins / totalTrades) : "0.0%";
  setValue(document.getElementById("allMdd"), money(-mdd));
  document.getElementById("dashboardCount").textContent = `${rows.length} 거래일`;
  const tbody = document.getElementById("days");
  tbody.replaceChildren();
  for (const item of [...rows].sort((a, b) => b.date.localeCompare(a.date))) {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "button";
    button.textContent = item.date;
    button.dataset.day = item.date;
    dateCell.append(button);
    row.append(dateCell);
    for (const text of [
      `${item.result.stats.total}회`,
      percent(item.result.stats.winRate),
      money(item.result.stats.netPnl),
    ]) {
      const cell = document.createElement("td");
      cell.textContent = text;
      if (text.endsWith("원")) cell.className = item.result.stats.netPnl > 0 ? "positive" : item.result.stats.netPnl < 0 ? "negative" : "flat";
      row.append(cell);
    }
    tbody.append(row);
  }
}

export async function runStrategyApp({ loadConfig, WmaStrategyEngine, StrategyCharts }) {
  let baseConfig;
  let config;
  let days = [];
  let charts;
  const cache = new Map();
  const daySelect = document.getElementById("daySelect");

  async function loadDay(date) {
    if (cache.has(date)) return cache.get(date);
    const payload = await getJson(`/api/trainer/day?date=${encodeURIComponent(date)}`);
    if (payload.date !== date) throw new Error("요청한 거래일과 응답 거래일이 일치하지 않습니다.");
    const result = new WmaStrategyEngine(mapBars(payload), config).run();
    cache.set(date, result);
    return result;
  }

  async function showDay(date) {
    showStatus(`${date} 데이터를 불러오고 전략을 적용하고 있습니다.`);
    setProgress(0, 1);
    const result = await loadDay(date);
    charts.render(result);
    renderDayResult(date, result);
    setProgress(1, 1);
    showStatus(`${date} 백테스트 완료 · ${result.bars1.length.toLocaleString("ko-KR")}개 1분봉, ${result.bars3.length.toLocaleString("ko-KR")}개 완성 3분봉`);
  }

  async function runAllDays() {
    const rows = [];
    const concurrency = 4;
    let cursor = 0;
    let completed = 0;
    let failure = null;
    setProgress(0, days.length);
    showStatus(`Supabase ${days.length}개 거래일을 백테스트하고 있습니다.`);
    const worker = async () => {
      while (cursor < days.length && !failure) {
        const index = cursor++;
        const date = days[index].date;
        try {
          rows[index] = { date, result: await loadDay(date) };
          completed++;
          setProgress(completed, days.length);
        } catch (error) {
          failure = error;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, days.length) }, worker));
    if (failure) throw failure;
    renderDashboard(rows);
    showStatus(`전체 거래일 백테스트 완료 · ${rows.length}일, ${rows.reduce((sum, row) => sum + row.result.stats.total, 0)}건 거래`);
  }

  try {
    baseConfig = await loadConfig();
    config = { ...baseConfig, ...loadOverrides() };
    renderConfigFields(config);
    charts = new StrategyCharts();
    const response = await getJson("/api/trainer/days");
    days = response.days;
    if (!Array.isArray(days) || days.length === 0) throw new Error("백테스트할 거래일이 없습니다.");
    for (const day of days) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(day.count)) {
        throw new Error("거래일 목록 응답 형식이 올바르지 않습니다.");
      }
      const option = document.createElement("option");
      option.value = day.date;
      option.textContent = `${day.date} · ${day.count}봉`;
      daySelect.append(option);
    }
    await showDay(days[0].date);
  } catch (error) {
    showStatus(error.message || "전략 백테스트 앱을 초기화하지 못했습니다.", true);
    return;
  }

  document.getElementById("runDay").addEventListener("click", async () => {
    try { await showDay(daySelect.value); } catch (error) { showStatus(error.message, true); }
  });
  document.getElementById("runAll").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await runAllDays(); } catch (error) { showStatus(error.message, true); }
    finally { button.disabled = false; }
  });
  document.getElementById("saveConfig").addEventListener("click", async () => {
    try {
      config = readConfigFromForm(baseConfig);
      saveOverrides(config);
      cache.clear();
      await showDay(daySelect.value);
      document.getElementById("dashboardCount").textContent = "설정 변경됨 · 전체 일자 재실행 필요";
    } catch (error) { showStatus(error.message, true); }
  });
  document.getElementById("downloadConfig").addEventListener("click", () => {
    try { downloadConfig(readConfigFromForm(baseConfig)); } catch (error) { showStatus(error.message, true); }
  });
  document.getElementById("resetConfig").addEventListener("click", async () => {
    clearOverrides();
    config = { ...baseConfig };
    cache.clear();
    renderConfigFields(config);
    try { await showDay(daySelect.value); } catch (error) { showStatus(error.message, true); }
  });
  document.getElementById("days").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-day]");
    if (!button) return;
    daySelect.value = button.dataset.day;
    try { await showDay(button.dataset.day); } catch (error) { showStatus(error.message, true); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
