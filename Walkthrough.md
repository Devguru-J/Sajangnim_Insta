# Recent Updates Walkthrough

## 1. Theme & UI Refinement

### Problem
- The site had inconsistent colors between light/dark modes.
- The Navbar had a "gray overlay" issue due to transparency overlapping with page backgrounds.
- Dropdowns lacked visual indicators.

### Solution
- **Global White Background**: Changed from custom off-white to standard `bg-white` and `dark:bg-zinc-950`.
- **Opaque Navbar**: Removed glass effect (`backdrop-blur`) in favor of solid colors (`bg-white` / `dark:bg-zinc-900`) for a cleaner look.
- **Dropdown Arrows**: Added Material Symbols `expand_more` icon to all `<select>` inputs in Signup and Profile pages.
- **Main Copy**: Updated landing page text to "간단한 회원가입 후 바로 무료로 사용하실 수 있어요."

---

## 2. Password Reset Flow

### Feature
Complete flow for users to reset forgotten passwords.

### Components
- **`/forgot-password`**:
  - Takes user email.
  - Sends Supabase magic link/reset email.
- **`/reset-password`**:
  - Secure form to enter new password.
  - Updates via Supabase `updateUser`.

### UX Details
- Fully styled with existing "Premium/Ivory" design system.
- Korean localization for all messages.
- Smooth transitions and loading states.

![Password Reset Flow](file:///Users/tuesdaymorning/.gemini/antigravity/brain/36948d86-cc29-449f-aafa-a2f9a0115403/password_reset_verification_1767416540186.webp)

---

## 3. Business Type & Industry Expansion

### Goal
Remove friction for users by remembering their industry and supporting more business types.

### Changes
1. **New Industry Types**:
   - **RESTAURANT** (식당/요식업) - Icon: 🍽️
   - **OTHER** (기타) - Icon: 🏪
   - Added to `ResourceType` enum and all mapping logic.

2. **Auto-Selection in `/generate`**:
   - Page effectively remembers user's choice from signup/profile.
   - **Before**: User selected industry manually every time.
   - **After**: Read-only box shows "프로필에서 설정한 업종입니다" with correct icon.
   - Implemented by converting Page to Server Component to fetch profile data.

3. **Case Sensitivity Fix**:
   - Fixed issue where `caps` DB values didn't match `lowercase` code values.
   - Added robust normalization (`toUpperCase()`) to industry mapping.

4. **React 19 Compatibility**:
   - Updated `ProfileForm` to use `useActionState` instead of deprecated `useFormState`.

---

## Verification Status

| Feature | Light Mode | Dark Mode | logic |
|:---|:---:|:---:|:---:|
| **Theme/Navbar** | ✅ Clean White | ✅ Deep Zinc | N/A |
| **Password Reset** | ✅ | ✅ | ✅ Email sent/PW updated |
| **Industry Auto-Select** | ✅ | ✅ | ✅ Fetches from DB |
| **New Icons (Rest./Other)** | ✅ | ✅ | ✅ Displays correctly |
