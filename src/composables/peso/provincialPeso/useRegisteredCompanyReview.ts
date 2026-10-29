import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRegisteredCompanyReviewStore } from '@/stores/peso/provincialPeso/registeredCompanyReviewStore'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import {
  buildCompanyRequirementItems,
  formatFileSize,
  formatSubmittedDate,
  getCompanyStatusLabel,
  getReviewStatusBadgeClass,
  getReviewStatusLabel,
  summarizeRequiredDocuments,
  toReviewStatus,
} from '@/helpers/common/companyRequirementHelper'
import {
  getCompanyDisplayName,
  getCompanyEstablishment,
  getEstablishmentStatusBadgeClass,
  getCompanyStatus,
} from '@/helpers/peso/provincialPeso/registeredCompanyHelper'
import {
  COMPANY_REVIEW_STATUS_OPTIONS,
  type CompanyRequirementItem,
  type CompanyReviewStatus,
} from '@/types/employer/companyRequirement'

const REMARKS_REQUIRED = 'Give the reason for rejecting.'

/**
 * Review sheet of the Registered Companies page (the list opens it with the store's openCompany) (Provincial PESO): open the company's documents,
 * approve or reject each one, and set the company's verification.
 */
export function useRegisteredCompanyReview() {
  const store = useRegisteredCompanyReviewStore()
  const { company, templates, submissions, verificationRemarks, isLoading, isSavingCompany, reviewingRequirementId } =
    storeToRefs(store)
  const { openDocument } = usePrivateDocuments()

  const isReviewOpen = computed({
    get: () => company.value !== null,
    set: (open: boolean) => {
      if (!open) store.closeCompany()
    },
  })

  const companyName = computed(() => (company.value ? getCompanyDisplayName(company.value) : ''))
  const companyTin = computed(() => (company.value ? getCompanyEstablishment(company.value)?.tin ?? '' : ''))
  const form2Status = computed(() => (company.value ? getCompanyStatus(company.value) : ''))
  const form2StatusClass = computed(() => getEstablishmentStatusBadgeClass(form2Status.value))

  const items = computed(() =>
    company.value ? buildCompanyRequirementItems(templates.value, submissions.value) : [],
  )
  const summary = computed(() => summarizeRequiredDocuments(items.value))

  // ─── Company status ───
  const companyStatusDraft = ref<CompanyReviewStatus>('pending')
  const companyRemarksDraft = ref('')
  const companyRemarksError = ref<string | null>(null)
  const savedCompanyStatus = computed(() => toReviewStatus(company.value?.verification_status) ?? 'pending')
  const isCompanyStatusChanged = computed(
    () =>
      companyStatusDraft.value !== savedCompanyStatus.value ||
      (companyStatusDraft.value === 'rejected' && companyRemarksDraft.value.trim() !== (verificationRemarks.value ?? '')),
  )

  function setCompanyStatusDraft(value: string | number | null) {
    companyStatusDraft.value = toReviewStatus(value == null ? null : String(value)) ?? 'pending'
    companyRemarksError.value = null
  }

  async function saveCompanyStatus() {
    const remarks = companyRemarksDraft.value.trim()
    if (companyStatusDraft.value === 'rejected' && !remarks) {
      companyRemarksError.value = REMARKS_REQUIRED
      return
    }
    await store.reviewCompany(companyStatusDraft.value, companyStatusDraft.value === 'rejected' ? remarks : null)
  }

  // ─── Document review ───
  /** employer_requirements.id whose reject reason is being typed */
  const rejectingRequirementId = ref<number | null>(null)
  const rejectRemarks = ref('')
  const rejectRemarksError = ref<string | null>(null)

  function startReject(item: CompanyRequirementItem) {
    if (!item.submission) return
    rejectingRequirementId.value = item.submission.id
    rejectRemarks.value = item.submission.status_remarks ?? ''
    rejectRemarksError.value = null
  }

  function cancelReject() {
    rejectingRequirementId.value = null
    rejectRemarks.value = ''
    rejectRemarksError.value = null
  }

  async function confirmReject() {
    const id = rejectingRequirementId.value
    const remarks = rejectRemarks.value.trim()
    if (!id) return
    if (!remarks) {
      rejectRemarksError.value = REMARKS_REQUIRED
      return
    }
    if (await store.reviewRequirement(id, 'rejected', remarks)) cancelReject()
  }

  async function setDocumentStatus(item: CompanyRequirementItem, status: Exclude<CompanyReviewStatus, 'rejected'>) {
    if (!item.submission) return
    cancelReject()
    await store.reviewRequirement(item.submission.id, status, null)
  }

  // A newly opened company starts from its saved status; its remarks arrive with the documents
  watch(
    () => company.value?.id,
    () => {
      companyStatusDraft.value = savedCompanyStatus.value
      companyRemarksDraft.value = ''
      companyRemarksError.value = null
      cancelReject()
    },
    { immediate: true },
  )
  watch(verificationRemarks, (remarks) => {
    companyRemarksDraft.value = remarks ?? ''
  })

  return {
    isReviewOpen,
    isLoading,
    companyName,
    companyTin,
    form2Status,
    form2StatusClass,
    items,
    summary,
    openDocument,
    // Company status
    statusOptions: COMPANY_REVIEW_STATUS_OPTIONS,
    companyStatusDraft,
    companyRemarksDraft,
    companyRemarksError,
    isCompanyStatusChanged,
    isSavingCompany,
    setCompanyStatusDraft,
    saveCompanyStatus,
    // Documents
    reviewingRequirementId,
    rejectingRequirementId,
    rejectRemarks,
    rejectRemarksError,
    startReject,
    cancelReject,
    confirmReject,
    setDocumentStatus,
    // Display helpers
    getReviewStatusLabel,
    getReviewStatusBadgeClass,
    getCompanyStatusLabel,
    formatFileSize,
    formatSubmittedDate,
  }
}
