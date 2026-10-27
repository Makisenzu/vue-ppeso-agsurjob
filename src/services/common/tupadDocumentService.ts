import { supabase } from '@/lib/supabaseClient'
import { fetchAllInChunks } from '@/helpers/common/supabasePaging'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import {
  TUPAD_DOCUMENT_OPTIONS,
  type TupadApplicantDocumentMap,
  type TupadApplicantDocumentRow,
  type TupadPendingDocumentMap,
} from '@/types/common/tupad'
import type { TupadReusedDocumentMap } from '@/types/common/tupadProgram'

const SIGNED_URL_TTL_SECONDS = 60 * 60

// esmdd.tupad_applicant_documents (migration 023) is not in database.types.ts until `npm run types:gen`
// is re-run, so the typed client does not know the table yet. Rows are typed by TupadApplicantDocumentRow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const documentsTable = () => (supabase.schema('esmdd') as any).from('tupad_applicant_documents')

async function removeStorageFiles(paths: string[]) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove(paths)
  // The database rows are already gone or replaced; a leftover file is only storage clutter
  if (error) console.warn('[tupadDocumentService] Failed to remove files from storage:', error.message)
}

async function fetchRows(tupadApplicantId: string): Promise<TupadApplicantDocumentRow[]> {
  const { data, error } = await documentsTable().select('*').eq('tupad_applicant_id', tupadApplicantId)
  if (error) throw new Error(error.message || 'Failed to load the TUPAD documents.')
  return (data ?? []) as TupadApplicantDocumentRow[]
}

/**
 * Files attached to the required TUPAD documents (`esmdd.tupad_applicant_documents`), shared by
 * Provincial PESO (read) and the applicant (read / upload). Files go in the uploader's own folder
 * of the documents bucket.
 */
export const tupadDocumentService = {
  /**
   * Storage paths of the files of these TUPAD applicants. Read them before deleting the applicants:
   * the document rows cascade away with them, leaving the files unreferenced.
   */
  async fetchFilePaths(
    tupadApplicantIds: string[]
  ): Promise<Pick<TupadApplicantDocumentRow, 'tupad_applicant_id' | 'path'>[]> {
    if (!tupadApplicantIds.length) return []
    const { data, error } = await fetchAllInChunks(tupadApplicantIds, (chunk) =>
      documentsTable().select('tupad_applicant_id, path').in('tupad_applicant_id', chunk).order('id')
    )
    if (error) throw new Error(error.message || 'Failed to load the TUPAD documents.')
    return data as Pick<TupadApplicantDocumentRow, 'tupad_applicant_id' | 'path'>[]
  },

  /** Removes files from the documents bucket (best effort — see removeStorageFiles). */
  removeFiles: removeStorageFiles,

  /** Current file per document name, with signed URLs for viewing. */
  async fetchDocuments(tupadApplicantId: string): Promise<TupadApplicantDocumentMap> {
    const rows = await fetchRows(tupadApplicantId)
    if (!rows.length) return {}

    const { data: signed, error } = await supabase.storage
      .from(DOCUMENT_UPLOAD_BUCKET)
      .createSignedUrls(
        rows.map((row) => row.path),
        SIGNED_URL_TTL_SECONDS
      )
    // Rows still show without a link if signing fails (e.g. the file was removed from storage)
    if (error) console.warn('[tupadDocumentService] Failed to sign document URLs:', error.message)

    const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]))
    const documents: TupadApplicantDocumentMap = {}
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
   * Each saved file ticks its document in tupad_applicants.doc_submitted (trigger in migration 070).
   */
  async uploadDocuments(options: {
    tupadApplicantId: string
    /** Signed-in user; files go into their own folder of the documents bucket. */
    uploaderId: string
    pending: TupadPendingDocumentMap
    reused?: TupadReusedDocumentMap
  }): Promise<void> {
    const { tupadApplicantId, uploaderId, pending, reused = {} } = options
    const existing = await fetchRows(tupadApplicantId)

    const saveRow = async (
      documentName: string,
      file: { path: string; fileName: string; mimeType: string | null; size: number | null }
    ) => {
      const current = existing.find((row) => row.document_name === documentName)
      const { error: rowErr } = await documentsTable().upsert(
        {
          tupad_applicant_id: tupadApplicantId,
          document_name: documentName,
          file_name: file.fileName,
          path: file.path,
          mime_type: file.mimeType,
          size: file.size,
          uploaded_by: uploaderId,
        },
        { onConflict: 'tupad_applicant_id,document_name' }
      )

      if (rowErr) {
        await removeStorageFiles([file.path])
        throw new Error(rowErr.message || `Failed to save the ${documentName}.`)
      }

      // Only the latest file is kept per document
      if (current) await removeStorageFiles([current.path])
    }

    for (const [documentName, file] of Object.entries(pending)) {
      if (!file || !TUPAD_DOCUMENT_OPTIONS.includes(documentName)) continue
      const path = fileHelpers.generateUniquePath(uploaderId, file.name)
      const { error: uploadErr } = await supabase.storage
        .from(DOCUMENT_UPLOAD_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw new Error(uploadErr.message || `Failed to upload the ${documentName}.`)
      await saveRow(documentName, { path, fileName: file.name, mimeType: file.type, size: file.size })
    }

    for (const [documentName, document] of Object.entries(reused)) {
      if (!document || pending[documentName] || !TUPAD_DOCUMENT_OPTIONS.includes(documentName)) continue
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

  /** Removes one attached file (row first, then the stored file). */
  async deleteDocument(document: Pick<TupadApplicantDocumentRow, 'id' | 'path' | 'document_name'>): Promise<void> {
    const { error } = await documentsTable().delete().eq('id', document.id)
    if (error) throw new Error(error.message || `Failed to remove the ${document.document_name}.`)
    await removeStorageFiles([document.path])
  },
}
