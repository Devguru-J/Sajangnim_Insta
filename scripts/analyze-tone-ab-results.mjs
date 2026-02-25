import fs from 'fs';
import path from 'path';

const DATA_DIR = '/Users/tuesdaymorning/Devguru/sajangnim_insta/data';

function parseArgs() {
  const args = process.argv.slice(2);
  let file = '';
  let latest = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      file = args[i + 1];
      latest = false;
      i += 1;
    }
    if (args[i] === '--latest') {
      latest = true;
    }
  }

  return { file, latest };
}

function findLatestResultCsv() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((name) => name.startsWith('ab_tone_test_results_') && name.endsWith('.csv'))
    .sort();

  if (files.length === 0) return '';
  return path.join(DATA_DIR, files[files.length - 1]);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeBoolFrom01(v) {
  return String(v ?? '').trim() === '1';
}

function pushMapCount(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function main() {
  const { file, latest } = parseArgs();
  const inputPath = latest ? findLatestResultCsv() : file;

  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('분석할 결과 CSV를 찾을 수 없습니다. --file 경로를 지정하거나 먼저 run-tone-ab-test를 실행하세요.');
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(inputPath, 'utf8'));
  if (rows.length === 0) {
    console.error('결과 CSV가 비어 있습니다.');
    process.exit(1);
  }

  const tones = ['EMOTIONAL', 'CASUAL', 'PROFESSIONAL'];
  const byToneScores = { EMOTIONAL: [], CASUAL: [], PROFESSIONAL: [] };
  const passByTone = {
    EMOTIONAL: { pass: 0, total: 0 },
    CASUAL: { pass: 0, total: 0 },
    PROFESSIONAL: { pass: 0, total: 0 },
  };
  const confusion = {};
  const issueByTone = { EMOTIONAL: {}, CASUAL: {}, PROFESSIONAL: {} };
  const lowRows = [];

  for (const expected of tones) {
    confusion[expected] = { EMOTIONAL: 0, CASUAL: 0, PROFESSIONAL: 0, ERROR: 0 };
  }

  for (const row of rows) {
    const tone = row.tone || 'UNKNOWN';
    const detected = row.detected_tone || 'ERROR';
    const score = safeNum(row.score);
    const issues = String(row.issues || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    if (byToneScores[tone]) byToneScores[tone].push(score);
    if (passByTone[tone]) {
      const lengthOk = safeBoolFrom01(row.length_ok);
      const hardBlocked = safeBoolFrom01(row.hard_blocked);
      passByTone[tone].total += 1;
      if (lengthOk && !hardBlocked) passByTone[tone].pass += 1;
    }
    if (confusion[tone]) {
      if (!confusion[tone][detected]) confusion[tone][detected] = 0;
      confusion[tone][detected] += 1;
    }

    for (const issue of issues) {
      pushMapCount(issueByTone[tone] || (issueByTone[tone] = {}), issue);
    }

    if (score < 70) {
      lowRows.push({
        case_id: row.case_id,
        tone,
        detected,
        score,
        issues: row.issues,
        caption: String(row.caption || '').slice(0, 120).replace(/\s+/g, ' '),
      });
    }
  }

  lowRows.sort((a, b) => a.score - b.score);

  const out = [];
  out.push('# Tone A/B Analysis Report');
  out.push('');
  out.push(`- source: ${inputPath}`);
  out.push(`- rows: ${rows.length}`);
  out.push('');

  out.push('## Average Score by Expected Tone');
  for (const tone of tones) {
    out.push(`- ${tone}: ${avg(byToneScores[tone]).toFixed(2)} (${byToneScores[tone].length} samples)`);
  }
  out.push('');

  out.push('## Tone Confusion Matrix (expected -> detected)');
  for (const tone of tones) {
    const row = confusion[tone];
    out.push(`- ${tone}: EMOTIONAL=${row.EMOTIONAL || 0}, CASUAL=${row.CASUAL || 0}, PROFESSIONAL=${row.PROFESSIONAL || 0}, ERROR=${row.ERROR || 0}`);
  }
  out.push('');

  out.push('## Pass Rate (length_ok=1 and hard_blocked=0)');
  for (const tone of tones) {
    const total = passByTone[tone].total || 1;
    const pass = passByTone[tone].pass || 0;
    const rate = (pass / total) * 100;
    out.push(`- ${tone}: ${pass}/${passByTone[tone].total} (${rate.toFixed(1)}%)`);
  }
  out.push('');

  out.push('## Frequent Issues by Tone');
  for (const tone of tones) {
    const entries = Object.entries(issueByTone[tone] || {}).sort((a, b) => b[1] - a[1]);
    const text = entries.length ? entries.map(([k, v]) => `${k}:${v}`).join(', ') : 'none';
    out.push(`- ${tone}: ${text}`);
  }
  out.push('');

  out.push('## Lowest Score Samples (Top 10)');
  const lowest = lowRows.slice(0, 10);
  if (lowest.length === 0) {
    out.push('- none');
  } else {
    for (const row of lowest) {
      out.push(`- ${row.case_id} | ${row.tone} | score=${row.score.toFixed(2)} | detected=${row.detected} | issues=${row.issues || 'none'} | ${row.caption}`);
    }
  }
  out.push('');

  out.push('## Suggested Next Tuning');
  out.push('- CASUAL이 EMOTIONAL로 자주 분류되면, 캐주얼 구어체 신호(짧은 문장, 가벼운 접속어) 가중치를 높이기');
  out.push('- PROFESSIONAL에서 ai_like 이슈가 많으면 권유형 문구 금지 규칙을 강화하기');
  out.push('- length 이슈가 많으면 생성 길이 제약을 110~150자로 더 강하게 고정하기');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(DATA_DIR, `ab_tone_analysis_${stamp}.md`);
  fs.writeFileSync(outputPath, out.join('\n') + '\n', 'utf8');

  console.log(`분석 완료: ${outputPath}`);
}

main();
