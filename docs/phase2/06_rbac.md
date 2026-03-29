# 設計書 Phase2-06｜ADMIN / STAFF 権限分離

## 権限マトリクス

| 機能 | ADMIN | STAFF |
|---|:---:|:---:|
| **ダッシュボード** | ✅ | ✅ |
| **会員管理（閲覧・編集・追加）** | ✅ | ✅ |
| 会員の檀家昇格 | ✅ | ❌ |
| 会員 CSV インポート | ✅ | ❌ |
| **過去帳（閲覧・追加・編集）** | ✅ | ✅ |
| **予約管理（閲覧・作成・更新）** | ✅ | ✅ |
| **イベント（閲覧・作成・編集・公開）** | ✅ | ✅ |
| イベント分析 | ✅ | ❌ |
| **お知らせ（閲覧・作成・編集）** | ✅ | ✅ |
| お知らせ削除 | ✅ | ❌ |
| **お布施（閲覧・新規追加）** | ✅ | ✅ |
| お布施（編集・削除） | ✅ | ❌ |
| **護持会費（閲覧）** | ✅ | ✅ |
| 護持会費（設定変更・削除） | ✅ | ❌ |
| **レポート（閲覧）** | ✅ | ✅ |
| **行事カレンダー（閲覧・追加）** | ✅ | ✅ |
| CSV エクスポート | ✅ | ❌ |
| 転換管理 | ✅ | ❌ |
| 寺院設定 | ✅ | ❌ |
| スタッフ管理 | ✅ | ❌ |
| プラン・お支払い | ✅ | ❌ |

---

## 変更対象

### Sidebar（UI 非表示）
- 設定 → `adminOnly: true` 追加
- 転換管理 → `adminOnly: true` 追加

### ページレベル（リダイレクト）
- `/admin/settings` → STAFF は `/admin` にリダイレクト
- `/admin/conversion` → STAFF は `/admin` にリダイレクト
- `/admin/members/import` → STAFF は `/admin/members` にリダイレクト

### API レベル（権限変更）
| エンドポイント | 変更前 | 変更後 |
|---|---|---|
| `POST /api/members/import` | requireAdminOrStaff | requireAdmin |
| `POST /api/members/[id]/promote` | requireAdminOrStaff | requireAdmin |
| `GET /api/export/*` | getAuthUser | requireAdmin |
| `DELETE /api/announcements/[id]` | requireAdminOrStaff | requireAdmin |
| `PATCH/DELETE /api/ofuse/[id]` | requireAuth | requireAdminOrStaff |
| `PATCH /api/settings` | getAuthUser | requireAdmin |
| `GET /api/conversion/*` | requireAdminOrStaff | requireAdmin |

### UI レベル（ボタン非表示）
- お布施一覧：編集・削除ボタンを ADMIN のみ表示
- お知らせ：削除ボタンを ADMIN のみ表示
- 会員詳細：「檀家に昇格」ボタンを ADMIN のみ表示
- CSV エクスポートボタンを ADMIN のみ表示
