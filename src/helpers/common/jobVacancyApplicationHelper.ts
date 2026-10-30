import {
  JOB_APPLICATION_ATTACHMENT_MAX_BYTES,
  JOB_APPLICATION_ATTACHMENT_MIME_TYPES,
  JOB_APPLICATION_REQUIREMENT_HINTS,
  JOB_APPLICATION_STAGES,
  type JobApplicationDocumentMap,
  type JobApplicationRequirement,
  type JobApplicationStage,
  type JobVacancyRequirement,
  type JobVacancyStage,
} from '@/types/common/jobVacancyApplication'

/**
 * What an application to this vacancy needs: the employer's requirements in their order (migration 088).
 * No NSRP Form: it is only for PESO programs. Files saved for a requirement the employer removed
 * later are listed last as optional, so nobody loses sight of them.
 */
export function toJobApplicationRequirements(
  requirements: readonly JobVacancyRequirement[],
  savedDocuments: JobApplicationDocumentMap = {},
): JobApplicationRequirement[] {
  const list: JobApplicationRequirement[] = requirements.map(({ requirement_name, is_required }) => ({
    name: requirement_name,
    hint: JOB_APPLICATION_REQUIREMENT_HINTS[requirement_name] ?? 'Requested by the employer',
    isOptional: !is_required,
  }))
  const listed = new Set(list.map((item) => item.name))
  for (const name of Object.keys(savedDocuments)) {
    if (!listed.has(name)) list.push({ name, hint: 'No longer requested by the employer', isOptional: true })
  }
  return list
}

export const JOB_APPLICATION_STAGE_LABELS: Record<JobApplicationStage, string> = {
  applied: 'New',
  in_progress: 'In progress',
  hired: 'Hired',
  rejected: 'Not selected',
}

/** What each status means to the applicant, under their status badge */
export const JOB_APPLICATION_STAGE_DESCRIPTIONS: Record<JobApplicationStage, string> = {
  applied: 'The employer has not reviewed it yet. You can still change your files until then.',
  in_progress: 'The employer is going through your application. You will be notified at each step.',
  hired: 'You were hired for this job.',
  rejected: 'The employer did not select you this time.',
}

/** Badge colors per status (design tokens only) */
export const JOB_APPLICATION_STAGE_BADGE_CLASS: Record<JobApplicationStage, string> = {
  applied: 'bg-primary/10 text-primary border-primary/30',
  in_progress: 'bg-warning/10 text-warning border-warning/30',
  hired: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

export const isJobApplicationStage = (value: unknown): value is JobApplicationStage =>
  (JOB_APPLICATION_STAGES as readonly unknown[]).includes(value)

/** "New", "Not selected", or the name of the hiring step while in progress / hired */
export function getJobApplicationStageLabel(stage: string | null | undefined, stepName?: string | null): string {
  if ((stage === 'in_progress' || stage === 'hired') && stepName) return stepName
  return isJobApplicationStage(stage) ? JOB_APPLICATION_STAGE_LABELS[stage] : 'New'
}

export interface HiringProgressStep {
  title: string
  state: 'completed' | 'active' | 'upcoming' | 'rejected'
}

/**
 * The applicant's tracker: Submitted, then the vacancy's hiring steps. While not reviewed, the first
 * step is the one in progress; a rejected application ends with "Not selected" at the step it stopped at.
 */
export function toHiringProgress(
  steps: readonly JobVacancyStage[],
  stage: JobApplicationStage,
  stageId: string | null,
): HiringProgressStep[] {
  const ordered = [...steps].sort((a, b) => a.sort_order - b.sort_order)
  const at = stageId ? ordered.findIndex((step) => step.id === stageId) : -1
  const submitted: HiringProgressStep = { title: 'Submitted', state: 'completed' }

  if (stage === 'rejected') {
    return [
      submitted,
      ...ordered.slice(0, Math.max(at, 0)).map((step) => ({ title: step.stage_name, state: 'completed' as const })),
      { title: 'Not selected', state: 'rejected' },
    ]
  }
  if (stage === 'hired') {
    return [submitted, ...ordered.map((step) => ({ title: step.stage_name, state: 'completed' as const }))]
  }
  const current = stage === 'applied' ? 0 : Math.max(at, 0)
  return [
    submitted,
    ...ordered.map((step, index) => ({
      title: step.stage_name,
      state: index < current ? ('completed' as const) : index === current ? ('active' as const) : ('upcoming' as const),
    })),
  ]
}

/** "JOB-APP-2026-1A2B": same shape as the program references (gipApplicationCode) */
export function jobApplicationCode(id: string, createdAt: string | null | undefined): string {
  const year = (createdAt ? new Date(createdAt).getFullYear() : NaN) || new Date().getFullYear()
  return `JOB-APP-${year}-${id.slice(0, 4).toUpperCase()}`
}

/** Error message for a file that can't be uploaded, or null when it is fine */
export function validateJobApplicationAttachment(file: File): string | null {
  if (!(JOB_APPLICATION_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Upload a PDF file.'
  }
  if (file.size > JOB_APPLICATION_ATTACHMENT_MAX_BYTES) {
    return `The file must be ${JOB_APPLICATION_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB or smaller.`
  }
  return null
}
