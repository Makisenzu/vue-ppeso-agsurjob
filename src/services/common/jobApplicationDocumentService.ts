import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import {
  JOB_APPLICATION_DOCUMENT_OPTIONS,
  type JobApplicationDocumentMap,
  type JobApplicationDocumentRow,
  type JobApplicationPendingDocumentMap,
  type JobApplicationReusedDocumentMap,
} from '@/types/common/jobVacancyApplication'

const SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * esmdd.job_vacancy_application_documents (migration 087) is not in database.types.ts until
 * `npm run types:gen` is re-run, so the typed client rejects it. Use `supabase` directly after regenerating.
 */
const documentsTable = () =>
  (supabase as unknown as SupabaseClient).schema('esmdd').from('job_vacancy_application_documents')

async function removeStorageFiles(paths: string[]) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove(paths)
  // The database rows are already gone or replaced; a leftover file is only storage clutter
  if (error) console.warn('[jobApplicationDocumentService] Failed to remove files from storage:', error.message)
}

async function fetchRows(applicationId: string): Promise<JobApplicationDocumentRow[]> {
  const { data, error } = await documentsTable()
    .select('id, application_id, document_name, file_name, path, mime_type, size, uploaded_by, created_at, updated_at')
    .eq('application_id', applicationId)
  if (error) throw new Error(error.message || 'Failed to load the application documents.')
  return (data ?? []) as JobApplicationDocumentRow[]
}

/**
 * Files attached to a job application, shared by the applicant (read / upload while the stage is
 * `applied`) and the employer reviewing the vacancy (read). Files go in the uploader's own folder of
 * the private documents bucket and open through signed URLs (PRIVACY.md §4).
 */
export const jobApplicationDocumentService = {
  /** Current file per document name, with signed URLs for viewing */
  async fetchDocuments(applicationId: string): Promise<JobApplicationDocumentMap> {
    const rows = await fetchRows(applicationId)
    if (!rows.length) return {}

    const { data: signed, error } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).createSignedUrls(
      rows.map((row) => row.path),
      SIGNED_URL_TTL_SECONDS
    )
    // Rows still show without a link if signing fails (e.g. the file was removed from storage)
    if (error) console.warn('[jobApplicationDocumentService] Failed to sign document URLs:', error.message)

    const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]))
    const documents: JobApplicationDocumentMap = {}
    for (const row of rows) {
      documents[row.document_name] = {
        ...row,
        size: row.size == null ? null : Number(row.size),
        url: urlByPath.get(row.path) ?? null,
      }
    }
    return documents
  },

  /**
   * Uploads the picked files and copies the chosen profile documents, each replacing that document's
   * previous file. Profile documents are copied, not linked, so removing one never breaks the other.
   */
  async uploadDocuments(options: {
    applicationId: string
    /** Signed-in user; files go into their own folder of the documents bucket */
    uploaderId: string
    pending: JobApplicationPendingDocumentMap
    reused?: JobApplicationReusedDocumentMap
  }): Promise<void> {
    const { applicationId, uploaderId, pending, reused = {} } = options
    const existing = await fetchRows(applicationId)

    const saveRow = async (
      documentName: string,
      file: { path: string; fileName: string; mimeType: string | null; size: number | null }
    ) => {
      const current = existing.find((row) => row.document_name === documentName)
      const { error: rowErr } = await documentsTable().upsert(
        {
          application_id: applicationId,
          document_name: documentName,
          file_name: file.fileName,
          path: file.path,
          mime_type: file.mimeType,
          size: file.size,
          uploaded_by: uploaderId,
        },
        { onConflict: 'application_id,document_name' }
      )

      if (rowErr) {
        await removeStorageFiles([file.path])
        throw new Error(rowErr.message || `Failed to save the ${documentName}.`)
      }

      // Only the latest file is kept per document
      if (current) await removeStorageFiles([current.path])
    }

    for (const [documentName, file] of Object.entries(pending)) {
      if (!file || !JOB_APPLICATION_DOCUMENT_OPTIONS.includes(documentName)) continue
      const path = fileHelpers.generateUniquePath(uploaderId, file.name)
      const { error: uploadErr } = await supabase.storage
        .from(DOCUMENT_UPLOAD_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw new Error(uploadErr.message || `Failed to upload the ${documentName}.`)
      await saveRow(documentName, { path, fileName: file.name, mimeType: file.type, size: file.size })
    }

    for (const [documentName, document] of Object.entries(reused)) {
      if (!document || pending[documentName] || !JOB_APPLICATION_DOCUMENT_OPTIONS.includes(documentName)) continue
      const path = fileHelpers.generateUniquePath(uploaderId, document.fileName)
      const { error: copyErr } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).copy(document.path, path)
      if (copyErr) {
        throw new Error(
          /not found/i.test(copyErr.message)
            ? `Your ${document.label} is no longer in your documents. Upload the ${documentName} instead.`
            : copyErr.message || `Failed to attach your ${document.label} to the ${documentName}.`
        )
      }
      await saveRow(documentName, {
        path,
        fileName: document.fileName,
        mimeType: document.mimeType,
        size: document.size,
      })
    }
  },

  /** Removes one attached file (row first, then the stored file) */
  async deleteDocument(document: Pick<JobApplicationDocumentRow, 'id' | 'path' | 'document_name'>): Promise<void> {
    const { error } = await documentsTable().delete().eq('id', document.id)
    if (error) throw new Error(error.message || `Failed to remove the ${document.document_name}.`)
    await removeStorageFiles([document.path])
  },
}
