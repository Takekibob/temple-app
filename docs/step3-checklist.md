# Step 3 実施チェックリスト — DANKA/GOEN 完全廃止

> **前提条件**: Supabase の RLS ポリシーを先に書き換えてから `prisma db push` を実行すること。
> 誤った順序で進めるとデータロスまたはデプロイ失敗が起きる。

---

## 1. Supabase Dashboard で書き換えるべき RLS ポリシー

以下は `member_type` 列または `my_member_type()` 関数に依存しており、削除前に書き換えが必要。

| テーブル | ポリシー名 | 現行条件 | 置換方針 |
|---------|-----------|---------|---------|
| `reservations` | `reservations_insert` | `my_member_type() = 'DANKA'` | `memberships` テーブルで ACTIVE な membership が存在するか確認 |
| `events` | `events_select_authenticated` | `target_visibility` が DANKA_ONLY のとき type チェック | `memberships.some` に置換 |
| `gojikai_payments` | `gojikai_payments_select` | `my_member_type() = 'DANKA'` | memberships チェックに置換 |
| `announcements` | `announcements_select_authenticated` | `targetSegment IN ('DANKA', 'GOEN')` を type で解決 | MEMBERS / ALL に統一 |
| `announcements` | `announcements_select_anon` | targetSegment チェック | 同上 |

### 削除すべきカスタム関数

```sql
DROP FUNCTION IF EXISTS my_member_type();
```

---

## 2. schema.prisma から削除するフィールド・列挙値

RLS ポリシーの書き換え完了後に実施。

```prisma
// ❌ 削除
enum MemberType {
  DANKA
  GOEN
  @@map("member_type")
}

// Member モデルから削除
type             MemberType @default(GOEN)  // ← 削除
promotedAt       DateTime?  // @deprecated  // ← 削除

// EventVisibility から削除
DANKA_ONLY  // @deprecated

// AnnouncementTarget から削除
DANKA  // @deprecated
GOEN   // @deprecated

// LineStepTrigger から削除
STAGE_CHANGE_PROSPECT   // @deprecated
STAGE_CHANGE_CANDIDATE  // @deprecated
```

### 変更後の `prisma db push`

```bash
npx prisma db push --accept-data-loss
npx prisma generate
```

---

## 3. コードベース — 変更が必要なファイル（66 ファイル）

### 管理画面 (admin)

| ファイル | 変更内容 |
|---------|---------|
| `admin/analytics/retention/page.tsx` | `DANKA`/`GOEN` 別集計 → MembershipType 別に |
| `admin/announcements/AnnouncementFormClient.tsx` | targetSegment の DANKA/GOEN 選択肢を削除 |
| `admin/announcements/[id]/edit/page.tsx` | 同上 |
| `admin/announcements/page.tsx` | DANKA/GOEN フィルター削除 |
| `admin/churn/page.tsx` | isDanka チェック → hasActiveMembership に |
| `admin/deceased/[id]/edit/page.tsx` | isDanka チェック削除（過去帳は全会員対象化） |
| `admin/deceased/new/page.tsx` | 同上 |
| `admin/events/EventFormClient.tsx` | DANKA_ONLY 選択肢削除 → MEMBERSHIP_REQUIRED に統一 |
| `admin/events/[id]/analytics/page.tsx` | member.type 参照を削除 |
| `admin/events/analytics/page.tsx` | 同上 |
| `admin/events/page.tsx` | type フィルター削除 |
| `admin/line/messages/new/page.tsx` | DANKA/GOEN セグメント選択 → MembershipType 選択に |
| `admin/members/MemberFilters.tsx` | DANKA/GOEN フォールバック削除（MembershipType のみに） |
| `admin/members/[id]/edit/page.tsx` | type 変更 UI 削除 |
| `admin/members/[id]/family-tree/page.tsx` | isDanka チェック削除 |
| `admin/members/[id]/page.tsx` | isDanka → hasActiveMembership |
| `admin/members/import/ImportClient.tsx` | type カラム削除 |
| `admin/members/page.tsx` | type (DANKA/GOEN) フォールバック削除 |
| `admin/page.tsx` (dashboard) | DANKA 件数カード → MembershipType 別に |
| `admin/reservations/new/page.tsx` | isDanka チェック削除 |

### 利用者画面 (app)

| ファイル | 変更内容 |
|---------|---------|
| `app/calendar/CalendarClient.tsx` | isDanka 条件削除 |
| `app/calendar/page.tsx` | 同上 |
| `app/deceased/page.tsx` | isDanka ガード削除 |
| `app/events/[id]/apply/page.tsx` | DANKA_ONLY ガード → MEMBERSHIP_REQUIRED に |
| `app/events/[id]/page.tsx` | 同上 |
| `app/events/page.tsx` | isDanka フィルター削除 |
| `app/mypage/MypageClient.tsx` | isDanka → hasMembership |
| `app/mypage/danka-info/page.tsx` | ページ自体を削除またはリダイレクト |
| `app/mypage/page.tsx` | isDanka チェック削除 |
| `app/news/NewsClient.tsx` | DANKA/GOEN セグメント削除 |
| `app/news/[id]/page.tsx` | 同上 |
| `app/news/page.tsx` | 同上 |
| `app/ofuse/page.tsx` | isDanka ガード削除 |
| `app/page.tsx` | 残存 DANKA/GOEN 参照（allowedSegments の "DANKA"） |
| `app/reservations/[id]/edit/page.tsx` | isDanka ガード削除 |
| `app/reservations/layout.tsx` | isDanka ガード削除 |
| `app/reservations/page.tsx` | isDanka ガード削除 |
| `app/layout.tsx` | isDanka/isGoen 分岐削除 |

### 公開ページ (public)

| ファイル | 変更内容 |
|---------|---------|
| `(public)/events/[id]/page.tsx` | DANKA_ONLY 表示ロジック削除 |

### API Routes

| ファイル | 変更内容 |
|---------|---------|
| `api/announcements/[id]/route.ts` | DANKA/GOEN セグメント参照削除 |
| `api/announcements/read-all/route.ts` | 同上 |
| `api/announcements/route.ts` | 同上 |
| `api/calendar/route.ts` | isDanka → hasActiveMembership |
| `api/checkout/create-session/route.ts` | DANKA チェック削除 |
| `api/cron/analytics-snapshot/route.ts` | DANKA/GOEN 別集計削除 |
| `api/deceased/[id]/route.ts` | isDanka ガード削除 |
| `api/deceased/route.ts` | 同上 |
| `api/events/[id]/analytics/route.ts` | member.type 参照削除 |
| `api/events/[id]/participate/route.ts` | DANKA_ONLY ガード → MEMBERSHIP_REQUIRED に |
| `api/events/[id]/route.ts` | DANKA_ONLY 削除 |
| `api/events/route.ts` | DANKA_ONLY フィルター削除 |
| `api/export/events/route.ts` | member.type カラム削除 |
| `api/export/members/route.ts` | type カラム削除 |
| `api/gojikai/route.ts` | isDanka ガード削除 |
| `api/members/import/route.ts` | type フィールド削除 |
| `api/members/route.ts` | type フィールド削除 |
| `api/ocr/[id]/import/route.ts` | type 設定削除 |
| `api/onboarding/route.ts` | type 設定削除 |
| `api/push/send/route.ts` | DANKA/GOEN ターゲット削除 |
| `api/reservations/route.ts` | isDanka ガード削除 |
| `api/setup/route.ts` | type 設定削除 |
| `api/superadmin/temples/route.ts` | type 集計削除 |

### 認証・オンボーディング

| ファイル | 変更内容 |
|---------|---------|
| `auth/onboarding/OnboardingClient.tsx` | type 選択 UI 削除 |

### 共有コンポーネント

| ファイル | 変更内容 |
|---------|---------|
| `components/admin/Sidebar.tsx` | DANKA/GOEN コメント削除（法要予約・護持会費の復活対応） |
| `components/shared/BottomNav.tsx` | isDanka 分岐削除 |
| `components/shared/RoleGuards.tsx` | isDanka ガード削除 |

### lib / hooks / types

| ファイル | 変更内容 |
|---------|---------|
| `hooks/useAuth.ts` | isDanka/isGoen プロパティ削除 |
| `lib/memberUtils.ts` | isDanka 関数削除（hasActiveMembership のみ残す） |
| `types/index.ts` | MemberType 型定義削除 |

---

## 4. 削除後の確認コマンド

```bash
# 残存参照がないことを確認
grep -r "member\.type\|isDanka\|isGoen\|DANKA\|GOEN\|MemberType" src --include="*.ts" --include="*.tsx" | grep -v generated | grep -v "step3-checklist"

# TypeScript エラーなし確認
npx tsc --noEmit

# デプロイ前動作確認
npm run dev
```

---

## 5. 移行タイムライン（目安）

| フェーズ | 内容 | 目安 |
|---------|------|------|
| Step 3-A | Supabase RLS ポリシーの書き換え | 2h |
| Step 3-B | Prisma schema から deprecated フィールド削除 + db push | 30m |
| Step 3-C | コードベース 66 ファイルの変更 | 1日 |
| Step 3-D | E2E テスト + デプロイ | 半日 |

**実施推奨時期**: 檀家機能（法要予約・過去帳・護持会費）の MembershipType ベース実装が完了してから。
