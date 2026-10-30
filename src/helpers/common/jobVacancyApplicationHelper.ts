import {
  JOB_APPLICATION_ATTACHMENT_MAX_BYTES,
  JOB_APPLICATION_ATTACHMENT_MIME_TYPES,
  JOB_APPLICATION_STAGES,
  type JobApplicationStage,
} from '@/types/common/jobVacancyApplication'

export const JOB_APPLICATION_STAGE_LABELS: Record<JobApplicationStage, string> = {
  applied: 'New',
  screening: 'Screening',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
  rejected: 'Not selected',
}

/** What each stage means to the applicant, under their status badge */
export const JOB_APPLICATION_STAGE_DESCRIPTIONS: Record<JobApplicationStage, string> = {
  applied: 'The employer has not reviewed it yet. You can still change your files until then.',
  screening: 'The employer is reviewing your application.',
  interview: 'You are shortlisted for an interview. The employer will contact you.',
  offered: 'The employer offered you the job. They will contact you with the details.',
  hired: 'You were hired for this job.',
  rejected: 'The employer did not select you this time.',
}

/** Badge colors per stage (design tokens only) */
export const JOB_APPLICATION_STAGE_BADGE_CLASS: Record<JobApplicationStage, string> = {
  applied: 'bg-primary/10 text-primary border-primary/30',
  screening: 'bg-warning/10 text-warning border-warning/30',
  interview: 'bg-warning/10 text-warning border-warning/30',
  offered: 'bg-success/10 text-success border-success/30',
  hired: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

export const isJobApplicationStage = (value: unknown): value is JobApplicationStage =>
  (JOB_APPLICATION_STAGES as readonly unknown[]).includes(value)

export const getJobApplicationStageLabel = (stage: string | null | undefined) =>
  isJobApplicationStage(stage) ? JOB_APPLICATION_STAGE_LABELS[stage] : 'New'

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
