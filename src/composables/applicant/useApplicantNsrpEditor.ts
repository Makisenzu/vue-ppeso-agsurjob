import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { focusFirstNsrpError, provideNsrpForm, useNsrpForm } from '@/composables/applicant/useNsrpForm'
import { useApplicantCompletionStore } from '@/stores/applicant/applicantCompletionStore'
import {
  COMPLETION_STEPS,
  createEducationEntry,
  getIncompleteSteps,
  toCompletionValues,
} from '@/helpers/applicant/applicantCompletionHelper'
import type { CompletionPersonalField, CompletionStepKey } from '@/types/applicant/applicantCompletion'

/** On the profile page every personal field is shown and required, unlike the wizard's missing-only fields. */
const ALL_PERSONAL_FIELDS: CompletionPersonalField[] = ['date_of_birth', 'sex', 'civil_status']

/**
 * Applicant profile "NSRP details" — read-only sections of the applicant's own `applicants.applicants`
 * record with per-section inline editing (same sections as the complete-profile wizard).
 */
export function useApplicantNsrpEditor() {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()
  const { user } = storeToRefs(authStore)
  const store = useApplicantCompletionStore()
  const { record, isLoading, isSubmitting } = storeToRefs(store)

  const sections = COMPLETION_STEPS
  /** Section currently in edit mode — one at a time, since all sections share one form. */
  const editingSection = ref<CompletionStepKey | null>(null)

  const form = useNsrpForm(
    computed(() => editingSection.value ?? 'personal'),
    ref(ALL_PERSONAL_FIELDS),
  )
  provideNsrpForm(form)

  /** Saved values in form shape, for the read-only view (blank/'N/A' already normalised). */
  const details = computed(() => toCompletionValues(record.value))
  const incompleteSections = computed(() => getIncompleteSteps(record.value))
  const isComplete = computed(() => incompleteSections.value.length === 0)
  const isIncomplete = (key: CompletionStepKey) => incompleteSections.value.includes(key)

  watch(
    () => user.value?.id,
    (profileId) => {
      if (profileId) void store.fetchMyRecord(profileId)
    },
    { immediate: true },
  )

  function startEdit(key: CompletionStepKey) {
    if (isSubmitting.value) return
    const initial = toCompletionValues(record.value)
    if (initial.educational_background.length === 0) initial.educational_background = [createEducationEntry()]
    form.resetForm({ values: initial })
    editingSection.value = key
  }

  function cancelEdit() {
    editingSection.value = null
  }

  async function saveSection() {
    const profileId = user.value?.id
    if (!profileId || !editingSection.value) return

    const { valid } = await form.validate()
    if (!valid) {
      await nextTick()
      focusFirstNsrpError()
      return
    }

    // Every section has been answered before (the wizard is required), so all steps count as reached
    const saved = await store.saveMyRecord(profileId, form.values.value, sections.length - 1, false)
    if (!saved) return

    const title = sections.find((section) => section.key === editingSection.value)?.title ?? 'NSRP details'
    toastAlert.success('Changes saved', `${title} updated.`)
    editingSection.value = null
  }

  return {
    sections,
    editingSection,
    record,
    details,
    isLoading,
    isSubmitting,
    isComplete,
    isIncomplete,
    startEdit,
    cancelEdit,
    saveSection,
  }
}
