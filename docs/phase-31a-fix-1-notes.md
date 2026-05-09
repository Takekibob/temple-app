# Phase 31a-fix-1 Cleanup Notes

## Overview

This phase removed remaining v1 funeral/Buddhist ceremony terminology (仏事系) from sample data and UI text, in compliance with v2.2 policy.

---

## Step 1: Seed file fix

**File:** `prisma/seed.ts` (line 213)

The `お知らせ` body for `pilot-announcement-all-001` contained 「法要予約（檀家の方）」.

### Before
```
このアプリでは以下のことができます：
・イベント・行事への参加申込
・法要予約（檀家の方）
・お寺からのお知らせ受信
・マイページでのプロフィール管理
```

### After
```
このアプリでは以下のことができます：
・イベント・行事への参加申込
・お寺からのお知らせ受信
・フォロー中の寺院の最新情報を確認
・マイページでのプロフィール管理
```

---

## Step 2: LineSettingsClient.tsx fix

**File:** `src/app/(app)/app/mypage/line/LineSettingsClient.tsx` (line 143)

### Before
```
LINEを連携すると予約確認・法事のリマインドなどをLINEで受け取れます。
```

### After
```
LINEを連携するとイベントや行事のリマインドが届きます。
```

---

## Step 3: Remaining grep results

Ran grep for `法要|法事|年忌|新盆` across `src/**/*.{ts,tsx}` (excluding `__tests__`, `node_modules`, `src/generated`).

### Result
```
src/app/(admin)/admin/announcements/AnnouncementFormClient.tsx:100:
    placeholder="例：お盆法要のご案内"
```

**Decision:** Skipped — this is the known deferred placeholder item explicitly excluded from Phase 31a-fix-1 scope.

### scripts/ (not src/)
`scripts/screenshots.ts` contained references to 法要予約一覧/法要予約フォーム in comments for v1 screenshot automation. These are not UI-visible text and are not in `src/`. Skipped.

---

## Final build status

`npm run build` — PASSED (no errors or warnings related to changes).
