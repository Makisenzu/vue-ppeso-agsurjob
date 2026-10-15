import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { focusFirstNsrpError, provideNsrpForm, useNsrpForm } from '@/composables/applicant/useNsrpForm'
import { useApplicantCompletionStore } from '@/stores/applicant/applicantCompletionStore'
import {
  COMPLETION_STEPS,
  createEducationEntry,
  getIncompleteSteps,
  getMissingPersonalFields,
  getResumeStepIndex,
  toCompletionValues,
} from '@/helpers/applicant/applicantCompletionHelper'
import type { CompletionPersonalField, CompletionStepKey } from '@/types/applicant/applicantCompletion'

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

  // ─── Form (shared with the profile page editor; field sections inject it) ───
  const form = useNsrpForm(currentStepKey, missingPersonal)
  provideNsrpForm(form)
  const { values, validate, resetForm } = form

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
      await nextTick()
      focusFirstNsrpError()
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
    displayName: computed(() => authStore.displayName),
  }
}
