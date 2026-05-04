<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## v2 方針サマリー（AI向け厳守ルール）

- UIに「ご縁さん」「檀家」「メンバーシップ」「法要予約」「過去帳」「護持会費」「お布施」「ブログ」を出さない
- `Member.type` (DANKA/GOEN) を新規コードで参照・分岐しない（@deprecated）
- 削除済みモデル（DeceasedPerson / Reservation / AnnualEvent / Ofuse / GojikaiPayment 等）を参照しない
- イベントの自動繰り返し生成（cron等）は実装しない（v2スコープ外）
- 寺院検索に「おすすめ」「ランキング」を実装しない（v2スコープ外）
- 新機能追加時は CLAUDE.md のチェックリストに従うこと
