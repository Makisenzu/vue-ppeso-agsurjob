import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApplicantEntryStore } from '@/stores/peso/provincialPeso/applicantEntryStore'
import { formatDateDisplay, getInitials } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'

export interface UseApplicantNsrpDetailsProps {
  applicant?: ApplicantEntryRecord
}

export interface UseApplicantNsrpDetailsOptions {
  props?: UseApplicantNsrpDetailsProps
  emit?: (e: 'back') => void
}

export function useApplicantNsrpDetails(options?: UseApplicantNsrpDetailsOptions) {
  const route = useRoute()
  const router = useRouter()
  const store = useApplicantEntryStore()
  const { isLoading } = storeToRefs(store)

  const applicant = computed<ApplicantEntryRecord | null>(() => {
    if (options?.props?.applicant) return options.props.applicant
    const id = route.params.id as string
    if (store.selectedApplicant && store.selectedApplicant.id === id) {
      return store.selectedApplicant
    }
    return store.applicants.find((a) => a.id === id) ?? null
  })

  onMounted(async () => {
    if (!applicant.value && store.applicants.length === 0) {
      await store.fetchApplicants()
    }
  })

  const handleBack = () => {
    options?.emit?.('back')
    router.push({ name: 'provincial-peso-entry' })
  }

  const handlePrint = () => {
    window.print()
  }

  const formattedDob = computed(() => (applicant.value ? formatDateDisplay(applicant.value.dateOfBirth) : 'N/A'))
  const formattedRegisteredDate = computed(() => (applicant.value ? formatDateDisplay(applicant.value.createdAt) : 'N/A'))
  const formattedUpdatedDate = computed(() => (applicant.value ? formatDateDisplay(applicant.value.updatedAt) : 'N/A'))
  const formattedAssessmentDate = computed(() => (applicant.value ? formatDateDisplay(applicant.value.assessmentDate) : 'N/A'))

  return {
    applicant,
    isLoading,
    handleBack,
    handlePrint,
    formattedDob,
    formattedRegisteredDate,
    formattedUpdatedDate,
    formattedAssessmentDate,
    getInitials,
    formatDateDisplay,
  }
}
