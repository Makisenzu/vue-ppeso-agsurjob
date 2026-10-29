import { computed, h, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Download, Eye } from '@lucide/vue'
import { useAuthStore } from '@/stores/common/auth'
import { useCompanyRequirementStore } from '@/stores/employer/companyRequirementStore'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import {
  buildCompanyRequirementItems,
  formatFileSize,
  getCompanyDocumentStep,
  getFileTypeLabel,
  getVerificationRemarks,
  toReviewStatus,
} from '@/helpers/common/companyRequirementHelper'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { EmployerRequirementFile } from '@/types/employer/companyRequirement'

/** Status text after a file in the lists (same wording as the applicant's documents) */
export const COMPANY_DOCUMENT_STATUS_TEXT = {
  pending: { label: 'Pending review', textClass: 'text-warning' },
  approved: { label: 'Approved', textClass: 'text-success' },
  rejected: { label: 'Rejected', textClass: 'text-destructive' },
} as const

/** The signed-in company's documents (shared by the profile section and the upload dialog) */
export function useCompanyDocumentItems() {
  const store = useCompanyRequirementStore()
  const { templates, submissions } = storeToRefs(store)
  return computed(() => buildCompanyRequirementItems(templates.value, submissions.value))
}

/**
 * Document section of the Company Profile, like the applicant's ProfileDocuments: the progress
 * stepper and the uploaded files (swipe to view / download).
 */
export function useCompanyDocuments() {
  const authStore = useAuthStore()
  const store = useCompanyRequirementStore()
  const { isLoading } = storeToRefs(store)
  const items = useCompanyDocumentItems()
  const { openDocument, downloadDocument } = usePrivateDocuments()

  const steps = computed(() => items.value.map((item) => ({ item, step: getCompanyDocumentStep(item) })))

  /** One row per uploaded file, in document order */
  const uploadedFiles = computed(() =>
    items.value.flatMap((item) =>
      item.files.map((file) => ({
        file,
        status: item.status ? COMPANY_DOCUMENT_STATUS_TEXT[item.status] : null,
        meta: `${getFileTypeLabel(file.mime_type)} · ${formatFileSize(file.size) || 'Unknown size'}`,
        remarks: item.status === 'rejected' ? (item.submission?.status_remarks ?? null) : null,
      })),
    ),
  )
  const hasUploads = computed(() => uploadedFiles.value.length > 0)

  /** PESO's reason when it rejected the company itself */
  const companyRemarks = computed(() =>
    toReviewStatus(authStore.employerProfile?.verification_status) === 'rejected'
      ? getVerificationRemarks(authStore.employerProfile)
      : null,
  )

  const ViewIcon = () => h(Eye, { class: 'size-5' })
  const DownloadIcon = () => h(Download, { class: 'size-5' })

  /** View / Download are non-destructive, so neither collapses the row (`dismiss: false`) */
  function getSwipeActions(file: EmployerRequirementFile): SwipeAction[] {
    return [
      { id: 'view', label: 'View', icon: ViewIcon, dismiss: false, onSelect: () => void openDocument(file.path) },
      {
        id: 'download',
        label: 'Download',
        icon: DownloadIcon,
        dismiss: false,
        onSelect: () => void downloadDocument(file.path, file.filename),
      },
    ]
  }

  onMounted(async () => {
    await authStore.init()
    await store.fetchRequirements()
  })

  return {
    steps,
    isLoading,
    uploadedFiles,
    hasUploads,
    companyRemarks,
    getSwipeActions,
  }
}
