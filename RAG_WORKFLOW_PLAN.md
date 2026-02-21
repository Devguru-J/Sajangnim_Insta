# 인스타 캡션 품질 개선 워크플로우 (현재 `/api` 서버 기반)

## 목표
- AI 티를 줄이고, 실제 사장님이 쓴 것 같은 자연스러운 캡션 생성
- 수집 데이터(크롤링)를 지속적으로 참고해 결과 품질을 개선
- 후보 2~3개 생성 후 내부 점수로 최종안 선택

## 아키텍처 결정
- 1단계는 **현재 API 서버(Cloudflare Functions `/api`)에서 임베딩 생성/저장**으로 진행
- Supabase는 벡터 저장/검색 및 운영 데이터 관리에 사용
- Supabase Edge Function은 추후 배치 트래픽이 커질 때 분리

---

## 1. 준비물 체크리스트

## 필수
- `OPENAI_API_KEY` 서버 환경변수 등록
- Supabase에 `pgvector` 활성화
- `caption_examples` 테이블 + 벡터 인덱스 준비
- 크롤링 데이터(raw) 확보

## 권장
- 정제 규칙 문서(삭제/보존 기준)
- 품질 점수 기준(자연스러움/구체성/전환성)

---

## 2. 데이터 스키마 (권장)

`caption_examples`
- `id` (uuid, pk)
- `category` (text) 예: CAFE, RESTAURANT, SALON
- `tone` (text) 예: CASUAL, WARM, PROFESSIONAL
- `caption` (text)
- `source_url` (text, unique)
- `likes` (int)
- `quality_score` (int)
- `embedding` (vector(1536))
- `created_at` (timestamptz)

추가 권장:
- `weather_context` (text)
- `inventory_context` (text)
- `customer_reaction_context` (text)

---

## 3. 실행 워크플로우

1. 수집
- 크롤러 결과를 raw 파일/테이블에 저장

2. 정제
- 룰 기반 1차 필터링:
  - 과도한 광고 문구 제거
  - 너무 짧거나 긴 캡션 제거
  - 해시태그만 나열된 캡션 제거
- (선택) LLM 필터링:
  - 자연스러움/맥락 점수로 저품질 제외

3. 임베딩 생성
- 정제된 캡션만 배치로 OpenAI 임베딩 생성
- `caption_examples.embedding`에 upsert

4. RAG 검색
- 생성 요청 시 입력을 요약해 검색 쿼리 구성:
  - 업종 + 톤 + 오늘 상황(날씨/재고/손님반응)
- 벡터 Top-K(예: 5~8개) + 메타 필터(category, tone)

5. 생성
- 검색된 예시를 문체/리듬 참고용으로만 사용
- 후보 2~3개 생성
- 규칙: 예시 문장 복붙 금지, 사실 기반 상황 반영

6. 재랭킹(내부 점수)
- 자연스러움(40)
- 구체성/현장감(35)
- 행동유도/홍보성(25)
- 최고 점수 1개 최종 채택

7. 저장/분석
- 후보별 점수 + 최종 선택 결과 저장
- 사용자 수정 로그(있다면) 함께 저장

8. 주간 개선 루프
- 고성과 문장 패턴 가중치 상승
- 저품질/어색 샘플 제거
- 업종별/톤별 샘플 비율 재조정

---

## 4. API 작업 단위 (현재 코드베이스 기준)

1. 임베딩 배치 엔드포인트
- `POST /api/caption-examples/embed`
- 입력: 정제된 캡션 배열
- 처리: 임베딩 생성 후 upsert

2. 검색 함수
- `searchCaptionExamples({ category, tone, queryEmbedding, topK })`

3. 생성 엔드포인트 확장
- 기존 생성 API에 RAG 검색 + 후보 2~3개 + 재랭킹 추가

4. 로그 저장
- `generation_candidates`(or 기존 generations 확장) 테이블에 후보/점수/선택 결과 저장

---

## 5. 품질 가드레일 (중요)

- 금지:
  - 입력 문장 복붙
  - 예시 문장 직복사
  - 과한 AI 말투(과장된 감성/추상어 반복)
- 강제:
  - 오늘 상황 최소 1개 반영(날씨/재고/손님 반응 중)
  - 제품/서비스 구체 정보 1개 이상
  - 마지막 문장 CTA(방문/DM/주문 유도)

---

## 6. 1주 실행 플랜

Day 1
- 스키마 확정 및 마이그레이션 점검

Day 2
- 정제 스크립트 완성 + 샘플 300개 정제

Day 3
- 임베딩 배치 API 구현 + 적재

Day 4
- 생성 API에 RAG 검색 연결

Day 5
- 후보 3개 + 재랭킹 적용

Day 6
- QA: 어색한 문장 케이스 30개 테스트

Day 7
- 점수/로그 기반 1차 튜닝

---

## 7. 성공 지표 (최소)

- 어색 문장 비율 감소 (수동 평가)
- 사용자 수정률 감소
- 최종 선택 캡션 재사용률 증가
- 생성 후 즉시 게시 가능한 비율 증가

---

## 8. 다음 액션

1. `caption_examples` 최종 컬럼 확정
2. 임베딩 배치 엔드포인트 구현
3. 생성 API에 RAG + 재랭킹 적용
4. 샘플 300개로 오프라인 품질 테스트

---

## 9. Hono API 구조 (리팩터링 반영)

현재 API는 Hono 기반으로 아래처럼 분리:

- `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/[[route]].ts`
  - 엔트리포인트 (Cloudflare Pages `onRequest`)
- `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/app.ts`
  - Hono 앱 생성, 공통 미들웨어(CORS), 라우트 등록
- `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/types.ts`
  - 환경변수 타입 정의
- `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/lib/clients.ts`
  - Supabase/OpenAI/Stripe 클라이언트 생성
- `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/lib/auth.ts`
  - 공통 인증(`requireUser`)
- `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/routes/*`
  - 도메인 라우트 분리 (`generate`, `history`, `profile`, `subscription`, `stripe`, `juso`, `health`)

의도:
- 단일 1000+줄 파일 제거
- 기능별 책임 분리
- 이후 RAG/임베딩 배치 API를 `routes/generate.ts` 또는 신규 `routes/caption-examples.ts`로 확장하기 쉽게 구성

추천 확장 순서:
1. `routes/caption-examples.ts` 추가 (`/caption-examples/embed`, `/caption-examples/search`)
2. `lib/rag.ts`, `lib/scoring.ts`로 생성 로직 추가 분리
3. 실패 재시도/배치 처리를 위한 job 테이블 추가
