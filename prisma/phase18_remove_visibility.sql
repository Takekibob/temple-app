-- Phase 18: EventVisibility 完全削除
-- events テーブルの visibility カラムへの依存をRLSから除去する

-- 既存のイベント関連ポリシーを削除
DROP POLICY IF EXISTS events_select_anon ON events;
DROP POLICY IF EXISTS events_select_authenticated ON events;

-- 新しいポリシー: visibility なし（全公開イベントが対象）
CREATE POLICY events_select_anon ON events
  FOR SELECT TO anon
  USING (status = 'PUBLISHED'::event_status);

CREATE POLICY events_select_authenticated ON events
  FOR SELECT TO authenticated
  USING (
    is_admin_or_staff()
    OR status = 'PUBLISHED'::event_status
  );
