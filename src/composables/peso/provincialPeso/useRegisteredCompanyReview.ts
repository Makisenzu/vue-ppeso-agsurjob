import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRegisteredCompanyReviewStore } from '@/stores/peso/provincialPeso/registeredCompanyReviewStore'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import {
  buildCompanyRequirementItems,
  formatFileSize,
  formatSubmittedDate,
  getCompanyStatusBadge,
  getCompanyStatusLabel,
  summarizeRequiredDocuments,
  toReviewStatus,
} from '@/helpers/common/companyRequirementHelper'
import { getCompanyDisplayName, getCompanyEstablishment } from '@/helpers/peso/provincialPeso/registeredCompanyHelper'
import { COMPANY_REVIEW_STATUS_OPTIONS, type CompanyReviewStatus } from '@/types/employer/companyRequirement'

const REMARKS_REQUIRED = 'Give the reason for rejecting.'

/** A status being edited in the sheet; saved together with Save changes */
interface ReviewDraft {
  status: CompanyReviewStatus
  remarks: string
  error: string | null
}

const toStatus = (value: string | number | null): CompanyReviewStatus =>
  toReviewStatus(value == null ? null : String(value)) ?? 'pending'

/**
 * Review sheet of the Registered Companies page (the list opens it with the store's openCompany).
 * The company status and each document's status are drafts; Save changes sends only what changed.
 */
export function useRegisteredCompanyReview() {
  const store = useRegisteredCompanyReviewStore()
  const { company, templates, submissions, verificationRemarks, isLoading, isSaving } = storeToRefs(store)
  const { openDocument } = usePrivateDocuments()

  const isReviewOpen = computed({
    get: () => company.value !== null,
    set: (open: boolean) => {
      if (!open) store.closeCompany()
    },
  })

  const companyName = computed(() => (company.value ? getCompanyDisplayName(company.value) : ''))
  const companyTin = computed(() => (company.value ? (getCompanyEstablishment(company.value)?.tin ?? '') : ''))
  /** The saved company status (header pill) */
  const companyStatusBadge = computed(() => getCompanyStatusBadge(company.value?.verification_status))

  const items = computed(() =>
    company.value ? buildCompanyRequirementItems(templates.value, submissions.value) : [],
  )
  const summary = computed(() => summarizeRequiredDocuments(items.value))

  // ─── Drafts ───
  const companyDraft = ref<ReviewDraft>({ status: 'pending', remarks: '', error: null })
  /** Keyed by employer_requirements.id; only submitted documents can be reviewed */
  const documentDrafts = ref<Record<number, ReviewDraft>>({})

  function resetDrafts() {
    companyDraft.value = {
      status: toStatus(company.value?.verification_status ?? null),
      remarks: verificationRemarks.value ?? '',
      error: null,
    }
    documentDrafts.value = Object.fromEntries(
      submissions.value.map((row) => [
        row.id,
        { status: toStatus(row.status), remarks: row.status_remarks ?? '', error: null },
      ]),
    )
  }

  // A newly opened company, or its documents arriving, starts the drafts from what is saved
  watch([() => company.value?.id, submissions, verificationRemarks], resetDrafts, { immediate: true })

  const isDraftChanged = (draft: ReviewDraft, status: CompanyReviewStatus, remarks: string | null) =>
    draft.status !== status || (draft.status === 'rejected' && draft.remarks.trim() !== (remarks ?? ''))

  const changedDocuments = computed(() =>
    submissions.value.filter((row) => {
      const draft = documentDrafts.value[row.id]
      return draft && isDraftChanged(draft, toStatus(row.status), row.status_remarks)
    }),
  )
  const isCompanyChanged = computed(() =>
    isDraftChanged(companyDraft.value, toStatus(company.value?.verification_status ?? null), verificationRemarks.value),
  )
  const hasChanges = computed(() => isCompanyChanged.value || changedDocuments.value.length > 0)

  function setCompanyStatus(value: string | number) {
    companyDraft.value = { ...companyDraft.value, status: toStatus(value), error: null }
  }

  function setDocumentStatus(requirementId: number, value: string | number) {
    const draft = documentDrafts.value[requirementId]
    if (draft) documentDrafts.value[requirementId] = { ...draft, status: toStatus(value), error: null }
  }

  /** Rejected needs a reason; marks the drafts that miss one */
  function validate(): boolean {
    let isValid = true
    const check = (draft: ReviewDraft) => {
      draft.error = draft.status === 'rejected' && !draft.remarks.trim() ? REMARKS_REQUIRED : null
      if (draft.error) isValid = false
    }
    if (isCompanyChanged.value) check(companyDraft.value)
    changedDocuments.value.forEach((row) => check(documentDrafts.value[row.id]))
    return isValid
  }

  async function saveReview() {
    if (!hasChanges.value || !validate()) return
    const remarksOf = (draft: ReviewDraft) => (draft.status === 'rejected' ? draft.remarks.trim() : null)
    await store.saveReview({
      documents: changedDocuments.value.map((row) => {
        const draft = documentDrafts.value[row.id]
        return { requirementId: row.id, status: draft.status, remarks: remarksOf(draft) }
      }),
      company: isCompanyChanged.value
        ? { status: companyDraft.value.status, remarks: remarksOf(companyDraft.value) }
        : null,
    })
  }

  return {
    isReviewOpen,
    isLoading,
    isSaving,
    companyName,
    companyTin,
    companyStatusBadge,
    items,
    summary,
    openDocument,
    // Drafts
    companyDraft,
    documentDrafts,
    hasChanges,
    setCompanyStatus,
    setDocumentStatus,
    saveReview,
    /** Company wording: approved reads as Verified */
    companyStatusOptions: COMPANY_REVIEW_STATUS_OPTIONS.map((option) => ({
      ...option,
      label: getCompanyStatusLabel(option.value),
    })),
    documentStatusOptions: COMPANY_REVIEW_STATUS_OPTIONS,
    // Display helpers
    formatFileSize,
    formatSubmittedDate,
  }
}
