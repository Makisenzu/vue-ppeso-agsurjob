import { ref } from 'vue'
import { defineStore } from 'pinia'
import { companyRequirementService } from '@/services/common/companyRequirementService'
import { registeredCompanyService } from '@/services/peso/provincialPeso/registeredCompanyService'
import { useRegisteredCompanyStore } from '@/stores/peso/provincialPeso/registeredCompanyStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  CompanyReviewStatus,
  EmployerRequirementWithFiles,
  RequirementTemplate,
} from '@/types/employer/companyRequirement'
import type { CompanyVerification, RegisteredCompanyListItem } from '@/types/peso/provincialPeso/registeredCompany'

/**
 * Toast description after a review. Companies are notified only when their company status changes
 * (document changes are not notified, migration 080).
 */
function describeStatusChange(previous: string | null, current: string | null, setByPeso: boolean): string | undefined {
  if (previous === current) return undefined
  if (!setByPeso && current === 'approved') return 'All documents are approved, so the company is now verified.'
  if (!setByPeso && current === 'pending') return 'A document was rejected, so the company is back to pending.'
  return 'The company was notified of its new status.'
}

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** Provincial PESO review of one registered company: its documents and its verification (migration 079) */
export const useRegisteredCompanyReviewStore = defineStore('pesoRegisteredCompanyReview', () => {
  const toastAlert = useToastAlert()
  const listStore = useRegisteredCompanyStore()

  // ─── State ───
  /** The company open in the review sheet (a row of the Registered Companies list) */
  const company = ref<RegisteredCompanyListItem | null>(null)
  const companyId = ref<string | null>(null)
  const templates = ref<RequirementTemplate[]>([])
  const submissions = ref<EmployerRequirementWithFiles[]>([])
  const verificationRemarks = ref<string | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)

  // ─── Actions ───

  async function openCompany(row: RegisteredCompanyListItem): Promise<void> {
    company.value = row
    await loadCompany(row.id)
  }

  function closeCompany(): void {
    company.value = null
  }

  /** Puts the company's saved status into the sheet and the list */
  function applyVerification(id: string, verification: CompanyVerification): void {
    verificationRemarks.value = verification.verification_remarks
    listStore.setVerificationStatus(id, verification.verification_status)
    if (company.value?.id === id) company.value = { ...company.value, verification_status: verification.verification_status }
  }

  async function loadCompany(id: string): Promise<void> {
    companyId.value = id
    submissions.value = []
    verificationRemarks.value = null
    isLoading.value = true
    try {
      const [templateRows, submissionRows, verification] = await Promise.all([
        templates.value.length ? Promise.resolve(templates.value) : companyRequirementService.fetchTemplates(),
        companyRequirementService.fetchCompanyRequirements(id),
        registeredCompanyService.fetchVerification(id),
      ])
      // A newer company was opened while this one loaded
      if (companyId.value !== id) return
      templates.value = templateRows
      submissions.value = submissionRows
      applyVerification(id, verification)
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to load the company documents.'))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Saves the review sheet in one go: the changed documents, then the company status. The company
   * gets one notification per change (database triggers, migration 079).
   */
  async function saveReview(review: {
    documents: { requirementId: number; status: CompanyReviewStatus; remarks: string | null }[]
    company: { status: CompanyReviewStatus; remarks: string | null } | null
  }): Promise<boolean> {
    const id = companyId.value
    if (!id) return false
    isSaving.value = true
    try {
      for (const doc of review.documents) {
        await companyRequirementService.reviewRequirement(doc.requirementId, doc.status, doc.remarks)
        submissions.value = submissions.value.map((row) =>
          row.id === doc.requirementId
            ? { ...row, status: doc.status, status_remarks: doc.status === 'rejected' ? doc.remarks : null }
            : row,
        )
      }
      if (review.company) {
        await companyRequirementService.reviewCompany(id, review.company.status, review.company.remarks)
      }
      // Re-read: the documents can move the company status on their own (migration 080)
      const previousStatus = company.value?.verification_status ?? null
      const verification = await registeredCompanyService.fetchVerification(id)
      applyVerification(id, verification)
      toastAlert.success('Review saved', describeStatusChange(previousStatus, verification.verification_status, !!review.company))
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to save the review.'))
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    // State
    company,
    companyId,
    templates,
    submissions,
    verificationRemarks,
    isLoading,
    isSaving,
    // Actions
    openCompany,
    closeCompany,
    loadCompany,
    saveReview,
  }
})
