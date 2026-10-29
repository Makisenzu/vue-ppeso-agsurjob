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
import type { RegisteredCompanyListItem } from '@/types/peso/provincialPeso/registeredCompany'

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
  const isSavingCompany = ref(false)
  /** employer_requirements.id being reviewed */
  const reviewingRequirementId = ref<number | null>(null)

  // ─── Actions ───

  async function openCompany(row: RegisteredCompanyListItem): Promise<void> {
    company.value = row
    await loadCompany(row.id)
  }

  function closeCompany(): void {
    company.value = null
  }

  async function loadCompany(id: string): Promise<void> {
    companyId.value = id
    submissions.value = []
    verificationRemarks.value = null
    isLoading.value = true
    try {
      const [templateRows, submissionRows, remarks] = await Promise.all([
        templates.value.length ? Promise.resolve(templates.value) : companyRequirementService.fetchTemplates(),
        companyRequirementService.fetchCompanyRequirements(id),
        registeredCompanyService.fetchVerificationRemarks(id),
      ])
      // A newer company was opened while this one loaded
      if (companyId.value !== id) return
      templates.value = templateRows
      submissions.value = submissionRows
      verificationRemarks.value = remarks
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to load the company documents.'))
    } finally {
      isLoading.value = false
    }
  }

  async function reviewRequirement(
    requirementId: number,
    status: CompanyReviewStatus,
    remarks: string | null,
  ): Promise<boolean> {
    reviewingRequirementId.value = requirementId
    try {
      await companyRequirementService.reviewRequirement(requirementId, status, remarks)
      submissions.value = submissions.value.map((row) =>
        row.id === requirementId ? { ...row, status, status_remarks: status === 'rejected' ? remarks : null } : row,
      )
      toastAlert.success('Document updated', 'The company was notified.')
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to update the document status.'))
      return false
    } finally {
      reviewingRequirementId.value = null
    }
  }

  async function reviewCompany(status: CompanyReviewStatus, remarks: string | null): Promise<boolean> {
    const id = companyId.value
    if (!id) return false
    isSavingCompany.value = true
    try {
      await companyRequirementService.reviewCompany(id, status, remarks)
      verificationRemarks.value = status === 'rejected' ? remarks : null
      listStore.setVerificationStatus(id, status)
      if (company.value?.id === id) company.value = { ...company.value, verification_status: status }
      toastAlert.success('Company status updated', 'The company was notified.')
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to update the company status.'))
      return false
    } finally {
      isSavingCompany.value = false
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
    isSavingCompany,
    reviewingRequirementId,
    // Actions
    openCompany,
    closeCompany,
    loadCompany,
    reviewRequirement,
    reviewCompany,
  }
})
