import type { ValidateUploadFileOptions } from '@/types/fileUpload'

export const DOCUMENT_UPLOAD_BUCKET = 'documents'

export const DEFAULT_UPLOAD_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

export const DEFAULT_UPLOAD_ACCEPT = '.pdf,.doc,.docx,.jpg,.png'

export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
}

export function validateUploadFile(file: File, options: ValidateUploadFileOptions = {}) {
  const {
    allowedMimeTypes = DEFAULT_UPLOAD_ALLOWED_MIME_TYPES,
    maxSizeMB = 10,
  } = options

  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    throw new Error('Invalid file type.')
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum size is ${maxSizeMB}MB.`)
  }

  return true
}
