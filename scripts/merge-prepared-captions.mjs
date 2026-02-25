import fs from 'fs';
import path from 'path';

const ROOT_DIR = '/Users/tuesdaymorning/Devguru/sajangnim_insta';
const DATA_DIR = path.join(ROOT_DIR, 'data');

const inputList = (process.env.MERGE_INPUTS || 'clean_captions_prepared.csv,all_posts_prepared.csv')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)
  .map((v) => (path.isAbsolute(v) ? v : path.join(DATA_DIR, v)));

const outputArg = process.env.MERGE_OUTPUT || 'merged_captions_prepared.csv';
const OUTPUT_PATH = path.isAbsolute(outputArg) ? outputArg : path.join(DATA_DIR, outputArg);

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

function toObject(headers, values) {
  const out = {};
  headers.forEach((h, idx) => {
    out[h] = values[idx] ?? '';
  });
  return out;
}

const merged = [];
const seenUrl = new Set();
const seenCaption = new Set();
let headers = null;

for (const inputPath of inputList) {
  if (!fs.existsSync(inputPath)) {
    console.warn(`skip missing file: ${inputPath}`);
    continue;
  }

  const text = fs.readFileSync(inputPath, 'utf8');
  const rows = parseCsv(text);
  if (rows.length === 0) continue;

  const fileHeaders = rows[0].map((h) => String(h).replace(/^\uFEFF/, '').trim());
  if (!headers) headers = fileHeaders;

  const body = rows.slice(1).map((row) => toObject(fileHeaders, row));
  for (const row of body) {
    const sourceUrl = String(row.source_url || '').trim();
    const captionNorm = String(row.caption || '').toLowerCase().replace(/\s+/g, ' ').trim();

    if (!sourceUrl || !captionNorm) continue;
    if (seenUrl.has(sourceUrl)) continue;
    if (seenCaption.has(captionNorm)) continue;

    seenUrl.add(sourceUrl);
    seenCaption.add(captionNorm);
    merged.push(row);
  }
}

if (!headers) {
  console.error('병합할 입력 CSV를 찾지 못했습니다.');
  process.exit(1);
}

const lines = [headers.join(',')];
for (const row of merged) {
  lines.push(headers.map((h) => csvEscape(row[h])).join(','));
}

fs.writeFileSync(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf8');

console.log('=== Merge prepared captions done ===');
console.log('inputs:', inputList.join(', '));
console.log('rows:', merged.length);
console.log('output:', OUTPUT_PATH);
