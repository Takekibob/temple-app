# Phase 31a-fix-2 Notes（更新版 2026-05-10）

> 初回実装からの差分を記録。

## 変更点サマリー（更新実装）

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/greetings.ts`（新規） | 朝/昼/夜の時間帯ベースあいさつ、Asia/Tokyo判定 |
| `src/components/teralog/NotificationBell.tsx`（新規） | ドットのみ表示の通知ベル、7日以内未読判定 |
| `src/components/teralog/FloatingActionButton.tsx` | テキスト削除→アイコンのみ円形ボタン |
| `src/components/shared/BottomNav.tsx` | マイページタブを /app/mypage にも対応 |
| `src/app/(app)/app/page.tsx` | getGreeting()・NotificationBell に切り替え、空状態テキスト更新 |

## Summary of Changes

### Step 1: Bottom tab 4-tab redesign
- **File**: `src/components/shared/BottomNav.tsx`
- Reduced from 5 tabs to 4: ホーム / 集い / 記録 / マイページ
- Removed `MapPin`, `Bell` icons; added `PenLine` for 記録 tab
- Removed `unreadNewsCount` prop entirely (badge logic gone)
- Active state uses exact match for `/app`, `startsWith` for events/journal, exact+prefix for my
- **File**: `src/app/(app)/layout.tsx`
- Removed all unreadNewsCount Prisma queries (3 DB calls removed from layout)
- Removed `prisma` import (no longer needed)
- Removed `unreadNewsCount` prop from `<BottomNav />`
- Updated `bg-stone-50` to `bg-paper` for v2 consistency

### Step 2 (integrated into Step 4): Home page bell icon
- Bell icon moved to home page header (not a separate step — done in full rewrite)

### Step 3: Floating Action Button
- **File created**: `src/components/teralog/FloatingActionButton.tsx`
- Client component; hides on `/app/journal/new` to avoid self-referential loop
- Fixed position, `bottom: calc(env(safe-area-inset-bottom) + 72px)` to clear bottom nav
- Uses `bg-ink text-paper` for v2 ink-on-paper aesthetic
- **File**: `src/app/(app)/layout.tsx` — added `<FloatingActionButton />` between `{children}` and `<BottomNav />`

### Step 4: Home page full redesign
- **File**: `src/app/(app)/app/page.tsx` — complete rewrite
- Removed 6-card QUICK_ITEMS grid and related icons (CalendarRange, Compass, Stamp, Heart, Clock, MapPin)
- New structure: Header → 集い section → お寺との出会い section → お寺の声 (conditional) → 学びの記事 (conditional)
- 集い prioritization: 参加予定 > フォロー中未参加 > 全体未参加
- お寺セクション: フォロー中お寺 (horizontal scroll cards) or 発見用お寺 if no follows
- Bell icon with unread badge in header, linking to `/app/news`
- `subMessage` rotates daily using day-of-year mod
- All design tokens use v2 CSS vars (text-ink, bg-paper, etc.)
- `font-serif` on all headings/labels/body; `font-sans` on dates/numbers
- `Image` from next/image used for temple logos; `<img>` for post/article covers
- No hardcoded hex colors

### Step 5: Admin banner v2 tone
- **File**: `src/app/(app)/layout.tsx` (committed in Step 1)
- Changed `bg-amber-900 text-amber-100` → `bg-paper-soft text-ink-secondary`
- Border: `0.5px solid var(--color-border)` inline style
- Text: `管理者として閲覧中` (shorter, calmer)
- Link: `text-ink font-light border-b-[0.5px] border-ink`

## Decisions Made

- **Icons**: `PenLine` chosen for 記録 tab (matches FAB icon for visual consistency)
- **FAB positioning**: `bottom: calc(env(safe-area-inset-bottom) + 72px)` — 72px clears the ~56px nav + 16px breathing room
- **FAB shape**: Rectangular pill with text label (not circular icon-only), consistent with v2 serif aesthetic
- **Bell badge color**: `bg-rose-500` (warmer, less alarming than blue, consistent with v2 palette)
- **Home page お寺セクション**: Horizontal scroll card layout (w-32 cards) for discoverability without overwhelming
- **No separate お知らせ section**: Bell icon in header handles this; reduces page clutter

## Build Status

All steps: build passes with `✓ Compiled successfully` and `✓ Generating static pages`.
No TypeScript errors. No hardcoded hex colors in modified/created files.
