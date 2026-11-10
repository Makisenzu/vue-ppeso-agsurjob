import { supabase } from '@/lib/supabaseClient'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import type {
  GipAccomplishmentRow,
  GipAccomplishmentStatus,
  GipAccomplishmentSavePayload,
} from '@/types/common/gipAccomplishment'

// esmdd.gip_accomplishments / submit_gip_accomplishment (migration 112) are not in database.types.ts until
// `npm run types:gen` is re-run, so the typed client does not know them yet. Rows are typed by GipAccomplishmentRow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const esmdd = () => supabase.schema('esmdd') as any
const accomplishmentsTable = () => esmdd().from('gip_accomplishments')

// Only the columns the screens show (PRIVACY.md §4 rule 3)
const COLUMNS =
  'id, appointment_id, applicant_id, program, period_start, period_end, daily_entries, activities, designation, supervisor_name, approver_name, approver_position, amount, amount_in_words, file_name, file_path, file_size, status, review_remarks, reviewed_at, submitted_at, created_at, updated_at'

async function removeStorageFile(path: string | null | undefined) {
  if (!path) return
  const { error } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove([path])
  // The row is already gone or points at the new file; a leftover file is only storage clutter
  if (error) console.warn('[gipAccomplishmentService] Failed to remove a file from storage:', error.message)
}

const normalize = (row: GipAccomplishmentRow): GipAccomplishmentRow => ({
  ...row,
  file_size: row.file_size == null ? null : Number(row.file_size),
  daily_entries: Array.isArray(row.daily_entries) ? row.daily_entries : [],
  activities: Array.isArray(row.activities) ? row.activities : [],
  // NUMERIC comes back as a string
  amount: row.amount == null ? null : Number(row.amount),
})

/**
 * Half-month accomplishment reports of GIP interns (`esmdd.gip_accomplishments`): DOLE daily entries, or PGAS
 * activities with the payment receipt. Interns save drafts and submit through the RPC (it checks the term, the half
 * and the funding's form); Provincial PESO reviews by
 * updating the status.
 * Files sit in the uploader's own folder of the private documents bucket and open only by signed URL.
 */
export const gipAccomplishmentService = {
  /** Reports of these appointment terms, newest period first. RLS limits interns to their own. */
  async listByAppointments(appointmentIds: string[]): Promise<GipAccomplishmentRow[]> {
    if (!appointmentIds.length) return []
    const { data, error } = await accomplishmentsTable()
      .select(COLUMNS)
      .in('appointment_id', appointmentIds)
      .order('period_start', { ascending: false })
    if (error) throw new Error(error.message || 'Failed to load the accomplishment reports.')
    return ((data ?? []) as GipAccomplishmentRow[]).map(normalize)
  },

  /** Saves (Draft) or submits the intern's report; a newly picked PDF replaces the previous file. */
  async save(payload: GipAccomplishmentSavePayload & { uploaderId: string; previousFilePath?: string | null }) {
    let file: { path: string; name: string; size: number | null } | null = payload.keepFile ?? null
    let uploadedPath: string | null = null

    if (payload.file) {
      const path = fileHelpers.generateUniquePath(payload.uploaderId, payload.file.name)
      const { error: uploadErr } = await supabase.storage
        .from(DOCUMENT_UPLOAD_BUCKET)
        .upload(path, payload.file, { contentType: payload.file.type || 'application/pdf', upsert: false })
      if (uploadErr) throw new Error(uploadErr.message || 'Failed to upload the PDF.')
      uploadedPath = path
      file = { path, name: payload.file.name, size: payload.file.size }
    }

    const { data, error } = await esmdd().rpc('save_gip_accomplishment', {
      p_id: payload.id,
      p_appointment_id: payload.appointmentId,
      p_period_start: payload.periodStart,
      p_period_end: payload.periodEnd,
      p_daily_entries: payload.dailyEntries,
      p_activities: payload.activities,
      p_details: payload.details,
      p_file_path: file?.path ?? null,
      p_file_name: file?.name ?? null,
      p_file_size: file?.size ?? null,
      p_submit: payload.submit,
    })

    if (error) {
      await removeStorageFile(uploadedPath)
      throw new Error(error.message || 'Failed to save the accomplishment report.')
    }

    // The old file is no longer referenced once the report points at a new one (or at none)
    if (payload.previousFilePath && payload.previousFilePath !== file?.path) {
      await removeStorageFile(payload.previousFilePath)
    }
    return normalize(data as GipAccomplishmentRow)
  },

  /** Discards a report PESO has not reviewed yet (row first, then its file). */
  async remove(report: Pick<GipAccomplishmentRow, 'id' | 'file_path'>): Promise<void> {
    const { error } = await accomplishmentsTable().delete().eq('id', report.id)
    if (error) throw new Error(error.message || 'Failed to remove the report.')
    await removeStorageFile(report.file_path)
  },

  /**
   * Discards several reports in one request (RLS lets an intern delete only their own, not yet Reviewed). Returns the
   * ids actually deleted; their files are removed afterwards.
   */
  async removeMany(reports: Pick<GipAccomplishmentRow, 'id' | 'file_path'>[]): Promise<string[]> {
    if (!reports.length) return []
    const { data, error } = await accomplishmentsTable()
      .delete()
      .in('id', reports.map((r) => r.id))
      .select('id')
    if (error) throw new Error(error.message || 'Failed to remove the reports.')
    const deleted = new Set(((data ?? []) as { id: string }[]).map((row) => row.id))
    const paths = reports.filter((r) => deleted.has(r.id) && r.file_path).map((r) => r.file_path as string)
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove(paths)
      if (storageError) console.warn('[gipAccomplishmentService] Failed to remove files from storage:', storageError.message)
    }
    return [...deleted]
  },

  /** Provincial PESO: mark Reviewed, or Return with remarks (required, CHECK in migration 112). */
  async review(id: string, status: Extract<GipAccomplishmentStatus, 'Reviewed' | 'Returned'>, remarks: string | null) {
    const { data, error } = await accomplishmentsTable()
      .update({ status, review_remarks: remarks?.trim() || null })
      .eq('id', id)
      .select(COLUMNS)
      .single()
    if (error) throw new Error(error.message || 'Failed to update the report.')
    return normalize(data as GipAccomplishmentRow)
  },

  /** Provincial PESO: marks several Submitted reports Reviewed in one request; returns the updated rows */
  async markManyReviewed(ids: string[]): Promise<GipAccomplishmentRow[]> {
    if (!ids.length) return []
    const { data, error } = await accomplishmentsTable()
      .update({ status: 'Reviewed', review_remarks: null })
      .in('id', ids)
      .eq('status', 'Submitted')
      .select(COLUMNS)
    if (error) throw new Error(error.message || 'Failed to update the reports.')
    return ((data ?? []) as GipAccomplishmentRow[]).map(normalize)
  },
}
