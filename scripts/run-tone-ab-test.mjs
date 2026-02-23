import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const ROOT = '/Users/tuesdaymorning/Devguru/sajangnim_insta';
const ENV_PATH = path.join(ROOT, '.env');
const INPUT_PATH = path.join(ROOT, 'data', 'ab_test_inputs.json');
const OUTPUT_DIR = path.join(ROOT, 'data');

const TONES = ['EMOTIONAL', 'CASUAL', 'PROFESSIONAL'];
const TONE_GUIDE = {
  EMOTIONAL: '감정과 분위기를 담되 과장하지 않는 따뜻한 일상 톤',
  CASUAL: '친한 단골에게 말하듯 편하고 자연스러운 구어체 톤',
  PROFESSIONAL: '차분하고 신뢰감 있는 안내형 톤, 과장 금지',
};

const AI_LIKE_PATTERNS = [
  /여러분/g, /고객님/g, /만나보세요/g, /오세요/g, /지금\s*바로/g, /놓치지\s*마세요/g, /특별한/g, /완벽한/g, /최고의/g,
];
const GENERIC_CAPTION_PATTERNS = [
  /좋은\s*하루/g, /기분이\s*좋네요/g, /잘\s*어울리는\s*음료/gi, /상큼하고\s*부드럽/gi, /반응도\s*좋았/gi, /것\s*같아요/g, /입니다\./g,
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function toCsvValue(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function normalizeForComparison(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/[.,!?~]/g, '').trim().toLowerCase();
}

function detectToneFromCaption(caption) {
  const text = String(caption || '').toLowerCase();
  const emotionalScore =
    (text.match(/따뜻|포근|설레|기분|감사|행복|분위기|여유|잔잔|소소/g) || []).length +
    (text.match(/[💛🧡❤️✨🌿☕️🍓]/g) || []).length;
  const casualScore =
    (text.match(/진짜|완전|살짝|요즘|오늘은|느낌|ㅋㅋ|ㅎㅎ|굿|찐/g) || []).length +
    (text.match(/~|!{2,}/g) || []).length;
  const professionalScore =
    (text.match(/안내|운영|예약|공지|준비했습니다|제공됩니다|가능합니다|권장드립니다|추천드립니다|품절|오픈|마감/g) || []).length +
    (text.match(/습니다|입니다/g) || []).length;

  if (professionalScore >= casualScore && professionalScore >= emotionalScore) return 'PROFESSIONAL';
  if (emotionalScore >= casualScore) return 'EMOTIONAL';
  return 'CASUAL';
}

function getCaptionIssues(caption) {
  const issues = [];
  const trimmed = String(caption || '').trim();
  if (trimmed.length < 90 || trimmed.length > 180) issues.push('length');

  const aiHits = AI_LIKE_PATTERNS.reduce((sum, regex) => sum + ((trimmed.match(regex) || []).length), 0);
  if (aiHits > 0) issues.push('ai_like');

  const genericHits = GENERIC_CAPTION_PATTERNS.reduce((sum, regex) => sum + ((trimmed.match(regex) || []).length), 0);
  if (genericHits > 0) issues.push('generic');

  const exclamationCount = (trimmed.match(/!/g) || []).length;
  if (exclamationCount >= 3) issues.push('too_many_exclamation');

  return issues;
}

function scoreCaption({ caption, expectedTone, sourceText }) {
  const trimmed = String(caption || '').trim();
  const issues = getCaptionIssues(trimmed);
  const targetLength = 125;

  const lengthScore = Math.max(0, 32 - Math.abs(trimmed.length - targetLength) * 0.5);
  const detectedTone = detectToneFromCaption(trimmed);
  const toneScore = detectedTone === expectedTone ? 22 : 0;

  const sourceKeywords = new Set(
    String(sourceText || '')
      .toLowerCase()
      .split(/[^0-9a-zA-Z가-힣]+/)
      .filter((t) => t.length >= 2)
      .slice(0, 30)
  );
  const captionKeywords = new Set(
    trimmed
      .toLowerCase()
      .split(/[^0-9a-zA-Z가-힣]+/)
      .filter((t) => t.length >= 2)
  );
  let overlap = 0;
  for (const token of sourceKeywords) {
    if (captionKeywords.has(token)) overlap += 1;
  }
  const relevanceScore = Math.min(20, overlap * 2);

  const copyPenalty = normalizeForComparison(trimmed).includes(normalizeForComparison(sourceText).slice(0, 30)) ? 8 : 0;
  const issuePenalty = issues.length * 8;

  const total = 30 + lengthScore + toneScore + relevanceScore - issuePenalty - copyPenalty;
  return {
    total: Number(total.toFixed(2)),
    detectedTone,
    issues: issues.join('|'),
  };
}

function parseJsonResult(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    return String(parsed.caption || '').trim();
  } catch {
    return '';
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 20;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number(args[i + 1]);
      i += 1;
    }
  }
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  return { limit };
}

async function fetchExamples({ supabase, openai, category, tone, inputText }) {
  const emb = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: inputText,
  });
  const queryEmbedding = `[${emb.data[0].embedding.join(',')}]`;

  const { data: toneRows } = await supabase.rpc('match_captions', {
    query_embedding: queryEmbedding,
    match_category: category,
    match_count: 9,
    match_tone: tone,
  });

  const merged = [...(toneRows || [])];
  if (merged.length < 4) {
    const { data: fallbackRows } = await supabase.rpc('match_captions', {
      query_embedding: queryEmbedding,
      match_category: category,
      match_count: 12,
      match_tone: null,
    });
    const seen = new Set(merged.map((r) => r.caption));
    for (const row of fallbackRows || []) {
      if (!seen.has(row.caption)) {
        merged.push(row);
        seen.add(row.caption);
      }
      if (merged.length >= 12) break;
    }
  }

  return merged.slice(0, 4).map((row) => String(row.caption || '').replace(/\s+/g, ' ').trim());
}

async function generateByTone({ openai, model, category, tone, content, weather, inventoryStatus, customerReaction, examples }) {
  let systemPrompt = `너는 ${category} 매장 사장님이다.
톤: ${tone}
톤 설명: ${TONE_GUIDE[tone]}
규칙:
- 100~150자
- 광고 과장 문구 금지
- 실제 매장 상황처럼 자연스럽게 작성
- 문장 끝맺음 반복 금지
- 입력 문장을 그대로 복붙하지 말고 의역
JSON으로 {"caption":"..."} 만 응답`;

  if (examples.length > 0) {
    systemPrompt += `\n참고 예시:\n${examples.map((e, i) => `${i + 1}. ${e.slice(0, 150)}`).join('\n')}`;
  }

  const userPrompt = `홍보 내용: ${content}
오늘 상황:
- 날씨: ${weather || '미입력'}
- 재고/운영상황: ${inventoryStatus || '미입력'}
- 손님 반응: ${customerReaction || '미입력'}`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.85,
  });

  return parseJsonResult(completion.choices[0]?.message?.content);
}

async function main() {
  loadEnvFile(ENV_PATH);
  const { limit } = parseArgs();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const GENERATION_MODEL = process.env.OPENAI_GENERATION_MODEL || 'gpt-4o-mini';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
    throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY가 필요합니다.');
  }

  const inputs = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const cases = inputs.slice(0, limit);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const rows = [];
  const summaryByTone = {
    EMOTIONAL: { count: 0, score: 0 },
    CASUAL: { count: 0, score: 0 },
    PROFESSIONAL: { count: 0, score: 0 },
  };

  console.log(`A/B 테스트 시작: cases=${cases.length}, tones=${TONES.length}, model=${GENERATION_MODEL}`);

  for (let idx = 0; idx < cases.length; idx++) {
    const testCase = cases[idx];
    const sourceText = `${testCase.content}\n${testCase.weather}\n${testCase.inventoryStatus}\n${testCase.customerReaction}`;
    console.log(`[${idx + 1}/${cases.length}] ${testCase.id} (${testCase.category})`);

    for (const tone of TONES) {
      try {
        const examples = await fetchExamples({
          supabase,
          openai,
          category: testCase.category,
          tone,
          inputText: sourceText,
        });

        const caption = await generateByTone({
          openai,
          model: GENERATION_MODEL,
          category: testCase.category,
          tone,
          content: testCase.content,
          weather: testCase.weather,
          inventoryStatus: testCase.inventoryStatus,
          customerReaction: testCase.customerReaction,
          examples,
        });

        const score = scoreCaption({
          caption,
          expectedTone: tone,
          sourceText,
        });

        rows.push({
          case_id: testCase.id,
          category: testCase.category,
          tone,
          score: score.total,
          detected_tone: score.detectedTone,
          issues: score.issues,
          caption,
          example_count: examples.length,
        });

        summaryByTone[tone].count += 1;
        summaryByTone[tone].score += score.total;
      } catch (error) {
        rows.push({
          case_id: testCase.id,
          category: testCase.category,
          tone,
          score: 0,
          detected_tone: 'ERROR',
          issues: String(error?.message || error),
          caption: '',
          example_count: 0,
        });
      }
    }
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const csvPath = path.join(OUTPUT_DIR, `ab_tone_test_results_${stamp}.csv`);
  const summaryPath = path.join(OUTPUT_DIR, `ab_tone_test_summary_${stamp}.md`);

  const headers = ['case_id', 'category', 'tone', 'score', 'detected_tone', 'issues', 'example_count', 'caption'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => toCsvValue(row[h])).join(','));
  }
  fs.writeFileSync(csvPath, lines.join('\n') + '\n', 'utf8');

  const summaryLines = [];
  summaryLines.push('# Tone A/B Test Summary');
  summaryLines.push('');
  summaryLines.push(`- model: ${GENERATION_MODEL}`);
  summaryLines.push(`- cases: ${cases.length}`);
  summaryLines.push(`- generated rows: ${rows.length}`);
  summaryLines.push('');
  summaryLines.push('## Average Score by Tone');
  for (const tone of TONES) {
    const count = summaryByTone[tone].count || 1;
    const avg = summaryByTone[tone].score / count;
    summaryLines.push(`- ${tone}: ${avg.toFixed(2)} (${summaryByTone[tone].count} samples)`);
  }
  summaryLines.push('');
  summaryLines.push(`- results csv: ${csvPath}`);
  summaryLines.push(`- summary md: ${summaryPath}`);
  fs.writeFileSync(summaryPath, summaryLines.join('\n') + '\n', 'utf8');

  console.log(`완료: ${csvPath}`);
  console.log(`완료: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
