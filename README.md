# K200 Trading Journal (코스피200 선물 매매 복기 일지)

개인용 웹앱. 자동주문 없음. 수동 입력 + 1분봉 복기 + 태그/감정 축적.

상세 명세: `Agnet.md` (정본). 요약 문서는 `docs/` 참조.

## Cloudflare Pages

- 추천 프로젝트명: **`k200-trading-journal`** (소문자+하이픈, Pages 명명규칙 충족, 저장소명과 일치)
- Framework preset: Next.js, Build: `npm run build`, Output: `.next` (Pages는 `next-on-pages` 불필요 — 표준 Next.js를 Pages Full-stack으로 배포하거나, 정적 export가 필요하면 추후 분기)
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 등록 (Service Role / KIS 키는 Pages에 등록 금지 → GitHub Secrets 전용)

## 로컬 실행

```powershell
cd C:\dev\kis_api\K200TradingJournal
npm install
cp .env.example .env.local  # 값 채우기 (이미 .env.local 존재 시 확인만)
npm run dev  # http://localhost:3000
```

## 검사

```powershell
npm run typecheck
npm run lint
npm test
```

## Supabase

- SQL: `supabase/migrations/0001_init.sql`을 Supabase Dashboard → SQL Editor에 순서대로 실행 (또는 `supabase db push`)
- Auth: Dashboard에서 사용자 1명 수동 생성, 공개 회원가입 UI 없음
- URL 확인: `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`이 `supabase.txt` ref와 일치하는지 대시보드에서 확인 필요
