import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useRecruitmentActivityDetailsStore } from '@/stores/peso/provincialPeso/recruitmentActivityDetailsStore'
import { useJobVacancyMatchingStore } from '@/stores/common/jobVacancyMatchingStore'
import {
  EMPTY_JOB_VACANCY_FORM_VALUES,
  jobVacancyFormShape,
  refineCompleteJobVacancyForm,
  toJobVacancyFields,
  toJobVacancyFormValues,
  toJobVacancyMatching,
} from '@/helpers/common/jobVacancyHelper'
import type { JobVacancyFormValues, JobVacancyMatching } from '@/types/common/jobVacancy'
import type {
  RecruitmentActivityVacancyDetails,
  RecruitmentActivityVacancyFormPayload,
} from '@/types/peso/provincialPeso/recruitmentActivity'

const optionalText = z.string().trim().optional()

/** Every job_vacancies field is required; the job order adds its jobsite country (SRA) and number. */
const jobOrderSchema = toTypedSchema(
  z
    .object({
      ...jobVacancyFormShape,
      isSra: z.boolean(),
      destinationCountry: optionalText,
      jobOrderNumber: optionalText,
    })
    .superRefine((values, ctx) => {
      refineCompleteJobVacancyForm(values, ctx)
      // Overseas job orders name the jobsite country (terminal report column)
      if (values.isSra && !values.destinationCountry?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['destinationCountry'],
          message: 'Jobsite country is required for an SRA job order.',
        })
      }
    })
)

type JobOrderFormValues = JobVacancyFormValues & {
  isSra: boolean
  destinationCountry: string
  jobOrderNumber: string
}

function toFormValues(
  row: RecruitmentActivityVacancyDetails | null,
  isSra: boolean,
  matching?: JobVacancyMatching,
): JobOrderFormValues {
  return {
    ...(row ? toJobVacancyFormValues(row, matching) : EMPTY_JOB_VACANCY_FORM_VALUES),
    isSra,
    destinationCountry: row?.destination_country ?? '',
    jobOrderNumber: row?.job_order_number ?? '',
  }
}

const orNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

export function useRecruitmentActivityVacancyForm() {
  const store = useRecruitmentActivityDetailsStore()
  const matchingStore = useJobVacancyMatchingStore()
  const { activity, isVacancyFormOpen, editingVacancy, isSubmittingVacancy } = storeToRefs(store)
  const { createVacancy, updateVacancy, closeVacancyFormDialog } = store

  const isSra = computed(() => activity.value?.type === 'SRA')

  const { handleSubmit, resetForm } = useForm({
    validationSchema: jobOrderSchema,
    initialValues: toFormValues(null, false),
  })

  const isEditMode = computed(() => editingVacancy.value !== null)

  // Load the selected row with its skills (or blank values) each time the dialog opens.
  watch(isVacancyFormOpen, async (open) => {
    if (!open) return
    const editing = editingVacancy.value
    resetForm({ values: toFormValues(editing, isSra.value) })
    if (!editing) return
    const matching = await matchingStore.loadMatching(editing.job_vacancy_id)
    if (isVacancyFormOpen.value && editingVacancy.value?.id === editing.id) {
      resetForm({ values: toFormValues(editing, isSra.value, matching) })
    }
  })

  const onVacancyDialogOpenChange = (open: boolean) => {
    if (open || isSubmittingVacancy.value) return
    closeVacancyFormDialog()
  }

  const submitVacancy = handleSubmit(async (formValues) => {
    const payload: RecruitmentActivityVacancyFormPayload = {
      vacancy: toJobVacancyFields(formValues as JobOrderFormValues),
      vacancy_count: formValues.vacancyCount,
      status: formValues.status,
      destination_country: isSra.value ? orNull(formValues.destinationCountry) : null,
      job_order_number: orNull(formValues.jobOrderNumber),
      matching: toJobVacancyMatching(formValues as JobOrderFormValues),
    }

    if (editingVacancy.value) await updateVacancy(editingVacancy.value, payload)
    else await createVacancy(payload)
  })

  return {
    isVacancyFormOpen,
    isSubmittingVacancy,
    isLoadingSkills: computed(() => matchingStore.isLoading),
    isEditMode,
    isSra,
    onVacancyDialogOpenChange,
    submitVacancy,
  }
}
