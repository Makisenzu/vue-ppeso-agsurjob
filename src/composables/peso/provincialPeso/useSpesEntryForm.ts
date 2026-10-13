import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import { useSpesFormSteps } from '@/composables/common/useSpesFormSteps'
import {
  buildSpesFormPayload,
  createEmptySpesFormValues,
  toSpesFormValues,
} from '@/helpers/common/spesFormHelper'
import { SPES_CIVIL_STATUS_OPTIONS, SPES_SEX_OPTIONS } from '@/types/common/spesForm'
import type { SpesFormRow, SpesLinkableJobseeker } from '@/types/peso/provincialPeso/spes'

const formatJobseekerName = (jobseeker: SpesLinkableJobseeker) =>
  [jobseeker.surname, [jobseeker.first_name, jobseeker.middle_name].filter(Boolean).join(' ')].filter(Boolean).join(', ')

export function useSpesEntryForm() {
  const route = useRoute()
  const router = useRouter()
  const store = useSpesStore()
  const { jobseekers, isLoadingJobseekers, isLoadingForms, isSubmitting, formAttachments } = storeToRefs(store)
  const { fetchJobseekers, fetchSpesFormById, fetchFormAttachments, createSpesForm, updateSpesForm } = store

  // Attachments are optional for PESO staff encoding a form
  const form = useSpesFormSteps()

  const formId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
  const isEditMode = computed(() => formId.value !== null)
  const editingForm = ref<SpesFormRow | null>(null)
  const loadError = ref<string | null>(null)

  /** PESO review status of the applicant being edited. */
  const applicantStatus = computed(() => (editingForm.value ? editingForm.value.status || 'Pending' : null))

  // ─── Linked jobseeker account ───
  const selectedJobseeker = ref<SpesLinkableJobseeker | null>(null)
  const jobseekerSearch = ref('')
  const jobseekerError = ref<string | null>(null)

  const filteredJobseekers = computed(() => {
    const query = jobseekerSearch.value.trim().toLowerCase()
    const matches = query
      ? jobseekers.value.filter((j) =>
          [formatJobseekerName(j), j.email ?? '', ...(j.contact_numbers ?? [])].some((v) => v.toLowerCase().includes(query))
        )
      : jobseekers.value
    // Keep the dropdown light; staff narrow it down by typing
    return matches.slice(0, 50)
  })

  /** Fills personal fields that are still blank from the selected jobseeker's record. */
  const selectJobseeker = (jobseeker: SpesLinkableJobseeker | null) => {
    selectedJobseeker.value = jobseeker
    jobseekerError.value = null
    if (!jobseeker) return

    const { values, setFieldValue } = form
    const fillIfBlank = (
      field: 'surname' | 'first_name' | 'middle_name' | 'date_of_birth' | 'contact_number' | 'email_address',
      value: string | null | undefined
    ) => {
      if (!values[field] && value) setFieldValue(field, value)
    }
    fillIfBlank('surname', jobseeker.surname)
    fillIfBlank('first_name', jobseeker.first_name)
    fillIfBlank('middle_name', jobseeker.middle_name)
    fillIfBlank('date_of_birth', jobseeker.date_of_birth)
    fillIfBlank('contact_number', jobseeker.contact_numbers?.[0])
    fillIfBlank('email_address', jobseeker.email)

    const sex = SPES_SEX_OPTIONS.find((o) => o.toLowerCase() === (jobseeker.sex ?? '').toLowerCase())
    if (!values.sex && sex) setFieldValue('sex', sex)
    const civilStatus = SPES_CIVIL_STATUS_OPTIONS.find(
      (o) => o.toLowerCase() === (jobseeker.civil_status ?? '').toLowerCase()
    )
    if (!values.civil_status && civilStatus) setFieldValue('civil_status', civilStatus)
  }

  // ─── Load ───
  const loadEntry = async () => {
    loadError.value = null
    const jobseekersLoaded = fetchJobseekers()

    if (!formId.value) {
      form.loadValues(createEmptySpesFormValues())
      form.loadAttachments({})
      await jobseekersLoaded
      return
    }

    const [row] = await Promise.all([
      fetchSpesFormById(formId.value),
      jobseekersLoaded,
      fetchFormAttachments(formId.value),
    ])
    if (!row) {
      loadError.value = 'This SPES form could not be loaded. It may have been deleted.'
      return
    }
    editingForm.value = row
    form.loadValues(toSpesFormValues(row))
    form.loadAttachments(formAttachments.value)
    selectedJobseeker.value = jobseekers.value.find((j) => j.profile_id === row.profile_id) ?? null
  }

  onMounted(() => {
    void loadEntry()
  })

  // ─── Submit ───
  const backToList = () => router.push({ name: 'provincial-peso-spes-applicants' })

  const submitEntry = form.createSubmitHandler(async (formValues) => {
    const payload = buildSpesFormPayload(formValues)

    if (editingForm.value) {
      const profileId = selectedJobseeker.value?.profile_id ?? editingForm.value.profile_id
      const saved = await updateSpesForm(
        editingForm.value.id,
        { ...payload, profile_id: profileId },
        form.pendingAttachments.value
      )
      if (saved) await backToList()
      return
    }

    if (!selectedJobseeker.value) {
      jobseekerError.value = 'Select the jobseeker account this SPES form belongs to.'
      form.currentStep.value = 1
      return
    }
    const created = await createSpesForm(
      { ...payload, profile_id: selectedJobseeker.value.profile_id },
      form.pendingAttachments.value
    )
    if (created) await backToList()
  })

  return {
    form,
    isEditMode,
    isLoading: computed(() => isLoadingForms.value),
    isSubmitting,
    loadError,
    applicantStatus,
    // jobseeker link
    selectedJobseeker,
    jobseekerSearch,
    jobseekerError,
    filteredJobseekers,
    isLoadingJobseekers,
    formatJobseekerName,
    selectJobseeker,
    // actions
    backToList,
    submitEntry,
  }
}
