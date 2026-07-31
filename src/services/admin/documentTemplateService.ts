import { supabase } from '@/lib/supabaseClient'
import type {
  DocumentTemplateRow,
  DocumentTemplateInsert,
  DocumentTemplateUpdate
} from '@/types/admin/documentTemplate'

export type { DocumentTemplateRow, DocumentTemplateInsert, DocumentTemplateUpdate }

export const DOCUMENT_TEMPLATE_BUCKET = 'templates'

export async function fetchDocumentTemplates(): Promise<DocumentTemplateRow[]> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchDocumentTemplateById(id: number): Promise<DocumentTemplateRow | null> {
  const { data, error } = await supabase
    .from('document_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function uploadTemplateFile(file: File): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  const sanitizeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${sanitizeName}`
  const storagePath = `templates/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_TEMPLATE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  return {
    filePath: storagePath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || getFallbackMimeType(fileExt)
  }
}

export async function removeTemplateFile(filePath: string): Promise<void> {
  if (!filePath) return
  const { error } = await supabase.storage
    .from(DOCUMENT_TEMPLATE_BUCKET)
    .remove([filePath])

  if (error) {
    console.warn(`Storage file deletion warning (${filePath}):`, error.message)
  }
}

export async function createDocumentTemplate(
  payload: Omit<DocumentTemplateInsert, 'file_path' | 'file_name' | 'file_size' | 'mime_type'>,
  file?: File | null
): Promise<DocumentTemplateRow> {
  let fileInfo: Partial<DocumentTemplateInsert> = {}

  if (file) {
    const uploaded = await uploadTemplateFile(file)
    fileInfo = {
      file_path: uploaded.filePath,
      file_name: uploaded.fileName,
      file_size: uploaded.fileSize,
      mime_type: uploaded.mimeType
    }
  }

  const insertPayload: DocumentTemplateInsert = {
    ...payload,
    ...fileInfo,
    is_active: payload.is_active ?? true
  }

  const { data, error } = await supabase
    .from('document_templates')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error) {
    if (fileInfo.file_path) {
      await removeTemplateFile(fileInfo.file_path)
    }
    throw error
  }

  return data
}

export async function updateDocumentTemplate(
  id: number,
  payload: DocumentTemplateUpdate,
  newFile?: File | null,
  oldFilePath?: string | null
): Promise<DocumentTemplateRow> {
  let fileInfo: Partial<DocumentTemplateUpdate> = {}

  if (newFile) {
    const uploaded = await uploadTemplateFile(newFile)
    fileInfo = {
      file_path: uploaded.filePath,
      file_name: uploaded.fileName,
      file_size: uploaded.fileSize,
      mime_type: uploaded.mimeType
    }
  }

  const updatePayload: DocumentTemplateUpdate = {
    ...payload,
    ...fileInfo,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('document_templates')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (fileInfo.file_path) {
      await removeTemplateFile(fileInfo.file_path)
    }
    throw error
  }

  if (newFile && oldFilePath) {
    await removeTemplateFile(oldFilePath)
  }

  return data
}

export async function deleteDocumentTemplate(id: number, filePath?: string | null): Promise<void> {
  if (filePath) {
    await removeTemplateFile(filePath)
  }

  const { error } = await supabase
    .from('document_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getDocumentTemplateFileUrl(filePath: string): Promise<string> {
  const { data } = supabase.storage
    .from(DOCUMENT_TEMPLATE_BUCKET)
    .getPublicUrl(filePath)

  if (data?.publicUrl) {
    return data.publicUrl
  }

  const { data: signedData, error } = await supabase.storage
    .from(DOCUMENT_TEMPLATE_BUCKET)
    .createSignedUrl(filePath, 3600)

  if (error || !signedData?.signedUrl) {
    throw new Error(error?.message || 'Failed to generate download URL')
  }

  return signedData.signedUrl
}

function getFallbackMimeType(ext?: string): string {
  switch (ext?.toLowerCase()) {
    case 'pdf': return 'application/pdf'
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'doc': return 'application/msword'
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    default: return 'application/octet-stream'
  }
}