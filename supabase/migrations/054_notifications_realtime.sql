-- =============================================================================
-- Migration: 054_notifications_realtime.sql
-- Purpose:   Live notifications: publish system.notifications to Supabase Realtime so the bell badge
--            and list update the moment a row is written (053 triggers, PESO inserts).
-- Schema:    system
--
-- Realtime applies the table's RLS (034: recipient_select), so each user only receives their own rows.
-- The app subscribes to INSERT and UPDATE filtered by recipient_id (notificationService.subscribe).
-- DELETE events are not used: without REPLICA IDENTITY FULL they carry no recipient to filter on.
-- Safe to re-run.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'system'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE system.notifications;
  END IF;
END;
$$;
