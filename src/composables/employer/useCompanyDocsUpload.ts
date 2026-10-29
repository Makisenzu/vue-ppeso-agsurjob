import { computed, h, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Eye, Trash2 } from '@lucide/vue'
import { useFileUpload } from '@/composables/common/useFileUpload'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import { useCompanyRequirementStore } from '@/stores/employer/companyRequirementStore'
import { useCompanyDocumentItems, COMPANY_DOCUMENT_STATUS_TEXT } from '@/composables/employer/useCompanyDocuments'
import {
  COMPANY_REQUIREMENT_ACCEPT,
  COMPANY_REQUIREMENT_ACCEPT_LABEL,
  formatFileSize as formatStoredFileSize,
} from '@/helpers/common/companyRequirementHelper'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { UploadState } from '@/types/common/fileUpload'
import type { CompanyRequirementItem } from '@/types/employer/companyRequirement'

const UPLOAD_SCOPE = 'company-profile-documents'

const docId = (item: CompanyRequirementItem) => `template-${item.templateId}`

/**
 * Upload Document dialog of the Company Profile, the same flow as the applicant's ProfileDocsUpload:
 * each dropped file is filed as the next document in order (Company Profile → BIR / SEC / Mayor's
 * Permit → Order of Payment), queued, then uploaded together. Documents already on file are listed
 * with swipe to view / delete.
 */
export function useCompanyDocsUpload() {
  const store = useCompanyRequirementStore()
  const { isDeleting } = storeToRefs(store)
  const toastAlert = useToastAlert()
  const { openDocument } = usePrivateDocuments()
  const documents = useCompanyDocumentItems()

  const open = ref(false)
  const isSubmitting = ref(false)
  const submitError = ref('')

  const { uploadedFiles, stageFile, clearUpload, clearScope, submitUploads, formatFileSize } =
    useFileUpload(UPLOAD_SCOPE)

  // The modal aria-hides the rest of the page before focus moves inside it; release focus first
  watch(open, (isOpen) => {
    if (isOpen) (document.activeElement as HTMLElement | null)?.blur()
  })

  const uploadOrder = computed(() => documents.value.map((doc) => doc.name))

  // ─── Lists ───
  const isOnFile = (doc: CompanyRequirementItem) => doc.files.length > 0
  const pendingDocuments = computed(() => documents.value.filter((doc) => !isOnFile(doc)))
  const uploadedDocuments = computed(() => documents.value.filter(isOnFile))
  const stagedDocuments = computed(() => documents.value.filter((doc) => uploadedFiles.value[docId(doc)]))
  const hasQueuedFiles = computed(() =>
    stagedDocuments.value.some((doc) => uploadedFiles.value[docId(doc)]?.state !== 'done'),
  )

  /** A document counts toward the order once it is on file or queued in this dialog */
  const isDocumentFilled = (doc: CompanyRequirementItem) => isOnFile(doc) || Boolean(uploadedFiles.value[docId(doc)])

  /** The earliest document still missing a file before `doc`, if any (every company document is mandatory) */
  function getBlockingDocument(doc: CompanyRequirementItem) {
    const index = documents.value.indexOf(doc)
    return documents.value.slice(0, Math.max(index, 0)).find((other) => !isDocumentFilled(other)) ?? null
  }

  const hasOutOfOrderFiles = computed(() => stagedDocuments.value.some((doc) => getBlockingDocument(doc)))

  // ─── Dropzone target ───
  const isSelectableDocument = (doc: CompanyRequirementItem) =>
    !uploadedFiles.value[docId(doc)] && !getBlockingDocument(doc)

  /** The next document the dropzone files into */
  const selectedDocument = computed(() => pendingDocuments.value.find(isSelectableDocument) ?? null)

  function isAcceptedFile(file: File) {
    const name = file.name.toLowerCase()
    return COMPANY_REQUIREMENT_ACCEPT.split(',').some((ext) => name.endsWith(ext))
  }

  function addFile(file: File | null | undefined) {
    const target = selectedDocument.value
    if (!file || !target) return
    if (!isAcceptedFile(file)) {
      toastAlert.error('File type not supported', `Use a ${COMPANY_REQUIREMENT_ACCEPT_LABEL} file for ${target.name}.`)
      return
    }
    submitError.value = ''
    stageFile(docId(target), file)
  }

  /** Counts enter/leave pairs so passing over child elements doesn't flicker the drag state */
  const dragDepth = ref(0)
  const isDragging = computed(() => dragDepth.value > 0)
  const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')

  function onDragEnter(event: DragEvent) {
    if (carriesFiles(event)) dragDepth.value += 1
  }
  function onDragOver(event: DragEvent) {
    if (carriesFiles(event) && event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }
  function onDragLeave() {
    dragDepth.value = Math.max(0, dragDepth.value - 1)
  }
  function onDrop(event: DragEvent) {
    dragDepth.value = 0
    addFile(event.dataTransfer?.files?.[0])
  }
  function onInputChange(event: Event) {
    const input = event.target as HTMLInputElement
    addFile(input.files?.[0])
    input.value = ''
  }

  const mapAttachmentState = (state: UploadState): 'done' | 'idle' | 'uploading' | 'processing' | 'error' =>
    state === 'pending' ? 'idle' : state

  // ─── Submit ───
  async function submitDocuments() {
    submitError.value = ''
    if (hasOutOfOrderFiles.value) {
      submitError.value = `Upload your documents in order: ${uploadOrder.value.join(', then ')}.`
      return
    }
    isSubmitting.value = true
    try {
      const optionsByDocId = Object.fromEntries(
        documents.value.map((doc) => [
          docId(doc),
          {
            executor: async ({ file, onProgress }: { file: File; onProgress: (progress: number) => void }) => {
              onProgress(10)
              await store.uploadDocument(doc, file)
              onProgress(100)
            },
          },
        ]),
      )
      await submitUploads(optionsByDocId)
      await store.refreshSubmissions()
      toastAlert.success('Documents uploaded successfully', 'They were sent to Provincial PESO for review.')
      clearScope(true)
      open.value = false
    } catch (error) {
      submitError.value = error instanceof Error ? error.message : 'Failed to upload documents.'
      await store.refreshSubmissions().catch(() => {})
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── On file: swipe to view / delete (hold to confirm) ───
  const deleteTarget = ref<CompanyRequirementItem | null>(null)
  const deleteDialogOpen = computed({
    get: () => deleteTarget.value !== null,
    set: (isOpen: boolean) => {
      if (!isOpen) deleteTarget.value = null
    },
  })

  const ViewIcon = () => h(Eye, { class: 'size-5' })
  const DeleteIcon = () => h(Trash2, { class: 'size-5' })

  /** Delete only opens the confirmation, so it must not collapse the row (`dismiss: false`) */
  function getSwipeActions(doc: CompanyRequirementItem): SwipeAction[] {
    return [
      { id: 'delete', label: 'Delete', icon: DeleteIcon, dismiss: false, onSelect: () => (deleteTarget.value = doc) },
      { id: 'view', label: 'View', icon: ViewIcon, dismiss: false, onSelect: () => void openDocument(doc.files[0]?.path) },
    ]
  }

  async function confirmDelete() {
    const target = deleteTarget.value
    if (!target) return
    if (await store.deleteDocument(target)) deleteTarget.value = null
  }

  /** "file.pdf · 2.3 MB" of a document on file (its first file) */
  const describeOnFile = (doc: CompanyRequirementItem) => {
    const file = doc.files[0]
    return file ? `${file.filename} · ${formatStoredFileSize(file.size) || 'Unknown size'}` : ''
  }
  const statusTextOf = (doc: CompanyRequirementItem) => (doc.status ? COMPANY_DOCUMENT_STATUS_TEXT[doc.status] : null)

  return {
    open,
    isSubmitting,
    submitError,
    documents,
    uploadOrder,
    pendingDocuments,
    uploadedDocuments,
    stagedDocuments,
    hasQueuedFiles,
    hasOutOfOrderFiles,
    selectedDocument,
    uploadedFiles,
    docId,
    getBlockingDocument,
    clearUpload,
    formatFileSize,
    mapAttachmentState,
    acceptTypes: COMPANY_REQUIREMENT_ACCEPT,
    acceptLabel: COMPANY_REQUIREMENT_ACCEPT_LABEL,
    // Dropzone
    isDragging,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onInputChange,
    submitDocuments,
    // On file
    getSwipeActions,
    describeOnFile,
    statusTextOf,
    deleteTarget,
    deleteDialogOpen,
    isDeleting,
    confirmDelete,
    remindHoldToDelete: () => toastAlert.info('Keep holding', 'Press and hold the button to delete this document.'),
  }
}
