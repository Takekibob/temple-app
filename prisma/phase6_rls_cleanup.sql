-- Phase 6: RLS ポリシー整理
-- 削除済みモデルのポリシーはテーブル DROP 時に PostgreSQL が自動削除済み。
-- 残作業: events_select_authenticated から @deprecated の MEMBERS_ONLY を除去する。

DROP POLICY IF EXISTS events_select_authenticated ON events;

CREATE POLICY events_select_authenticated ON events
  FOR SELECT TO authenticated
  USING (
    is_admin_or_staff()
    OR (
      status = 'PUBLISHED'::event_status
      AND visibility IN (
        'PUBLIC'::event_visibility,
        'FOLLOWERS_ONLY'::event_visibility
      )
    )
  );
