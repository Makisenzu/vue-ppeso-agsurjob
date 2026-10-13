import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useJobFairParticipantStore } from '@/stores/peso/provincialPeso/jobFairParticipantStore'
import {
  DISABILITY_TYPE_OPTIONS,
  NATURE_OF_WORK_OPTIONS,
  VACANCY_STATUSES,
  type DisabilityType,
  type JobVacancyInsert,
  type JobVacancyRow,
} from '@/types/peso/provincialPeso/jobFair'

const optionalText = z.string().trim().optional()

const vacancySchema = toTypedSchema(
  z
    .object({
      positionTitle: z.string().trim().min(1, 'Position title is required.'),
      jobDescription: optionalText,
      natureOfWork: z.enum(NATURE_OF_WORK_OPTIONS),
      vacancyCount: z.coerce.number().int('Must be a whole number.').min(1, 'At least 1 opening.'),
      salary: optionalText,
      placeOfWork: optionalText,
      educationalLevel: optionalText,
      courseShsStrand: optionalText,
      workExperienceMonths: z.coerce.number().int('Must be a whole number.').min(0, 'Cannot be negative.'),
      eligibility: optionalText,
      license: optionalText,
      certification: optionalText,
      languages: optionalText,
      otherQualifications: optionalText,
      acceptsPwd: z.boolean(),
      pwdDisabilities: z.array(z.enum(DISABILITY_TYPE_OPTIONS)),
      pwdOtherDisability: optionalText,
      acceptsReturningOfw: z.boolean(),
      postingDate: optionalText,
      validUntil: optionalText,
      status: z.enum(VACANCY_STATUSES),
    })
    // ISO yyyy-mm-dd strings compare correctly as plain strings
    .refine((v) => !v.postingDate || !v.validUntil || v.validUntil >= v.postingDate, {
      message: 'Valid until cannot be before the posting date.',
      path: ['validUntil'],
    })
)

type VacancyFormValues = {
  positionTitle: string
  jobDescription: string
  natureOfWork: (typeof NATURE_OF_WORK_OPTIONS)[number]
  vacancyCount: number
  salary: string
  placeOfWork: string
  educationalLevel: string
  courseShsStrand: string
  workExperienceMonths: number
  eligibility: string
  license: string
  certification: string
  languages: string
  otherQualifications: string
  acceptsPwd: boolean
  pwdDisabilities: DisabilityType[]
  pwdOtherDisability: string
  acceptsReturningOfw: boolean
  postingDate: string
  validUntil: string
  status: (typeof VACANCY_STATUSES)[number]
}

const INITIAL_VALUES: VacancyFormValues = {
  positionTitle: '',
  jobDescription: '',
  natureOfWork: 'Permanent',
  vacancyCount: 1,
  salary: '',
  placeOfWork: '',
  educationalLevel: '',
  courseShsStrand: '',
  workExperienceMonths: 0,
  eligibility: '',
  license: '',
  certification: '',
  languages: '',
  otherQualifications: '',
  acceptsPwd: false,
  pwdDisabilities: [],
  pwdOtherDisability: '',
  acceptsReturningOfw: false,
  postingDate: '',
  validUntil: '',
  status: 'open',
}

const joinList = (items?: string[] | null) => (items ?? []).join(', ')
const splitList = (value?: string) => {
  const items = (value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  return items.length ? items : null
}
const orNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

function toFormValues(row: JobVacancyRow): VacancyFormValues {
  const status = VACANCY_STATUSES.find((s) => s === (row.status ?? '').toLowerCase()) ?? 'open'
  return {
    positionTitle: row.position_title,
    jobDescription: row.job_description ?? '',
    natureOfWork: row.nature_of_work,
    vacancyCount: row.vacancy_count ?? 1,
    salary: row.salary ?? '',
    placeOfWork: row.place_of_work ?? '',
    educationalLevel: row.educational_level ?? '',
    courseShsStrand: row.course_shs_strand ?? '',
    workExperienceMonths: row.work_experience_months ?? 0,
    eligibility: row.eligibility ?? '',
    license: row.license ?? '',
    certification: row.certification ?? '',
    languages: joinList(row.language_dialect_spoken),
    otherQualifications: joinList(row.other_qualifications),
    acceptsPwd: row.accepts_pwd ?? false,
    pwdDisabilities: row.pwd_disabilities ?? [],
    pwdOtherDisability: row.pwd_other_disability ?? '',
    acceptsReturningOfw: row.accepts_returning_ofw ?? false,
    postingDate: row.posting_date?.slice(0, 10) ?? '',
    validUntil: row.valid_until?.slice(0, 10) ?? '',
    status,
  }
}

export function useJobVacancyForm() {
  const store = useJobFairParticipantStore()
  const { jobFair, participant, isVacancyFormOpen, editingVacancy, isSubmitting } = storeToRefs(store)
  const { createVacancy, updateVacancy, closeVacancyFormDialog } = store

  const { handleSubmit, resetForm, values, setFieldValue } = useForm({
    validationSchema: vacancySchema,
    initialValues: INITIAL_VALUES,
  })

  const isEditMode = computed(() => editingVacancy.value !== null)
  const acceptsPwd = computed(() => values.acceptsPwd === true)
  const hasOtherDisability = computed(() => values.pwdDisabilities?.includes('Others') ?? false)

  // Load the selected row (or blank values) each time the dialog opens.
  watch(isVacancyFormOpen, (open) => {
    if (!open) return
    resetForm({ values: editingVacancy.value ? toFormValues(editingVacancy.value) : INITIAL_VALUES })
  })

  const onVacancyDialogOpenChange = (open: boolean) => {
    if (open || isSubmitting.value) return
    closeVacancyFormDialog()
  }

  const toggleDisability = (option: DisabilityType, checked: boolean) => {
    const current = values.pwdDisabilities ?? []
    setFieldValue(
      'pwdDisabilities',
      checked ? [...new Set([...current, option])] : current.filter((item) => item !== option)
    )
  }

  const submitVacancy = handleSubmit(async (formValues) => {
    if (!jobFair.value || !participant.value) return

    const payload: Omit<JobVacancyInsert, 'job_fair_id' | 'participant_id'> = {
      position_title: formValues.positionTitle,
      job_description: orNull(formValues.jobDescription),
      nature_of_work: formValues.natureOfWork,
      vacancy_count: formValues.vacancyCount,
      salary: orNull(formValues.salary),
      place_of_work: orNull(formValues.placeOfWork),
      educational_level: orNull(formValues.educationalLevel),
      course_shs_strand: orNull(formValues.courseShsStrand),
      work_experience_months: formValues.workExperienceMonths,
      eligibility: orNull(formValues.eligibility),
      license: orNull(formValues.license),
      certification: orNull(formValues.certification),
      language_dialect_spoken: splitList(formValues.languages),
      other_qualifications: splitList(formValues.otherQualifications),
      accepts_pwd: formValues.acceptsPwd,
      // PWD details only apply when the vacancy accepts PWD applicants.
      pwd_disabilities: formValues.acceptsPwd && formValues.pwdDisabilities.length ? formValues.pwdDisabilities : null,
      pwd_other_disability:
        formValues.acceptsPwd && formValues.pwdDisabilities.includes('Others') ? orNull(formValues.pwdOtherDisability) : null,
      accepts_returning_ofw: formValues.acceptsReturningOfw,
      posting_date: orNull(formValues.postingDate),
      valid_until: orNull(formValues.validUntil),
      status: formValues.status,
    }

    if (editingVacancy.value) {
      await updateVacancy(editingVacancy.value.id, payload)
    } else {
      await createVacancy({ ...payload, job_fair_id: jobFair.value.id, participant_id: participant.value.id })
    }
  })

  return {
    isVacancyFormOpen,
    isSubmitting,
    isEditMode,
    acceptsPwd,
    hasOtherDisability,
    formValues: values,
    onVacancyDialogOpenChange,
    toggleDisability,
    submitVacancy,
    natureOfWorkOptions: NATURE_OF_WORK_OPTIONS,
    disabilityOptions: DISABILITY_TYPE_OPTIONS,
    statusOptions: VACANCY_STATUSES,
  }
}
