# 프로젝트 개발 규칙

## 프로젝트 목적

이 프로젝트는 코스피200 선물 매매를 복기하는 개인용 매매일지다.
자동주문이나 투자 추천 기능은 만들지 않는다.

## 기술 스택

- Next.js (App Router, `src/app`, Route Handlers는 `route.ts`)
- TypeScript
- Tailwind CSS
- shadcn/ui (후속 단계에서 도입, 현재는 Tailwind 기본 클래스 사용)
- Supabase PostgreSQL
- Supabase Auth
- Lightweight Charts
- Vitest
- Playwright
- Python 3.12 (collector/, 후속 단계)
- GitHub Actions (후속 단계)

## 필수 규칙

1. TypeScript의 any 사용을 피한다.
2. 서버 데이터는 Zod로 검증한다.
3. 시간은 데이터베이스에서 timestamptz로 저장한다.
4. 화면에는 Asia/Seoul 기준으로 표시한다.
5. 금액과 가격 계산에 부동소수점 오차가 생기지 않게 한다 (가격은 소수점 2자리 반올림 후 정수틱 연산, 금액은 원 단위 정수).
6. 증권사 API 키와 Service Role Key를 클라이언트에 노출하지 않는다 (`NEXT_PUBLIC_` 금지).
7. minute_bars는 contract_id와 bar_time 기준으로 중복을 방지한다 (upsert).
8. 거래는 trades와 trade_executions로 분리한다.
9. 분할 진입과 분할 청산을 지원해야 한다.
10. 사용자의 원본 체결정보를 덮어쓰거나 합쳐서 잃지 않는다.
11. 자동주문 코드는 작성하지 않는다.
12. 기능을 구현한 뒤 테스트를 함께 작성한다.
13. 기존 테스트를 통과시키지 못하면 작업 완료로 간주하지 않는다.
14. 데이터베이스 변경은 migration 파일로 작성한다.
15. 큰 파일 하나를 만들지 말고 기능별 모듈로 분리한다.

## 작업 절차

각 작업을 시작할 때:

1. 관련 파일을 먼저 읽는다.
2. 변경 계획을 간단히 작성한다.
3. 최소 범위로 구현한다.
4. 타입 검사, 린트, 단위 테스트를 실행한다.
5. 결과와 남은 문제를 요약한다.

## 금지 사항

- API Key 하드코딩
- 주문 API 구현
- 실제 투자 추천 문구 생성
- 테스트를 삭제해서 통과시키기
- 사용자 확인 없이 데이터베이스 테이블 삭제
- 원본 거래기록 자동 수정

## Next.js 유의

- `src/app` + Route Groups `(auth)`, `(app)` 사용, URL에 그룹명 미포함.
- `page.tsx`와 `route.ts`를 같은 세그먼트에 두지 않는다 (`app/api/*`는 route만).
- Route Handler 동적 렌더링 시 `params`는 await 필요 시 대응 (Next 16 `RouteContext`).
- `node_modules/next/dist/docs/01-app/01-getting-started/` 가이드와 deprecation 경고를 따른다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
