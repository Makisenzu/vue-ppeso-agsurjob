import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { watchDebounced } from '@vueuse/core'
import { format } from 'date-fns'
import * as z from 'zod'
import { useHotsStore } from '@/stores/peso/provincialPeso/hotsStore'
import { getRegistryPhone, getVacancySlotsLeft } from '@/helpers/peso/provincialPeso/jobFairHelper'
import type { HotsInsert, JobFairRegistryApplicant, HotsWithDetails } from '@/types/peso/provincialPeso/jobFair'

export const HOTS_APPLICANT_SOURCES = ['registry', 'walk-in'] as const
export type HotsApplicantSource = (typeof HOTS_APPLICANT_SOURCES)[number]

const REGISTRY_SEARCH_MIN_LENGTH = 2

const hotsSchema = toTypedSchema(
  z
    .object({
      participantId: z.string({ required_error: 'Select the hiring employer.' }).min(1, 'Select the hiring employer.'),
      jobVacancyId: z.string({ required_error: 'Select the vacancy filled.' }).min(1, 'Select the vacancy filled.'),
      applicantSource: z.enum(HOTS_APPLICANT_SOURCES),
      applicantId: z.string().optional(),
      firstName: z.string().trim().optional(),
      middleName: z.string().trim().optional(),
      lastName: z.string().trim().optional(),
      contactPhone: z.string().trim().optional(),
      email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address.')]).optional(),
      hiredDate: z.string().min(1, 'Hired date is required.'),
      remarks: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.applicantSource === 'registry') {
        if (!values.applicantId) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['applicantId'], message: 'Select an applicant from the registry.' })
        }
        return
      }
      // Walk-ins are not in the registry, so PESO enters who was hired
      if (!values.firstName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['firstName'], message: 'First name is required.' })
      if (!values.lastName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lastName'], message: 'Last name is required.' })
      if (!values.contactPhone) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['contactPhone'], message: 'Contact number is required.' })
      }
    })
)

type HotsFormValues = {
  participantId: string
  jobVacancyId: string
  applicantSource: HotsApplicantSource
  applicantId: string | undefined
  firstName: string
  middleName: string
  lastName: string
  contactPhone: string
  email: string
  hiredDate: string
  remarks: string
}

const today = () => format(new Date(), 'yyyy-MM-dd')

const initialValues = (): HotsFormValues => ({
  participantId: '',
  jobVacancyId: '',
  applicantSource: 'registry',
  applicantId: undefined,
  firstName: '',
  middleName: '',
  lastName: '',
  contactPhone: '',
  email: '',
  hiredDate: today(),
  remarks: '',
})

function toFormValues(row: HotsWithDetails): HotsFormValues {
  return {
    participantId: row.participant_id,
    jobVacancyId: row.job_vacancy_id,
    applicantSource: row.applicant_id ? 'registry' : 'walk-in',
    applicantId: row.applicant_id ?? undefined,
    firstName: row.applicant_first_name,
    middleName: row.applicant_middle_name ?? '',
    lastName: row.applicant_last_name,
    contactPhone: row.applicant_contact_phone,
    email: row.applicant_email ?? '',
    hiredDate: row.hired_date.slice(0, 10),
    remarks: row.remarks ?? '',
  }
}

/** The registry details already copied onto a saved hire, so editing shows them without a lookup. */
function toRegistryApplicant(row: HotsWithDetails): JobFairRegistryApplicant | null {
  if (!row.applicant_id) return null
  return {
    id: row.applicant_id,
    profile_id: row.applicant_profile_id,
    first_name: row.applicant_first_name,
    middle_name: row.applicant_middle_name,
    surname: row.applicant_last_name,
    suffix: null,
    sex: null,
    email: row.applicant_email,
    contact_numbers: [row.applicant_contact_phone],
  }
}

const orNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

export function useHotsForm() {
  const store = useHotsStore()
  const { jobFairId, vacancyOptions, isFormDialogOpen, editingHire, isSubmitting } = storeToRefs(store)
  const { createHire, updateHire, closeFormDialog, searchRegistryApplicants } = store

  const { handleSubmit, resetForm, values, setFieldValue, setFieldError } = useForm({
    validationSchema: hotsSchema,
    initialValues: initialValues(),
  })

  const isEditMode = computed(() => editingHire.value !== null)
  const isRegistrySource = computed(() => values.applicantSource === 'registry')

  // ─── Employer → Vacancy ───
  const participantOptions = computed(() => {
    const byId = new Map<string, string>()
    for (const option of vacancyOptions.value) {
      byId.set(option.participant_id, option.job_fair_participants?.business_name ?? 'Unnamed employer')
    }
    return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  })

  const vacancyChoices = computed(() =>
    vacancyOptions.value
      .filter((option) => option.participant_id === values.participantId)
      .map((option) => {
        const slotsLeft = getVacancySlotsLeft(option)
        // The vacancy the hire already fills keeps its own slot when editing
        const isCurrent = editingHire.value?.job_vacancy_id === option.id
        return {
          id: option.id,
          title: option.position_title,
          slotsLabel: slotsLeft === null ? 'No limit' : `${slotsLeft} of ${option.vacancy_count} left`,
          isFull: slotsLeft === 0 && !isCurrent,
        }
      })
  )

  // Switching employer clears a vacancy that belongs to another employer
  watch(
    () => values.participantId,
    () => {
      if (values.jobVacancyId && !vacancyChoices.value.some((choice) => choice.id === values.jobVacancyId)) {
        setFieldValue('jobVacancyId', '')
      }
    }
  )

  // ─── Registry Applicant ───
  const selectedApplicant = ref<JobFairRegistryApplicant | null>(null)
  const registrySearchTerm = ref('')
  const registryResults = ref<JobFairRegistryApplicant[]>([])
  const isSearchingRegistry = ref(false)

  const registryPhone = computed(() => (selectedApplicant.value ? getRegistryPhone(selectedApplicant.value) : ''))
  /** The trigger keeps the entered phone only when the registry has none. */
  const needsManualPhone = computed(() => isRegistrySource.value && !!selectedApplicant.value && !registryPhone.value)

  watchDebounced(
    registrySearchTerm,
    async (term) => {
      if (term.trim().length < REGISTRY_SEARCH_MIN_LENGTH) {
        registryResults.value = []
        return
      }
      isSearchingRegistry.value = true
      try {
        registryResults.value = await searchRegistryApplicants(term)
      } finally {
        isSearchingRegistry.value = false
      }
    },
    { debounce: 300 }
  )

  function selectApplicant(applicant: JobFairRegistryApplicant | null) {
    selectedApplicant.value = applicant
    setFieldValue('applicantId', applicant?.id)
  }

  function setApplicantSource(source: HotsApplicantSource) {
    setFieldValue('applicantSource', source)
    if (source === 'walk-in') selectApplicant(null)
  }

  // Load the selected row (or blank values) each time the dialog opens.
  watch(isFormDialogOpen, (open) => {
    if (!open) return
    const row = editingHire.value
    resetForm({ values: row ? toFormValues(row) : initialValues() })
    selectedApplicant.value = row ? toRegistryApplicant(row) : null
    registrySearchTerm.value = ''
    registryResults.value = []
  })

  const onFormDialogOpenChange = (open: boolean) => {
    if (open || isSubmitting.value) return
    closeFormDialog()
  }

  const submitHire = handleSubmit(async (formValues) => {
    if (!jobFairId.value) return

    const vacancy = vacancyOptions.value.find((option) => option.id === formValues.jobVacancyId)
    if (!vacancy) return

    const applicant = formValues.applicantSource === 'registry' ? selectedApplicant.value : null
    const contactPhone = applicant ? registryPhone.value || orNull(formValues.contactPhone) : orNull(formValues.contactPhone)
    if (!contactPhone) {
      // Only reachable for a registry applicant with no number on file
      setFieldError('contactPhone', 'This applicant has no contact number in the registry. Enter one for this hire.')
      return
    }

    // For registry applicants the trigger overwrites these from applicants.applicants;
    // they are sent so the NOT NULL columns are satisfied either way.
    const payload: HotsInsert = {
      job_fair_id: jobFairId.value,
      participant_id: vacancy.participant_id,
      job_vacancy_id: vacancy.id,
      applicant_id: applicant?.id ?? null,
      applicant_first_name: applicant ? applicant.first_name : (formValues.firstName ?? '').trim(),
      applicant_middle_name: applicant ? applicant.middle_name : orNull(formValues.middleName),
      applicant_last_name: applicant ? applicant.surname : (formValues.lastName ?? '').trim(),
      applicant_contact_phone: contactPhone,
      applicant_email: applicant ? applicant.email : orNull(formValues.email),
      hired_date: formValues.hiredDate,
      remarks: orNull(formValues.remarks),
    }

    if (editingHire.value) {
      await updateHire(editingHire.value.id, payload)
    } else {
      await createHire(payload)
    }
  })

  return {
    isFormDialogOpen,
    isSubmitting,
    isEditMode,
    isRegistrySource,
    participantOptions,
    vacancyChoices,
    selectedApplicant,
    registrySearchTerm,
    registryResults,
    isSearchingRegistry,
    registryPhone,
    needsManualPhone,
    registrySearchMinLength: REGISTRY_SEARCH_MIN_LENGTH,
    selectApplicant,
    setApplicantSource,
    onFormDialogOpenChange,
    submitHire,
  }
}
