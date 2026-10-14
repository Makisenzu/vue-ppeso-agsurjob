-- =============================================================================
-- Migration: 021_tupad_referral_backfill.sql
-- Purpose:   Register every registry applicant already referred to TUPAD
--            (applicants.applicants.referred_programs contains 'TUPAD') as a
--            TUPAD applicant in esmdd.tupad_applicants.
--
--            From now on applicantEntryService keeps the two in step, the same
--            way it does for GIP / SPES:
--              - TUPAD checked   → referToTupad     (insert if missing)
--              - TUPAD unchecked → unreferFromTupad (delete only a Pending row
--                                  that was never added to a batch)
-- Schema:    esmdd
-- =============================================================================

INSERT INTO esmdd.tupad_applicants (applicant_id, status, doc_submitted)
SELECT a.id, 'Pending', ARRAY['NSRP Form']::TEXT[]
FROM applicants.applicants a
WHERE EXISTS (
  SELECT 1 FROM unnest(COALESCE(a.referred_programs, '{}')) AS p(program)
  WHERE upper(p.program) LIKE '%TUPAD%'
)
ON CONFLICT (applicant_id) DO NOTHING;
