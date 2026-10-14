import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useSpesFormStore } from '@/stores/applicant/spesFormStore'
import { useSpesFormSteps } from '@/composables/common/useSpesFormSteps'
import {
  buildSpesFormPayload,
  calculateSpesAge,
  createEmptySpesFormValues,
  matchSpesMunicipality,
  toSpesFormValues,
  type SpesFormDraft,
} from '@/helpers/common/spesFormHelper'
import { SPES_CIVIL_STATUS_OPTIONS, SPES_SEX_OPTIONS, type SpesCompletionReportType } from '@/types/common/spesForm'

export function useSpesFormEntry() {
  const authStore = useAuthStore()
  const { user, applicantProfile } = storeToRefs(authStore)
  const store = useSpesFormStore()
  const {
    myForm,
    attachments,
    applicationRecord,
    isLoading,
    isSubmitting,
    errorMessage,
    isLocked,
    currentAppointment,
    completionReports,
    busyReportType,
  } = storeToRefs(store)
  const { fetchMyForm, saveForm, uploadCompletionReport, removeCompletionReport } = store

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

    // Read through `unknown`: the unwrapped Json type of `address` is too deep for TS to compare
    const rawAddress = (applicant as { address?: unknown }).address
    const address = (rawAddress && typeof rawAddress === 'object' ? rawAddress : {}) as Record<string, unknown>
    const municipality = matchSpesMunicipality(
      String(address.city_municipality ?? address.municipality ?? address.city ?? '')
    )

    return {
      ...base,
      municipality: municipality ?? undefined,
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

  // ─── Appointment & completion reports (DTR / Accomplishment Report) ───
  /** Reports can be sent while the appointment runs; afterwards they are read-only. */
  const canSubmitReports = computed(() => currentAppointment.value?.status === 'Active')

  const onReportPicked = (type: SpesCompletionReportType, file: File) => {
    if (profileId.value) void uploadCompletionReport(profileId.value, type, file)
  }
  const onReportRemoved = (type: SpesCompletionReportType) => {
    void removeCompletionReport(type)
  }

  return {
    form,
    applicationRecord,
    currentAppointment,
    completionReports,
    busyReportType,
    canSubmitReports,
    onReportPicked,
    onReportRemoved,
    isLoading,
    isSubmitting,
    errorMessage,
    isLocked,
    isEditMode,
    reloadForm: loadForm,
    submitForm,
  }
}
