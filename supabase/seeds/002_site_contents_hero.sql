-- ============================================================================
-- Seed: system.site_contents hero carousel (migration 046)
-- ============================================================================
-- The four slides the landing page ships with, published so PESO can edit them
-- instead of starting from an empty carousel. Images are left empty, so the slides
-- use the plain background until a photo is uploaded to 'site-content-media'.
-- Re-runnable: a slide is skipped when its placement + title already exists.
--
-- Sources: program eligibility from the PESO requirements list (SPES, GIP, FNPLP).
-- Run in the Supabase SQL editor after migration 046.
-- ============================================================================

INSERT INTO system.site_contents (
  placement, eyebrow, title, description,
  primary_label, primary_link, secondary_label, secondary_link,
  sort_order, status
)
SELECT
  'hero_carousel', v.eyebrow, v.title, v.description,
  v.primary_label, v.primary_link, v.secondary_label, v.secondary_link,
  v.sort_order, 'published'
FROM (
  VALUES
    (
      'PESO Agusan del Sur',
      'Find work close to home in Agusan del Sur',
      'Browse vacancies from local employers, apply online, and track every application in one place.',
      'Create an account', '/signup', 'See vacancies', '#jobs', 0
    ),
    (
      'Special Program for Employment of Students',
      'Earn during your school break with SPES',
      'For students aged 15 to 30 who live in Agusan del Sur and come from low-income families.',
      'Apply for SPES', '/signup', 'View requirements', '#program-spes', 1
    ),
    (
      'Government Internship Program',
      'Start your career in public service through GIP',
      'Open to 18 to 30 year olds who finished at least high school or a tech-voc course.',
      'Apply for GIP', '/signup', 'View requirements', '#program-gip', 2
    ),
    (
      'OFW Fly Now Pay Later Plan',
      'Fly now and pay later for your overseas job',
      'Financing for OFWs with an employment contract and working visa, backed by two co-makers.',
      'Apply for FNPLP', '/signup', 'View requirements', '#program-fly-now-pay-later', 3
    )
) AS v (eyebrow, title, description, primary_label, primary_link, secondary_label, secondary_link, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM system.site_contents c
  WHERE c.placement = 'hero_carousel'
    AND c.title = v.title
);
