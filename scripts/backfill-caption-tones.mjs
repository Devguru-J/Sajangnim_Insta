import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function detectToneFromCaption(caption) {
  const text = (caption || '').toLowerCase();
  const emotionalScore =
    (text.match(/따뜻|포근|설레|기분|감사|행복|분위기|여유|잔잔|소소/g) || []).length +
    (text.match(/[💛🧡❤️✨🌿☕️🍓🫶🤍]/g) || []).length;
  const casualScore =
    (text.match(/진짜|완전|살짝|요즘|오늘은|느낌|ㅋㅋ|ㅎㅎ|굿|찐|ㅠㅠ|ㄷㄷ/g) || []).length +
    (text.match(/~|!{2,}/g) || []).length;
  const professionalScore =
    (text.match(/안내|운영|예약|공지|준비했습니다|제공됩니다|가능합니다|권장드립니다|추천드립니다|품절|오픈|마감/g) || []).length +
    (text.match(/습니다|입니다/g) || []).length;

  if (professionalScore >= casualScore && professionalScore >= emotionalScore) return 'PROFESSIONAL';
  if (emotionalScore >= casualScore) return 'EMOTIONAL';
  return 'CASUAL';
}

async function run() {
  const pageSize = 500;
  let from = 0;
  let totalUpdated = 0;
  const toneStats = { EMOTIONAL: 0, CASUAL: 0, PROFESSIONAL: 0 };

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('caption_examples')
      .select('id, caption, tone')
      .is('tone', null)
      .range(from, to);

    if (error) {
      console.error('조회 실패:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      const tone = detectToneFromCaption(row.caption);
      const { error: updateError } = await supabase
        .from('caption_examples')
        .update({ tone })
        .eq('id', row.id);

      if (updateError) {
        console.error(`업데이트 실패 (${row.id}):`, updateError.message);
        continue;
      }

      totalUpdated += 1;
      toneStats[tone] += 1;
    }

    console.log(`processed: ${from + data.length}, updated: ${totalUpdated}`);
    from += pageSize;
  }

  const { data: finalRows, error: finalError } = await supabase
    .from('caption_examples')
    .select('category, tone')
    .limit(2000);

  if (finalError) {
    console.error('최종 통계 조회 실패:', finalError.message);
    process.exit(1);
  }

  const finalStats = {};
  for (const row of finalRows || []) {
    const key = `${row.category || 'NULL'}|${row.tone || 'NULL'}`;
    finalStats[key] = (finalStats[key] || 0) + 1;
  }

  console.log('--- backfill done ---');
  console.log('updated:', totalUpdated);
  console.log('updated tone stats:', toneStats);
  console.log('final dist:', finalStats);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
