import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import type {
  ParticipantStatusFormValues,
  SkillsDemandCourseLevel,
  SkillsDemandCourseRow,
  SkillsDemandRow,
  SkillsTraining,
  SkillsTrainingFormValues,
  SkillsTrainingParticipant,
  TrainingCompletionStatus,
  TrainingEmploymentStatus,
} from '@/types/peso/provincialPeso/skillsTraining'

/** Rows per page of the trainings, participants, candidates and demand tables */
export const SKILLS_TRAINING_PAGE_SIZE = 10

/** A training teaches 1 to this many skills (esmdd.save_skills_training) */
export const TRAINING_MAX_SKILLS = 20

/** Training agencies PESO usually coordinates with; any other name can be typed */
export const TRAINING_AGENCY_SUGGESTIONS = ['TESDA', 'DICT', 'DOLE', 'DTI', 'DA-ATI', 'DOST'] as const

export const COMPLETION_STATUSES: readonly TrainingCompletionStatus[] = ['Enrolled', 'Completed', 'Did Not Finish']
export const EMPLOYMENT_STATUSES: readonly TrainingEmploymentStatus[] = ['Not Yet Employed', 'Hired', 'Self-Employed', 'Unreachable']

export const COMPLETION_FILTER_OPTIONS = [{ value: 'ALL', label: 'All Completion' }, ...COMPLETION_STATUSES.map((s) => ({ value: s, label: s }))]
export const EMPLOYMENT_FILTER_OPTIONS = [{ value: 'ALL', label: 'All Statuses' }, ...EMPLOYMENT_STATUSES.map((s) => ({ value: s, label: s }))]

export const COMPLETION_BADGE_CLASS: Record<TrainingCompletionStatus, string> = {
  Enrolled: 'border-info/30 bg-info/10 text-info',
  Completed: 'border-success/30 bg-success/10 text-success',
  'Did Not Finish': 'border-destructive/30 bg-destructive/10 text-destructive',
}

/** A vacancy's Open / Closed badge on the Skills Demand page (only open vacancies count as demand) */
export const vacancyStatusLabel = (isOpen: boolean) => (isOpen ? 'Open' : 'Closed')
export const vacancyStatusBadgeClass = (isOpen: boolean) =>
  isOpen ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-muted text-muted-foreground'

export const EMPLOYMENT_BADGE_CLASS: Record<TrainingEmploymentStatus, string> = {
  'Not Yet Employed': 'border-warning/30 bg-warning/10 text-warning',
  Hired: 'border-success/30 bg-success/10 text-success',
  'Self-Employed': 'border-primary/30 bg-primary/10 text-primary',
  Unreachable: 'border-border bg-muted text-muted-foreground',
}

export const errorMessageOf = (error: unknown, fallback: string): string =>
  (error instanceof Error && error.message) || (typeof (error as { message?: unknown })?.message === 'string' && (error as { message: string }).message) || fallback

/** "10/05/2026 – 11/20/2026", or one date for a one-day training */
export function formatTrainingDates(training: Pick<SkillsTraining, 'start_date' | 'end_date'>): string {
  const start = formatDisplayDate(training.start_date, '—')
  if (!training.end_date || training.end_date === training.start_date) return start
  return `${start} – ${formatDisplayDate(training.end_date, '—')}`
}

/** "Prosperidad Gymnasium, Prosperidad" */
export function formatTrainingPlace(training: Pick<SkillsTraining, 'venue' | 'municipality'>): string {
  return [training.venue, training.municipality].map((part) => part?.trim()).filter(Boolean).join(', ')
}

/** "Data Entry, Email Management +2": the first skills by name, then how many more */
export function formatTrainingSkills(training: Pick<SkillsTraining, 'skill_names'>, max = 2): string {
  const names = training.skill_names
  if (names.length === 0) return 'No skills listed'
  const shown = names.slice(0, max).join(', ')
  return names.length > max ? `${shown} +${names.length - max}` : shown
}

/** Share of participants now hired or self-employed: "36%"; "—" with no participants */
export function formatPlacementRate(training: Pick<SkillsTraining, 'participant_count' | 'employed_count'>): string {
  if (!training.participant_count) return '—'
  return `${Math.round((training.employed_count / training.participant_count) * 100)}%`
}

// ─── Forms ───

export const emptyTrainingForm = (): SkillsTrainingFormValues => ({
  title: '',
  skillIds: [],
  agency: '',
  startDate: '',
  endDate: '',
  venue: '',
  municipality: '',
  remarks: '',
})

export const toTrainingForm = (training: SkillsTraining): SkillsTrainingFormValues => ({
  title: training.title,
  skillIds: [...training.skill_ids],
  agency: training.agency,
  startDate: training.start_date,
  endDate: training.end_date,
  venue: training.venue ?? '',
  municipality: training.municipality ?? '',
  remarks: training.remarks ?? '',
})

export type TrainingFormErrors = Partial<Record<keyof SkillsTrainingFormValues, string>>

/** Mirrors the table's CHECK constraints (migration 118) */
export function validateTrainingForm(values: SkillsTrainingFormValues): TrainingFormErrors {
  const errors: TrainingFormErrors = {}
  const title = values.title.trim()
  const agency = values.agency.trim()
  if (title.length < 2 || title.length > 150) errors.title = 'Enter a title of 2 to 150 characters.'
  if (values.skillIds.length === 0) errors.skillIds = 'Add at least one skill the training teaches.'
  else if (values.skillIds.length > TRAINING_MAX_SKILLS) errors.skillIds = `Keep it to ${TRAINING_MAX_SKILLS} skills.`
  if (agency.length < 2 || agency.length > 100) errors.agency = 'Enter the training agency.'
  if (!values.startDate) errors.startDate = 'Enter the start date.'
  if (!values.endDate) errors.endDate = 'Enter the end date.'
  else if (values.startDate && values.endDate < values.startDate) errors.endDate = 'The end date is before the start date.'
  if (values.venue.trim().length > 200) errors.venue = 'Keep the venue under 200 characters.'
  if (values.remarks.trim().length > 1000) errors.remarks = 'Keep the remarks under 1,000 characters.'
  return errors
}

export const toStatusForm = (participant: SkillsTrainingParticipant): ParticipantStatusFormValues => ({
  completionStatus: participant.completion_status,
  employmentStatus: participant.employment_status,
  employerName: participant.employer_name ?? '',
  dateHired: participant.date_hired ?? '',
  remarks: participant.status_remarks ?? '',
})

export type StatusFormErrors = Partial<Record<keyof ParticipantStatusFormValues, string>>

export function validateStatusForm(values: ParticipantStatusFormValues, today: string): StatusFormErrors {
  const errors: StatusFormErrors = {}
  if (values.employmentStatus === 'Hired') {
    const employer = values.employerName.trim()
    if (!employer) errors.employerName = 'Enter the company that hired them.'
    else if (employer.length > 150) errors.employerName = 'Keep the company name under 150 characters.'
    if (values.dateHired && values.dateHired > today) errors.dateHired = 'The date hired is in the future.'
  }
  if (values.remarks.trim().length > 500) errors.remarks = 'Keep the remarks under 500 characters.'
  return errors
}

// ─── Skills Demand ───

/**
 * What to do about a skill, from the province's supply against the municipalities' own gaps:
 * every municipality covered, or refer people from municipalities with a surplus, or train the rest.
 */
export function trainingRecommendation(row: SkillsDemandRow): string {
  if (row.gap <= 0) return 'Each municipality that needs it has enough jobseekers.'
  const shortfall = Math.max(row.demand_slots - demandSupplyTotal(row), 0)
  const people = (count: number) => `${count.toLocaleString()} ${count === 1 ? 'person' : 'people'}`
  if (shortfall === 0) return `Short of ${people(row.gap)} where needed; refer jobseekers from other municipalities.`
  if (shortfall < row.gap) {
    return `Train about ${people(shortfall)}; refer the other ${row.gap - shortfall} from other municipalities.`
  }
  const places = row.places.filter((place) => place !== 'Unspecified').slice(0, 3)
  return `Train about ${people(row.gap)}${places.length ? ` in ${places.join(', ')}` : ''}.`
}

/** "Bayugan, San Francisco +2" */
export function formatPlaces(places: string[], max = 2): string {
  if (places.length === 0) return '—'
  const shown = places.slice(0, max).join(', ')
  return places.length > max ? `${shown} +${places.length - max}` : shown
}

/** Supply as shown: record holders plus training completers */
export const demandSupplyTotal = (row: Pick<SkillsDemandRow, 'supply' | 'trained'>): number => row.supply + row.trained

/** Course levels as shown on Skills Demand → By Course */
export const COURSE_LEVEL_LABEL: Record<SkillsDemandCourseLevel, string> = {
  shs_strand: 'SHS strand',
  techvoc: 'TESDA',
  tertiary: 'College',
  graduate: 'Graduate',
}

/** A course's level; "Other" for a course only vacancies name */
export const courseLevelLabel = (row: Pick<SkillsDemandCourseRow, 'level'>): string => (row.level ? COURSE_LEVEL_LABEL[row.level] : 'Other')
