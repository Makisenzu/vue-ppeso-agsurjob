import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useAuthStore } from '@/stores/common/auth'
import { useEmployerCompletionStore } from '@/stores/employer/employerCompletionStore'
import {
  BUSINESS_TYPE_OPTIONS,
  EMPLOYER_COMPLETION_STEPS,
  createInitialEmployerCompletionValues,
  formatEstablishmentAddress,
  getEmployerCompletionStepSchema,
  normalizeEmployerCompletionValues,
} from '@/helpers/employer/employerCompletionHelper'
import type { UnclaimedEstablishmentMatch } from '@/types/common/establishment'
import type { EmployerCompletionStepKey, EmployerCompletionValues } from '@/types/employer/employerCompletion'

/**
 * "Register your establishment" wizard — the company's NSRP Form 2, filled after signup. The
 * router guard keeps a company owner here until their company has a Form 2.
 */
export function useEmployerCompletion() {
  const router = useRouter()
  const authStore = useAuthStore()
  const store = useEmployerCompletionStore()
  const { isSubmitting, isCheckingEstablishment, errorMessage } = storeToRefs(store)

  // ─── Steps ───
  const steps = EMPLOYER_COMPLETION_STEPS
  const currentStep = ref(0)
  const currentStepKey = computed<EmployerCompletionStepKey>(() => steps[currentStep.value].key)
  const currentStepMeta = computed(() => steps[currentStep.value])
  const isLastStep = computed(() => currentStep.value === steps.length - 1)

  // ─── Form ───
  const validationSchema = computed(() => toTypedSchema(getEmployerCompletionStepSchema(currentStepKey.value)))

  const { values: rawValues, validate, setFieldValue } = useForm<EmployerCompletionValues>({
    validationSchema,
    initialValues: createInitialEmployerCompletionValues(authStore.employerProfile, {
      fullName: authStore.displayName,
      email: authStore.userEmail,
      mobile: authStore.profile?.contact_number ?? '',
    }),
    keepValuesOnUnmount: true,
  })

  const values = computed(() => normalizeEmployerCompletionValues(rawValues))
  const establishmentAddress = computed(() => formatEstablishmentAddress(values.value.establishment))
  const establishmentPhones = computed(() => {
    const { mobileNumber, telephoneNumber } = values.value.establishment
    return [mobileNumber, telephoneNumber].filter(Boolean).join(' · ') || '—'
  })
  const employerType = computed(() => {
    const { employerCategory, publicEmployerType, privateEmployerType } = values.value.establishment
    return `${employerCategory} · ${(employerCategory === 'Public' ? publicEmployerType : privateEmployerType) || '—'}`
  })

  // ─── Establishment matches (PESO-encoded Form 2 records) ───
  /** Unlinked Form 2 records PESO encoded for the same TIN / business name */
  const establishmentMatches = ref<UnclaimedEstablishmentMatch[]>([])
  /** TIN + name the matches were looked up for; a change looks them up again */
  let matchedFor = ''

  async function hasNewEstablishmentMatches(): Promise<boolean> {
    const { tin, businessName } = values.value.establishment
    const key = `${tin.replace(/\D/g, '')}|${businessName.trim().toLowerCase()}`
    if (key === matchedFor) return false
    matchedFor = key
    setFieldValue('claim_establishment_id', '')
    establishmentMatches.value = await store.findUnclaimedEstablishments(tin, businessName)
    return establishmentMatches.value.length > 0
  }

  /** The matches as radio options, plus "register a new one" (id '') */
  const establishmentMatchOptions = computed(() => [
    ...establishmentMatches.value.map((match) => ({
      id: match.id,
      title: match.business_name,
      detail: [match.trade_name, match.city_municipality, match.province].filter(Boolean).join(' · '),
    })),
    { id: '', title: 'None of these, register a new establishment', detail: '' },
  ])

  const claimedEstablishment = computed(
    () => establishmentMatches.value.find((match) => match.id === values.value.claim_establishment_id) ?? null
  )

  /** '' registers a new Form 2 instead of linking one */
  function selectEstablishmentMatch(id: unknown) {
    setFieldValue('claim_establishment_id', typeof id === 'string' ? id : '')
  }

  // ─── Navigation ───
  async function nextStep() {
    const { valid } = await validate()
    if (!valid) return

    // Stay on the step once when PESO already has this establishment, so the owner can link it
    if (currentStepKey.value === 'establishment' && (await hasNewEstablishmentMatches())) return

    if (!isLastStep.value) currentStep.value++
  }

  function prevStep() {
    if (currentStep.value > 0) currentStep.value--
  }

  /** Jumps back to an earlier step (stepper and the review screen's Edit buttons). */
  function goToStep(key: EmployerCompletionStepKey) {
    const index = steps.findIndex((meta) => meta.key === key)
    if (index >= 0 && index < currentStep.value) currentStep.value = index
  }

  // Long steps on phones leave the owner at the bottom — bring the next step's header into view
  watch(currentStep, () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  })

  // ─── Submission ───
  async function handleSubmit() {
    try {
      await store.submit(values.value)
      router.push({ name: 'employer-dashboard' })
    } catch {
      // errorMessage is set by the store
    }
  }

  return {
    // Steps
    steps,
    currentStep,
    currentStepKey,
    currentStepMeta,
    isLastStep,
    nextStep,
    prevStep,
    goToStep,
    // Form
    values,
    establishmentAddress,
    establishmentPhones,
    employerType,
    displayName: computed(() => authStore.displayName),
    // Establishment matches
    establishmentMatches,
    establishmentMatchOptions,
    claimedEstablishment,
    selectEstablishmentMatch,
    // Submit
    isSubmitting,
    isCheckingEstablishment,
    errorMessage,
    handleSubmit,
    // Select options
    BUSINESS_TYPE_OPTIONS,
  }
}
