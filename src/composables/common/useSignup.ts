import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSignupStore } from '@/stores/common/signupStore'
import { usePsgc } from '@/composables/common/usePsgc'
import type { SignupRole } from '@/types/common/signup'
import {
  SIGNUP_ROLES,
  STEP_META,
  TOTAL_STEPS,
  PROGRESS_STEPS,
  validateStep,
  GENDER_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
} from '@/helpers/common/signupHelper'

export function useSignup() {
  const router = useRouter()
  const signupStore = useSignupStore()

  const {
    selectedRole,
    profileForm,
    applicantForm,
    companyForm,
    confirmPassword,
    currentStep,
    isSubmitting,
    submitError,
  } = storeToRefs(signupStore)

  // ─── PSGC cascading address ───
  const {
    regions: psgcRegions,
    provinces: psgcProvinces,
    cities: psgcCities,
    barangays: psgcBarangays,
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    initialize: initPsgc,
  } = usePsgc()

  onMounted(() => {
    initPsgc()
  })

  // Sync PSGC selections to profileForm names
  watch(selectedRegion, (val) => {
    profileForm.value.region = val?.name ?? ''
  })
  watch(selectedProvince, (val) => {
    profileForm.value.province = val?.name ?? ''
  })
  watch(selectedCity, (val) => {
    profileForm.value.geographic = val?.name ?? ''
  })
  watch(selectedBarangay, (val) => {
    profileForm.value.barangay = val?.name ?? ''
  })

  // ─── PSGC change handlers ───
  function onRegionChange(code: any) {
    const region = psgcRegions.value.find((r: any) => r.code === String(code))
    if (region) selectedRegion.value = region
  }

  function onProvinceChange(code: any) {
    const province = psgcProvinces.value.find((p: any) => p.code === String(code))
    if (province) selectedProvince.value = province
  }

  function onCityChange(code: any) {
    const city = psgcCities.value.find((c: any) => c.code === String(code))
    if (city) selectedCity.value = city
  }

  function onBarangayChange(code: any) {
    const barangay = psgcBarangays.value.find((b: any) => b.code === String(code))
    if (barangay) selectedBarangay.value = barangay
  }

  // ─── Step metadata ───
  const stepTitle = computed(() => STEP_META[currentStep.value]?.title ?? '')
  const stepDescription = computed(() => STEP_META[currentStep.value]?.description ?? '')

  // ─── Selection helpers ───
  const isSelected = (id: SignupRole) => selectedRole.value === id

  // ─── Validation ───
  const canProceed = computed(() =>
    validateStep(
      currentStep.value,
      profileForm.value,
      applicantForm.value,
      companyForm.value,
      confirmPassword.value,
      selectedRole.value,
    ),
  )

  // ─── Navigation ───
  function nextStep() {
    if (currentStep.value < TOTAL_STEPS - 1) {
      currentStep.value++
    }
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  function handleBack() {
    router.push('/login')
  }

  // ─── Submission ───
  async function handleSubmit() {
    try {
      await signupStore.submitSignup()
      router.push('/login')
    } catch {
      // Error is already set in the store's submitError
    }
  }

  return {
    // Role
    roles: SIGNUP_ROLES,
    selectedRole,
    isSelected,
    // Steps
    currentStep,
    stepTitle,
    stepDescription,
    progressSteps: PROGRESS_STEPS,
    canProceed,
    nextStep,
    prevStep,
    // Form data (reactive refs from store)
    profileForm,
    applicantForm,
    companyForm,
    confirmPassword,
    // Submit
    isSubmitting,
    submitError,
    handleSubmit,
    // Navigation
    handleBack,
    // PSGC
    psgcRegions,
    psgcProvinces,
    psgcCities,
    psgcBarangays,
    selectedRegion,
    selectedProvince,
    selectedCity,
    selectedBarangay,
    onRegionChange,
    onProvinceChange,
    onCityChange,
    onBarangayChange,
    // Select options
    GENDER_OPTIONS,
    EMPLOYMENT_STATUS_OPTIONS,
    EMPLOYMENT_TYPE_OPTIONS,
    EDUCATION_LEVEL_OPTIONS,
    CIVIL_STATUS_OPTIONS,
    BUSINESS_TYPE_OPTIONS,
  }
}
