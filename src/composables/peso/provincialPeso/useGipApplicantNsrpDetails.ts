import { ref, computed } from 'vue'
import type { GipApplicantRecord } from '@/types/peso/provincialPeso/gip'
import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'
import {
  LPII_CONFIG,
  convertGipApplicantToEntryRecord,
  getInitials,
} from '@/helpers/peso/provincialPeso/gipHelper'
import { formatDateDisplay } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import {
  downloadNsrpFormPdf,
  printNsrpForm,
} from '@/helpers/peso/provincialPeso/nsrpTemplateHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'

export interface UseGipApplicantNsrpDetailsProps {
  applicant: GipApplicantRecord
}

export interface UseGipApplicantNsrpDetailsOptions {
  props: UseGipApplicantNsrpDetailsProps
  emit?: (e: 'back') => void
}

export function useGipApplicantNsrpDetails(options: UseGipApplicantNsrpDetailsOptions) {
  const toastAlert = useToastAlert()

  const isGeneratingPdf = ref(false)
  const isPrintingPdf = ref(false)

  const applicantRecord = computed<ApplicantEntryRecord>(() => {
    return convertGipApplicantToEntryRecord(options.props.applicant)
  })

  const handleBack = () => {
    options.emit?.('back')
  }

  const handleDownloadForm = async () => {
    try {
      isGeneratingPdf.value = true
      await downloadNsrpFormPdf(applicantRecord.value)
      toastAlert.success('PDF Downloaded', 'The NSRP Form 1 PDF has been generated and downloaded.')
    } catch (error: any) {
      console.error('Failed to generate NSRP PDF:', error)
      toastAlert.error('PDF Generation Failed', error?.message || 'Unable to generate PDF. Please try again.')
    } finally {
      isGeneratingPdf.value = false
    }
  }

  const handlePrint = async () => {
    try {
      isPrintingPdf.value = true
      await printNsrpForm(applicantRecord.value)
    } catch (error: any) {
      console.error('Failed to prepare NSRP print:', error)
      toastAlert.error('Print Preparation Failed', error?.message || 'Unable to prepare PDF for printing.')
    } finally {
      isPrintingPdf.value = false
    }
  }

  const formattedDob = computed(() => formatDateDisplay(applicantRecord.value.dateOfBirth))
  const formattedRegisteredDate = computed(() =>
    formatDateDisplay(options.props.applicant.createdAt || applicantRecord.value.createdAt)
  )
  const formattedAssessmentDate = computed(() =>
    formatDateDisplay(applicantRecord.value.assessmentDate)
  )
  const formattedUpdatedDate = computed(() => {
    const dateVal =
      applicantRecord.value.updatedAt ||
      options.props.applicant.rawApplicant?.updated_at ||
      options.props.applicant.createdAt ||
      applicantRecord.value.createdAt
    return dateVal ? formatDateDisplay(dateVal) : 'N/A'
  })

  const displayDocumentsSubmitted = computed<string[]>(() => {
    if (
      options.props.applicant.rawApplicant?.documents_submitted &&
      options.props.applicant.rawApplicant.documents_submitted.length > 0
    ) {
      return options.props.applicant.rawApplicant.documents_submitted
    }
    if (
      options.props.applicant.documentsSubmitted &&
      options.props.applicant.documentsSubmitted.length > 0
    ) {
      return options.props.applicant.documentsSubmitted
    }
    return []
  })

  return {
    applicantRecord,
    isGeneratingPdf,
    isPrintingPdf,
    handleBack,
    handleDownloadForm,
    handlePrint,
    formattedDob,
    formattedRegisteredDate,
    formattedAssessmentDate,
    formattedUpdatedDate,
    displayDocumentsSubmitted,
    getInitials,
    formatDateDisplay,
    LPII_CONFIG,
  }
}
