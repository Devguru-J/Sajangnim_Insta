# Instagram RAG Execution Checklist

## 완료
- [x] Hono API 리팩터링 (routes/lib/types 분리)
- [x] 톤 기반 RAG 검색 반영 (`match_tone`)
- [x] `caption_examples.tone` 컬럼 및 인덱스 추가
- [x] 생성 API에 톤 우선 검색 + fallback 검색 적용
- [x] 정제 스크립트 추가 (`scripts/prepare-captions.mjs`)
- [x] 임베딩 적재 스크립트 추가 (`scripts/embed-captions.ts`)
- [x] tone NULL 백필 스크립트 추가 및 실행 (`scripts/backfill-caption-tones.mjs`)
- [x] 톤별 RAG 검색 테스트 스크립트 추가 (`scripts/test-tone-rag.mjs`)

## 진행 중
- [ ] 추가 크롤링 데이터 수집
- [ ] owner-style 샘플 비율 확대

## 다음 액션 (우선순위)
- [ ] 신규 크롤링 데이터 병합 (`data/clean_captions.csv`)
- [ ] 정제 실행 (`node scripts/prepare-captions.mjs`)
- [ ] 임베딩 적재 (`CAPTIONS_CSV=clean_captions_prepared.csv node --experimental-strip-types scripts/embed-captions.ts`)
- [ ] tone 백필 재실행 (`node scripts/backfill-caption-tones.mjs`)
- [ ] 톤 RAG 테스트 재실행 (`node scripts/test-tone-rag.mjs`)

## 품질 개선 실험
- [ ] 동일 입력 톤 3종 생성 A/B 테스트 세트 만들기
- [ ] 어색함/톤구분/복붙감 점수표로 비교
- [ ] 재랭킹 가중치 튜닝

## 목표 기준
- [ ] 업종별 정제 샘플 300개 이상
- [ ] 톤별 샘플 80~100개 이상
- [ ] owner-style 비율 50% 이상
- [ ] salon PROFESSIONAL 샘플 확충

## 운영 루프
- [ ] 주 1회 배치 루틴 확정
- [ ] 실패 재시도 및 로그 모니터링 규칙 정리
