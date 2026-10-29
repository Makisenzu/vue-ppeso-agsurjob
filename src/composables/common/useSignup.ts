import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useSignupStore } from '@/stores/common/signupStore'
import { usePsgc } from '@/composables/common/usePsgc'
import { getPasswordStrength } from '@/helpers/common/password'
import type { SignupFormValues, SignupRole, SignupStepKey } from '@/types/common/signup'
import {
  SIGNUP_ROLES,
  SEX_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  SUFFIX_OPTIONS,
  MIN_PASSWORD_LENGTH,
  calculateAge,
  createInitialSignupValues,
  formatSignupAddress,
  formatSignupFullName,
  normalizeSignupValues,
  getSignupStepSchema,
  getSignupSteps,
  todayIsoDate,
} from '@/helpers/common/signupHelper'
import { getPrivacyConsentStatement, getRequiredPrivacyPurposes } from '@/helpers/common/privacyHelper'
import type { PrivacyPurpose } from '@/types/common/privacy'

interface PsgcOption {
  code: string
  name: string
}

export function useSignup() {
  const router = useRouter()
  const signupStore = useSignupStore()
  const { isSubmitting, isCheckingEmail, submitError } = storeToRefs(signupStore)

  // ─── Role & steps ───
  const selectedRole = ref<SignupRole | null>(null)
  const currentStep = ref(0)

  const steps = computed(() => getSignupSteps(selectedRole.value))
  const currentStepMeta = computed(() => steps.value[currentStep.value] ?? steps.value[0])
  const currentStepKey = computed<SignupStepKey>(() => currentStepMeta.value.key)
  /** Steps shown in the progress indicator (everything after role selection). */
  const progressSteps = computed(() => steps.value.slice(1).map((meta, index) => ({ ...meta, step: index + 1 })))
  const isLastStep = computed(() => currentStep.value === steps.value.length - 1)
  /** Company owners give only their own details; the NSRP applicant fields are for applicants */
  const isApplicant = computed(() => selectedRole.value === 'applicant')
  /** Step holding the name and birth fields, and the one holding the email (review Edit buttons) */
  const personalStepKey = computed<SignupStepKey>(() => (isApplicant.value ? 'personal' : 'representative'))
  const contactStepKey = computed<SignupStepKey>(() => (isApplicant.value ? 'address' : 'representative'))

  // ─── Form (values stay here — never in Pinia) ───
  const validationSchema = computed(() => toTypedSchema(getSignupStepSchema(currentStepKey.value)))

  const { values: rawValues, validate, setFieldValue, setFieldError } = useForm<SignupFormValues>({
    validationSchema,
    initialValues: createInitialSignupValues(),
    keepValuesOnUnmount: true,
  })

  /** Form values with every field guaranteed to be a string (see normalizeSignupValues). */
  const values = computed(() => normalizeSignupValues(rawValues))
  const age = computed(() => calculateAge(values.value.date_of_birth))
  const fullName = computed(() => formatSignupFullName(values.value))
  const fullAddress = computed(() => formatSignupAddress(values.value))
  const passwordStrength = computed(() => getPasswordStrength(values.value.password))

  // One line per review row, so the review screen fits without scrolling
  const personalSummary = computed(() => {
    const v = values.value
    const applicantDetails = isApplicant.value
      ? [v.civil_status, v.religion, v.height_ft ? `${v.height_ft} ft` : '', v.tin && `TIN ${v.tin}`]
      : []
    return [v.date_of_birth, age.value !== null ? `${age.value} yrs` : '', v.sex, ...applicantDetails]
      .filter(Boolean)
      .join(' · ')
  })
  const contactSummary = computed(() => [values.value.contact_number, values.value.email].filter(Boolean).join(' · '))

  // ─── PSGC cascading address ───
  const {
    regions: psgcRegions,
    provinces: psgcProvinces,
    cities: psgcCities,
    barangays: psgcBarangays,
    regionOptions,
    provinceOptions,
    cityOptions,
    barangayOptions,
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    initialize: initPsgc,
  } = usePsgc()

  onMounted(() => {
    initPsgc()
  })

  // Keep the form fields in step with the PSGC selections (usePsgc clears children on parent change)
  watch(selectedRegion, (val) => setFieldValue('region', val?.name ?? ''))
  watch(selectedProvince, (val) => setFieldValue('province', val?.name ?? ''))
  watch(selectedCity, (val) => setFieldValue('municipality', val?.name ?? ''))
  watch(selectedBarangay, (val) => setFieldValue('barangay', val?.name ?? ''))

  const findByCode = (list: PsgcOption[], code: unknown) => list.find((item) => item.code === String(code))

  function onRegionChange(code: unknown) {
    const region = findByCode(psgcRegions.value, code)
    if (region) selectedRegion.value = region
  }

  function onProvinceChange(code: unknown) {
    const province = findByCode(psgcProvinces.value, code)
    if (province) selectedProvince.value = province
  }

  function onCityChange(code: unknown) {
    const city = findByCode(psgcCities.value, code)
    if (city) selectedCity.value = city
  }

  function onBarangayChange(code: unknown) {
    const barangay = findByCode(psgcBarangays.value, code)
    if (barangay) selectedBarangay.value = barangay
  }

  // ─── Navigation ───
  const isSelected = (id: SignupRole) => selectedRole.value === id

  function selectRole(role: SignupRole) {
    selectedRole.value = role
  }

  async function nextStep() {
    if (currentStepKey.value === 'role') {
      if (selectedRole.value) currentStep.value++
      return
    }

    const { valid } = await validate()
    if (!valid) return

    if (currentStepKey.value === contactStepKey.value && (await signupStore.isEmailTaken(values.value.email))) {
      setFieldError('email', 'An account with this email already exists. Sign in instead.')
      return
    }

    if (!isLastStep.value) currentStep.value++
  }

  // Long steps on phones leave the user at the bottom — bring the next step's header into view
  watch(currentStep, () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  })

  function prevStep() {
    if (currentStep.value > 0) currentStep.value--
  }

  /** Jumps back to an earlier step (used by the review screen's Edit buttons). */
  function goToStep(key: SignupStepKey) {
    const index = steps.value.findIndex((meta) => meta.key === key)
    if (index >= 0 && index < currentStep.value) currentStep.value = index
  }

  function handleBack() {
    router.push('/login')
  }

  // ─── Privacy consent (RA 10173): one box per purpose, none ticked in advance ───
  const consentPurposes = computed(() =>
    getRequiredPrivacyPurposes(selectedRole.value).map((purpose) => ({
      purpose,
      statement: getPrivacyConsentStatement(purpose),
    }))
  )
  const consentTicked = reactive<Partial<Record<PrivacyPurpose, boolean>>>({})
  const hasGivenConsent = computed(() => consentPurposes.value.every(({ purpose }) => consentTicked[purpose]))

  function setConsentTicked(purpose: PrivacyPurpose, value: boolean | 'indeterminate') {
    consentTicked[purpose] = value === true
  }

  // ─── Submission ───
  async function handleSubmit() {
    if (!selectedRole.value || !hasGivenConsent.value) return
    try {
      await signupStore.submitSignup(
        selectedRole.value,
        values.value,
        consentPurposes.value.map(({ purpose }) => purpose)
      )
      // Navigating away unmounts the card, which discards the form (and the password) with it
      router.push('/login')
    } catch {
      // submitError is set by the store
    }
  }

  return {
    // Role
    roles: SIGNUP_ROLES,
    selectedRole,
    isSelected,
    selectRole,
    // Steps
    currentStep,
    currentStepKey,
    currentStepMeta,
    progressSteps,
    isApplicant,
    personalStepKey,
    contactStepKey,
    isLastStep,
    nextStep,
    prevStep,
    goToStep,
    handleBack,
    // Form
    values,
    age,
    fullName,
    fullAddress,
    passwordStrength,
    personalSummary,
    contactSummary,
    maxBirthDate: todayIsoDate(),
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // Submit
    isSubmitting,
    isCheckingEmail,
    submitError,
    handleSubmit,
    // Privacy consent
    consentPurposes,
    consentTicked,
    hasGivenConsent,
    setConsentTicked,
    // PSGC
    psgcRegions,
    psgcProvinces,
    psgcCities,
    psgcBarangays,
    regionOptions,
    provinceOptions,
    cityOptions,
    barangayOptions,
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    onRegionChange,
    onProvinceChange,
    onCityChange,
    onBarangayChange,
    // Select options
    SEX_OPTIONS,
    CIVIL_STATUS_OPTIONS,
    SUFFIX_OPTIONS,
  }
}
