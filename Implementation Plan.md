# IMPLEMENTATION PLAN — 사장님 인스타

## 프로젝트 개요
Next.js + Vercel + Supabase + Stripe + OpenAI를 활용한 AI 인스타그램 글 생성 서비스

### 원칙
- 목표는 "완벽한 제품"이 아니라 "이번 주 결제/반응 검증"
- 기능 추가보다 end-to-end 흐름 완성이 우선
- 사용자 인증 기반 (Supabase Auth)

---

## 아키텍처 개요
```
사용자(브라우저)
  → Next.js UI (/generate)
  → Next.js API (/api/generate) → OpenAI
  → Supabase (generations 저장 + 제한 체크)
  → Paywall
  → Stripe Checkout
  → Stripe Webhook (/api/webhook)
  → Supabase (subscriptions 기록) → 제한 해제
```

---

## 데이터 모델

### Table: profiles
- id: uuid (PK, references auth.users)
- email: text
- full_name: text
- industry: text (cafe | salon | restaurant | other)
- store_name: text
- phone: text
- city: text
- district: text
- detail_address: text
- created_at: timestamp
- updated_at: timestamp

### Table: generations
- id: uuid (PK)
- visitor_id: text (indexed) - 또는 user_id for authenticated users
- industry: text (cafe | salon | restaurant | other)
- tone: text (감성적 | 캐주얼 | 전문적)
- goal: text (방문 유도 | 예약 유도 | 신메뉴/신규시술 | 이벤트)
- input_text: text
- result_json: jsonb
- created_at: timestamp

### Table: subscriptions
- id: uuid
- visitor_id: text (indexed)
- stripe_customer_id: text (nullable)
- stripe_subscription_id: text (nullable)
- status: text (active | inactive)
- current_period_end: timestamp (nullable)
- created_at: timestamp

---

## 핵심 로직

### 1) 사용자 인증
- Supabase Auth (Email/Password)
- 회원가입 시 profiles 테이블 자동 생성 (trigger)
- 업종 정보 저장 및 자동 적용

### 2) 무료 제한 (3회/일)
- generations에서 user_id 기준
- created_at 날짜가 오늘인 row count
- count >= 3 이고 subscription active 아니면 paywall

### 3) 글 생성 (/api/generate)
**입력:**
- industry (자동 적용), tone, goal, input_text

**처리:**
- 금일 제한 체크
- OpenAI 호출 (gpt-4o-mini)
- 응답을 json으로 정규화
- generations에 저장
- UI에 반환

**응답 포맷:**
- caption
- hashtags (array)
- storyPhrases (array)
- engagementQuestion

### 4) 결제 (Stripe Subscription)
- Paywall에서 "월 5,900원으로 계속 사용하기" 클릭
- /api/checkout → Stripe Checkout 세션 생성
- 결제 완료 → /success
- webhook에서 subscription active 기록
- active면 생성 제한 해제

---

## ✅ 완료된 기능

### 1. 인증 시스템
- [x] Supabase Auth 통합
- [x] 로그인/회원가입 페이지
- [x] 비밀번호 재설정 플로우 (`/forgot-password`, `/reset-password`)
- [x] 프로필 관리 페이지
- [x] 주소 검색 통합 (Daum Postcode API)

### 2. Theme & UI
- [x] Dark Mode 구현 (`next-themes`)
- [x] Tailwind Zinc 색상 팔레트 표준화
- [x] Navbar 투명도 이슈 해결 (opaque 배경)
- [x] 드롭다운 화살표 아이콘 추가
- [x] 전역 배경 순백색 적용

### 3. 업종 관리
- [x] 4가지 업종 지원 (카페, 미용실, 식당, 기타)
- [x] 프로필 기반 자동 업종 선택
- [x] 업종별 아이콘 표시
- [x] 대소문자 매핑 이슈 해결

### 4. 기술 개선
- [x] React 19 / Next.js 15 호환성
- [x] `useActionState` 마이그레이션
- [x] Hydration 이슈 해결
- [x] Server Component 전환 (`/generate`)

---

## 🚧 진행 중 / 다음 단계

### 우선순위 높음
- [ ] Stripe 결제 연동 완성 및 검증
  - [ ] `/api/checkout` 엔드포인트 테스트
  - [ ] `/api/webhook` Stripe 이벤트 처리 검증
  - [ ] 구독 후 무제한 사용 로직 확인
- [ ] 사용량 제한 로직 정교화
  - [ ] 자정 기준 리셋 로직 정확성 확인
  - [ ] 구독 상태 변경 즉시 반영
  - [ ] `/limit-reached` 페이지 UX 개선

### 우선순위 중간
- [ ] 결과 페이지 개선
  - [ ] 복사 기능 개선 (클립보드 API)
  - [ ] 결과 공유 기능
  - [ ] 결과 편집 기능
- [ ] 히스토리 페이지 기능 확장
  - [ ] 검색/필터 (날짜, 업종별)
  - [ ] 페이지네이션
  - [ ] 삭제 기능

### 우선순위 낮음
- [ ] AI 프롬프트 최적화
- [ ] 분석 대시보드
- [ ] 소셜 기능

---

## 실패 대비 (MVP에서 꼭 넣기)
- OpenAI 호출 실패 시: 친절한 재시도 메시지 + 로그 저장
- 생성 결과가 비어있을 때: "다시 만들기" 유도
- 결제 실패/취소 시: paywall로 복귀
- 에러 처리 및 사용자 피드백 강화

---

## 배포 체크리스트
- [ ] 환경 변수 설정 (Vercel)
- [ ] Supabase 프로덕션 DB 설정
- [ ] Stripe Webhook 엔드포인트 등록
- [ ] OpenAI API 키 설정
- [ ] 도메인 연결
- [ ] 실사용 테스트 (5명)
