import type {
  FitBand,
  FitCriterion,
  FitCriterionKey,
  FitCriterionView,
  FitReason,
  FitStatus,
  JobVacancyFit,
} from '@/types/common/jobVacancyFit'

/**
 * Labels and wording of the vacancy fit (migration 098). The SQL returns keys only; every word the
 * employer or applicant reads comes from here.
 */

export const FIT_CRITERION_LABEL: Record<FitCriterionKey, string> = {
  skills_required: 'Must-have skills',
  education: 'Education',
  course: 'Course / strand',
  experience: 'Work experience',
  eligibility: 'Eligibility',
  license: 'License',
  training: 'Training',
  skills_optional: 'Nice-to-have skills',
  language: 'Language',
}

export const FIT_STATUS_LABEL: Record<FitStatus, string> = {
  met: 'Met',
  partial: 'Partly met',
  unmet: 'Not met',
  unknown: 'Check documents',
}

export const FIT_STATUS_TEXT_CLASS: Record<FitStatus, string> = {
  met: 'text-success',
  partial: 'text-warning',
  unmet: 'text-destructive',
  unknown: 'text-muted-foreground',
}

export const FIT_BAND_LABEL: Record<FitBand, string> = {
  strong: 'Strong fit',
  partial: 'Partial fit',
  low: 'Low fit',
}

/** Same badge look as the hiring stages (JOB_APPLICATION_STAGE_BADGE_CLASS) */
export const FIT_BAND_BADGE_CLASS: Record<FitBand, string> = {
  strong: 'bg-success/10 text-success border-success/30',
  partial: 'bg-warning/10 text-warning border-warning/30',
  low: 'bg-muted text-muted-foreground border-border',
}

const REASON_TEXT: Record<FitReason, string> = {
  level_not_comparable: 'The level asked for is not on the standard list',
  no_education_on_profile: 'No education on the NSRP profile',
  any_bachelors_degree: "Any bachelor's degree is accepted",
  relevance_needs_review: 'Whether the course is relevant needs a review',
  unlisted_eligibility_needs_review: 'Not on the standard list; check the documents',
  unlisted_license_needs_review: 'Not on the standard list; check the documents',
  duration_not_in_hours: 'Some training durations are not in hours',
}

/** Shown under every fit breakdown */
export const FIT_DISCLAIMER = 'Advisory only, from the NSRP profile. Verify against the submitted documents.'

/** Shown under the applicant's own match */
export const FIT_APPLICANT_DISCLAIMER =
  'Based on your NSRP profile. The employer decides from your application and documents.'

/** How the score is computed, for the "How is this computed?" note */
export const FIT_METHOD_NOTE =
  'Each requirement the posting asks for is weighed: must-have skills 30, education 15, course 15, work experience 15, ' +
  'eligibility 10, license 10, training 5, nice-to-have skills 5, language 5. Partly met earns its share. ' +
  'Sex, age, civil status, religion, disability and OFW status are never scored.'

const toList = (value: string | string[] | undefined): string[] =>
  Array.isArray(value) ? value : value ? [value] : []

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'}`

/** 18 → "1 year and 6 months" */
function formatMonths(months: number): string {
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (!years) return plural(rest, 'month')
  return rest ? `${plural(years, 'year')} and ${plural(rest, 'month')}` : plural(years, 'year')
}

/** "2 of 3 found" style count for list criteria */
const countDetail = (criterion: FitCriterion) => {
  const required = toList(criterion.required)
  const matched = toList(criterion.matched)
  return `${matched.length} of ${required.length} found`
}

function describeDetail(criterion: FitCriterion): string {
  const reason = criterion.reason ? REASON_TEXT[criterion.reason] : null
  const required = toList(criterion.required)

  switch (criterion.key) {
    case 'skills_required':
    case 'skills_optional':
    case 'language':
      return countDetail(criterion)
    case 'education': {
      const has = toList(criterion.applicant)[0]
      return [`Asks for ${required[0] ?? '—'}`, has ? `has ${has}` : null, reason].filter(Boolean).join(' · ')
    }
    case 'course': {
      const matched = toList(criterion.matched)[0]
      if (matched) return `Matches ${matched}`
      const has = toList(criterion.applicant)
      return [`Accepts ${required.join(', ')}`, has.length ? `has ${has.join(', ')}` : 'no course on profile', reason]
        .filter(Boolean)
        .join(' · ')
    }
    case 'experience':
      return `Asks for ${formatMonths(criterion.required_months ?? 0)} · has ${formatMonths(criterion.applicant_months ?? 0)}`
    case 'training':
      return [
        `Asks for ${plural(criterion.required_hours ?? 0, 'hour')}`,
        `has ${plural(Math.round(criterion.applicant_hours ?? 0), 'hour')}`,
        reason,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'eligibility':
    case 'license':
      return [required[0] ?? '—', reason].filter(Boolean).join(' · ')
  }
}

/** Requirements first in the SQL's order, nice-to-have skills last */
export function toFitCriterionViews(fit: JobVacancyFit | null | undefined): FitCriterionView[] {
  if (!fit) return []
  return [...fit.criteria]
    .sort((a, b) => Number(a.key === 'skills_optional') - Number(b.key === 'skills_optional'))
    .map((criterion) => ({
      key: criterion.key,
      label: FIT_CRITERION_LABEL[criterion.key],
      status: criterion.status,
      statusLabel: FIT_STATUS_LABEL[criterion.status],
      detail: describeDetail(criterion),
      missing: criterion.missing ?? [],
      isOptional: criterion.key === 'skills_optional',
    }))
}

/** "5 of 6 requirements met" (+ "· 1 to check in documents") */
export function formatFitCounts(fit: Pick<JobVacancyFit, 'met_count' | 'required_count' | 'unknown_count'>): string {
  const met = `${fit.met_count} of ${plural(fit.required_count, 'requirement')} met`
  return fit.unknown_count > 0 ? `${met} · ${fit.unknown_count} to check in documents` : met
}

/** Short "5/6" for table cells and mobile cards; null when there's nothing to compare */
export function formatFitShort(metCount: number | null, requiredCount: number | null): string | null {
  if (metCount == null || !requiredCount) return null
  return `${metCount}/${requiredCount}`
}

/** Criteria the applicant could act on: not met or partly met, with what's missing */
export const toFitGaps = (views: FitCriterionView[]) =>
  views.filter((view) => !view.isOptional && (view.status === 'unmet' || view.status === 'partial'))
