import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import {
  SPES_APPLICANT_STATUSES,
  type SpesApplicantStatus,
  type SpesFormRow,
} from '@/types/peso/provincialPeso/spes'

const spesReviewSchema = toTypedSchema(
  z.object({
    status: z.enum(SPES_APPLICANT_STATUSES),
    remarks: z.string().trim().optional(),
  })
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

/** PESO review dialog — sets the status / remarks on a SPES applicant's form. */
export function useSpesApplicantForm() {
  const store = useSpesStore()
  const { reviewingForm, isSubmitting, formAttachments, isLoadingAttachments } = storeToRefs(store)
  const { reviewSpesForm, closeReviewDialog } = store

  const { handleSubmit, resetForm } = useForm({
    validationSchema: spesReviewSchema,
    initialValues: INITIAL_VALUES,
  })

  const isReviewDialogOpen = computed(() => reviewingForm.value !== null)

  // Load the selected applicant's current review each time the dialog opens.
  watch(reviewingForm, (row) => {
    if (row) resetForm({ values: toFormValues(row) })
  })

  const onReviewDialogOpenChange = (open: boolean) => {
    if (!open) closeReviewDialog()
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
    statusOptions: SPES_APPLICANT_STATUSES,
    onReviewDialogOpenChange,
    submitReview,
  }
}
