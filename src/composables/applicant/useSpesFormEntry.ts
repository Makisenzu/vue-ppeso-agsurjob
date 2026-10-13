import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useSpesFormStore } from '@/stores/applicant/spesFormStore'
import { useSpesFormSteps } from '@/composables/common/useSpesFormSteps'
import {
  buildSpesFormPayload,
  calculateSpesAge,
  createEmptySpesFormValues,
  toSpesFormValues,
  type SpesFormDraft,
} from '@/helpers/common/spesFormHelper'
import { SPES_CIVIL_STATUS_OPTIONS, SPES_SEX_OPTIONS } from '@/types/common/spesForm'

export function useSpesFormEntry() {
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const store = useSpesFormStore()
  const { myForm, attachments, applicationRecord, isLoading, isSubmitting, errorMessage, isLocked } = storeToRefs(store)
  const { fetchMyForm, saveForm } = store

  // Applicants must back every checked requirement with an image / PDF
  const form = useSpesFormSteps({ requireAttachments: true })

  const isEditMode = computed(() => myForm.value !== null)
  const profileId = computed(() => user.value?.id ?? null)

  /** First-time applicants start from what they already gave in their jobseeker profile. */
  const buildPrefill = (): SpesFormDraft => {
    const base = createEmptySpesFormValues()
    const applicant = applicantProfile.value
    if (!applicant) return { ...base, email_address: user.value?.email ?? '' }

    const sex = applicant.sex
      ? SPES_SEX_OPTIONS.find((option) => option.toLowerCase() === applicant.sex!.toLowerCase())
      : undefined
    const civilStatus = applicant.civil_status
      ? SPES_CIVIL_STATUS_OPTIONS.find((option) => option.toLowerCase() === applicant.civil_status!.toLowerCase())
      : undefined

    return {
      ...base,
      surname: applicant.surname ?? '',
      first_name: applicant.first_name ?? '',
      middle_name: applicant.middle_name ?? '',
      date_of_birth: applicant.date_of_birth ?? '',
      age: calculateSpesAge(applicant.date_of_birth),
      sex,
      civil_status: civilStatus,
      contact_number: applicant.contact_numbers?.[0] ?? '',
      email_address: applicant.email ?? user.value?.email ?? '',
    }
  }

  const loadForm = async () => {
    if (!profileId.value) return
    await fetchMyForm(profileId.value)
    form.loadValues(myForm.value ? toSpesFormValues(myForm.value) : buildPrefill())
    form.loadAttachments(attachments.value)
  }

  onMounted(() => {
    void loadForm()
  })

  const submitForm = form.createSubmitHandler(async (formValues) => {
    if (!profileId.value) return
    const saved = await saveForm(profileId.value, buildSpesFormPayload(formValues), form.pendingAttachments.value)
    if (saved && myForm.value) {
      form.loadValues(toSpesFormValues(myForm.value))
      form.loadAttachments(attachments.value)
    }
  })

  return {
    form,
    applicationRecord,
    isLoading,
    isSubmitting,
    errorMessage,
    isLocked,
    isEditMode,
    reloadForm: loadForm,
    submitForm,
  }
}
