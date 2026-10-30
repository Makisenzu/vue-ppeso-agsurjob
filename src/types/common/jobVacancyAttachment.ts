/**
 * esmdd.job_vacancy_attachments (migration 086). Typed by hand until `npm run types:gen` is re-run;
 * then derive it from database.types.ts.
 */
export type JobVacancyAttachmentRow = {
  id: string
  job_vacancy_id: string
  path: string
  filename: string
  mime_type: string | null
  size: number | null
  uploaded_by: string | null
  created_at: string
}

/** A saved attachment with a short-lived signed URL (the bucket is private) */
export type JobVacancyAttachment = JobVacancyAttachmentRow & { url: string | null }

export const JOB_VACANCY_ATTACHMENT_BUCKET = 'job-vacancy-attachments'
export const JOB_VACANCY_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]
export const JOB_VACANCY_ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp'
export const JOB_VACANCY_ATTACHMENT_MAX_SIZE_MB = 10
export const JOB_VACANCY_ATTACHMENT_MAX_FILES = 5
