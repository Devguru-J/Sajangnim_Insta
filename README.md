# 사장님 인스타 (Sajangnim Insta)

> "오늘 인스타 뭐 올리지?"
> 카페, 미용실 사장님의 고민을 10초 만에 해결해주는 AI 인스타그램 글 생성 서비스

![Project Preview](/Design/preview.png)
*(여기에 스크린샷이나 데모 이미지를 넣으면 좋습니다)*

## 🚀 프로젝트 소개
사장님들은 매일 인스타그램에 어떤 사진과 글을 올려야 할지 고민합니다.
**사장님 인스타**는 업종, 말투, 홍보 목적, 그리고 간단한 내용만 입력하면 **GPT-4o**를 활용해 감성적인 캡션, 적절한 해시태그, 스토리 문구, 댓글 유도 질문까지 완벽한 게시글 세트를 자동으로 생성해줍니다.

## ✨ 주요 기능
- **AI 맞춤 글 생성**: 업종(카페/미용실), 톤(감성/캐주얼/전문), 목적(방문/예약/신메뉴)에 맞는 텍스트 생성
- **풀 패키지 제공**: 캡션 본문 + 추천 해시태그 15개 + 스토리 문구 + 댓글 유도 질문
- **무료/유료 하이브리드**: 하루 3회 무료 사용, 이후 월 구독(Stripe)으로 무제한 사용
- **간편한 UI**: 복잡한 입력 없이 터치 몇 번으로 결과물 완성

## 🛠 기술 스택 (Tech Stack)
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **AI**: [OpenAI API](https://openai.com/) (gpt-4o-mini)
- **Payments**: [Stripe](https://stripe.com/)
- **Deployment**: [Vercel](https://vercel.com/)

## ⚙️ 설치 및 실행 (Getting Started)

### 1. 프로젝트 클론
```bash
git clone https://github.com/your-username/sajangnim-insta.git
cd sajangnim-insta
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 아래 내용을 입력하세요.

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
```

### 4. 데이터베이스 세팅
Supabase SQL Editor에서 `supabase/schema.sql` 파일의 내용을 실행하여 테이블을 생성합니다.

### 5. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 접속

## 📂 폴더 구조
```
├── app/                  # Next.js App Router Pages & API
│   ├── api/              # API Routes (generate, checkout, webhook)
│   ├── generate/         # 글 생성 페이지
│   ├── results/          # 결과 조회 페이지
│   ├── pricing/          # 요금 안내 페이지
│   └── ...
├── components/           # UI Components (Navbar, Footer, ResultsView...)
├── lib/                  # Utilities (Supabase Client, Admin...)
├── supabase/             # SQL Schema
└── ...
```

## 📝 라이선스
MIT License
