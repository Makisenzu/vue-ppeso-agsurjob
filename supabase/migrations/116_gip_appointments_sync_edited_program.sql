-- ════════════════════════════════════════════════════════════════════════════
-- 116 · GIP: current appointment terms follow the intern's edited program
-- ════════════════════════════════════════════════════════════════════════════
-- Editing a deployed intern (program PGAS ↔ DOLE, office, supervisor, stipend) used to rewrite only
-- esmdd.gips.remarks ("[PGAS] Office | Supervisor: … | Period: … | Stipend: …"); the intern's current term in
-- esmdd.gip_appointments kept the program, office and stipend it was deployed with. The Appointment Record,
-- the accomplishment forms (DOLE vs PGAS) and renewals read the term, so they showed the old fund.
--
-- The app now updates the current term on every edit (gipService.updateAppointmentTerm). This one-off repair
-- brings terms edited before that in line: for each intern's latest term whose program differs from the
-- "[PGAS] / [DOLE]" tag in gips.remarks, copy the program, office, supervisor and stipend from the remarks.
-- Dates are left alone (renewals keep their own). Safe to re-run: matching terms are not touched.

WITH latest AS (
  SELECT DISTINCT ON (ap.gip_id)
    ap.id,
    g.remarks,
    upper(substring(g.remarks FROM '^\s*\[(PGAS|DOLE)\]')) AS tagged_program
  FROM esmdd.gip_appointments ap
  JOIN esmdd.gips g ON g.id = ap.gip_id
  WHERE g.remarks ~* '^\s*\[(PGAS|DOLE)\]'
  ORDER BY ap.gip_id, ap.term_number DESC
),
parsed AS (
  SELECT
    l.id,
    l.tagged_program,
    nullif(btrim(split_part(regexp_replace(l.remarks, '^\s*\[(PGAS|DOLE)\]\s*', '', 'i'), '|', 1)), '') AS office,
    nullif(btrim(substring(l.remarks FROM 'Supervisor:\s*([^|]+)')), '') AS supervisor,
    nullif(btrim(substring(l.remarks FROM 'Stipend:\s*([^|]+)')), '') AS stipend
  FROM latest l
)
UPDATE esmdd.gip_appointments ap
SET
  program         = p.tagged_program,
  assigned_office = coalesce(p.office, ap.assigned_office),
  supervisor      = coalesce(p.supervisor, ap.supervisor),
  daily_stipend   = coalesce(p.stipend, CASE WHEN p.tagged_program = 'DOLE' THEN '₱475.00 / day' ELSE '₱479.35 / day' END)
FROM parsed p
WHERE ap.id = p.id
  AND ap.program IS DISTINCT FROM p.tagged_program;
