import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useAuthStore } from '@/stores/common/auth'
import { useJobPostingStore } from '@/stores/employer/jobPostingStore'
import { useJobPostingAttachments } from '@/composables/employer/useJobPostingAttachments'
import {
  EMPTY_JOB_VACANCY_FORM_VALUES,
  MAX_TRAINING_HOURS,
  formatTrainingHours,
  jobVacancyFormShape,
  refineCompleteJobVacancyForm,
  refineJobVacancySchedule,
  toJobVacancyFields,
  toJobVacancyFormValues,
  toJobVacancyMatching,
} from '@/helpers/common/jobVacancyHelper'
import { toReviewStatus } from '@/helpers/common/companyRequirementHelper'
import {
  formatJobPostingDate,
  getJobPostingStatusLabel,
  jobPostingRequirementsSchema,
  jobPostingStagesSchema,
  toJobPostingRequirementValues,
  toJobPostingStageValues,
  toJobVacancyRequirements,
  toJobVacancyStages,
} from '@/helpers/employer/jobPostingHelper'
import { laterIsoDay, scheduledMinIso, todayIso } from '@/helpers/common/dateRuleHelper'
import type { JobVacancySavedDates } from '@/helpers/common/jobVacancyHelper'
import type { JobPostingFormValues } from '@/types/employer/jobPosting'

/**
 * The job_vacancies fields of PESO's vacancy forms, including the skills used for matching, plus the documents
 * applicants submit (088) and the hiring steps (089) — employer postings only. Languages and other
 * qualifications are optional here: left blank, they're saved as empty.
 */
const createJobPostingSchema = (saved: JobVacancySavedDates = {}) => toTypedSchema(
  z
    .object({
      ...jobVacancyFormShape,
      languages: z.string().trim(),
      otherQualifications: z.string().trim(),
      // Blank → null; otherwise whole hours (migration 096)
      trainingHours: z.preprocess(
        (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
        z
          .number({ invalid_type_error: 'Enter the number of hours.' })
          .int('Whole hours only.')
          .min(1, 'At least 1 hour.')
          .max(MAX_TRAINING_HOURS, `Up to ${MAX_TRAINING_HOURS} hours.`)
          .nullable(),
      ),
      requirements: jobPostingRequirementsSchema,
      stages: jobPostingStagesSchema,
    })
    .superRefine(refineCompleteJobVacancyForm)
    .superRefine(refineJobVacancySchedule(saved)),
)

/** Steps of the posting page; each is checked before moving on */
export const JOB_POSTING_FORM_STEPS = [
  { key: 'details', title: 'Job details', description: 'The position, pay, qualifications and posting period.' },
  { key: 'requirements', title: 'Requirements', description: 'Documents applicants submit, and files to share with them.' },
  { key: 'stages', title: 'Hiring steps', description: 'The steps applicants go through, in order.' },
  { key: 'review', title: 'Review', description: 'Check everything before posting.' },
] as const

type JobPostingFormStepKey = (typeof JOB_POSTING_FORM_STEPS)[number]['key']

/** Form fields validated on each step */
const STEP_FIELDS: Record<JobPostingFormStepKey, readonly string[]> = {
  details: [...Object.keys(jobVacancyFormShape), 'trainingHours'],
  requirements: ['requirements'],
  stages: ['stages'],
  review: [],
}

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? '' : 's'}`

/**
 * Post a Job / Edit Job Posting page (owner only): the posting form as a stepper — job details,
 * requirements & attachments, hiring steps, review — saved in one call (esmdd.save_job_vacancy, 089).
 */
export function useJobPostingForm() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const store = useJobPostingStore()
  const { editingPosting, isLoadingPosting, isSaving } = storeToRefs(store)

  const vacancyId = computed(() => (route.params.vacancyId ? String(route.params.vacancyId) : null))
  const isEditMode = computed(() => vacancyId.value !== null)
  const pageTitle = computed(() => (isEditMode.value ? 'Edit Job Posting' : 'Post a Job'))
  const loadError = ref<string | null>(null)

  /** PESO verifies the company before its postings reach applicants */
  const isCompanyVerified = computed(
    () => toReviewStatus(authStore.employerProfile?.verification_status) === 'approved',
  )

  // ─── Form ───
  /** The posting period as saved (editing): those dates may stay even once they're past */
  const savedDates = computed<JobVacancySavedDates>(() =>
    isEditMode.value && editingPosting.value
      ? { postingDate: editingPosting.value.posting_date, validUntil: editingPosting.value.valid_until }
      : {},
  )
  const validationSchema = computed(() => createJobPostingSchema(savedDates.value))

  const { handleSubmit, resetForm, validateField, values } = useForm<JobPostingFormValues>({
    validationSchema,
    initialValues: {
      ...EMPTY_JOB_VACANCY_FORM_VALUES,
      trainingHours: null,
      requirements: toJobPostingRequirementValues(),
      stages: toJobPostingStageValues(),
    },
    // Each step's fields stay registered while another step shows
    keepValuesOnUnmount: true,
  })

  const attachments = useJobPostingAttachments()

  // ─── Steps ───
  const currentStep = ref(0)
  /** Furthest step reached; the stepper only jumps back to steps already checked */
  const reachedStep = ref(0)
  const currentStepMeta = computed(() => JOB_POSTING_FORM_STEPS[currentStep.value]!)
  const isLastStep = computed(() => currentStep.value === JOB_POSTING_FORM_STEPS.length - 1)

  /** True when every field of the step is valid (shows their errors otherwise) */
  async function validateStep(key: JobPostingFormStepKey): Promise<boolean> {
    const results = await Promise.all(STEP_FIELDS[key].map((field) => validateField(field as keyof JobPostingFormValues)))
    return results.every((result) => result.valid) && !(key === 'requirements' && attachments.attachmentError.value)
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  async function nextStep() {
    if (isLastStep.value || !(await validateStep(currentStepMeta.value.key))) return
    currentStep.value += 1
    reachedStep.value = Math.max(reachedStep.value, currentStep.value)
    scrollToTop()
  }

  function previousStep() {
    if (currentStep.value === 0) return
    currentStep.value -= 1
    scrollToTop()
  }

  /** Back to any step reached; forward only through the checks of the steps in between */
  async function goToStep(index: number) {
    if (index > reachedStep.value || index === currentStep.value) return
    if (index > currentStep.value) {
      for (let step = currentStep.value; step < index; step += 1) {
        if (!(await validateStep(JOB_POSTING_FORM_STEPS[step]!.key))) {
          currentStep.value = step
          return
        }
      }
    }
    currentStep.value = index
    scrollToTop()
  }

  // ─── Review ───
  const review = computed(() => {
    const openings = Number(values.vacancyCount) || 1
    const experience = Number(values.workExperienceMonths) || 0
    const requirements = values.requirements ?? []
    return {
      title: values.positionTitle?.trim() || 'Untitled position',
      summary: [values.natureOfWork, values.placeOfWork?.trim(), plural(openings, 'opening')].filter(Boolean).join(' · '),
      details: [
        { label: 'Salary rate / grade', value: values.salary?.trim() || '—' },
        { label: 'Posting period', value: `${formatJobPostingDate(values.postingDate)} – ${formatJobPostingDate(values.validUntil)}` },
        { label: 'Status', value: getJobPostingStatusLabel(values.status) },
        { label: 'Education', value: [values.educationalLevel, values.courseShsStrand].filter(Boolean).join(' · ') || '—' },
        { label: 'Work experience', value: experience ? plural(experience, 'month') : 'Not required' },
        { label: 'Training', value: formatTrainingHours(values.trainingHours) || 'Not required' },
        { label: 'Skills', value: (values.skills ?? []).map((skill) => skill.name).join(', ') || '—' },
      ],
      requirements: requirements.map((item) => ({ name: item.name, note: item.isRequired ? 'Required' : 'Optional' })),
      attachmentCount: attachments.attachmentItems.value.length,
      stages: (values.stages ?? []).map((item) => item.name),
    }
  })

  // ─── Load / save ───
  async function load() {
    loadError.value = null
    currentStep.value = 0
    reachedStep.value = 0
    await authStore.init()

    if (vacancyId.value) {
      if (!(await store.loadPosting(vacancyId.value)) || !editingPosting.value) {
        loadError.value = 'This job posting could not be opened.'
        return
      }
      const posting = editingPosting.value
      attachments.resetAttachments(posting.attachments)
      resetForm({
        values: {
          ...toJobVacancyFormValues(posting, posting),
          trainingHours: posting.training_hours ?? null,
          requirements: toJobPostingRequirementValues(posting.requirements),
          stages: toJobPostingStageValues(posting.stages),
        },
      })
      // Everything was valid when saved: every step can be opened
      reachedStep.value = JOB_POSTING_FORM_STEPS.length - 1
      return
    }

    store.startCreate()
    attachments.resetAttachments([])
    resetForm({
      values: {
        ...EMPTY_JOB_VACANCY_FORM_VALUES,
        postingDate: todayIso(),
        placeOfWork: authStore.employerProfile?.company_address ?? '',
        trainingHours: null,
        requirements: toJobPostingRequirementValues(),
        stages: toJobPostingStageValues(),
      },
    })
  }

  const goBackToList = () => router.push({ name: 'job-postings' })

  const save = handleSubmit(
    async (formValues) => {
      if (!isEditMode.value && !isCompanyVerified.value) return
      const matching = toJobVacancyMatching(formValues)
      const saved = await store.savePosting(
        {
          vacancy: {
            ...toJobVacancyFields(formValues),
            vacancy_count: formValues.vacancyCount,
            status: formValues.status,
            related_courses: matching.related_courses,
            training_hours: formValues.trainingHours ?? null,
          },
          skills: matching.skills,
          requirements: toJobVacancyRequirements(formValues.requirements),
          stages: toJobVacancyStages(formValues.stages),
        },
        attachments.attachmentChanges.value,
      )
      if (saved) await goBackToList()
    },
    // A field on an earlier step is invalid (e.g. edited after reaching Review): open the first such step
    async () => {
      for (const [index, step] of JOB_POSTING_FORM_STEPS.entries()) {
        if (!(await validateStep(step.key))) {
          currentStep.value = index
          scrollToTop()
          return
        }
      }
    },
  )

  /** Before the last step (e.g. Enter in a field) the form moves on instead of saving */
  const onSubmit = () => (isLastStep.value ? save() : nextStep())

  // ─── Date pickers: no past days (the saved ones excepted); the deadline not before the posting date ───
  const postingDateMin = computed(() => scheduledMinIso(savedDates.value.postingDate))
  const validUntilMin = computed(() =>
    laterIsoDay(values.postingDate, scheduledMinIso(savedDates.value.validUntil)) || todayIso(),
  )

  onMounted(load)

  return {
    pageTitle,
    isEditMode,
    isCompanyVerified,
    isLoadingPosting,
    loadError,
    reload: load,
    isSaving,
    postingDateMin,
    validUntilMin,
    // Steps
    steps: JOB_POSTING_FORM_STEPS,
    currentStep,
    reachedStep,
    currentStepMeta,
    isLastStep,
    nextStep,
    previousStep,
    goToStep,
    onSubmit,
    goBackToList,
    // Review
    review,
    // Attachments (optional, staged until save)
    attachmentItems: attachments.attachmentItems,
    attachmentError: attachments.attachmentError,
    attachmentRemainingSlots: attachments.remainingSlots,
    attachmentAccept: attachments.attachmentAccept,
    attachmentMaxSizeMB: attachments.attachmentMaxSizeMB,
    attachmentMaxFiles: attachments.attachmentMaxFiles,
    addAttachments: attachments.addAttachments,
    removeAttachment: attachments.removeAttachment,
  }
}
