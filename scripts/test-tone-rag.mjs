import fs from 'fs';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const ENV_PATH = '/Users/tuesdaymorning/Devguru/sajangnim_insta/.env';

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

loadEnvFile(ENV_PATH);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const TEST_CASES = [
  {
    industry: 'cafe',
    input: '딸기 라떼 당도 낮춰서 다시 맞췄고 오늘 비 와서 따뜻한 음료 주문이 많았어요.',
  },
  {
    industry: 'restaurant',
    input: '점심시간 웨이팅이 길었고 오늘은 재료 소진이 빨라서 저녁 메뉴를 조금 조정했어요.',
  },
  {
    industry: 'salon',
    input: '비 오는 날이라 다운펌 문의가 많았고 예약 사이사이 손질 팁도 안내해드렸어요.',
  },
];

const TONES = ['EMOTIONAL', 'CASUAL', 'PROFESSIONAL'];

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function run() {
  const rows = [];
  const sampleRows = [];

  for (const testCase of TEST_CASES) {
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testCase.input,
    });
    const queryEmbedding = `[${emb.data[0].embedding.join(',')}]`;

    for (const tone of TONES) {
      const { data, error } = await supabase.rpc('match_captions', {
        query_embedding: queryEmbedding,
        match_category: testCase.industry,
        match_count: 8,
        match_tone: tone,
      });

      if (error) {
        rows.push({
          industry: testCase.industry,
          tone,
          count: 0,
          avgSimilarity: 0,
          toneMatchRate: 0,
          error: error.message,
        });
        continue;
      }

      const list = data || [];
      const toneMatched = list.filter((item) => (item.tone || '').toUpperCase() === tone).length;
      const similarities = list.map((item) => Number(item.similarity || 0));

      rows.push({
        industry: testCase.industry,
        tone,
        count: list.length,
        avgSimilarity: avg(similarities),
        toneMatchRate: list.length ? toneMatched / list.length : 0,
        error: '',
      });

      if (list[0]) {
        sampleRows.push({
          industry: testCase.industry,
          tone,
          similarity: Number(list[0].similarity || 0),
          sample: String(list[0].caption || '').slice(0, 120).replace(/\s+/g, ' '),
        });
      }
    }
  }

  console.log('=== Tone RAG Retrieval Test ===');
  for (const row of rows) {
    console.log(
      `${row.industry}\t${row.tone}\tcount=${row.count}\tavgSim=${row.avgSimilarity.toFixed(3)}\ttoneMatch=${(row.toneMatchRate * 100).toFixed(1)}%${row.error ? `\terror=${row.error}` : ''}`
    );
  }

  console.log('\n=== Top Sample by Tone ===');
  for (const row of sampleRows) {
    console.log(`${row.industry}\t${row.tone}\tsim=${row.similarity.toFixed(3)}\t${row.sample}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
