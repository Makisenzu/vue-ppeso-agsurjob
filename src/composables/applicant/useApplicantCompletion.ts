import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useFieldArray, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useApplicantCompletionStore } from '@/stores/applicant/applicantCompletionStore'
import { calculateAge, todayIsoDate } from '@/helpers/common/signupHelper'
import {
  APPOINTMENT_STATUS_OPTIONS,
  COMPLETION_CIVIL_STATUS_OPTIONS,
  COMPLETION_SEX_OPTIONS,
  COMPLETION_STEPS,
  DISABILITY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_TYPE_OPTIONS,
  LANGUAGE_ABILITIES,
  SKILL_OPTIONS,
  UNEMPLOYED_REASON_OPTIONS,
  createEducationEntry,
  createEligibilityEntry,
  createLanguageEntry,
  createTrainingEntry,
  createWorkEntry,
  getCompletionStepSchema,
  getIncompleteSteps,
  getMissingPersonalFields,
  getResumeStepIndex,
  toCompletionValues,
  toggleListValue,
} from '@/helpers/applicant/applicantCompletionHelper'
import type {
  ApplicantCompletionValues,
  CompletionPersonalField,
  CompletionStepKey,
  EducationEntryForm,
  EligibilityEntryForm,
  LanguageEntryForm,
  TrainingEntryForm,
  WorkEntryForm,
} from '@/types/applicant/applicantCompletion'

/**
 * "Complete your NSRP profile" wizard — every applicant-fillable column of `applicants.applicants`
 * not collected at signup. Each step is validated and saved, and the router guard keeps the
 * applicant here until every step is answered.
 */
export function useApplicantCompletion() {
  const router = useRouter()
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()
  const { user, profile } = storeToRefs(authStore)
  const store = useApplicantCompletionStore()
  const { record, isLoading, isSubmitting, errorMessage } = storeToRefs(store)

  // ─── Steps ───
  const steps = COMPLETION_STEPS
  const currentStep = ref(0)
  /** Furthest step validated and saved in this session (or already complete on the record). */
  const reachedStep = ref(-1)
  const currentStepKey = computed<CompletionStepKey>(() => steps[currentStep.value].key)
  const currentStepMeta = computed(() => steps[currentStep.value])
  const isLastStep = computed(() => currentStep.value === steps.length - 1)

  /** Personal fields the record is missing — decided once per load so fields don't vanish while typing. */
  const missingPersonal = ref<CompletionPersonalField[]>([])

  // ─── Form ───
  const validationSchema = computed(() =>
    toTypedSchema(getCompletionStepSchema(currentStepKey.value, missingPersonal.value)),
  )

  const { values: rawValues, errors, validate, resetForm, setFieldValue } = useForm<ApplicantCompletionValues>({
    validationSchema,
    initialValues: toCompletionValues(null),
    keepValuesOnUnmount: true,
  })

  /** Values with every key filled — vee-validate can report untouched / hidden fields as undefined. */
  const values = computed<ApplicantCompletionValues>(() => {
    const filled = toCompletionValues(null)
    for (const [key, value] of Object.entries(rawValues)) {
      if (value !== undefined && value !== null) Object.assign(filled, { [key]: value })
    }
    return filled
  })

  const { fields: educationFields, push: pushEducation, remove: removeEducation } =
    useFieldArray<EducationEntryForm>('educational_background')
  const { fields: trainingFields, push: pushTraining, remove: removeTraining } =
    useFieldArray<TrainingEntryForm>('vocational_trainings')
  const { fields: eligibilityFields, push: pushEligibility, remove: removeEligibility } =
    useFieldArray<EligibilityEntryForm>('eligibilities')
  const { fields: workFields, push: pushWork, remove: removeWork } = useFieldArray<WorkEntryForm>('work_experiences')
  const { fields: languageFields, push: pushLanguage, remove: removeLanguage } =
    useFieldArray<LanguageEntryForm>('language_proficiencies')

  const isEmployed = computed(() => values.value.employment_status === 'Employed')
  const isUnemployed = computed(() => values.value.employment_status === 'Unemployed')
  const isSelfEmployed = computed(() => isEmployed.value && values.value.employment_type === 'Self-employed')
  const age = computed(() => calculateAge(values.value.date_of_birth))
  const needsPersonal = (field: CompletionPersonalField) => missingPersonal.value.includes(field)

  /** List-level error (e.g. "Add at least one school"), shown above the entries. */
  const listError = (name: keyof ApplicantCompletionValues) => (errors.value as Record<string, string | undefined>)[name]

  // ─── Load ───
  function loadIntoForm() {
    const p = profile.value
    const initial = toCompletionValues(record.value, {
      date_of_birth: p?.birthdate?.slice(0, 10) ?? null,
      sex: p?.gender === 'man' ? 'Male' : p?.gender === 'woman' ? 'Female' : null,
    })
    // Start with one blank school so the section isn't empty
    if (initial.educational_background.length === 0) initial.educational_background = [createEducationEntry()]

    missingPersonal.value = getMissingPersonalFields(initial)
    resetForm({ values: initial })

    // Resume at the first unanswered step
    currentStep.value = getResumeStepIndex(record.value)
    reachedStep.value = currentStep.value - 1
  }

  async function reload() {
    const profileId = user.value?.id
    if (!profileId) return
    await store.fetchMyRecord(profileId)
    loadIntoForm()
  }

  // The auth store may still be hydrating when the page opens
  watch(() => user.value?.id, () => void reload(), { immediate: true })

  // ─── Navigation ───
  function scrollToTop() {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  /** On phones the first error is often off-screen — bring it into view. */
  async function focusFirstError() {
    await nextTick()
    const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-list-error]')
    invalid?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    if (invalid instanceof HTMLInputElement || invalid instanceof HTMLSelectElement) invalid.focus({ preventScroll: true })
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--
      scrollToTop()
    }
  }

  /** Stepper navigation: completed steps and the next one are reachable. */
  function goToStep(index: number) {
    if (index <= reachedStep.value + 1 && index !== currentStep.value) {
      currentStep.value = index
      scrollToTop()
    }
  }

  async function saveAndContinue() {
    const profileId = user.value?.id
    if (!profileId) return

    const { valid } = await validate()
    if (!valid) {
      await focusFirstError()
      return
    }

    reachedStep.value = Math.max(reachedStep.value, currentStep.value)
    const saved = await store.saveMyRecord(profileId, values.value, reachedStep.value, isLastStep.value)
    if (!saved) return

    if (!isLastStep.value) {
      currentStep.value++
      scrollToTop()
      return
    }

    // Safety net: send them back to anything still unanswered instead of bouncing off the guard
    const remaining = getIncompleteSteps(record.value)
    if (remaining.length > 0) {
      currentStep.value = steps.findIndex((step) => step.key === remaining[0])
      toastAlert.error('Almost there', 'Some sections still need answers.')
      scrollToTop()
      return
    }
    router.push({ name: 'dashboard' })
  }

  // ─── Checkbox lists ───
  const toggleIn = (name: 'disabilities' | 'job_type_preference' | 'other_skills') =>
    (item: string, checked: boolean | 'indeterminate') =>
      setFieldValue(name, toggleListValue(values.value[name], item, checked))

  function addLanguage() {
    pushLanguage(createLanguageEntry())
  }

  return {
    // Steps
    steps,
    currentStep,
    reachedStep,
    currentStepKey,
    currentStepMeta,
    isLastStep,
    prevStep,
    goToStep,
    saveAndContinue,
    // State
    record,
    isLoading,
    isSubmitting,
    errorMessage,
    values,
    age,
    isEmployed,
    isUnemployed,
    isSelfEmployed,
    needsPersonal,
    listError,
    maxDate: todayIsoDate(),
    displayName: computed(() => authStore.displayName),
    // Field arrays
    educationFields,
    addEducation: () => pushEducation(createEducationEntry()),
    removeEducation,
    trainingFields,
    addTraining: () => pushTraining(createTrainingEntry()),
    removeTraining,
    eligibilityFields,
    addEligibility: () => pushEligibility(createEligibilityEntry()),
    removeEligibility,
    workFields,
    addWork: () => pushWork(createWorkEntry()),
    removeWork,
    languageFields,
    addLanguage,
    removeLanguage,
    // Checkbox lists
    toggleDisability: toggleIn('disabilities'),
    toggleJobType: toggleIn('job_type_preference'),
    toggleSkill: toggleIn('other_skills'),
    // Options
    sexOptions: COMPLETION_SEX_OPTIONS,
    civilStatusOptions: COMPLETION_CIVIL_STATUS_OPTIONS,
    employmentStatusOptions: EMPLOYMENT_STATUS_OPTIONS,
    employmentTypeOptions: EMPLOYMENT_TYPE_OPTIONS,
    unemployedReasonOptions: UNEMPLOYED_REASON_OPTIONS,
    educationLevelOptions: EDUCATION_LEVEL_OPTIONS,
    appointmentStatusOptions: APPOINTMENT_STATUS_OPTIONS,
    disabilityOptions: DISABILITY_OPTIONS,
    jobTypeOptions: JOB_TYPE_OPTIONS,
    skillOptions: SKILL_OPTIONS,
    languageAbilities: LANGUAGE_ABILITIES,
  }
}
