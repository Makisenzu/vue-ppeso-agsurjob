export type UploadState = 'pending' | 'uploading' | 'done' | 'error'

export interface UploadDocumentDefinition {
  id: string
  label: string
  accept?: string
  allowedMimeTypes?: string[]
  maxSizeMB?: number
}

export interface UploadedDocument {
  file: File
  state: UploadState
  progress: number
  errorMessage?: string
  uploadedAt?: string
  metadata?: Record<string, unknown>
}

export type UploadedFilesMap = Record<string, UploadedDocument>
export type InputResetKeysMap = Record<string, number>

export interface ValidateUploadFileOptions {
  allowedMimeTypes?: string[]
  maxSizeMB?: number
}

export interface UploadExecutionOptions {
  docId: string
  file: File
  onProgress: (progress: number) => void
  signal?: AbortSignal
}

export interface UploadExecutionResult {
  metadata?: Record<string, unknown>
}

export type UploadExecutor = (
  options: UploadExecutionOptions
) => Promise<UploadExecutionResult | void>

export interface ApplicantRequirementUploadExecutorOptions extends UploadExecutionOptions {
  applicantId: number
  document: UploadDocumentDefinition
}

export interface ApplicantRequirementUploadResult extends UploadExecutionResult {
  applicantRequirementId: number
  mediaId: number
  storagePath: string
  publicUrl: string
}

export interface UploadDocumentOptions {
  allowedMimeTypes?: string[]
  maxSizeMB?: number
  executor?: UploadExecutor
}

export interface SimulatedUploadOptions {
  onProgress: (progress: number) => void
  signal?: AbortSignal
  durationMs?: number
  intervalMs?: number
}
