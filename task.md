# Task Checklist

## ✅ Completed

### Debugging Display Issues
- [x] Investigate "auto_awesome" text issue (Material Icons) <!-- id: 0 -->
- [x] Investigate missing images (Placeholder issue) <!-- id: 1 -->
- [x] Fix Icon issue <!-- id: 2 -->
- [x] Fix Image issue <!-- id: 3 -->

### Authentication Implementation
- [x] Install `@supabase/ssr` package <!-- id: 4 -->
- [x] Setup Supabase Server/Client utilities <!-- id: 5 -->
- [x] Create `profiles` table and trigger in Supabase (SQL) <!-- id: 6 -->
- [x] Implement Login Page (`/login`) <!-- id: 7 -->
- [x] Implement Signup Page (`/signup`) <!-- id: 8 -->
- [x] Implement Auth Server Actions <!-- id: 9 -->
- [x] Update Middleware for session management <!-- id: 10 -->
- [x] Push migrations via Supabase CLI <!-- id: 11 -->

### UI Enhancements
- [x] Add Login/Signup buttons to Navbar <!-- id: 12 -->
- [x] Integrate Spline 3D Hero Section <!-- id: 24 -->
- [x] Fix Landing Page Layout & Copy <!-- id: 25 -->

### Profile Implementation
- [x] Create migration for additional profile fields <!-- id: 13 -->
- [x] Implement Profile Page (`/profile`) <!-- id: 14 -->
- [x] Implement Profile Update Action <!-- id: 15 -->

### Address Search & Signup Expansion
- [x] Create migration to update `handle_new_user` trigger <!-- id: 16 -->
- [x] Update Signup Action (`auth/actions.ts`) <!-- id: 17 -->
- [x] Update Signup Page with Address Search <!-- id: 18 -->
- [x] Update Profile Page with Address Search <!-- id: 19 -->
- [x] Debug Address Search Fetch Error (Proxy) <!-- id: 20 -->
- [x] Improve Address Search UI (Dropdown Spacing) <!-- id: 21 -->
- [x] Implement Detailed Address Field (Schema & UI) <!-- id: 22 -->
- [x] Implement Keyboard Navigation for Address Search <!-- id: 23 -->

### Theme & UI Refinement
- [x] Implement Dark Mode Toggle with `next-themes` <!-- id: 26 -->
- [x] Fix Navbar transparency and visual bugs in light mode <!-- id: 27 -->
- [x] Standardize color palette (Zinc scale) across all pages <!-- id: 28 -->
- [x] Add Dropdown Arrow Icons to Select inputs <!-- id: 29 -->

### Authentication & User Flow Features
- [x] Implement Forgot Password Page (`/forgot-password`) <!-- id: 30 -->
- [x] Implement Reset Password Page (`/reset-password`) <!-- id: 31 -->
- [x] Integrate Supabase Password Reset Email flow <!-- id: 32 -->
- [x] Auto-select Business Type from User Profile in `/generate` <!-- id: 33 -->
- [x] Add 'Restaurant' (식당/요식업) and 'Other' (기타) Business Types <!-- id: 34 -->

---

## 🚧 High Priority (Next)

### Stripe Payment Integration
- [ ] Test `/api/checkout` endpoint with Stripe <!-- id: 35 -->
- [ ] Verify `/api/webhook` Stripe event handling <!-- id: 36 -->
- [ ] Confirm subscription → unlimited usage logic <!-- id: 37 -->
- [ ] Test full payment flow end-to-end <!-- id: 38 -->

### Usage Limits & Paywall
- [ ] Verify daily reset logic (midnight KST) <!-- id: 39 -->
- [ ] Test subscription status immediate reflection <!-- id: 40 -->
- [ ] Improve `/limit-reached` page UX (upgrade CTA) <!-- id: 41 -->
- [ ] Add usage counter display in Navbar <!-- id: 42 -->

### Error Handling & UX
- [ ] Add clear error messages for API failures <!-- id: 43 -->
- [ ] Implement retry logic for network errors <!-- id: 44 -->
- [ ] Add skeleton loading states <!-- id: 45 -->
- [ ] Improve OpenAI timeout handling <!-- id: 46 -->

---

## 📋 Medium Priority

### Results Page Enhancements
- [ ] Improve clipboard copy functionality <!-- id: 47 -->
- [ ] Add share feature (KakaoTalk, Link) <!-- id: 48 -->
- [ ] Implement result editing (caption modification) <!-- id: 49 -->
- [ ] Add PDF/Image download option <!-- id: 50 -->

### History Page Features
- [x] Add search/filter (date, industry) <!-- id: 51 -->
- [x] Implement pagination or infinite scroll <!-- id: 52 -->
- [x] Add bookmark/favorite feature <!-- id: 53 -->
- [x] Implement delete functionality <!-- id: 54 -->

### Profile Expansion
- [x] Add profile image upload <!-- id: 55 -->
- [x] Implement account deletion <!-- id: 56 -->
- [x] Add subscription management UI <!-- id: 57 -->
- [x] Enable email change feature <!-- id: 58 -->

---

## 💡 Low Priority (Future)

### AI & Content Optimization
- [x] Optimize prompts by industry <!-- id: 59 -->
- [x] Add temperature control for natural content <!-- id: 60 -->
- [x] Reduce AI-like feel in generated text <!-- id: 61 -->
- [ ] Implement user feedback collection <!-- id: 61 -->

### Analytics
- [ ] Add usage statistics dashboard <!-- id: 62 -->
- [ ] Show popular hashtags/trends <!-- id: 63 -->
- [ ] Implement A/B testing for prompts <!-- id: 64 -->

### Deployment & DevOps
- [ ] Set up Vercel production environment <!-- id: 65 -->
- [ ] Configure Stripe webhook endpoint <!-- id: 66 -->
- [ ] Set up monitoring and logging <!-- id: 67 -->
- [ ] Conduct user testing (5 users) <!-- id: 68 -->
