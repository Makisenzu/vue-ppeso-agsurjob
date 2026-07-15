import { defineStore } from 'pinia'
import { validateUploadFile } from '@/helpers/uploadHelpers'
import { fileUploadService } from '@/services/fileUploadService'
import type {
  InputResetKeysMap,
  UploadDocumentOptions,
  UploadedDocument,
  UploadedFilesMap,
} from '@/types/fileUpload'

const controllersByScope = new Map<string, Map<string, AbortController>>()

function ensureScopeControllers(scope: string) {
  if (!controllersByScope.has(scope)) {
    controllersByScope.set(scope, new Map())
  }
  return controllersByScope.get(scope)!
}

function getScopedDocKey(scope: string, docId: string) {
  return `${scope}:${docId}`
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Upload failed.'
}

export const useFileUploadStore = defineStore('file-upload', {
  state: () => ({
    uploadedFilesByScope: {} as Record<string, UploadedFilesMap>,
    inputResetKeysByScope: {} as Record<string, InputResetKeysMap>,
    stagedFilesByScope: {} as Record<string, Record<string, File>>,
  }),

  getters: {
    uploadsByScope: (state) => (scope: string) => state.uploadedFilesByScope[scope] ?? {},
    inputResetKeysByScopeGetter: (state) =>
      (scope: string) => state.inputResetKeysByScope[scope] ?? {},
    stagedFilesByScopeGetter: (state) => (scope: string) => state.stagedFilesByScope[scope] ?? {},
  },

  actions: {
    ensureScope(scope: string) {
      if (!this.uploadedFilesByScope[scope]) {
        this.uploadedFilesByScope[scope] = {}
      }

      if (!this.inputResetKeysByScope[scope]) {
        this.inputResetKeysByScope[scope] = {}
      }

      if (!this.stagedFilesByScope[scope]) {
        this.stagedFilesByScope[scope] = {}
      }

      ensureScopeControllers(scope)
    },

    stageFile(scope: string, docId: string, file: File) {
      this.ensureScope(scope)

      this.stagedFilesByScope[scope][docId] = file
      this.uploadedFilesByScope[scope][docId] = {
        file,
        state: 'pending',
        progress: 0,
      }
    },

    clearUpload(scope: string, docId: string, resetInput = true) {
      this.ensureScope(scope)

      const scopeControllers = ensureScopeControllers(scope)
      const controller = scopeControllers.get(docId)
      if (controller) {
        controller.abort()
        scopeControllers.delete(docId)
      }

      delete this.uploadedFilesByScope[scope][docId]
      delete this.stagedFilesByScope[scope][docId]

      if (resetInput) {
        this.inputResetKeysByScope[scope][docId] =
          (this.inputResetKeysByScope[scope][docId] ?? 0) + 1
      }
    },

    async uploadDocument(
      scope: string,
      docId: string,
      file: File,
      options: UploadDocumentOptions = {}
    ) {
      this.ensureScope(scope)

      this.clearUpload(scope, docId, false)

      validateUploadFile(file, {
        allowedMimeTypes: options.allowedMimeTypes,
        maxSizeMB: options.maxSizeMB,
      })

      const uploadEntry: UploadedDocument = {
        file,
        state: 'uploading',
        progress: 0,
      }

      this.uploadedFilesByScope[scope][docId] = uploadEntry

      const scopeControllers = ensureScopeControllers(scope)
      const controller = new AbortController()
      scopeControllers.set(docId, controller)

      try {
        const result = await fileUploadService.executeUpload(
          {
            docId,
            file,
            signal: controller.signal,
            onProgress: (progress) => {
              const current = this.uploadedFilesByScope[scope]?.[docId]
              if (!current || current.state !== 'uploading') {
                return
              }

              current.progress = progress
            },
          },
          options.executor
        )

        const current = this.uploadedFilesByScope[scope]?.[docId]
        if (current) {
          current.state = 'done'
          current.progress = 100
          current.uploadedAt = new Date().toISOString()
          current.errorMessage = undefined
          current.metadata = result?.metadata
        }
      } catch (error) {
        const message = toErrorMessage(error)
        const current = this.uploadedFilesByScope[scope]?.[docId]

        if (current) {
          current.state = 'error'
          current.errorMessage = message
        }
      } finally {
        scopeControllers.delete(docId)
      }
    },

    async submitScopeUploads(
      scope: string,
      optionsByDocId: Record<string, UploadDocumentOptions> = {}
    ) {
      this.ensureScope(scope)

      const stagedFiles = { ...this.stagedFilesByScope[scope] }
      const docIds = Object.keys(stagedFiles)

      for (const docId of docIds) {
        const file = stagedFiles[docId]
        const uploadOptions = optionsByDocId[docId] ?? {}
        await this.uploadDocument(scope, docId, file, uploadOptions)
        delete this.stagedFilesByScope[scope][docId]
      }
    },

    handleFileChange(
      scope: string,
      docId: string,
      event: Event,
      options: UploadDocumentOptions = {}
    ) {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]

      if (!file) {
        return
      }

      return this.uploadDocument(scope, docId, file, options)
    },

    clearScope(scope: string, resetInput = false) {
      this.ensureScope(scope)

      const docIds = Object.keys(this.uploadedFilesByScope[scope])
      for (const docId of docIds) {
        this.clearUpload(scope, docId, resetInput)
      }

      this.stagedFilesByScope[scope] = {}

      if (!resetInput) {
        return
      }

      this.inputResetKeysByScope[scope] = {}
    },

    clearAllScopes() {
      const scopes = Object.keys(this.uploadedFilesByScope)
      for (const scope of scopes) {
        this.clearScope(scope)
      }
    },

    getScopedDocKey,
  },
})
