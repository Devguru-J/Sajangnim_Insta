# Cloudflare Pages 배포 가이드

## 📋 사전 준비

- [x] Cloudflare 계정 생성
- [ ] GitHub 저장소 연결
- [ ] 프로젝트 설정
- [ ] 환경 변수 설정
- [ ] 배포

---

## Step 1: 프로젝트 설정 파일 추가

### 1.1 `@cloudflare/next-on-pages` 설치

```bash
npm install -D @cloudflare/next-on-pages wrangler
```

### 1.2 `wrangler.toml` 생성 (프로젝트 루트)

```toml
name = "sajangnim-insta"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

### 1.3 `next.config.ts` 수정

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages 호환을 위한 설정
  images: {
    unoptimized: true, // Cloudflare에서는 Next.js Image Optimization 사용 불가
  },
};

export default nextConfig;
```

### 1.4 `package.json` 스크립트 추가

```json
{
  "scripts": {
    "build": "next build",
    "pages:build": "npx @cloudflare/next-on-pages",
    "pages:dev": "npx wrangler pages dev .vercel/output/static --compatibility-flags=nodejs_compat",
    "pages:deploy": "npm run pages:build && wrangler pages deploy .vercel/output/static"
  }
}
```

---

## Step 2: Cloudflare 대시보드 설정

### 2.1 Pages 프로젝트 생성

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) 접속
2. 왼쪽 메뉴에서 **Workers & Pages** 클릭
3. **Create application** 클릭
4. **Pages** 탭 선택
5. **Connect to Git** 클릭

### 2.2 GitHub 연결

1. **GitHub** 선택
2. **Authorize Cloudflare Pages** 승인
3. 저장소 선택: `Devguru-J/Sajangnim_Insta`
4. **Begin setup** 클릭

### 2.3 빌드 설정

| 항목 | 값 |
|------|-----|
| **Project name** | `sajangnim-insta` |
| **Production branch** | `main` |
| **Framework preset** | `Next.js` |
| **Build command** | `npx @cloudflare/next-on-pages` |
| **Build output directory** | `.vercel/output/static` |

---

## Step 3: 환경 변수 설정

### 3.1 필수 환경 변수

Cloudflare Pages 대시보드에서 **Settings > Environment variables**에 추가:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 | `sk-...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGc...` |
| `ADMIN_EMAIL` | 관리자 이메일 | `admin@example.com` |
| `NEXT_PUBLIC_SITE_URL` | 사이트 URL | `https://sajangnim-insta.pages.dev` |

### 3.2 환경 변수 추가 방법

1. **Settings** 탭 클릭
2. **Environment variables** 섹션
3. **Add variable** 클릭
4. Name과 Value 입력
5. **Production** 체크 (Preview도 필요시 체크)
6. **Save** 클릭

> ⚠️ **중요**: `NEXT_PUBLIC_` 접두사가 있는 변수는 클라이언트에 노출됩니다.
> 민감한 키는 절대 `NEXT_PUBLIC_` 접두사를 사용하지 마세요.

---

## Step 4: 배포 실행

### 4.1 자동 배포

GitHub에 푸시하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Add Cloudflare Pages configuration"
git push origin main
```

### 4.2 수동 배포 (CLI)

```bash
# 로컬에서 빌드 및 배포
npm run pages:build
wrangler pages deploy .vercel/output/static
```

### 4.3 배포 확인

1. Cloudflare Dashboard > Workers & Pages
2. 프로젝트 클릭
3. **Deployments** 탭에서 상태 확인
4. 성공 시 URL 접속: `https://sajangnim-insta.pages.dev`

---

## Step 5: 커스텀 도메인 설정 (선택)

### 5.1 도메인 추가

1. **Custom domains** 탭 클릭
2. **Set up a custom domain** 클릭
3. 도메인 입력 (예: `sajangnim.com`)
4. DNS 설정 안내 따르기

### 5.2 DNS 설정

**Cloudflare DNS 사용 시:**
- 자동으로 설정됨

**외부 DNS 사용 시:**
- CNAME 레코드 추가: `sajangnim-insta.pages.dev`

---

## 🔧 트러블슈팅

### 문제 1: 빌드 실패

```
Error: Could not find Next.js build output
```

**해결:**
- `next.config.ts`에서 `output: 'standalone'` 제거
- `npm run build` 먼저 실행 후 `pages:build` 실행

### 문제 2: Server Actions 에러

```
Error: Server Actions are not supported
```

**해결:**
- `next.config.ts`에 `experimental: { serverActions: true }` 추가
- Edge Runtime으로 변환 필요할 수 있음

### 문제 3: 환경 변수 인식 안됨

**해결:**
- 배포 후 **Retry deployment** 클릭
- 변수명 오타 확인
- Production 환경에 체크되어 있는지 확인

### 문제 4: Image 로딩 안됨

**해결:**
- `next.config.ts`에 `images: { unoptimized: true }` 설정
- 또는 Cloudflare Images 사용

---

## 📊 배포 후 체크리스트

- [ ] 메인 페이지 로딩 확인
- [ ] 로그인/회원가입 작동 확인
- [ ] AI 글 생성 기능 확인
- [ ] 히스토리 페이지 확인
- [ ] 프로필 페이지 확인
- [ ] 환경 변수 정상 작동 확인
- [ ] Admin 계정 Premium 표시 확인

---

## 📚 참고 자료

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
