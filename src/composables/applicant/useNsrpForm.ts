import { computed, inject, provide, type InjectionKey, type Ref } from 'vue'
import { useFieldArray, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { calculateAge, todayIsoDate } from '@/helpers/common/signupHelper'
import {
  APPOINTMENT_STATUS_OPTIONS,
  COMPLETION_CIVIL_STATUS_OPTIONS,
  COMPLETION_SEX_OPTIONS,
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
 * Shared NSRP form wiring for `applicants.applicants` — used by the complete-profile wizard and the
 * profile page editor. The schema follows `stepKey`, so only the section being edited is validated.
 * Call it in the page component's setup; the field sections read it back with `useNsrpFormContext()`.
 */
export function useNsrpForm(stepKey: Ref<CompletionStepKey>, requiredPersonal: Ref<CompletionPersonalField[]>) {
  const validationSchema = computed(() => toTypedSchema(getCompletionStepSchema(stepKey.value, requiredPersonal.value)))

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
  const needsPersonal = (field: CompletionPersonalField) => requiredPersonal.value.includes(field)

  /** List-level error (e.g. "Add at least one school"), shown above the entries. */
  const listError = (name: keyof ApplicantCompletionValues) => (errors.value as Record<string, string | undefined>)[name]

  // ─── Checkbox lists ───
  const toggleIn = (name: 'disabilities' | 'job_type_preference' | 'other_skills') =>
    (item: string, checked: boolean | 'indeterminate') =>
      setFieldValue(name, toggleListValue(values.value[name], item, checked))

  return {
    // Form controls
    validate,
    resetForm,
    // State
    values,
    age,
    isEmployed,
    isUnemployed,
    isSelfEmployed,
    needsPersonal,
    listError,
    maxDate: todayIsoDate(),
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
    /** Adds a language row by name (PESO entry style); returns false for a blank or duplicate name. */
    addLanguage: (name: string) => {
      const language = name.trim()
      const exists = values.value.language_proficiencies.some(
        (entry) => entry.language.trim().toLowerCase() === language.toLowerCase(),
      )
      if (!language || exists) return false
      pushLanguage(createLanguageEntry(language))
      return true
    },
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

export type NsrpForm = ReturnType<typeof useNsrpForm>

const NSRP_FORM_KEY: InjectionKey<NsrpForm> = Symbol('nsrpForm')

/** Makes the form available to the NSRP field sections rendered below this component. */
export function provideNsrpForm(form: NsrpForm) {
  provide(NSRP_FORM_KEY, form)
}

/** Reads the form provided by the wizard or the profile editor. */
export function useNsrpFormContext(): NsrpForm {
  const form = inject(NSRP_FORM_KEY)
  if (!form) throw new Error('NSRP field sections must be rendered inside a component that calls provideNsrpForm().')
  return form
}

/** Scrolls the first invalid field into view — on phones it is often off-screen. */
export function focusFirstNsrpError() {
  const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-list-error]')
  invalid?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  if (invalid instanceof HTMLInputElement || invalid instanceof HTMLSelectElement) invalid.focus({ preventScroll: true })
}
