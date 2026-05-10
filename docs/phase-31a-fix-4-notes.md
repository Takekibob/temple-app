# Phase 31a-fix-4 Notes（2026-05-10）

マイページ問題解決。`/app/mypage` → `/app/settings` リネーム・リダイレクト実装・全設定画面 v2 tone 化。

## 関連ファイル一覧

### 設定画面（利用者）
| ファイル | 役割 | 変更 |
|---------|-----|------|
| `src/app/(app)/app/settings/page.tsx` | 設定トップ Server Component | Yes（getAuthUser移行）|
| `src/app/(app)/app/settings/MypageClient.tsx` | 設定トップ Client Component | Yes（v2 フル書き換え）|
| `src/app/(app)/app/settings/profile/page.tsx` | プロフィール編集 Server Component | Yes（getAuthUser移行・v2ヘッダー）|
| `src/app/(app)/app/settings/profile/ProfileEditClient.tsx` | プロフィール編集 Client | Yes（v2 フル書き換え）|
| `src/app/(app)/app/settings/line/page.tsx` | LINE設定 Server Component | Yes（back link更新のみ）|
| `src/app/(app)/app/settings/line/LineSettingsClient.tsx` | LINE設定 Client | なし（31a-fix-3済み）|
| `src/app/(app)/app/settings/notifications/page.tsx` | 通知設定 Server Component | Yes（getAuthUser移行・v2ヘッダー）|
| `src/app/(app)/app/settings/notifications/NotificationsClient.tsx` | 通知設定 Client | Yes（v2 フル書き換え）|
| `src/app/(app)/app/settings/actions.ts` | Server Actions | Yes（revalidatePath更新）|

### ルーティング・ナビゲーション
| ファイル | 変更内容 |
|---------|---------|
| `next.config.ts` | `/app/mypage` → `/app/settings` 308 リダイレクト追加 |
| `src/components/shared/BottomNav.tsx` | isActive 判定を `/app/settings` に更新 |
| `src/components/teralog/BottomNav.tsx` | **削除**（孤児ファイル、shared/BottomNav が現役）|
| `src/app/(app)/app/my/page.tsx` | profile リンク・「設定 →」リンク更新 |

## ディレクトリ rename

```
src/app/(app)/app/mypage/ → src/app/(app)/app/settings/
```

`git mv` で実施。git 履歴上は rename として記録されている。

## リダイレクト実装（next.config.ts）

```typescript
async redirects() {
  return [
    { source: "/app/mypage", destination: "/app/settings", permanent: true },
    { source: "/app/mypage/:path*", destination: "/app/settings/:path*", permanent: true },
  ];
}
```

`permanent: true` → 308 レスポンス。外部ブックマーク・古いリンクも吸収。

## 設定画面 v2 設計（3セクション）

```
設 定（ヘッダー）                    ログアウト →
│
├── プロフィール
│   └── [avatar] 名前 / email        編集 →
│
├── 通知・LINE
│   ├── LINE 連携                    連携済み/未連携バッジ + ChevronRight
│   └── 通知設定                     ChevronRight
│
└── お寺との繋がり
    └── 所属寺院 or フォロー中        ChevronRight
```

## NotificationsClient と LineSettingsClient の重複編集フィールド（既知の制約）

`notifyEvent` / `notifyAnnouncement` の 2 フィールドを両画面が編集している。

- `settings/notifications/NotificationsClient.tsx` → `/api/me/member-settings` PATCH
- `settings/line/LineSettingsClient.tsx` → `/api/members/{id}/line-settings` PATCH（通知頻度ラジオ）

**影響範囲**: 片方の画面で変更後、もう片方の画面を開くと値が同期されている（両方 DB から読み直すため整合性は保たれる）。ただし UI 上「通知設定」と「LINE通知頻度」が分離しており、ユーザーが混乱する可能性がある。

**将来タスク（Phase 31b 以降）**: 通知設定を一画面に統合するか、フィールドを分離（LINE専用フィールドを追加）するかを判断する。現状は仕様上許容。

## コミット

1. `41e3a06` — 順序2: /app/mypage → /app/settings rename + redirect + 内部リンク一括更新
2. `a57f242` — 順序3-5: 設定画面全ページ v2 tone

