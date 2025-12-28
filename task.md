# TASK — 사장님 인스타 (Antigravity 실행용)

## 목표 (이번 주)
- 링크로 바로 테스트 가능한 MVP 배포 (Vercel)
- 실제 사용자 5명 테스트
- Stripe 결제까지 end-to-end 확인
- 첫 유료 결제 1건 또는 “왜 결제 안 하는지” 명확한 데이터 확보

---

## 확정 스택
- Front/Server: Next.js (App Router)
- Hosting: Vercel
- DB/Auth: Supabase (MVP는 로그인 없이 visitor_id 기반)
- Payments: Stripe Subscription (₩5,900/월)
- AI: OpenAI API (권장: gpt-4o-mini)

---

## 범위 (이번 주 MVP)
### 포함
- 랜딩 `/`
- 글 생성 `/generate` (입력+결과+복사)
- 요금 `/pricing`
- 무료 제한 `/paywall`
- 결제 성공 `/success`
- API: `/api/generate`, `/api/checkout`, `/api/webhook`

### 제외 (지금 안 함)
- 업종 확장 (카페/미용실 외)
- 이미지 생성/편집
- 예약 발행/스케줄링
- 팀/직원/템플릿 관리
- 고급 분석 대시보드

---

## 작업 목록 (Must)
### A. 기본 세팅
- [ ] Next.js 프로젝트 생성 (App Router)
- [ ] 환경변수 세팅 (.env.local)
  - OPENAI_API_KEY
  - SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
  - STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_ID
- [ ] 배포 파이프라인 준비 (Vercel 연결)

### B. 데이터베이스 (Supabase)
- [ ] 테이블 생성: `generations`
- [ ] 테이블 생성: `subscriptions` (또는 `entitlements`)
- [ ] 최소 인덱스 추가 (visitor_id, created_at)

### C. 글 생성 엔진
- [ ] `/api/generate` 구현
- [ ] OpenAI 프롬프트 고정 (업종/톤/목적)
- [ ] 응답 포맷 강제 (캡션/스토리/댓글유도/해시태그)
- [ ] 결과를 Supabase에 저장

### D. 무료 3회 제한
- [ ] visitor_id 쿠키 발급 (첫 방문 시)
- [ ] 금일 생성 횟수 count 로직
- [ ] 3회 이상이면 `/paywall`로 유도

### E. 결제 (Stripe)
- [ ] `/api/checkout` 구현 (Checkout 세션 생성)
- [ ] `/api/webhook` 구현 (구독 활성화 기록)
- [ ] Paywall → Checkout → Success 흐름 확인
- [ ] 구독자에게 제한 해제 적용

### F. QA & 테스트
- [ ] 모바일(아이폰) 기준 UI 확인
- [ ] OpenAI 호출 실패/타임아웃 처리
- [ ] 무료 제한 정확히 동작하는지 확인
- [ ] 결제 성공 후 다시 생성 가능한지 확인

---

## 성공 기준 (이번 주)
- [ ] 실제 사장님 5명이 링크로 사용해봄
- [ ] 최소 3명 이상이 “복사해서 올릴 수 있겠다” 반응
- [ ] Stripe 테스트 결제 3회 성공 (개발자)
- [ ] 실제 유료 결제 1건 또는 이탈 이유 Top 3 확보
