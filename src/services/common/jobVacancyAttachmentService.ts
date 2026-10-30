import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import {
  JOB_VACANCY_ATTACHMENT_BUCKET,
  type JobVacancyAttachment,
  type JobVacancyAttachmentRow,
} from '@/types/common/jobVacancyAttachment'

/** Signed URLs are made for the files on screen only, and expire after an hour */
const SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * esmdd.job_vacancy_attachments (migration 086) is not in database.types.ts until `npm run types:gen`
 * is re-run, so the typed client rejects it. Use `supabase` directly after regenerating.
 */
const attachmentsTable = () =>
  (supabase as unknown as SupabaseClient).schema('esmdd').from('job_vacancy_attachments')
const bucket = () => supabase.storage.from(JOB_VACANCY_ATTACHMENT_BUCKET)

const ATTACHMENT_COLUMNS = 'id, job_vacancy_id, path, filename, mime_type, size, uploaded_by, created_at'

/** Safe storage key under the vacancy's folder; the random prefix makes each path unique */
function buildAttachmentPath(vacancyId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'file'
  return `${vacancyId}/${crypto.randomUUID()}-${safeName}`
}

export const jobVacancyAttachmentService = {
  /** A vacancy's attachments, oldest first, each with a signed URL (one request for all of them) */
  async fetchAttachments(vacancyId: string): Promise<JobVacancyAttachment[]> {
    const { data, error } = await attachmentsTable()
      .select(ATTACHMENT_COLUMNS)
      .eq('job_vacancy_id', vacancyId)
      .order('created_at', { ascending: true })

    if (error) throw error
    const rows = (data ?? []) as JobVacancyAttachmentRow[]
    if (rows.length === 0) return []

    const { data: signed } = await bucket().createSignedUrls(
      rows.map((row) => row.path),
      SIGNED_URL_TTL_SECONDS,
    )
    const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]))
    return rows.map((row) => ({ ...row, url: urlByPath.get(row.path) ?? null }))
  },

  /** Uploads the file, then records it; a failed record removes the uploaded file again */
  async uploadAttachment(vacancyId: string, file: File): Promise<void> {
    const path = buildAttachmentPath(vacancyId, file)
    const { error: uploadError } = await bucket().upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    const { error } = await attachmentsTable().insert({
      job_vacancy_id: vacancyId,
      path,
      filename: file.name.slice(0, 200),
      mime_type: file.type || null,
      size: file.size,
    })
    if (error) {
      await bucket().remove([path]).catch(() => {})
      throw error
    }
  },

  /** Deletes the records, then their files (one request each) */
  async deleteAttachments(attachments: Pick<JobVacancyAttachmentRow, 'id' | 'path'>[]): Promise<void> {
    if (attachments.length === 0) return
    const { error } = await attachmentsTable()
      .delete()
      .in('id', attachments.map((attachment) => attachment.id))
    if (error) throw error
    await bucket().remove(attachments.map((attachment) => attachment.path)).catch(() => {})
  },

  /**
   * Stored file paths of vacancies about to be deleted. Read them first: the rows go with the
   * vacancy (ON DELETE CASCADE), but the files would be left behind (see removeFiles).
   */
  async fetchPathsOfVacancies(vacancyIds: string[]): Promise<string[]> {
    if (vacancyIds.length === 0) return []
    // One page of postings at most (≤ 5 files each), so a single .in() lookup fits
    const { data, error } = await attachmentsTable().select('path').in('job_vacancy_id', vacancyIds)
    if (error) throw error
    return ((data ?? []) as Pick<JobVacancyAttachmentRow, 'path'>[]).map((row) => row.path)
  },

  /** Removes stored files after their vacancies were deleted; leftovers are harmless, so failures are ignored */
  async removeFiles(paths: string[]): Promise<void> {
    if (paths.length) await bucket().remove(paths).catch(() => {})
  },
}
