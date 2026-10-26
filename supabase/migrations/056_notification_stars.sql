-- =============================================================================
-- Migration: 056_notification_stars.sql
-- Purpose:   Gmail-style starring on the notifications page: system.notifications.is_starred.
--            The recipient already updates their own rows (034 recipient_update), so no policy changes.
-- Schema:    system
-- Safe to re-run.
-- =============================================================================

ALTER TABLE system.notifications ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN system.notifications.is_starred IS 'Starred by the recipient on the notifications page (056).';
