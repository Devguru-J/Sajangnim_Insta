import fs from 'fs';
import path from 'path';

const ROOT_DIR = '/Users/tuesdaymorning/Devguru/sajangnim_insta';
const DATA_DIR = path.join(ROOT_DIR, 'data');

const inputArg = process.env.INPUT_CSV || 'clean_captions.csv';
const outputPrefixArg = process.env.OUTPUT_PREFIX || 'clean_captions';

const INPUT_PATH = path.isAbsolute(inputArg) ? inputArg : path.join(DATA_DIR, inputArg);
const OUTPUT_PATH = path.join(DATA_DIR, `${outputPrefixArg}_prepared.csv`);
const REJECTED_PATH = path.join(DATA_DIR, `${outputPrefixArg}_rejected.csv`);
const OWNER_OUTPUT_PATH = path.join(DATA_DIR, `${outputPrefixArg}_owner_style.csv`);
const OWNER_STRICT_OUTPUT_PATH = path.join(DATA_DIR, `${outputPrefixArg}_owner_strict.csv`);

const INDUSTRY_MAP = new Map([
  ['카페', 'CAFE'],
  ['커피', 'CAFE'],
  ['베이커리', 'CAFE'],
  ['맛집', 'RESTAURANT'],
  ['식당', 'RESTAURANT'],
  ['음식점', 'RESTAURANT'],
  ['미용실', 'SALON'],
  ['뷰티', 'SALON'],
  ['헤어', 'SALON'],
  ['헬스', 'GYM'],
  ['피트니스', 'GYM'],
]);

const STOP_PATTERNS = [
  /팔로우/i,
  /저장\s*(후|필수|하고)?/i,
  /DM\b/i,
  /메신저/i,
  /링크\s*보내/i,
  /추천\s*\d+\s*곳/i,
  /모음집/i,
  /가이드/i,
  /광고/i,
  /협찬/i,
  /제공받/i,
  /문의/i,
  /예약\s*문의/i,
  /공구/i,
  /판매\s*중/i,
  /라인업/i,
  /오픈\s*중/i,
  /카페\s*추천/i,
  /데이트/i,
  /가볼/i,
  /방문해보세요/i,
  /에디터/i,
  /모음은\s*계속/i,
  /인생샷/i,
  /\bTOP\b/i,
  /\d+\s*군데/i,
  /\d+\s*곳/i,
];

const OWNER_VOICE_HINTS = [
  /오늘/,
  /저희/,
  /우리/,
  /준비/,
  /만들/,
  /품절/,
  /오픈/,
  /마감/,
  /손님/,
  /주문/,
  /찾아주/,
  /감사/,
  /매장/,
  /운영/,
  /재고/,
];

const GUIDE_OR_REVIEW_HINTS = [
  /추천/,
  /소개/,
  /가봤/,
  /다녀왔/,
  /에디터/,
  /데이트/,
  /여행/,
  /위치\s*:/,
  /영업시간/,
  /주차/,
  /가격/,
  /한눈에/,
  /모음/,
  /태그/,
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeWhitespace(text) {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function stripNoise(text) {
  let t = text;
  t = t.replace(/^\s*[a-z0-9_.]+\s+((수정됨\s*•\s*)?\d+주\s*)?/i, '');
  t = t.replace(/@[a-z0-9_.]+/gi, '');
  t = t.replace(/#\S+/g, '');
  t = t.replace(/\s{2,}/g, ' ');
  return normalizeWhitespace(t);
}

function inferIndustry(industryRaw, hashtagRaw, caption) {
  const candidates = [industryRaw, hashtagRaw, caption].filter(Boolean);
  for (const candidate of candidates) {
    for (const [keyword, mapped] of INDUSTRY_MAP.entries()) {
      if (String(candidate).includes(keyword)) return mapped;
    }
  }
  return 'OTHER';
}

function inferTone(text) {
  const t = text.toLowerCase();
  const pro = (t.match(/안내|운영|공지|예약|준비했습니다|가능합니다|오픈|마감/g) || []).length;
  const emo = (t.match(/감사|행복|따뜻|설레|여유|기분|포근|좋네요/g) || []).length + (t.match(/[💛🧡❤️✨🌿☕️🍓]/g) || []).length;
  if (pro >= 2) return 'PROFESSIONAL';
  if (emo >= 2) return 'EMOTIONAL';
  return 'CASUAL';
}

function isMostlyKorean(text) {
  const letters = (text.match(/[A-Za-z가-힣]/g) || []).length;
  const korean = (text.match(/[가-힣]/g) || []).length;
  if (letters < 20) return true;
  return korean / letters >= 0.35;
}

function looksLikeListicle(text) {
  const numbered = (text.match(/\b\d+[.)]/g) || []).length;
  const bullets = (text.match(/[•▪◽◾✅✔️]/g) || []).length;
  const lines = text.split('\n').length;
  return numbered >= 3 || bullets >= 8 || lines >= 12;
}

function hasStopPattern(text) {
  return STOP_PATTERNS.some((p) => p.test(text));
}

function qualityFilter(text) {
  if (text.length < 45 || text.length > 320) return { ok: false, reason: 'length' };
  if (!isMostlyKorean(text)) return { ok: false, reason: 'language' };
  if (looksLikeListicle(text)) return { ok: false, reason: 'listicle' };
  if (hasStopPattern(text)) return { ok: false, reason: 'ad_or_curation' };
  if ((text.match(/\n/g) || []).length > 6) return { ok: false, reason: 'too_many_lines' };
  if ((text.match(/[!?]/g) || []).length > 8) return { ok: false, reason: 'noisy_punctuation' };
  return { ok: true, reason: '' };
}

function ownerVoiceFilter(text) {
  const ownerHits = OWNER_VOICE_HINTS.reduce((acc, p) => acc + (p.test(text) ? 1 : 0), 0);
  if (ownerHits < 1) return { ok: false, reason: 'not_owner_voice', ownerHits, guideHits: 0 };

  const guideHits = GUIDE_OR_REVIEW_HINTS.reduce((acc, p) => acc + (p.test(text) ? 1 : 0), 0);
  if (guideHits >= 2) return { ok: false, reason: 'guide_or_reviewer_tone', ownerHits, guideHits };

  return { ok: true, reason: '', ownerHits, guideHits };
}

function strictOwnerVoiceFilter(text) {
  const owner = ownerVoiceFilter(text);
  if (!owner.ok) return { ok: false, reason: owner.reason };
  if (owner.ownerHits < 2) return { ok: false, reason: 'owner_signal_weak' };
  if (owner.guideHits > 0) return { ok: false, reason: 'contains_guide_signal' };
  if (text.length < 55 || text.length > 240) return { ok: false, reason: 'strict_length' };
  if (/📍|영업시간|주차|위치\s*:/.test(text)) return { ok: false, reason: 'store_listing_style' };
  if ((text.match(/[💛🧡❤️✨🌿☕️🍓🎂🍰🥐📌📷📍]/g) || []).length > 6) return { ok: false, reason: 'emoji_heavy' };
  return { ok: true, reason: '' };
}

function buildPreparedRow(raw) {
  const industryRaw = raw['업종'] || '';
  const hashtagRaw = raw['해시태그'] || '';
  const bodyRaw = raw['본문'] || '';

  const cleaned = stripNoise(bodyRaw);
  const industry = inferIndustry(industryRaw, hashtagRaw, cleaned);
  const tone = inferTone(cleaned);
  const likes = Number.parseInt(String(raw['좋아요'] || '0'), 10) || 0;

  return {
    source_url: String(raw['URL'] || '').trim(),
    caption: cleaned,
    industry,
    likes,
    collected_at: String(raw['수집일시'] || '').trim(),
    hashtag: String(hashtagRaw || '').trim(),
    tone_hint: tone,
    is_ad: 'false',
    lang: 'ko',
  };
}

function toObjectRow(headers, values) {
  const obj = {};
  headers.forEach((header, idx) => {
    obj[header] = values[idx] ?? '';
  });
  return obj;
}

const rawText = fs.readFileSync(INPUT_PATH, 'utf8');
const parsedRows = parseCsv(rawText);
if (parsedRows.length === 0) {
  console.error('입력 CSV가 비어 있습니다.');
  process.exit(1);
}

const headers = parsedRows[0].map((h) => String(h).replace(/^\uFEFF/, '').trim());
const dataRows = parsedRows.slice(1).map((row) => toObjectRow(headers, row));

const seenUrl = new Set();
const seenCaption = new Set();
const accepted = [];
const ownerAccepted = [];
const ownerStrictAccepted = [];
const rejected = [];
const rejectStats = new Map();

for (const row of dataRows) {
  const prepared = buildPreparedRow(row);

  if (!prepared.source_url) {
    rejected.push({ ...prepared, reject_reason: 'missing_url' });
    rejectStats.set('missing_url', (rejectStats.get('missing_url') || 0) + 1);
    continue;
  }

  if (seenUrl.has(prepared.source_url)) {
    rejected.push({ ...prepared, reject_reason: 'duplicate_url' });
    rejectStats.set('duplicate_url', (rejectStats.get('duplicate_url') || 0) + 1);
    continue;
  }

  const normCaption = prepared.caption.toLowerCase().replace(/\s+/g, ' ').trim();
  if (seenCaption.has(normCaption)) {
    rejected.push({ ...prepared, reject_reason: 'duplicate_caption' });
    rejectStats.set('duplicate_caption', (rejectStats.get('duplicate_caption') || 0) + 1);
    continue;
  }

  const q = qualityFilter(prepared.caption);
  if (!q.ok) {
    rejected.push({ ...prepared, reject_reason: q.reason });
    rejectStats.set(q.reason, (rejectStats.get(q.reason) || 0) + 1);
    continue;
  }

  seenUrl.add(prepared.source_url);
  seenCaption.add(normCaption);
  accepted.push(prepared);

  const ownerQ = ownerVoiceFilter(prepared.caption);
  if (ownerQ.ok) {
    ownerAccepted.push(prepared);
    const strictQ = strictOwnerVoiceFilter(prepared.caption);
    if (strictQ.ok) {
      ownerStrictAccepted.push(prepared);
    }
  }
}

const outputHeaders = ['source_url', 'caption', 'industry', 'likes', 'collected_at', 'hashtag', 'tone_hint', 'is_ad', 'lang'];
const rejectedHeaders = [...outputHeaders, 'reject_reason'];

const outLines = [outputHeaders.join(',')];
for (const row of accepted) {
  outLines.push(outputHeaders.map((h) => csvEscape(row[h])).join(','));
}

const rejectedLines = [rejectedHeaders.join(',')];
for (const row of rejected) {
  rejectedLines.push(rejectedHeaders.map((h) => csvEscape(row[h])).join(','));
}

fs.writeFileSync(OUTPUT_PATH, outLines.join('\n') + '\n', 'utf8');
fs.writeFileSync(REJECTED_PATH, rejectedLines.join('\n') + '\n', 'utf8');

const ownerLines = [outputHeaders.join(',')];
for (const row of ownerAccepted) {
  ownerLines.push(outputHeaders.map((h) => csvEscape(row[h])).join(','));
}
fs.writeFileSync(OWNER_OUTPUT_PATH, ownerLines.join('\n') + '\n', 'utf8');

const ownerStrictLines = [outputHeaders.join(',')];
for (const row of ownerStrictAccepted) {
  ownerStrictLines.push(outputHeaders.map((h) => csvEscape(row[h])).join(','));
}
fs.writeFileSync(OWNER_STRICT_OUTPUT_PATH, ownerStrictLines.join('\n') + '\n', 'utf8');

const industryStats = accepted.reduce((acc, row) => {
  acc[row.industry] = (acc[row.industry] || 0) + 1;
  return acc;
}, {});

console.log('=== Prepare captions done ===');
console.log('input file:', INPUT_PATH);
console.log('input rows:', dataRows.length);
console.log('accepted rows:', accepted.length);
console.log('owner-style rows:', ownerAccepted.length);
console.log('owner-strict rows:', ownerStrictAccepted.length);
console.log('rejected rows:', rejected.length);
console.log('industry stats:', industryStats);
console.log('reject stats:', Object.fromEntries(rejectStats.entries()));
console.log('output:', OUTPUT_PATH);
console.log('owner output:', OWNER_OUTPUT_PATH);
console.log('owner strict output:', OWNER_STRICT_OUTPUT_PATH);
console.log('rejected:', REJECTED_PATH);
