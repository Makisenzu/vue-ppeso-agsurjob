import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useJobFairStore } from '@/stores/peso/provincialPeso/jobFairStore'
import { JOB_FAIR_STATUSES, type JobFairRow, type JobFairStatus } from '@/types/peso/provincialPeso/jobFair'
import type { MapCoordinates } from '@/helpers/common/mapboxHelpers'

const jobFairSchema = toTypedSchema(
  z
    .object({
      title: z.string().trim().min(1, 'Title is required.'),
      location: z.string().trim().min(1, 'Location is required.'),
      startDate: z.string().min(1, 'Start date is required.'),
      endDate: z.string().min(1, 'End date is required.'),
      status: z.enum(JOB_FAIR_STATUSES),
      registrationLink: z.union([z.literal(''), z.string().trim().url('Enter a valid URL.')]).optional(),
      description: z.string().trim().optional(),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
    })
    // ISO yyyy-mm-dd strings compare correctly as plain strings
    .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
      message: 'End date cannot be before the start date.',
      path: ['endDate'],
    })
)

const INITIAL_VALUES = {
  title: '',
  location: '',
  startDate: '',
  endDate: '',
  status: 'Upcoming' as JobFairStatus,
  registrationLink: '',
  description: '',
  latitude: null as number | null,
  longitude: null as number | null,
}

function toFormValues(row: JobFairRow): typeof INITIAL_VALUES {
  const status = JOB_FAIR_STATUSES.find((s) => s.toLowerCase() === row.status.toLowerCase()) ?? 'Upcoming'
  return {
    title: row.title,
    location: row.location,
    // date inputs need plain yyyy-mm-dd
    startDate: row.start_date.slice(0, 10),
    endDate: row.end_date.slice(0, 10),
    status,
    registrationLink: row.registration_link ?? '',
    description: row.description ?? '',
    latitude: row.latitude,
    longitude: row.longitude,
  }
}

export function useJobFairForm() {
  const store = useJobFairStore()
  const { isFormDialogOpen, editingJobFair, isSubmitting } = storeToRefs(store)
  const { createJobFair, updateJobFair, closeFormDialog } = store

  const { handleSubmit, resetForm, values, setFieldValue } = useForm({
    validationSchema: jobFairSchema,
    initialValues: INITIAL_VALUES,
  })

  const isEditMode = computed(() => editingJobFair.value !== null)

  // Load the selected row (or blank values) each time the dialog opens.
  watch(isFormDialogOpen, (open) => {
    if (!open) return
    resetForm({ values: editingJobFair.value ? toFormValues(editingJobFair.value) : INITIAL_VALUES })
  })

  const onFormDialogOpenChange = (open: boolean) => {
    if (open || isSubmitting.value) return
    closeFormDialog()
  }

  const setMapLocation = (coordinates: MapCoordinates | null) => {
    setFieldValue('latitude', coordinates?.latitude ?? null)
    setFieldValue('longitude', coordinates?.longitude ?? null)
  }

  const submitJobFair = handleSubmit(async (formValues) => {
    const payload = {
      title: formValues.title,
      location: formValues.location,
      start_date: formValues.startDate,
      end_date: formValues.endDate,
      status: formValues.status,
      registration_link: formValues.registrationLink || null,
      description: formValues.description || null,
      latitude: formValues.latitude ?? null,
      longitude: formValues.longitude ?? null,
    }

    if (editingJobFair.value) {
      await updateJobFair(editingJobFair.value.id, payload)
    } else {
      await createJobFair(payload)
    }
  })

  return {
    isFormDialogOpen,
    isSubmitting,
    isEditMode,
    statusOptions: JOB_FAIR_STATUSES,
    formValues: values,
    onFormDialogOpenChange,
    setMapLocation,
    submitJobFair,
  }
}
