import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import {
  SPES_APPLICANT_STATUSES,
  type SpesApplicantStatus,
  type SpesFormRow,
} from '@/types/peso/provincialPeso/spes'
import { refineStatusRemarks, requiresStatusRemarks } from '@/helpers/common/statusRemarksHelper'

const spesReviewSchema = toTypedSchema(
  z
    .object({
      status: z.enum(SPES_APPLICANT_STATUSES),
      remarks: z.string().trim().optional(),
    })
    // Rejecting needs remarks; the applicant reads them in their notification
    .superRefine(refineStatusRemarks)
)

const INITIAL_VALUES = {
  status: 'Pending' as SpesApplicantStatus,
  remarks: '',
}

function toFormValues(row: SpesFormRow): typeof INITIAL_VALUES {
  const status =
    SPES_APPLICANT_STATUSES.find((s) => s.toLowerCase() === (row.status ?? '').toLowerCase()) ?? 'Pending'
  return { status, remarks: row.remarks ?? '' }
}

/**
 * PESO edit card — sets the status / remarks on a SPES applicant's form after checking the
 * submitted documents, and links to the full form editor for the applicant's details.
 */
export function useSpesApplicantForm() {
  const router = useRouter()
  const store = useSpesStore()
  const { reviewingForm, isSubmitting, formAttachments, isLoadingAttachments } = storeToRefs(store)
  const { reviewSpesForm, closeReviewDialog } = store

  const { handleSubmit, resetForm, values } = useForm({
    validationSchema: spesReviewSchema,
    initialValues: INITIAL_VALUES,
  })

  const isReviewDialogOpen = computed(() => reviewingForm.value !== null)
  const isRemarksRequired = computed(() => requiresStatusRemarks(values.status))

  // Load the selected applicant's current review each time the dialog opens.
  watch(reviewingForm, (row) => {
    if (row) resetForm({ values: toFormValues(row) })
  })

  const onReviewDialogOpenChange = (open: boolean) => {
    if (!open) closeReviewDialog()
  }

  const openEditDetails = () => {
    const formId = reviewingForm.value?.id
    if (!formId || isSubmitting.value) return
    closeReviewDialog()
    void router.push({ name: 'provincial-peso-spes-applicants-details', params: { id: formId } })
  }

  const submitReview = handleSubmit(async (formValues) => {
    await reviewSpesForm({ status: formValues.status, remarks: formValues.remarks || null })
  })

  return {
    isReviewDialogOpen,
    formAttachments,
    isLoadingAttachments,
    isSubmitting,
    reviewingForm,
    isRemarksRequired,
    statusOptions: SPES_APPLICANT_STATUSES,
    onReviewDialogOpenChange,
    openEditDetails,
    submitReview,
  }
}
