import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import { formatSpesFormName, getSpesBeneficiaryType } from '@/helpers/peso/provincialPeso/spesHelper'
import {
  SPES_BENEFICIARY_TYPES,
  SPES_STATUSES,
  type SpesStatus,
  type SpesWithApplicant,
} from '@/types/peso/provincialPeso/spes'

const spesBeneficiarySchema = toTypedSchema(
  z.object({
    applicationId: z.string().min(1, 'Select an approved SPES applicant.'),
    beneficiary: z.string().optional(),
    daysDuration: z.coerce
      .number({ message: 'Enter the number of days.' })
      .int('Enter a whole number of days.')
      .min(1, 'Duration must be at least 1 day.')
      .max(365, 'Duration cannot exceed 365 days.'),
    status: z.enum(SPES_STATUSES),
  })
)

const INITIAL_VALUES = {
  applicationId: '',
  beneficiary: '',
  daysDuration: undefined as number | undefined,
  status: 'Active' as SpesStatus,
}

function toFormValues(row: SpesWithApplicant): typeof INITIAL_VALUES {
  const status = SPES_STATUSES.find((s) => s.toLowerCase() === (row.status ?? '').toLowerCase()) ?? 'Active'
  const days = Number(row.days_duration)
  return {
    applicationId: row.application_id ?? '',
    beneficiary: row.beneficiary ?? '',
    daysDuration: Number.isFinite(days) && days > 0 ? days : undefined,
    status,
  }
}

export function useSpesBeneficiaryForm() {
  const store = useSpesStore()
  const { isSpesFormOpen, editingSpes, isSubmitting, enrollableApplicants } = storeToRefs(store)
  const { createSpes, updateSpes, closeSpesFormDialog } = store

  const { handleSubmit, resetForm, setFieldValue } = useForm({
    validationSchema: spesBeneficiarySchema,
    initialValues: INITIAL_VALUES,
  })

  const isEditMode = computed(() => editingSpes.value !== null)

  const applicantOptions = computed(() =>
    enrollableApplicants.value.map((form) => ({
      value: form.id,
      label: formatSpesFormName(form),
      beneficiary: getSpesBeneficiaryType(form),
    }))
  )

  watch(isSpesFormOpen, (open) => {
    if (!open) return
    resetForm({ values: editingSpes.value ? toFormValues(editingSpes.value) : INITIAL_VALUES })
  })

  /** Pre-fills the beneficiary type from the selected applicant's SPES availment history. */
  const onApplicantSelected = (applicationId: string) => {
    const match = applicantOptions.value.find((option) => option.value === applicationId)
    if (match?.beneficiary) setFieldValue('beneficiary', match.beneficiary)
  }

  const onSpesFormOpenChange = (open: boolean) => {
    if (open || isSubmitting.value) return
    closeSpesFormDialog()
  }

  const submitSpes = handleSubmit(async (formValues) => {
    const payload = {
      beneficiary: formValues.beneficiary || null,
      days_duration: String(formValues.daysDuration),
      status: formValues.status,
    }

    if (editingSpes.value) {
      await updateSpes(editingSpes.value.id, payload)
    } else {
      await createSpes({ ...payload, application_id: formValues.applicationId })
    }
  })

  return {
    isSpesFormOpen,
    isSubmitting,
    isEditMode,
    editingSpes,
    applicantOptions,
    statusOptions: SPES_STATUSES,
    beneficiaryOptions: SPES_BENEFICIARY_TYPES,
    onApplicantSelected,
    onSpesFormOpenChange,
    submitSpes,
  }
}
