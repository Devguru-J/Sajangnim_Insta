# AGENTS.md

## Project Summary
- Frontend: Vite + React + TypeScript
- API: Cloudflare Pages Functions + Hono
- Database/Auth: Supabase
- Payments: Stripe
- AI generation: OpenAI API
- RAG source: `caption_examples` in Supabase

## Key Paths
- Caption generation route: `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/routes/generate.ts`
- API app entry: `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/app.ts`
- Frontend generate form: `/Users/tuesdaymorning/Devguru/sajangnim_insta/src/components/GenerateForm.tsx`
- Pricing page: `/Users/tuesdaymorning/Devguru/sajangnim_insta/src/pages/Pricing.tsx`
- FAQ pricing copy: `/Users/tuesdaymorning/Devguru/sajangnim_insta/src/pages/FAQ.tsx`
- Supabase schema: `/Users/tuesdaymorning/Devguru/sajangnim_insta/supabase/schema.sql`
- Caption embedding script: `/Users/tuesdaymorning/Devguru/sajangnim_insta/scripts/embed-captions.ts`
- Caption preparation script: `/Users/tuesdaymorning/Devguru/sajangnim_insta/scripts/prepare-captions.mjs`
- Caption merge script: `/Users/tuesdaymorning/Devguru/sajangnim_insta/scripts/merge-prepared-captions.mjs`
- Tone A/B test: `/Users/tuesdaymorning/Devguru/sajangnim_insta/scripts/run-tone-ab-test.mjs`
- Tone analysis: `/Users/tuesdaymorning/Devguru/sajangnim_insta/scripts/analyze-tone-ab-results.mjs`
- Daily tone check runner: `/Users/tuesdaymorning/Devguru/sajangnim_insta/scripts/run-daily-tone-check.sh`

## Current Pricing
- Pro plan price: `2,900원 / 월`
- If price changes again, update both:
  - `/Users/tuesdaymorning/Devguru/sajangnim_insta/src/pages/Pricing.tsx`
  - `/Users/tuesdaymorning/Devguru/sajangnim_insta/src/pages/FAQ.tsx`

## Generation Quality Rules
- The generator uses multi-candidate generation, internal scoring, and rewrite passes.
- Tone-specific length rules:
  - `CASUAL`: `85~125자`
  - `EMOTIONAL`: `110~150자`
  - `PROFESSIONAL`: `110~150자`
- Hard-block terms are filtered/re-written and sanitized before final output.
- Tone retrieval uses Supabase RPC `match_captions`.

## RAG Workflow
1. Bring new crawler CSV into `/Users/tuesdaymorning/Devguru/sajangnim_insta/data/`
2. Prepare captions:
   - `INPUT_CSV=all_posts.csv OUTPUT_PREFIX=all_posts node scripts/prepare-captions.mjs`
3. Merge prepared captions:
   - `node scripts/merge-prepared-captions.mjs`
4. Embed merged captions:
   - `set -a; source .env; set +a`
   - `EMBED_BATCH_SIZE=10 CAPTIONS_CSV=merged_captions_prepared.csv node --experimental-strip-types scripts/embed-captions.ts`
5. Run daily A/B check:
   - `npm run ab:daily`

## Validation Commands
- Build:
  - `npm run build`
- Daily tone regression:
  - `npm run ab:daily`
- Latest analysis:
  - `node scripts/analyze-tone-ab-results.mjs --latest`

## Notes
- If `/api/generate` returns `500`, check `/Users/tuesdaymorning/Devguru/sajangnim_insta/functions/api/routes/generate.ts` first.
- Avoid committing large generated files in `/Users/tuesdaymorning/Devguru/sajangnim_insta/data/` unless explicitly needed.
- Supabase schema and migrations may be dirty locally; do not change them unless the task is schema-related.
