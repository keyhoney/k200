const CONFIG_URL = "./strategy-config.json";
const STORAGE_KEY = "k200-strategy-config-v1";

export const CONFIG_FIELDS = [
  ["wmaPeriod", "WMA 기간", 1, 200, 1],
  ["atrPeriod", "ATR 기간", 1, 100, 1],
  ["rMin", "R 최솟값 (pt)", 0.1, 20, 0.1],
  ["rMax", "R 최댓값 (pt)", 0.1, 20, 0.1],
  ["contactTolerance", "원진입 접촉 허용폭 (pt)", 0, 5, 0.01],
  ["longSlope", "롱 기울기 기준 (pt)", 0, 5, 0.01],
  ["shortSlope", "숏 기울기 기준 (pt)", -5, 0, 0.01],
  ["entryStart", "진입 시작 (08:45 이후 분)", 0, 400, 1],
  ["entryEnd", "진입 종료 (08:45 이후 분)", 1, 420, 1],
  ["forceExit", "강제청산 (08:45 이후 분)", 2, 430, 1],
  ["quantity", "진입 계약수", 1, 20, 1],
  ["pointValue", "포인트 가치 (원)", 1, 1000000, 1000],
  ["tick", "틱 / 슬리피지 (pt)", 0.01, 1, 0.01],
  ["feeRate", "수수료율 (예: 0.00002)", 0, 0.01, 0.000001],
  ["signalValidMinutes", "3분 신호 유효시간", 1, 60, 1],
  ["originalMaxHold", "원거래 최대 보유 (분)", 1, 240, 1],
  ["reentryMaxHold", "재진입 최대 보유 (분)", 1, 120, 1],
  ["reentryWatchMinutes", "재진입 감시시간 (분)", 1, 120, 1],
  ["firstTargetR", "1차 익절 (R)", 0.01, 10, 0.01],
  ["protectR", "익절 후 보호선 (R)", 0, 10, 0.01],
  ["trailStartR", "트레일링 시작 (R)", 0.01, 20, 0.01],
  ["trailAtrMultiple", "트레일링 ATR 배수", 0, 10, 0.01],
  ["reentryStopR", "재진입 손절 (R)", 0.01, 10, 0.01],
  ["reentryTouch", "재진입 접촉 오프셋 (pt)", 0, 5, 0.01],
];

export async function loadConfig() {
  const response = await fetch(CONFIG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`전략 설정 파일을 읽지 못했습니다 (${response.status}).`);
  const data = await response.json();
  if (!data || typeof data !== "object" || !data.params || typeof data.params !== "object") {
    throw new Error("strategy-config.json 형식이 올바르지 않습니다.");
  }
  return { ...data.params };
}

export function loadOverrides() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("저장된 설정 형식이 올바르지 않습니다.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }
    throw error;
  }
}

export function saveOverrides(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config, null, 2));
}

export function clearOverrides() {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadConfig(config) {
  const blob = new Blob([`${JSON.stringify({ name: "WMA20 전략", version: 1, params: config }, null, 2)}\n`], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "strategy-config.json";
  link.click();
  URL.revokeObjectURL(link.href);
}
