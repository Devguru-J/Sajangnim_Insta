/**
 * 크롤링된 인스타그램 캡션을 임베딩하여 Supabase에 저장하는 스크립트
 *
 * 사용법:
 *   npx tsx scripts/embed-captions.ts
 *
 * 환경변수 필요:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// 환경변수 로드
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// CSV 파일 경로
const DATA_DIR = '/Users/tuesdaymorning/Devguru/sajangnim_insta/data';
const DATA_FILE = process.env.CAPTIONS_CSV || 'clean_captions_prepared.csv';

// 카테고리 매핑 (CSV 업종명 → DB 카테고리)
const CATEGORY_MAP: Record<string, string> = {
    '카페': 'cafe',
    '커피': 'cafe',
    '베이커리': 'cafe',
    'CAFE': 'cafe',
    '맛집': 'restaurant',
    '음식점': 'restaurant',
    '식당': 'restaurant',
    'RESTAURANT': 'restaurant',
    '미용실': 'salon',
    '뷰티': 'salon',
    '헤어': 'salon',
    'SALON': 'salon',
    'GYM': 'gym',
    'OTHER': 'other',
};

interface CaptionRow {
    업종?: string;
    해시태그?: string;
    본문?: string;
    좋아요?: string;
    URL?: string;
    수집일시?: string;
    source_url?: string;
    caption?: string;
    industry?: string;
    likes?: string;
    collected_at?: string;
    hashtag?: string;
    tone_hint?: string;
    tone?: string;
}

type RetryConfig = {
    maxAttempts: number;
    baseDelayMs: number;
};

// CSV 파싱 (간단한 구현)
function parseCSV(content: string): CaptionRow[] {
    const lines = content.split('\n');
    const headers = lines[0].replace('\ufeff', '').split(',');
    const rows: CaptionRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV 파싱 (쉼표와 따옴표 처리)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const row: CaptionRow = {};
        headers.forEach((header, index) => {
            (row as any)[header] = values[index] ?? '';
        });
        rows.push(row);
    }

    return rows;
}

// 캡션 필터링 (너무 짧거나 의미없는 캡션 제외)
function isValidCaption(caption: string): boolean {
    // 최소 20자 이상
    if (caption.length < 20) return false;

    // 이모지만 있는 경우 제외
    const textOnly = caption.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu, '').trim();
    if (textOnly.length < 10) return false;

    // 해시태그만 있는 경우 제외
    const withoutHashtags = caption.replace(/#\S+/g, '').trim();
    if (withoutHashtags.length < 10) return false;

    return true;
}

// 캡션 정제 (해시태그 분리, 너무 긴 경우 자르기)
function cleanCaption(caption: string): string {
    // 해시태그 제거 (별도 컬럼으로 관리)
    let cleaned = caption.replace(/#\S+/g, '').trim();

    // 1000자로 제한
    if (cleaned.length > 1000) {
        cleaned = cleaned.substring(0, 1000) + '...';
    }

    return cleaned;
}

function pickCaption(row: CaptionRow): string {
    return (row.caption || row.본문 || '').trim();
}

function pickCategory(row: CaptionRow): string {
    const industry = (row.industry || row.업종 || row.해시태그 || row.hashtag || '').trim();
    return CATEGORY_MAP[industry] || 'cafe';
}

function pickHashtag(row: CaptionRow): string {
    return (row.hashtag || row.해시태그 || '').trim();
}

function pickSourceUrl(row: CaptionRow): string {
    return (row.source_url || row.URL || '').trim();
}

function pickLikes(row: CaptionRow): number {
    return parseInt(row.likes || row.좋아요 || '0') || 0;
}

function pickTone(row: CaptionRow): string {
    const raw = (row.tone || row.tone_hint || '').trim().toUpperCase();
    if (raw === 'EMOTIONAL' || raw === 'CASUAL' || raw === 'PROFESSIONAL') {
        return raw;
    }
    return 'CASUAL';
}

async function main() {
    console.log('🚀 캡션 임베딩 스크립트 시작\n');

    // 클라이언트 초기화
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // CSV 파일 읽기
    const csvPath = path.join(DATA_DIR, DATA_FILE);
    console.log(`📂 CSV 파일 읽는 중: ${csvPath}`);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    console.log(`📊 총 ${rows.length}개 행 발견\n`);

    // 유효한 캡션만 필터링
    const validRows = rows.filter((row) => isValidCaption(pickCaption(row)));
    console.log(`✅ 유효한 캡션: ${validRows.length}개\n`);

    // 배치 처리 (환경변수로 조절 가능)
    const parsedBatch = Number(process.env.EMBED_BATCH_SIZE || '25');
    const BATCH_SIZE = Number.isFinite(parsedBatch) && parsedBatch > 0 ? parsedBatch : 25;
    const retryConfig: RetryConfig = {
        maxAttempts: 3,
        baseDelayMs: 1200,
    };
    let processed = 0;
    let inserted = 0;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
        const batch = validRows.slice(i, i + BATCH_SIZE);
        console.log(`📦 배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validRows.length / BATCH_SIZE)} 처리 중...`);

        // 캡션 정제
        const cleanedCaptions = batch.map((row) => cleanCaption(pickCaption(row)));

        // 임베딩 생성
        try {
            let embeddingResponse: Awaited<ReturnType<typeof openai.embeddings.create>> | null = null;
            let lastError: unknown = null;

            for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
                try {
                    embeddingResponse = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: cleanedCaptions,
                    });
                    break;
                } catch (error: any) {
                    lastError = error;
                    const status = error?.status ?? error?.cause?.status ?? 'unknown';
                    const message = error?.message || error?.cause?.message || String(error);
                    console.warn(`⚠️ 임베딩 재시도 ${attempt}/${retryConfig.maxAttempts} 실패 (status=${status}): ${message}`);
                    if (attempt < retryConfig.maxAttempts) {
                        await new Promise((resolve) => setTimeout(resolve, retryConfig.baseDelayMs * attempt));
                    }
                }
            }

            if (!embeddingResponse) {
                throw lastError || new Error('embedding request failed');
            }

            // Supabase에 저장 (pgvector 형식으로 변환)
            const records = batch.map((row, idx) => {
                const category = pickCategory(row);
                // pgvector는 "[0.1, 0.2, ...]" 문자열 형식을 기대
                const embeddingVector = `[${embeddingResponse.data[idx].embedding.join(',')}]`;
                return {
                    category,
                    tone: pickTone(row),
                    hashtag: pickHashtag(row),
                    caption: cleanedCaptions[idx],
                    likes: pickLikes(row),
                    source_url: pickSourceUrl(row),
                    embedding: embeddingVector,
                };
            }).filter((row) => row.source_url);

            const { error } = await supabase
                .from('caption_examples')
                .upsert(records, {
                    onConflict: 'source_url',
                    ignoreDuplicates: true
                });

            if (error) {
                console.error(`❌ 저장 오류:`, error.message);
            } else {
                inserted += records.length;
                console.log(`   ✓ ${records.length}개 저장 완료`);
            }

            processed += batch.length;

            // Rate limit 방지
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error: any) {
            const status = error?.status ?? error?.cause?.status ?? 'unknown';
            const message = error?.message || error?.cause?.message || String(error);
            console.error(`❌ 임베딩 오류 (status=${status}):`, message);
        }
    }

    console.log(`\n✨ 완료!`);
    console.log(`   - 처리: ${processed}개`);
    console.log(`   - 저장: ${inserted}개`);
}

main().catch(console.error);
