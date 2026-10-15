import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { watchDebounced } from '@vueuse/core'
import * as z from 'zod'
import { useJobFairAttendeeStore } from '@/stores/peso/provincialPeso/jobFairAttendeeStore'
import {
  JOB_FAIR_APPLICANT_STATUSES,
  type JobFairApplicantStatus,
  type JobFairRegistryApplicant,
} from '@/types/peso/provincialPeso/jobFair'

const REGISTRY_SEARCH_MIN_LENGTH = 2

const attendeeSchema = toTypedSchema(
  z.object({
    applicantId: z.string({ required_error: 'Select an applicant from the registry.' }).min(1, 'Select an applicant from the registry.'),
    status: z.enum(JOB_FAIR_APPLICANT_STATUSES),
    remarks: z.string().trim().optional(),
  })
)

type AttendeeFormValues = {
  applicantId: string
  status: JobFairApplicantStatus
  remarks: string
}

const initialValues = (): AttendeeFormValues => ({ applicantId: '', status: 'Attended', remarks: '' })

export function useJobFairAttendeeForm() {
  const store = useJobFairAttendeeStore()
  const { jobFairId, attendees, isFormDialogOpen, editingAttendee, isSubmitting } = storeToRefs(store)
  const { createAttendee, updateAttendee, closeFormDialog, searchRegistryApplicants } = store

  const { handleSubmit, resetForm, setFieldValue } = useForm({
    validationSchema: attendeeSchema,
    initialValues: initialValues(),
  })

  const isEditMode = computed(() => editingAttendee.value !== null)

  // ─── Registry Applicant ───
  const selectedApplicant = ref<JobFairRegistryApplicant | null>(null)
  const registrySearchTerm = ref('')
  const registryResults = ref<JobFairRegistryApplicant[]>([])
  const isSearchingRegistry = ref(false)

  /** Applicants already listed for this job fair — shown but not selectable. */
  const listedApplicantIds = computed(() => new Set(attendees.value.map((row) => row.applicant_id)))

  watchDebounced(
    registrySearchTerm,
    async (term) => {
      if (term.trim().length < REGISTRY_SEARCH_MIN_LENGTH) {
        registryResults.value = []
        return
      }
      isSearchingRegistry.value = true
      try {
        registryResults.value = await searchRegistryApplicants(term)
      } finally {
        isSearchingRegistry.value = false
      }
    },
    { debounce: 300 }
  )

  function selectApplicant(applicant: JobFairRegistryApplicant | null) {
    selectedApplicant.value = applicant
    setFieldValue('applicantId', applicant?.id ?? '')
  }

  // Load the selected row (or blank values) each time the dialog opens.
  watch(isFormDialogOpen, (open) => {
    if (!open) return
    const row = editingAttendee.value
    resetForm({
      values: row
        ? { applicantId: row.applicant_id, status: row.status as JobFairApplicantStatus, remarks: row.remarks ?? '' }
        : initialValues(),
    })
    selectedApplicant.value = row?.applicant ?? null
    registrySearchTerm.value = ''
    registryResults.value = []
  })

  const onFormDialogOpenChange = (open: boolean) => {
    if (open || isSubmitting.value) return
    closeFormDialog()
  }

  const submitAttendee = handleSubmit(async (formValues) => {
    if (!jobFairId.value) return
    const remarks = formValues.remarks?.trim() || null

    if (editingAttendee.value) {
      // The applicant is fixed once listed; only attendance details change
      await updateAttendee(editingAttendee.value.id, { status: formValues.status, remarks })
    } else {
      await createAttendee({
        job_fair_id: jobFairId.value,
        applicant_id: formValues.applicantId,
        status: formValues.status,
        remarks,
      })
    }
  })

  return {
    isFormDialogOpen,
    isSubmitting,
    isEditMode,
    selectedApplicant,
    registrySearchTerm,
    registryResults,
    isSearchingRegistry,
    listedApplicantIds,
    registrySearchMinLength: REGISTRY_SEARCH_MIN_LENGTH,
    statusOptions: JOB_FAIR_APPLICANT_STATUSES,
    selectApplicant,
    onFormDialogOpenChange,
    submitAttendee,
  }
}
