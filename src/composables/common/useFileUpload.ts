import { computed, onBeforeUnmount } from 'vue'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import { useFileUploadStore } from '@/stores/common/fileUploadStore'
import type { UploadDocumentDefinition, UploadDocumentOptions } from '@/types/common/fileUpload'

const DEFAULT_OPTIONS: Required<Pick<UseFileUploadOptions, 'cleanupOnUnmount'>> = {
  cleanupOnUnmount: true,
}

export interface UseFileUploadOptions {
  cleanupOnUnmount?: boolean
}

export function useFileUpload(scope: string, options: UseFileUploadOptions = {}) {
  const store = useFileUploadStore()
  const merged = { ...DEFAULT_OPTIONS, ...options }

  store.ensureScope(scope)

  const uploadedFiles = computed(() => store.uploadsByScope(scope))
  const inputResetKeys = computed(() => store.inputResetKeysByScopeGetter(scope))
  const stagedFiles = computed(() => store.stagedFilesByScopeGetter(scope))

  const stageFile = (docId: string, file: File) => {
    store.stageFile(scope, docId, file)
  }

  const clearUpload = (docId: string, resetInput = true) => {
    store.clearUpload(scope, docId, resetInput)
  }

  const submitUploads = async (optionsByDocId: Record<string, UploadDocumentOptions> = {}) => {
    await store.submitScopeUploads(scope, optionsByDocId)
  }

  const handleFileChange = (
    doc: Pick<UploadDocumentDefinition, 'id' | 'allowedMimeTypes' | 'maxSizeMB'>,
    event: Event
  ) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) {
      return
    }

    stageFile(doc.id, file)
  }

  const clearScope = (resetInput = false) => {
    store.clearScope(scope, resetInput)
  }

  if (merged.cleanupOnUnmount) {
    onBeforeUnmount(() => {
      clearScope(false)
    })
  }

  return {
    uploadedFiles,
    stagedFiles,
    inputResetKeys,
    stageFile,
    clearUpload,
    handleFileChange,
    submitUploads,
    clearScope,
    formatFileSize,
  }
}
