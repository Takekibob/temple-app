-- Fix Phase 5: drop announcement policies that depend on targetSegment column

-- Drop the blocking policies
DROP POLICY IF EXISTS announcements_select_anon ON announcements;
DROP POLICY IF EXISTS announcements_select_authenticated ON announcements;

-- Recreate without targetSegment (all announcements are now broadcast-only)
CREATE POLICY announcements_select_anon ON announcements
  FOR SELECT TO anon
  USING ("publishedAt" IS NOT NULL);

CREATE POLICY announcements_select_authenticated ON announcements
  FOR SELECT TO authenticated
  USING (is_admin_or_staff() OR "publishedAt" IS NOT NULL);

-- Also update events_select_authenticated to reflect v2 visibility model
DROP POLICY IF EXISTS events_select_authenticated ON events;
CREATE POLICY events_select_authenticated ON events
  FOR SELECT TO authenticated
  USING (
    is_admin_or_staff() OR
    (
      status = 'PUBLISHED'::event_status AND
      visibility IN (
        'PUBLIC'::event_visibility,
        'FOLLOWERS_ONLY'::event_visibility,
        'MEMBERS_ONLY'::event_visibility
      )
    )
  );
