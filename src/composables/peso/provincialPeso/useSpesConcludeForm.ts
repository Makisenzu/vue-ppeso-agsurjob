import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { GenericObject } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import { countSpesCompletionReports, hasAllSpesCompletionReports } from '@/helpers/peso/provincialPeso/spesHelper'
import { SPES_COMPLETION_REPORTS } from '@/types/common/spesForm'
import { SPES_CONCLUDE_STATUSES } from '@/types/peso/provincialPeso/spes'

export const SPES_CONCLUDE_OPTIONS = [
  { value: 'Completed', label: 'Completed', description: 'Served the full duration; DTR and report submitted' },
  { value: 'Terminated', label: 'Terminated', description: 'Resigned or removed early' },
] as const

const concludeZodSchema = z.object({
  status: z.enum(SPES_CONCLUDE_STATUSES),
  notes: z.string().trim().optional(),
})

type ConcludeFormValues = z.infer<typeof concludeZodSchema>

/** Conclude a SPES appointment as Completed (needs the DTR and Accomplishment Report) or Terminated. */
export function useSpesConcludeForm() {
  const store = useSpesStore()
  const { concludingAppointment, isSubmitting, completionReports, isLoadingReports } = storeToRefs(store)
  const { concludeAppointment, closeConcludeDialog, openReportsDialog } = store

  const concludeSchema = toTypedSchema(concludeZodSchema)

  const concludeReports = computed(() =>
    concludingAppointment.value ? completionReports.value[concludingAppointment.value.id] : undefined
  )
  const canMarkCompleted = computed(() => hasAllSpesCompletionReports(concludeReports.value))
  const concludeReportCount = computed(() => countSpesCompletionReports(concludeReports.value))

  const concludeInitialValues = computed<ConcludeFormValues>(() => ({
    status: canMarkCompleted.value ? 'Completed' : 'Terminated',
    notes: '',
  }))

  // Remounts once the reports have loaded so the default status follows them
  const concludeFormKey = computed(
    () => `conclude-${concludingAppointment.value?.id ?? 'none'}-${canMarkCompleted.value ? 'complete' : 'incomplete'}`
  )

  /** Opens the reports dialog from the conclude dialog to upload the missing PDFs. */
  const openConcludeReports = () => {
    const entry = concludingAppointment.value
    if (!entry) return
    closeConcludeDialog()
    openReportsDialog(entry)
  }

  const onConcludeOpenChange = (open: boolean) => {
    if (open) return
    closeConcludeDialog()
  }

  const submitConclusion = async (formValues: GenericObject) => {
    const values = formValues as ConcludeFormValues
    await concludeAppointment(values.status, values.notes || null)
  }

  return {
    isSubmitting,
    concludingAppointment,
    concludeSchema,
    concludeInitialValues,
    concludeFormKey,
    concludeOptions: SPES_CONCLUDE_OPTIONS,
    canMarkCompleted,
    concludeReportCount,
    totalReports: SPES_COMPLETION_REPORTS.length,
    isLoadingReports,
    openConcludeReports,
    onConcludeOpenChange,
    submitConclusion,
  }
}
