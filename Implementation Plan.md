# IMPLEMENTATION PLAN — 사장님 인스타 (Next.js + Vercel + Supabase + Stripe + OpenAI)

## 원칙
- 목표는 “완벽한 제품”이 아니라 “이번 주 결제/반응 검증”
- 기능 추가보다 end-to-end 흐름 완성이 우선
- 로그인은 MVP에서 제거 (visitor_id 쿠키 기반)

---

## 아키텍처 개요
사용자(브라우저)
  → Next.js UI (/generate)
  → Next.js API (/api/generate) → OpenAI
  → Supabase (generations 저장 + 제한 체크)
  → Paywall
  → Stripe Checkout
  → Stripe Webhook (/api/webhook)
  → Supabase (subscriptions 기록) → 제한 해제

---

## 데이터 모델 (MVP 최소)
### Table: generations
- id: uuid (PK)
- visitor_id: text (indexed)
- industry: text (cafe | salon)
- tone: text (감성적 | 캐주얼 | 전문적)
- goal: text (방문 유도 | 예약 유도 | 신메뉴/신규시술 | 이벤트)
- input_text: text
- result_json: jsonb
- created_at: timestamp

### Table: subscriptions (또는 entitlements)
- id: uuid
- visitor_id: text (indexed)
- stripe_customer_id: text (nullable)
- stripe_subscription_id: text (nullable)
- status: text (active | inactive)
- current_period_end: timestamp (nullable)
- created_at: timestamp

---

## 핵심 로직
### 1) visitor_id 쿠키
- 첫 방문 시 uuid 생성 후 쿠키 저장
- 모든 생성/결제는 visitor_id로 연결

### 2) 무료 제한 (3회/일)
- generations에서 visitor_id 기준
- created_at 날짜가 오늘인 row count
- count >= 3 이고 subscription active 아니면 paywall

### 3) 글 생성 (/api/generate)
입력:
- industry, tone, goal, input_text, visitor_id

처리:
- 금일 제한 체크
- OpenAI 호출 (gpt-4o-mini 권장)
- 응답을 json으로 정규화
- generations에 저장
- UI에 반환

응답 포맷(고정):
- caption
- story
- comment_hook
- hashtags (array or string)

### 4) 결제 (Stripe Subscription)
- Paywall에서 “월 5,900원으로 계속 사용하기” 클릭
- /api/checkout → Stripe Checkout 세션 생성
- 결제 완료 → /success
- webhook에서 subscription active 기록
- active면 생성 제한 해제

---

## 구현 순서 (권장)
### Day 1: 프로젝트/DB 세팅
- Next.js 생성 및 기본 라우트 구성
- Supabase 테이블 생성
- visitor_id 쿠키 발급 구현

### Day 2: 글 생성 엔진
- /api/generate 구현
- OpenAI 프롬프트/포맷 고정
- generations 저장 & 조회 확인

### Day 3: Paywall & Stripe
- /paywall UI
- /api/checkout 구현
- /api/webhook 구현
- subscription active 로직 연결

### Day 4~5: 배포/실사용 테스트
- Vercel 배포
- 실제 사용자 5명에게 링크 전달
- 피드백 수집

---

## 실패 대비 (MVP에서 꼭 넣기)
- OpenAI 호출 실패 시: 친절한 재시도 메시지 + 로그 저장
- 생성 결과가 비어있을 때: “다시 만들기” 유도
- 결제 실패/취소 시: paywall로 복귀
