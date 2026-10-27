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
import { normalizeStatusRemarks, refineStatusRemarks, requiresStatusRemarks } from '@/helpers/common/statusRemarksHelper'

const spesReviewSchema = toTypedSchema(
  z
    .object({
      status: z.enum(SPES_APPLICANT_STATUSES),
      remarks: z.string().trim().optional(),
      orientationDate: z.string().optional(),
      orientationTime: z.string().optional(),
      orientationNote: z.string().trim().max(500, 'Keep the note under 500 characters.').optional(),
    })
    // Rejecting needs remarks; the applicant reads them in their notification
    .superRefine(refineStatusRemarks)
    // Approving tells the applicant when to come for orientation (same as GIP)
    .superRefine((values, ctx) => {
      if (values.status !== 'Approved') return
      if (!values.orientationDate) {
        ctx.addIssue({ code: 'custom', path: ['orientationDate'], message: 'Set the orientation date.' })
      }
      if (!values.orientationTime) {
        ctx.addIssue({ code: 'custom', path: ['orientationTime'], message: 'Set the orientation time.' })
      }
    })
)

const INITIAL_VALUES = {
  status: 'Pending' as SpesApplicantStatus,
  remarks: '',
  orientationDate: '',
  orientationTime: '',
  orientationNote: '',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** A saved orientation_at as the date and time inputs' values, in the staff's local time */
function toOrientationInputs(value: string | null | undefined) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return { orientationDate: '', orientationTime: '' }
  return {
    orientationDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    orientationTime: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

function toFormValues(row: SpesFormRow): typeof INITIAL_VALUES {
  const status =
    SPES_APPLICANT_STATUSES.find((s) => s.toLowerCase() === (row.status ?? '').toLowerCase()) ?? 'Pending'
  return {
    status,
    remarks: row.remarks ?? '',
    ...toOrientationInputs(row.orientation_at),
    orientationNote: row.orientation_note ?? '',
  }
}

/**
 * PESO edit card — sets the status / remarks on a SPES applicant's form after checking the
 * submitted documents (and the orientation schedule when approving), and links to the full form
 * editor for the applicant's details.
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
  const isOrientationRequired = computed(() => values.status === 'Approved')

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
    const isApproved = formValues.status === 'Approved'
    await reviewSpesForm({
      status: formValues.status,
      remarks: formValues.remarks || null,
      // The date and time inputs are local time; saved as an instant
      orientation_at: isApproved
        ? new Date(`${formValues.orientationDate}T${formValues.orientationTime}:00`).toISOString()
        : null,
      orientation_note: isApproved ? normalizeStatusRemarks(formValues.orientationNote) : null,
    })
  })

  return {
    isReviewDialogOpen,
    formAttachments,
    isLoadingAttachments,
    isSubmitting,
    reviewingForm,
    isRemarksRequired,
    isOrientationRequired,
    statusOptions: SPES_APPLICANT_STATUSES,
    onReviewDialogOpenChange,
    openEditDetails,
    submitReview,
  }
}
