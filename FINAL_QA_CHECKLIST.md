# Final QA Checklist

## Goal
- Confirm the generation flow is usable enough for paid release.
- Focus on real caption quality, not just A/B metrics.

## Pre-check
- `npm run build`
- Pricing shows `2,900원` on:
  - `/pricing`
  - `/faq`
- `/api/generate` returns `200`, not `500`

## Test Matrix
- Industries:
  - cafe
  - restaurant
  - salon
- Tones:
  - EMOTIONAL
  - CASUAL
  - PROFESSIONAL
- Context input:
  - no extra context
  - weather only
  - inventory only
  - customer reaction only
  - all three filled

## What To Check
- Caption feels like a real owner wrote it
- No obvious AI phrases
- No broken Korean grammar
- No leftover hard-block words
- Tone clearly changes when tone option changes
- Input context is paraphrased, not copied
- Length stays roughly in target range

## Fail Patterns
- EMOTIONAL:
  - too poetic
  - ad-like warmth
  - phrases like `특별한`, `함께 나누고`, `마음을 사로잡`
- CASUAL:
  - too short
  - turns emotional
  - formal endings
- PROFESSIONAL:
  - too generic
  - too soft/emotional
  - promo wording

## Manual Sample Inputs
- Cafe:
  - `딸기라떼를 새로 만들었고 덜 달게 조정했다.`
  - weather: `비가 와서 따뜻한 음료 주문이 많다`
  - reaction: `시음한 손님이 덜 달아서 좋다고 했다`
- Restaurant:
  - `국물 베이스를 다시 잡아서 짠맛을 줄였다.`
  - inventory: `토핑은 일부 한정 수량`
  - reaction: `국물이 부드러워졌다는 반응이 있었다`
- Salon:
  - `다운펌 시술 시간을 줄였지만 유지력은 그대로다.`
  - weather: `비 오는 날이라 곱슬 관련 문의가 많다`
  - reaction: `손질이 편해졌다는 반응이 있었다`

## Release Gate
- EMOTIONAL confusion: at least `14/20`
- CASUAL confusion: at least `18/20`
- PROFESSIONAL confusion: at least `19/20`
- No major broken sentence in 10 manual generations
- No `/api/generate` runtime error
