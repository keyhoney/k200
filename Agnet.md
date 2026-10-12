이 앱의 핵심은 단순한 손익 기록이 아니라, **“실제 매매를 1분봉 위에서 복기하고, 진입 판단과 감정까지 함께 축적하는 개인용 훈련 도구”**입니다. 처음부터 자동매매나 복잡한 통계까지 넣으면 바이브코딩 과정이 흔들리므로, 1차 버전은 코스피200 선물 최근월물, 수동 매매 입력, 차트 복기, 일별 메모에 집중하는 것이 좋습니다.

아래 명세서는 GitHub Copilot, Claude Code, Cursor 같은 AI 코딩 도구에 그대로 제공할 수 있는 형태로 작성했습니다. 증권사 연동은 한국투자증권 KIS Open API를 우선 전제로 합니다. KIS는 국내선물옵션 API, 국내파생 종목정보 파일, Python 샘플 저장소를 제공합니다.

코스피200 선물 매매일지 앱 작업 명세서
1. 프로젝트 개요
1.1 프로젝트명

K200 Trading Journal

임시 한글명:

코스피200 선물 매매 복기 일지

1.2 개발 목적

사용자가 매일 코스피200 선물 거래 내역을 직접 입력하고, 해당 거래일의 1분봉 차트 위에 다음 정보를 시각적으로 표시하는 개인용 웹 애플리케이션을 개발한다.

롱 진입
롱 청산
숏 진입
숏 청산
분할 진입
분할 청산
진입 이유
청산 이유
실수 및 개선점
장중 감정
다음 거래에서 기억할 점
일별 손익 및 거래 통계

이 앱은 자동 주문 프로그램이 아니다.

앱에서 수행하는 기능은 다음으로 제한한다.

증권사 API를 통한 시세 데이터 조회
거래 기록 수동 입력
매매 복기
통계 분석
데이터 저장 및 조회

주문, 정정, 취소, 자동매매 기능은 구현하지 않는다.

2. 핵심 사용자 경험
2.1 대표 사용 시나리오

사용자가 당일 거래를 마친 후 앱에 접속한다.

1. 오늘 날짜를 선택한다.
2. 오늘 거래한 코스피200 선물 월물을 확인한다.
3. 해당 날짜의 1분봉 차트를 불러온다.
4. 진입 및 청산 기록을 입력한다.
5. 입력된 거래 지점이 차트에 표시된다.
6. 각 거래에 진입 이유와 청산 이유를 기록한다.
7. 오늘 잘한 점, 실수, 감정 상태를 기록한다.
8. 일지를 저장한다.
9. 과거 일지를 날짜, 전략, 방향, 손익으로 검색한다.

2.2 앱이 제공해야 하는 핵심 가치

사용자가 앱을 열었을 때 다음 질문에 바로 답할 수 있어야 한다.

어디에서 롱 또는 숏으로 진입했는가?
어디에서 청산했는가?
당시 시장은 어떤 흐름이었는가?
왜 그 자리에서 진입했는가?
계획대로 진입했는가?
손절과 익절은 적절했는가?
같은 실수를 반복하고 있는가?
어떤 진입 이유의 성과가 좋은가?
오전과 오후 중 어느 시간대 성과가 좋은가?
롱과 숏 중 어느 방향의 성과가 좋은가?
3. 개발 범위
3.1 MVP 범위

첫 번째 완성 버전에 반드시 포함할 기능이다.

인증
개인 사용자 로그인
관리자 한 명만 사용하는 구조
로그아웃
세션 유지
비밀번호 해시 저장
시세 데이터
코스피200 선물 최근월물 1분봉 조회
거래일별 1분봉 저장
실제 월물 종목코드 저장
날짜별 차트 표시
데이터 수집 상태 확인
수동 재수집
중복 데이터 방지
매매 기록
거래일 선택
롱·숏 구분
진입 시각
진입 가격
청산 시각
청산 가격
수량
수수료
진입 이유
청산 이유
거래 메모
전략 태그
감정 태그
실수 태그
스크린샷 첨부
분할 진입 및 분할 청산
차트
1분봉 캔들차트
거래량
롱 진입 마커
롱 청산 마커
숏 진입 마커
숏 청산 마커
마커 클릭 시 거래 상세정보 표시
차트 줌 및 이동
차트 특정 구간 확대
체결 시각 중심으로 이동
일별 일지
장 시작 전 계획
당일 시장 해석
잘한 점
잘못한 점
다음 거래에서 기억할 점
감정 상태
집중도
규칙 준수 점수
일별 만족도
통계
총 거래 횟수
승리 거래 수
손실 거래 수
승률
총손익
평균 이익
평균 손실
손익비
최대 이익
최대 손실
롱·숏별 성과
시간대별 성과
진입 이유별 성과
실수 태그별 손실
3.2 MVP에서 제외할 기능

초기 개발 속도를 위해 다음은 구현하지 않는다.

자동 주문
실시간 자동매매
투자 신호 추천
AI 매수·매도 추천
다른 사용자와 일지 공유
소셜 기능
모바일 앱 패키징
여러 증권사 계좌 통합
모든 선물·옵션 종목 지원
틱 데이터
백테스트 엔진
세금 계산
정교한 자금관리 추천
실시간 WebSocket 차트
4. 기술 구성
4.1 추천 기술 스택
프런트엔드
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Lightweight Charts
React Hook Form
Zod
TanStack Query
백엔드 및 데이터베이스
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Row Level Security
자동 수집
Python 3.12
GitHub Actions
requests 또는 httpx
pandas
tenacity
psycopg 또는 Supabase Python Client
배포
프런트엔드: Cloudflare Pages
데이터베이스·인증·파일: Supabase
시세 수집: GitHub Actions
소스 저장소: GitHub Private Repository
4.2 전체 구성도
사용자 브라우저
      ↓
Cloudflare Pages
Next.js 웹 애플리케이션
      ↓
Supabase
  ├─ 사용자 인증
  ├─ 매매 기록
  ├─ 1분봉 데이터
  ├─ 매매일지
  └─ 스크린샷 저장

GitHub Actions
      ↓
Python 수집기
      ↓
한국투자증권 KIS Open API
      ↓
Supabase minute_bars 테이블

4.3 이 구성을 권장하는 이유

매매일지 앱은 단순히 날짜별 파일을 저장하는 것보다 로그인, 검색, 수정, 집계, 이미지 첨부가 필요하다. 따라서 데이터는 Git 저장소의 CSV 파일보다 PostgreSQL에 저장하는 것이 적합하다.

GitHub Actions는 다음 역할만 한다.

평일 정해진 시각에 실행
현재 코스피200 선물 최근월물 확인
1분봉 조회
중복 제거
Supabase에 저장
저장 결과 검증
실패 로그 기록

GitHub Actions는 비공개 저장소에도 플랜별 무료 실행시간을 제공한다. 한 종목의 일 1~2회 수집은 일반적으로 작은 작업에 해당한다.

Cloudflare Workers는 무료 플랜에서 호출당 CPU 시간 제한이 있으므로, 여러 API 응답을 병합하고 검증하는 Python 수집 작업보다는 웹 배포 용도로만 사용하는 편이 단순하다.

5. 핵심 데이터 모델
5.1 사용자 테이블

Supabase Auth의 사용자 ID를 기준으로 프로필만 별도로 저장한다.

create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    timezone text not null default 'Asia/Seoul',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

5.2 선물 월물 테이블
create table futures_contracts (
    id bigint generated always as identity primary key,
    broker text not null,
    market text not null default 'KRX',
    product_code text not null,
    symbol text not null,
    contract_name text not null,
    expiry_date date not null,
    first_trade_date date,
    last_trade_date date,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (broker, symbol)
);

필드 의미
product_code: 코스피200 선물 계열 식별값
symbol: 실제 거래 월물 코드
contract_name: 화면에 표시할 월물명
expiry_date: 최종 거래일 또는 만기일
is_active: 현재 조회 가능한 월물 여부

종목코드를 소스에 고정하면 안 된다. 코스피200 선물의 실제 월물 코드는 만기마다 변경되므로, 국내파생 종목정보를 이용하여 최근월물을 자동 선택해야 한다. 한국투자증권은 국내파생 지수선물옵션 종목정보 파일을 제공한다.

5.3 1분봉 테이블
create table minute_bars (
    id bigint generated always as identity primary key,
    contract_id bigint not null references futures_contracts(id),
    trading_date date not null,
    bar_time timestamptz not null,
    open numeric(12, 4) not null,
    high numeric(12, 4) not null,
    low numeric(12, 4) not null,
    close numeric(12, 4) not null,
    volume bigint not null default 0,
    open_interest bigint,
    source text not null default 'kis',
    collected_at timestamptz not null default now(),

    unique (contract_id, bar_time),

    constraint minute_bar_price_check check (
        high >= low
        and high >= open
        and high >= close
        and low <= open
        and low <= close
    )
);

인덱스
create index idx_minute_bars_date
on minute_bars (trading_date);

create index idx_minute_bars_contract_date
on minute_bars (contract_id, trading_date, bar_time);

5.4 거래 묶음 테이블

한 번의 매매 아이디어를 나타낸다.

분할 진입과 분할 청산이 있더라도 하나의 거래 묶음으로 관리한다.

create table trades (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    contract_id bigint not null references futures_contracts(id),
    trading_date date not null,
    direction text not null check (direction in ('LONG', 'SHORT')),
    status text not null default 'CLOSED'
        check (status in ('OPEN', 'PARTIALLY_CLOSED', 'CLOSED', 'CANCELLED')),
    strategy_name text,
    setup_grade text check (setup_grade in ('A', 'B', 'C', 'D')),
    entry_reason text,
    exit_reason text,
    trade_note text,
    planned_stop_price numeric(12, 4),
    planned_target_price numeric(12, 4),
    actual_pnl numeric(14, 2),
    fee numeric(14, 2) not null default 0,
    rule_followed boolean,
    emotion_before text,
    emotion_during text,
    emotion_after text,
    screenshot_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

5.5 체결 내역 테이블

하나의 거래에 여러 진입과 청산을 저장할 수 있다.

create table trade_executions (
    id uuid primary key default gen_random_uuid(),
    trade_id uuid not null references trades(id) on delete cascade,
    execution_type text not null
        check (execution_type in ('ENTRY', 'EXIT')),
    executed_at timestamptz not null,
    price numeric(12, 4) not null,
    quantity integer not null check (quantity > 0),
    fee numeric(14, 2) not null default 0,
    memo text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

설계 원칙

방향은 trades.direction에 저장한다.

체결 유형은 다음 두 개만 사용한다.

ENTRY
EXIT

따라서 의미는 다음처럼 해석한다.

LONG + ENTRY = 롱 진입
LONG + EXIT  = 롱 청산
SHORT + ENTRY = 숏 진입
SHORT + EXIT  = 숏 청산


이 구조가 LONG_ENTRY, LONG_EXIT, SHORT_ENTRY, SHORT_EXIT 네 종류를 따로 저장하는 것보다 일관성이 좋다.

5.6 전략 태그 테이블
create table tags (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    category text not null
        check (category in ('STRATEGY', 'MARKET', 'EMOTION', 'MISTAKE')),
    name text not null,
    color text,
    created_at timestamptz not null default now(),

    unique (user_id, category, name)
);

create table trade_tags (
    trade_id uuid not null references trades(id) on delete cascade,
    tag_id bigint not null references tags(id) on delete cascade,
    primary key (trade_id, tag_id)
);

기본 전략 태그 예시
추세 지속
돌파
눌림목
되돌림
지지 반등
저항 반락
갭 대응
박스 상단 돌파
박스 하단 이탈
전고점 돌파
전저점 이탈
시가 돌파
VWAP 회귀
과매수 역추세
과매도 역추세
기본 실수 태그 예시
추격 진입
손절 지연
계획 없는 진입
물타기
과도한 수량
복수 매매
조급한 청산
지나치게 빠른 익절
뉴스 확인 부족
거래 시간 위반
연속 손실 후 재진입
진입 근거 소멸 무시
기본 감정 태그 예시
침착
자신감
불안
조급함
두려움
탐욕
분노
복수심
지루함
과신
집중
피로
5.7 일별 매매일지 테이블
create table daily_journals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    trading_date date not null,
    contract_id bigint references futures_contracts(id),

    premarket_plan text,
    market_summary text,
    good_points text,
    bad_points text,
    lesson_learned text,
    next_session_plan text,

    confidence_score integer check (confidence_score between 1 and 5),
    concentration_score integer check (concentration_score between 1 and 5),
    discipline_score integer check (discipline_score between 1 and 5),
    satisfaction_score integer check (satisfaction_score between 1 and 5),

    daily_pnl numeric(14, 2),
    daily_fee numeric(14, 2) not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (user_id, trading_date)
);

5.8 수집 실행 이력
create table collection_runs (
    id bigint generated always as identity primary key,
    source text not null,
    trading_date date not null,
    contract_symbol text,
    started_at timestamptz not null,
    finished_at timestamptz,
    requested_count integer not null default 0,
    inserted_count integer not null default 0,
    updated_count integer not null default 0,
    first_bar_time timestamptz,
    last_bar_time timestamptz,
    status text not null
        check (status in ('RUNNING', 'SUCCESS', 'WARNING', 'FAILED', 'SKIPPED')),
    error_message text,
    created_at timestamptz not null default now()
);

6. 화면 설계
6.1 로그인 화면
구성
앱 로고 또는 제목
이메일
비밀번호
로그인 버튼
오류 메시지
비밀번호 표시·숨기기
보안 요구사항
회원가입은 공개하지 않는다.
관리자가 Supabase에서 사용자 한 명을 생성한다.
로그인하지 않은 사용자는 모든 내부 페이지에 접근할 수 없다.
API 키는 브라우저에 전달하지 않는다.
6.2 대시보드
상단 요약 카드
오늘 손익
이번 달 누적 손익
이번 달 거래 횟수
이번 달 승률
규칙 준수율
마지막 시세 수집 시각
중앙 영역
최근 20거래일 일별 손익 그래프
최근 매매일지 목록
반복 실수 상위 5개
전략별 성과
빠른 작업
오늘 일지 작성
새 거래 입력
오늘 차트 보기
데이터 수동 수집
과거 거래 검색
6.3 일별 복기 화면

이 앱에서 가장 중요한 화면이다.

기본 레이아웃
┌────────────────────────────────────────────┐
│ 날짜 ◀ 2026-10-12 ▶  월물  거래손익  저장 │
├──────────────────────────────┬─────────────┤
│                              │ 거래 목록   │
│        1분봉 차트            │             │
│                              │ 거래 상세   │
│                              │             │
├──────────────────────────────┴─────────────┤
│ 장전 계획 / 오늘의 복기 / 개선점 / 다음 계획 │
└────────────────────────────────────────────┘


데스크톱에서는 차트와 거래 목록을 좌우 배치한다.

모바일에서는 다음 순서로 세로 배치한다.

날짜 및 월물
차트
거래 목록
거래 편집
일별 메모
7. 차트 상세 명세
7.1 기본 차트
캔들차트
거래량 히스토그램
한국시간 표시
가격 눈금
시간 눈금
줌
좌우 이동
자동 맞춤
전체 보기 버튼
거래 구간만 보기 버튼
7.2 마커 규칙
롱 진입
초록색 위쪽 화살표
캔들 아래 표시
라벨: L1, L2, L3
롱 청산
파란색 원 또는 아래쪽 화살표
캔들 위 표시
라벨: LX1, LX2
숏 진입
빨간색 아래쪽 화살표
캔들 위 표시
라벨: S1, S2, S3
숏 청산
주황색 원 또는 위쪽 화살표
캔들 아래 표시
라벨: SX1, SX2

색상만으로 구분하지 않고 모양과 문자도 함께 사용한다.

7.3 진입·청산 연결선

동일한 거래 묶음의 평균 진입가격과 평균 청산가격을 점선으로 연결한다.

롱 거래: 초록색 계열
숏 거래: 빨간색 계열
이익 거래: 불투명도 높게
손실 거래: 점선 또는 경고색 테두리
7.4 거래 영역 음영

거래가 열려 있던 시간 구간을 옅은 배경색으로 표시한다.

진입 시각 ───────── 청산 시각

롱 보유 구간: 옅은 초록
숏 보유 구간: 옅은 빨강

복수 거래가 겹치면 투명도를 낮춘다.

7.5 마커 상호작용

마커에 마우스를 올리면 다음을 툴팁으로 보여준다.

거래 방향
진입 또는 청산
시각
가격
수량
해당 체결 메모

마커를 클릭하면 오른쪽 거래 상세 패널을 연다.

7.6 차트 클릭 입력

차트의 캔들을 클릭하면 새 체결 입력창에 다음 값을 자동으로 채운다.

선택한 시각
해당 캔들의 종가
선택한 거래일
현재 월물

사용자가 가격을 수정할 수 있어야 한다.

8. 매매 입력 기능
8.1 입력 흐름
새 거래 버튼
    ↓
롱 또는 숏 선택
    ↓
진입 체결 추가
    ↓
청산 체결 추가
    ↓
진입 이유 및 태그 선택
    ↓
저장
    ↓
차트에 즉시 반영

8.2 거래 입력 필드
기본 정보
거래일
월물
방향
전략명
셋업 등급
규칙 준수 여부
진입
진입 시각
진입 가격
수량
수수료
진입 메모
추가 진입 버튼
청산
청산 시각
청산 가격
수량
수수료
청산 메모
추가 청산 버튼
계획
계획 손절가
계획 목표가
복기
진입 이유
청산 이유
거래 메모
장세 태그
전략 태그
감정 태그
실수 태그
이미지 첨부
8.3 입력 검증
청산 시각은 최초 진입 시각보다 빠를 수 없다.
가격은 0보다 커야 한다.
수량은 1 이상의 정수여야 한다.
총 청산 수량은 총 진입 수량을 초과할 수 없다.
완전 청산 상태에서는 진입 수량과 청산 수량이 같아야 한다.
거래일과 체결 시각의 날짜가 일치해야 한다.
해당 월물의 거래 가능 기간 밖에는 저장하지 않는다.
미래 시각은 허용하지 않는다.
동일한 체결을 실수로 두 번 입력했을 때 경고한다.
1분봉 가격 범위를 크게 벗어나면 확인 경고를 표시한다.

가격 범위 경고는 저장을 막지 않는다. 실제 체결가격은 1분봉 고가·저가와 소폭 다를 수 있으므로, 강제 제한이 아니라 사용자 확인용으로만 사용한다.

9. 손익 계산 규칙
9.1 기본 계산

코스피200 선물의 계약당 가치 계산에 필요한 승수는 앱 설정에 저장하고, 코드에 여러 곳에 중복 작성하지 않는다.

롱 손익 = (청산가격 - 진입가격) × 계약승수 × 수량
숏 손익 = (진입가격 - 청산가격) × 계약승수 × 수량
순손익 = 총손익 - 수수료


승수나 상품 조건은 변경될 수 있으므로 설정 테이블 또는 환경설정에서 관리한다.

9.2 분할 체결 계산

분할 진입 및 분할 청산은 다음 중 하나를 선택하여 계산한다.

MVP 기본값:

이동평균 방식으로 평균 진입가격과 실현손익 계산

저장 시 원본 체결은 그대로 보존하고, 요약값만 계산한다.

계산 결과
총 진입 수량
총 청산 수량
평균 진입가격
평균 청산가격
가격 변화 포인트
총손익
수수료
순손익
보유 시간
계획 손절 준수 여부
10. 일별 일지 기능
10.1 장전 계획
오늘의 주요 가격대
상승 시 대응
하락 시 대응
거래하지 않을 조건
최대 손실 제한
최대 거래 횟수
오늘 집중할 거래 유형
10.2 장 마감 복기
오늘 시장은 어떤 흐름이었는가?
가장 잘한 거래는 무엇인가?
가장 잘못한 거래는 무엇인가?
계획을 지켰는가?
손절은 계획대로 실행했는가?
추격 진입이 있었는가?
감정적으로 거래한 순간이 있었는가?
다음 거래에서 반드시 기억할 점은 무엇인가?
10.3 점수 입력

1점부터 5점까지 입력한다.

집중도
규칙 준수
감정 통제
진입 품질
청산 품질
종합 만족도

점수 선택 시 기준을 표시한다.

1점: 계획을 거의 지키지 못함
2점: 계획 위반이 많음
3점: 일부 위반했으나 대체로 통제함
4점: 대부분 계획대로 실행함
5점: 계획과 실행이 일치함

11. 거래 검색 및 필터

과거 일지는 다음 조건으로 검색할 수 있어야 한다.

시작일·종료일
롱 또는 숏
이익 또는 손실
월물
전략 태그
실수 태그
감정 태그
셋업 등급
규칙 준수 여부
손익 범위
진입 시간대
메모 키워드

검색 결과에서 다음 열을 보여준다.

날짜
월물
방향
최초 진입 시각
최종 청산 시각
평균 진입가
평균 청산가
수량
순손익
전략
셋업 등급
규칙 준수 여부

행을 클릭하면 해당 날짜의 차트로 이동하고 그 거래를 선택한다.

12. 통계 기능
12.1 기본 통계
거래 횟수
승리 횟수
패배 횟수
무승부 횟수
승률
총이익
총손실
순손익
평균 이익
평균 손실
손익비
Profit Factor
최대 연속 이익
최대 연속 손실
최대 이익 거래
최대 손실 거래
12.2 분류별 통계
롱·숏별
오전·오후별
요일별
전략별
셋업 등급별
감정별
실수별
규칙 준수 여부별
보유 시간별
진입 횟수별
월물별
12.3 우선 제공해야 할 인사이트

다음 문장은 데이터에 따라 자동으로 생성한다.

규칙을 지킨 거래의 평균 손익이 규칙을 어긴 거래보다 높습니다.

오후 2시 이후 거래에서 손실 비율이 높습니다.

추격 진입 태그가 포함된 거래의 평균 손실이 가장 큽니다.

A등급 셋업보다 C등급 셋업의 거래 횟수가 더 많습니다.

연속 2회 손실 이후의 거래에서 추가 손실이 자주 발생합니다.


이 기능은 투자 조언이 아니라 과거 사용자 기록의 단순 집계로 표현해야 한다.

13. 시세 수집 명세
13.1 데이터 출처

1차 데이터 소스:

한국투자증권 KIS Open API
국내선물옵션 시세 API
국내파생 종목정보 파일

KIS는 국내선물옵션 API 카테고리, 종목정보 파일, 공식 Python 예제 저장소를 제공한다.

13.2 수집 시각

GitHub Actions 기준:

schedule:
  - cron: "17 7 * * 1-5"
  - cron: "37 7 * * 1-5"


UTC 07:17은 한국시간 16:17이다.

첫 실행은 본 수집이고, 두 번째 실행은 검증 및 실패 복구용이다.

GitHub Actions 예약 작업은 정확한 초 단위 실행을 보장하는 스케줄러가 아니며 플랫폼 상황에 따라 지연될 수 있다. 따라서 장 종료 직후 정각보다 약간 늦은 시각을 사용한다.

13.3 수집 절차
1. 한국시간 기준 현재 날짜 확인
2. 평일 여부 확인
3. KIS 접근 토큰 발급 또는 캐시 사용
4. 국내파생 종목정보 확인
5. 코스피200 선물 월물 목록 추출
6. 거래일 기준 최근월물 선택
7. 해당 월물의 당일 1분봉 반복 조회
8. 응답 필드 정규화
9. 시간 오름차순 정렬
10. 중복 제거
11. OHLC 무결성 검사
12. Supabase에 upsert
13. 수집 실행 결과 기록
14. 실패 시 GitHub Actions 작업 실패 처리

13.4 최근월물 선택 규칙

MVP에서는 다음 규칙을 적용한다.

거래일 <= 만기일인 코스피200 선물 중
만기일이 가장 가까운 월물을 선택한다.


만기일 당일에는 만기 월물을 저장하고, 다음 영업일부터 새 최근월물을 선택한다.

차후 설정으로 다음 방식을 추가할 수 있다.

만기일 이전 지정된 날짜에 롤오버
거래량이 가장 많은 월물 선택
사용자가 월물을 직접 지정
13.5 Upsert 기준
contract_id + bar_time


같은 작업이 반복되어도 중복 행이 생기지 않아야 한다.

데이터가 이미 존재하더라도 다음 필드는 갱신한다.

OHLC
거래량
미결제약정
수집 시각
13.6 검증 규칙
응답 종목코드가 요청 월물과 동일한가?
거래일이 요청일과 동일한가?
시간 중복이 있는가?
시간이 오름차순인가?
고가가 저가보다 낮지 않은가?
고가가 시가와 종가 이상인가?
저가가 시가와 종가 이하인가?
거래량이 음수가 아닌가?
첫 봉과 마지막 봉이 예상 범위에 있는가?
기존 저장 데이터보다 봉 개수가 줄어들지 않았는가?

기존 데이터가 더 완전하면 불완전한 새 결과로 덮어쓰지 않는다.

14. 수동 데이터 보완 기능

증권사 API 장애 또는 GitHub Actions 실패에 대비하여 CSV 업로드 기능을 제공한다.

업로드 형식
trading_date,time,open,high,low,close,volume,open_interest
2026-10-12,09:00:00,350.10,350.25,349.90,350.20,1234,45678

업로드 흐름
관리자 설정
  → 시세 데이터 관리
  → 날짜 선택
  → 월물 선택
  → CSV 업로드
  → 미리보기
  → 유효성 검사
  → 저장


업로드된 데이터의 출처는 다음처럼 구분한다.

source = 'manual_csv'

15. API 명세

Supabase를 직접 사용하는 경우에도 화면에서 사용할 서비스 함수를 명확히 구분한다.

15.1 일별 차트 조회
GET /api/chart?date=2026-10-12


응답 예시:

{
  "tradingDate": "2026-10-12",
  "contract": {
    "symbol": "실제월물코드",
    "name": "코스피200 선물 최근월물",
    "expiryDate": "2026-12-10"
  },
  "bars": [
    {
      "time": 1791763200,
      "open": 350.10,
      "high": 350.25,
      "low": 349.90,
      "close": 350.20,
      "volume": 1234
    }
  ],
  "trades": []
}

15.2 거래 생성
POST /api/trades


요청 예시:

{
  "tradingDate": "2026-10-12",
  "contractId": 12,
  "direction": "LONG",
  "strategyName": "전고점 돌파",
  "setupGrade": "A",
  "entryReason": "전고점 돌파 후 거래량 증가",
  "exitReason": "목표 가격 도달",
  "ruleFollowed": true,
  "executions": [
    {
      "type": "ENTRY",
      "executedAt": "2026-10-12T09:32:00+09:00",
      "price": 350.15,
      "quantity": 1
    },
    {
      "type": "EXIT",
      "executedAt": "2026-10-12T09:41:00+09:00",
      "price": 350.65,
      "quantity": 1
    }
  ]
}

15.3 거래 수정
PATCH /api/trades/{tradeId}

15.4 거래 삭제
DELETE /api/trades/{tradeId}


삭제 전 확인 창을 표시하고, 삭제된 거래는 통계에서 즉시 제외한다.

15.5 일별 일지 저장
PUT /api/journals/{tradingDate}

15.6 시세 수집 요청
POST /api/admin/collections


이 기능은 로그인 사용자와 관리자 권한을 모두 확인해야 한다.

16. 보안 요구사항
16.1 증권사 인증정보

다음 값은 GitHub Secrets에 저장한다.

KIS_APP_KEY
KIS_APP_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY


SUPABASE_SERVICE_ROLE_KEY는 GitHub Actions 수집기에서만 사용한다.

브라우저에서는 절대 사용하지 않는다.

프런트엔드에는 공개용 키만 사용한다.

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

16.2 데이터베이스 권한

모든 사용자 데이터 테이블에 Row Level Security를 활성화한다.

기본 정책:

사용자는 자신의 user_id에 해당하는 행만
조회, 생성, 수정, 삭제할 수 있다.


minute_bars, futures_contracts는 로그인 사용자가 읽을 수 있지만 브라우저에서 수정할 수 없게 한다.

시세 데이터 수정은 GitHub Actions의 Service Role만 가능하도록 한다.

16.3 입력 보안
메모 입력 길이 제한
HTML 태그 제거 또는 안전한 렌더링
업로드 확장자 제한
이미지 파일 크기 제한
서버 측 유효성 검사
인증되지 않은 API 요청 차단
API 오류에 인증정보를 포함하지 않음
Actions 로그에 App Key와 토큰을 출력하지 않음
17. 비기능 요구사항
17.1 성능
일반 페이지 첫 표시: 3초 이내 목표
일별 1분봉 차트 표시: 2초 이내 목표
거래 저장 후 차트 반영: 1초 이내 목표
일별 1분봉 전체 데이터를 한 번의 조회로 가져올 것
날짜 변경 시 이전 요청 취소
차트 데이터 캐시 적용
17.2 사용성
모든 중요한 기능은 3번 이내의 클릭으로 접근
거래 입력 중 임시 저장
저장되지 않은 변경사항이 있을 때 페이지 이탈 경고
키보드 입력 지원
날짜 전환 단축키 제공
차트와 거래 목록 선택 상태 동기화
오류 메시지는 사용자가 이해할 수 있는 문장으로 표시
17.3 반응형 화면

우선순위:

데스크톱 1440px
노트북 1024px
태블릿
모바일

차트 복기는 데스크톱 중심으로 설계하되, 모바일에서도 일지 조회와 간단한 입력은 가능해야 한다.

17.4 접근성
색상만으로 롱·숏을 구분하지 않음
모든 폼 요소에 라벨 제공
키보드 탐색 가능
충분한 색상 대비
오류 필드에 텍스트 설명 제공
다크 모드 지원
18. 오류 처리
18.1 사용자 입력 오류

예시:

청산 수량이 진입 수량보다 많습니다.

청산 시각은 진입 시각보다 빠를 수 없습니다.

선택한 날짜의 1분봉 데이터가 없습니다.

실제 체결가격이 해당 1분봉의 고가·저가 범위를 벗어났습니다.
입력한 가격을 다시 확인해 주세요.

18.2 수집 오류
인증 실패
API 호출 제한
종목코드 확인 실패
월물 목록 없음
빈 응답
일부 시간대 누락
데이터베이스 저장 실패
작업 시간 초과

오류 발생 시 collection_runs에 실패 사유를 저장하고 GitHub Actions 작업을 실패 상태로 종료한다.

19. 테스트 요구사항
19.1 단위 테스트
롱 손익 계산
숏 손익 계산
분할 진입 평균가격
분할 청산 손익
수수료 차감
최근월물 선택
만기일 롤오버
중복 1분봉 제거
OHLC 유효성 검사
체결 수량 검사
한국시간 변환
19.2 통합 테스트
로그인 후 대시보드 접근
날짜별 1분봉 조회
거래 생성
거래 수정
거래 삭제
분할 진입 저장
분할 청산 저장
일지 저장
태그 등록
검색 필터
차트 마커 클릭
이미지 업로드
수집 결과 upsert
19.3 E2E 테스트

Playwright를 사용한다.

필수 시나리오:

로그인
→ 날짜 선택
→ 1분봉 차트 표시
→ 차트에서 진입 시각 선택
→ 롱 거래 입력
→ 청산 체결 추가
→ 진입 이유 입력
→ 저장
→ 차트에서 롱 진입·청산 마커 확인
→ 일별 메모 작성
→ 대시보드 통계 반영 확인

19.4 시드 데이터

AI가 화면을 개발할 때 빈 화면만 보지 않도록 테스트 데이터를 제공한다.

거래일 3일
코스피200 선물 월물 2개
일별 1분봉 데이터
롱 거래 3건
숏 거래 3건
분할 진입 거래 1건
분할 청산 거래 1건
이익·손실 거래 혼합
일별 일지 3건
전략·감정·실수 태그

시드 데이터는 반드시 DEMO 또는 SYNTHETIC으로 명시하여 실제 데이터와 혼동되지 않게 한다.

20. 개발 단계
0단계: 저장소 및 규칙 구성

목표:

프로젝트 생성
환경변수 예시
코딩 규칙
데이터베이스 마이그레이션 구조
AI 작업 지침 작성

산출물:

README.md
AGENTS.md
.env.example
docs/product-spec.md
docs/database.md
docs/chart-rules.md
supabase/migrations/


완료 조건:

로컬 실행 가능
린트 실행 가능
테스트 명령 실행 가능
비밀정보가 저장소에 포함되지 않음
1단계: 인증과 기본 레이아웃

구현:

로그인
보호된 라우트
사이드바
상단 메뉴
다크 모드
로그아웃

완료 조건:

로그인하지 않은 사용자는 내부 페이지 접근 불가
로그인 후 새로고침해도 세션 유지
모바일 메뉴 작동
2단계: 데이터베이스

구현:

전체 테이블
외래키
인덱스
RLS 정책
테스트 데이터

완료 조건:

사용자별 데이터 격리
1분봉 중복 저장 방지
Service Role만 시세 데이터 수정 가능
3단계: 시세 수집기

구현:

KIS 인증
코스피200 선물 최근월물 탐색
1분봉 조회
페이지 반복
정규화
검증
Supabase upsert
수집 로그

완료 조건:

하루치 데이터 저장 성공
같은 날짜 재실행 시 중복 없음
실패하면 Actions가 성공으로 위장하지 않음
월물 변경 테스트 통과
4단계: 차트

구현:

일별 데이터 조회
캔들차트
거래량
날짜 이동
월물 표시
로딩·빈 데이터·오류 상태

완료 조건:

한 거래일 전체 데이터 표시
한국시간이 정확함
줌과 이동 작동
화면 크기 변경 시 차트 재조정
5단계: 거래 입력

구현:

롱·숏
단일 진입·청산
분할 진입·청산
손익 계산
태그
메모
수정·삭제

완료 조건:

입력 결과가 차트에 즉시 표시
수량 검증 작동
손익 계산 테스트 통과
재접속 후에도 동일하게 표시
6단계: 일별 매매일지

구현:

장전 계획
장 마감 복기
점수
일별 요약
자동 임시 저장

완료 조건:

날짜별 독립 저장
거래 손익과 일별 손익 비교
저장되지 않은 변경사항 경고
7단계: 검색과 통계

구현:

거래 검색
다중 필터
기본 통계
태그별 통계
손익 추이
반복 실수

완료 조건:

필터 조합 작동
수정·삭제 후 통계 즉시 반영
손익 계산과 거래 목록 합계 일치
8단계: 안정화

구현:

CSV 수동 업로드
이미지 최적화
오류 로깅
백업
E2E 테스트
배포 문서
복구 문서

완료 조건:

프로덕션 배포
자동 수집 성공
수동 재수집 성공
데이터베이스 백업 가능
새 환경에서 문서만 보고 재배포 가능
21. AI 바이브코딩 작업 규칙

AI에게 한 번에 전체 앱을 만들어 달라고 요청하지 않는다. 단계별로 작은 기능을 완성하고 검증한 후 다음 단계로 이동한다.

공통 프롬프트

다음 내용을 프로젝트의 AGENTS.md에 넣는다.

# 프로젝트 개발 규칙

## 프로젝트 목적

이 프로젝트는 코스피200 선물 매매를 복기하는 개인용 매매일지다.
자동주문이나 투자 추천 기능은 만들지 않는다.

## 기술 스택

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase PostgreSQL
- Supabase Auth
- Lightweight Charts
- Vitest
- Playwright
- Python 3.12
- GitHub Actions

## 필수 규칙

1. TypeScript의 any 사용을 피한다.
2. 서버 데이터는 Zod로 검증한다.
3. 시간은 데이터베이스에서 timestamptz로 저장한다.
4. 화면에는 Asia/Seoul 기준으로 표시한다.
5. 금액과 가격 계산에 부동소수점 오차가 생기지 않게 한다.
6. 증권사 API 키와 Service Role Key를 클라이언트에 노출하지 않는다.
7. minute_bars는 contract_id와 bar_time 기준으로 중복을 방지한다.
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

22. 단계별 AI 프롬프트 예시
프롬프트 1: 프로젝트 초기화
docs/product-spec.md와 AGENTS.md를 먼저 읽어라.

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui를 사용하는
프로젝트 기본 구조를 만들어라.

이번 작업 범위는 다음으로 제한한다.

1. 로그인 페이지 UI
2. 인증된 사용자만 접근할 수 있는 앱 레이아웃
3. 대시보드, 일별 복기, 거래 목록, 통계, 설정 메뉴
4. 다크 모드
5. 반응형 사이드바

Supabase 연결은 인터페이스만 만들고 실제 테이블 작업은 하지 마라.
완료 후 실행한 검사 명령과 결과를 보고하라.

프롬프트 2: 데이터베이스
docs/product-spec.md의 데이터 모델을 기준으로 Supabase migration을 작성하라.

다음 테이블을 포함하라.

- profiles
- futures_contracts
- minute_bars
- trades
- trade_executions
- tags
- trade_tags
- daily_journals
- collection_runs

요구사항:

- 외래키와 unique constraint 설정
- 필요한 index 생성
- Row Level Security 활성화
- 사용자는 자신의 trades, executions, tags, journals만 접근
- 로그인 사용자는 minute_bars와 futures_contracts를 읽기만 가능
- 클라이언트가 minute_bars를 수정할 수 없게 설정
- rollback 또는 되돌리기 방법 문서화

SQL을 작성한 후 정책상 보안상 허점이 없는지 자체 검토하라.

프롬프트 3: 차트
Lightweight Charts를 사용하여 일별 코스피200 선물 1분봉 차트를 구현하라.

요구사항:

- 캔들차트
- 거래량 히스토그램
- Asia/Seoul 시간 표시
- 날짜 선택
- 이전·다음 거래일 버튼
- 전체 보기 버튼
- 반응형 크기
- 로딩, 빈 데이터, 오류 상태

이번 단계에서는 거래 마커를 만들지 마라.
차트 데이터 타입과 변환 함수를 분리하고 단위 테스트를 작성하라.

프롬프트 4: 거래 입력과 차트 마커
거래 입력과 차트 표시를 구현하라.

요구사항:

- LONG, SHORT 선택
- ENTRY, EXIT 체결을 여러 개 추가 가능
- 체결별 시각, 가격, 수량, 수수료, 메모
- 총 진입 수량보다 총 청산 수량이 많으면 저장 불가
- LONG과 SHORT의 손익 계산을 분리
- 거래 저장 후 차트 마커 즉시 갱신
- 롱 진입은 캔들 아래 녹색 위쪽 화살표
- 롱 청산은 캔들 위 파란색 마커
- 숏 진입은 캔들 위 빨간색 아래쪽 화살표
- 숏 청산은 캔들 아래 주황색 마커
- 색상뿐 아니라 L, LX, S, SX 문자를 표시
- 마커 클릭 시 거래 상세 패널 열기

손익 계산 함수에 단위 테스트를 작성하라.

프롬프트 5: 수집기
Python 3.12로 한국투자증권 KIS Open API 기반
코스피200 선물 1분봉 수집기를 구현하라.

중요:

- 주문 기능은 절대 구현하지 않는다.
- 공식 국내선물옵션 시세 API만 사용한다.
- 실제 API 엔드포인트, TR ID, 요청·응답 필드는 공식 문서와
  공식 샘플 코드에서 확인한 값만 사용한다.
- 확인되지 않은 API 값을 추측하지 않는다.

기능:

1. 환경변수 검증
2. 접근 토큰 발급 및 캐시
3. 국내파생 종목정보에서 코스피200 선물 월물 추출
4. 거래일 기준 최근월물 선택
5. 당일 1분봉 전체 조회
6. 시간 오름차순 정렬
7. 중복 제거
8. OHLC 검증
9. Supabase upsert
10. collection_runs 기록
11. 재시도와 지수 백오프
12. 로그에서 Secret 마스킹
13. dry-run 모드

실제 API 호출을 하지 않는 fixture 기반 테스트도 함께 작성하라.

23. 완료 판정 기준

MVP는 다음 시나리오가 실제 배포 환경에서 동작하면 완료로 본다.

1. 사용자가 로그인한다.
2. 2026-10-12 날짜를 선택한다.
3. 해당 거래일의 코스피200 선물 월물과 1분봉이 표시된다.
4. 사용자가 09:32 롱 1계약 진입을 입력한다.
5. 사용자가 09:41 롱 1계약 청산을 입력한다.
6. 차트에 진입과 청산 마커가 표시된다.
7. 진입 이유와 청산 이유를 입력한다.
8. 추격 진입 또는 계획 매매 같은 태그를 붙인다.
9. 일별 복기와 다음 거래의 개선점을 저장한다.
10. 대시보드 손익과 거래 통계가 갱신된다.
11. 로그아웃 후 다시 로그인해도 모든 정보가 유지된다.
12. 같은 날짜의 시세를 다시 수집해도 1분봉이 중복되지 않는다.
13. 만기 후 새 최근월물이 자동으로 선택된다.

24. 가장 현실적인 개발 순서

바이브코딩에서는 다음 순서를 지키는 것이 중요합니다.

1. 가짜 1분봉 데이터로 차트부터 완성
2. 수동 거래 입력과 차트 마커 완성
3. 데이터베이스 저장 연결
4. 일별 메모 완성
5. 통계 완성
6. 마지막에 증권사 API 자동 수집 연결


처음부터 증권사 API 인증과 월물 처리부터 시작하면 화면 개발이 멈추기 쉽습니다. 먼저 합성 데이터로 **“차트에 내 거래가 잘 보이는가”**를 완성한 다음 실제 시세를 연결하는 편이 효율적입니다.

특히 첫 개발 목표는 작게 잡는 것이 좋습니다.

특정 날짜의 1분봉 차트를 표시하고, 사용자가 롱 진입과 청산을 입력하면 해당 위치에 마커가 나타나며, 진입 이유를 저장할 수 있다.

이 한 흐름이 완성된 다음 분할 체결, 통계, 자동 수집을 차례로 추가하면 됩니다.