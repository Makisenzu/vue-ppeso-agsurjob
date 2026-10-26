import { supabase } from '@/lib/supabaseClient'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import type {
  GipApplicantDocumentMap,
  GipApplicantDocumentRow,
  GipPendingDocumentMap,
  GipReusedDocumentMap,
} from '@/types/common/gipProgram'

const SIGNED_URL_TTL_SECONDS = 60 * 60

// esmdd.gip_applicant_documents (migration 060) is not in database.types.ts until `npm run types:gen`
// is re-run, so the typed client does not know the table yet. Rows are typed by GipApplicantDocumentRow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const documentsTable = () => (supabase.schema('esmdd') as any).from('gip_applicant_documents')

async function removeStorageFiles(paths: string[]) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove(paths)
  // The database rows are already gone or replaced; a leftover file is only storage clutter
  if (error) console.warn('[gipDocumentService] Failed to remove files from storage:', error.message)
}

async function fetchRows(gipApplicantId: string): Promise<GipApplicantDocumentRow[]> {
  const { data, error } = await documentsTable().select('*').eq('gip_applicant_id', gipApplicantId)
  if (error) throw new Error(error.message || 'Failed to load the GIP documents.')
  return (data ?? []) as GipApplicantDocumentRow[]
}

/**
 * Soft copies of the GIP requirements (`esmdd.gip_applicant_documents`), shared by Provincial PESO
 * (read) and the applicant (read / upload). Files go in the uploader's own folder of the documents
 * bucket; a trigger ticks each uploaded document in gip_applicants.document_submitted.
 */
export const gipDocumentService = {
  /** Current file per document name, with signed URLs for viewing. */
  async fetchDocuments(gipApplicantId: string): Promise<GipApplicantDocumentMap> {
    const rows = await fetchRows(gipApplicantId)
    if (!rows.length) return {}

    const { data: signed, error } = await supabase.storage
      .from(DOCUMENT_UPLOAD_BUCKET)
      .createSignedUrls(
        rows.map((row) => row.path),
        SIGNED_URL_TTL_SECONDS
      )
    // Rows still show without a link if signing fails (e.g. the file was removed from storage)
    if (error) console.warn('[gipDocumentService] Failed to sign document URLs:', error.message)

    const urlByPath = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]))
    const documents: GipApplicantDocumentMap = {}
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
    gipApplicantId: string
    /** Signed-in user; files go into their own folder of the documents bucket. */
    uploaderId: string
    pending: GipPendingDocumentMap
    reused?: GipReusedDocumentMap
  }): Promise<void> {
    const { gipApplicantId, uploaderId, pending, reused = {} } = options
    const existing = await fetchRows(gipApplicantId)

    const saveRow = async (
      documentName: string,
      file: { path: string; fileName: string; mimeType: string; size: number | null }
    ) => {
      const current = existing.find((row) => row.document_name === documentName)
      const { error: rowErr } = await documentsTable().upsert(
        {
          gip_applicant_id: gipApplicantId,
          document_name: documentName,
          file_name: file.fileName,
          path: file.path,
          mime_type: file.mimeType,
          size: file.size,
          uploaded_by: uploaderId,
        },
        { onConflict: 'gip_applicant_id,document_name' }
      )

      if (rowErr) {
        await removeStorageFiles([file.path])
        throw new Error(rowErr.message || `Failed to save the ${documentName}.`)
      }

      // Only the latest file is kept per document
      if (current) await removeStorageFiles([current.path])
    }

    for (const [documentName, file] of Object.entries(pending)) {
      if (!file) continue
      const path = fileHelpers.generateUniquePath(uploaderId, file.name)
      const { error: uploadErr } = await supabase.storage
        .from(DOCUMENT_UPLOAD_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw new Error(uploadErr.message || `Failed to upload the ${documentName}.`)
      await saveRow(documentName, { path, fileName: file.name, mimeType: file.type, size: file.size })
    }

    for (const [documentName, document] of Object.entries(reused)) {
      if (!document || pending[documentName]) continue
      const path = fileHelpers.generateUniquePath(uploaderId, document.fileName)
      const { error: copyErr } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).copy(document.path, path)
      if (copyErr) throw new Error(copyErr.message || `Failed to attach your ${document.label} to the ${documentName}.`)
      await saveRow(documentName, {
        path,
        fileName: document.fileName,
        mimeType: 'application/pdf',
        size: document.size,
      })
    }
  },

  /** Removes one attached file (row first, then the stored file). */
  async deleteDocument(document: Pick<GipApplicantDocumentRow, 'id' | 'path' | 'document_name'>): Promise<void> {
    const { error } = await documentsTable().delete().eq('id', document.id)
    if (error) throw new Error(error.message || `Failed to remove the ${document.document_name}.`)
    await removeStorageFiles([document.path])
  },
}
