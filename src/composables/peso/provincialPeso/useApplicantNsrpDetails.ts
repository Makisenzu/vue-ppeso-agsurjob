import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useApplicantEntryStore } from '@/stores/peso/provincialPeso/applicantEntryStore'
import { formatDateDisplay, getInitials } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'

import {
  downloadNsrpFormPdf,
  printNsrpForm,
} from '@/helpers/peso/provincialPeso/nsrpTemplateHelper'

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
  const toastAlert = useToastAlert()
  const { isLoading } = storeToRefs(store)

  const isGeneratingPdf = ref(false)
  const isPrintingPdf = ref(false)

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

  const handlePrint = async () => {
    if (!applicant.value) {
      window.print()
      return
    }
    try {
      isPrintingPdf.value = true
      await printNsrpForm(applicant.value)
    } catch (error: any) {
      console.error('Failed to prepare NSRP print:', error)
      toastAlert.error('Print Preparation Failed', error?.message || 'Unable to prepare PDF for printing.')
    } finally {
      isPrintingPdf.value = false
    }
  }

  const handleDownloadForm = async () => {
    if (!applicant.value) return
    try {
      isGeneratingPdf.value = true
      await downloadNsrpFormPdf(applicant.value)
      toastAlert.success('PDF Downloaded', 'The NSRP Form 1 PDF has been generated and downloaded.')
    } catch (error: any) {
      console.error('Failed to generate NSRP PDF:', error)
      toastAlert.error('PDF Generation Failed', error?.message || 'Unable to generate PDF. Please try again.')
    } finally {
      isGeneratingPdf.value = false
    }
  }

  const formattedDob = computed(() => (applicant.value ? formatDateDisplay(applicant.value.dateOfBirth) : 'N/A'))
  const formattedRegisteredDate = computed(() => (applicant.value ? formatDateDisplay(applicant.value.createdAt) : 'N/A'))
  const formattedUpdatedDate = computed(() => (applicant.value ? formatDateDisplay(applicant.value.updatedAt) : 'N/A'))
  const formattedAssessmentDate = computed(() => (applicant.value ? formatDateDisplay(applicant.value.assessmentDate) : 'N/A'))

  return {
    applicant,
    isLoading,
    isGeneratingPdf,
    isPrintingPdf,
    handleBack,
    handlePrint,
    handleDownloadForm,
    handleDownloadPdf: handleDownloadForm,
    formattedDob,
    formattedRegisteredDate,
    formattedUpdatedDate,
    formattedAssessmentDate,
    getInitials,
    formatDateDisplay,
  }
}

