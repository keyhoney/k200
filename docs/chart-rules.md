# Chart rules (Agnet.md §7 요약)

- 캔들 + 거래량 히스토그램, KST 표시, 줌/이동
- 마커: 롱진입 녹색▲(L1..) 아래 / 롱청산 파랑(LX) 위 / 숏진입 빨강▼(S) 위 / 숏청산 주황(SX) 아래
- 색+모양+문자 병행 (색만 구분 금지)
- 동일 묶음 평균가 점선 연결, 보유구간 음영 (롱 연녹 / 숏 연적)
- 마커 호버: 방향/구분/시각/가격/수량/메모, 클릭: 상세 패널
- 구현: `src/components/KChart.tsx` (lightweight-charts v5: addSeries + createSeriesMarkers, UTCTimestamp 캐스팅)
