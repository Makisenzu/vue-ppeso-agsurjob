import { supabase } from '@/lib/supabaseClient'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import {
  SPES_COMPLETION_REPORTS,
  SPES_COMPLETION_REPORT_MAX_BYTES,
  SPES_COMPLETION_REPORT_MIME_TYPE,
  type SpesCompletionReportMap,
  type SpesCompletionReportRow,
  type SpesCompletionReportType,
} from '@/types/common/spesForm'

const SIGNED_URL_TTL_SECONDS = 60 * 60

// esmdd.spes_completion_reports (migration 016) is not in database.types.ts until `npm run types:gen`
// is re-run, so the typed client does not know the table yet. Rows are typed by SpesCompletionReportRow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const completionReportsTable = () => (supabase.schema('esmdd') as any).from('spes_completion_reports')

async function removeStorageFiles(paths: string[]) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove(paths)
  // The database rows are already gone; a leftover file is only storage clutter
  if (error) console.warn('[spesCompletionReportService] Failed to remove files from storage:', error.message)
}

async function fetchRows(appointmentIds: string[]): Promise<SpesCompletionReportRow[]> {
  const ids = [...new Set(appointmentIds)]
  if (!ids.length) return []

  const { data, error } = await completionReportsTable().select('*').in('appointment_id', ids)
  if (error) throw new Error(error.message || 'Failed to load the SPES completion reports.')
  return (data ?? []) as SpesCompletionReportRow[]
}

function reportLabel(type: SpesCompletionReportType) {
  return SPES_COMPLETION_REPORTS.find((report) => report.key === type)?.label ?? 'report'
}

/**
 * DTR and Accomplishment Report PDFs of SPES appointments (`esmdd.spes_completion_reports`), shared by
 * Provincial PESO and the beneficiary. Files go in the uploader's own folder of the documents bucket.
 */
export const spesCompletionReportService = {
  /** Reports per appointment id, with signed URLs for viewing. */
  async fetchReports(appointmentIds: string[]): Promise<Record<string, SpesCompletionReportMap>> {
    const rows = await fetchRows(appointmentIds)
    const reports: Record<string, SpesCompletionReportMap> = {}

    await Promise.all(
      rows.map(async (row) => {
        const { data: signed } = await supabase.storage
          .from(DOCUMENT_UPLOAD_BUCKET)
          .createSignedUrl(row.path, SIGNED_URL_TTL_SECONDS)
        reports[row.appointment_id] = {
          ...reports[row.appointment_id],
          [row.report_type]: { ...row, size: row.size == null ? null : Number(row.size), url: signed?.signedUrl ?? null },
        }
      })
    )
    return reports
  },

  /** Storage paths of an appointment's reports. Read them before deleting it: the rows cascade away. */
  async fetchFilePaths(appointmentIds: string[]): Promise<string[]> {
    return (await fetchRows(appointmentIds)).map((row) => row.path)
  },

  removeFiles: removeStorageFiles,

  /** Uploads a PDF report, replacing the previous file of the same type. */
  async uploadReport(options: {
    appointmentId: string
    type: SpesCompletionReportType
    file: File
    /** Signed-in user; the file goes into their own folder of the documents bucket. */
    uploaderId: string
  }): Promise<void> {
    const { appointmentId, type, file, uploaderId } = options
    const label = reportLabel(type)

    if (file.type !== SPES_COMPLETION_REPORT_MIME_TYPE) throw new Error(`The ${label} must be a PDF file.`)
    if (file.size > SPES_COMPLETION_REPORT_MAX_BYTES) {
      throw new Error(`The ${label} must be ${SPES_COMPLETION_REPORT_MAX_BYTES / 1024 / 1024} MB or smaller.`)
    }

    const previous = (await fetchRows([appointmentId])).find((row) => row.report_type === type)

    const path = fileHelpers.generateUniquePath(uploaderId, file.name)
    const { error: uploadErr } = await supabase.storage
      .from(DOCUMENT_UPLOAD_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadErr) throw new Error(uploadErr.message || `Failed to upload the ${label}.`)

    const { error } = await completionReportsTable().upsert(
      {
        appointment_id: appointmentId,
        report_type: type,
        filename: file.name,
        path,
        mime_type: file.type,
        size: file.size,
        uploaded_by: uploaderId,
      },
      { onConflict: 'appointment_id,report_type' }
    )

    if (error) {
      await removeStorageFiles([path])
      throw new Error(error.message || `Failed to save the ${label}.`)
    }

    // Only the latest file is kept per report
    if (previous && previous.path !== path) await removeStorageFiles([previous.path])
  },

  async removeReport(reportId: string, path: string): Promise<void> {
    const { error } = await completionReportsTable().delete().eq('id', reportId)
    if (error) throw new Error(error.message || 'Failed to remove the report.')
    await removeStorageFiles([path])
  },
}
