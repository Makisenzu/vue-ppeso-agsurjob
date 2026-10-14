import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { GenericObject } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import {
  computeSpesEndDate,
  countSpesCalendarDays,
  countSpesCompletionReports,
  formatSpesFormName,
  getSpesBeneficiaryType,
  hasAllSpesCompletionReports,
} from '@/helpers/peso/provincialPeso/spesHelper'
import { SPES_COMPLETION_REPORTS } from '@/types/common/spesForm'
import {
  SPES_CONCLUDE_STATUSES,
  SPES_DURATION_OPTIONS,
  type SpesAppointee,
  type SpesAppointmentDetails,
  type SpesAppointmentEntry,
  type SpesDurationOption,
} from '@/types/peso/provincialPeso/spes'

export const SPES_CONCLUDE_OPTIONS = [
  { value: 'Completed', label: 'Completed', description: 'Served the full duration; DTR and report submitted' },
  { value: 'Terminated', label: 'Terminated', description: 'Resigned or removed early' },
] as const

/** Provincial PESO appoints SPES beneficiaries for either 10 or 20 working days. */
const DEFAULT_DAYS_DURATION: SpesDurationOption = 20

export const SPES_DURATION_CHOICES = SPES_DURATION_OPTIONS.map((days) => ({
  value: days,
  label: `${days} days`,
  description: `${days} working days, Monday to Friday`,
}))

const blankToUndefined = (value: unknown) => (value === '' || value == null ? undefined : value)

const appointmentZodSchema = z
  .object({
    // 'form:<spes_form id>' for an approved applicant, 'spes:<esmdd.spes id>' for a former beneficiary
    appointee: z.string().min(1, 'Select who to appoint.'),
    spesYear: z.coerce
      .number({ message: 'Enter the SPES year.' })
      .int('Enter a valid year.')
      .min(2000, 'Enter a valid year.')
      .max(2100, 'Enter a valid year.'),
    assignedOffice: z.string().trim().min(1, 'Enter the establishment or office.'),
    supervisor: z.string().trim().optional(),
    dailyWage: z.preprocess(blankToUndefined, z.coerce.number().min(0, 'Wage cannot be negative.').optional()),
    startDate: z.string().min(1, 'Pick a start date.'),
    endDate: z.string().min(1, 'Pick an end date.'),
    daysDuration: z.coerce
      .number({ message: 'Choose 10 or 20 days.' })
      .refine((days) => (SPES_DURATION_OPTIONS as readonly number[]).includes(days), 'Choose 10 or 20 days.'),
    notes: z.string().trim().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after the start date.',
    path: ['endDate'],
  })
  .refine((v) => v.daysDuration <= (countSpesCalendarDays(v.startDate, v.endDate) ?? Infinity), {
    message: 'Duration cannot be longer than the appointment period.',
    path: ['daysDuration'],
  })

const concludeZodSchema = z.object({
  status: z.enum(SPES_CONCLUDE_STATUSES),
  notes: z.string().trim().optional(),
})

type AppointmentFormValues = z.infer<typeof appointmentZodSchema>
type ConcludeFormValues = z.infer<typeof concludeZodSchema>

function toAppointeeValue(appointee: SpesAppointee): string {
  return appointee.kind === 'applicant' ? `form:${appointee.formId}` : `spes:${appointee.spesId}`
}

function parseAppointee(value: string): SpesAppointee | null {
  const [kind, id] = value.split(':')
  if (!id) return null
  if (kind === 'form') return { kind: 'applicant', formId: id }
  if (kind === 'spes') return { kind: 'beneficiary', spesId: id }
  return null
}

function toFormValues(entry: SpesAppointmentEntry): Partial<AppointmentFormValues> {
  return {
    appointee: `spes:${entry.spes_id}`,
    spesYear: entry.spes_year,
    assignedOffice: entry.assigned_office,
    supervisor: entry.supervisor ?? '',
    dailyWage: entry.daily_wage ?? undefined,
    startDate: entry.start_date,
    endDate: entry.end_date,
    daysDuration: entry.days_duration,
    notes: entry.decision_notes ?? '',
  }
}

export function useSpesAppointmentForm() {
  const store = useSpesStore()
  const {
    isAppointmentFormOpen,
    editingAppointment,
    presetAppointee,
    concludingAppointment,
    isSubmitting,
    selectedYear,
    enrollableApplicants,
    reappointableBeneficiaries,
    completionReports,
    isLoadingReports,
  } = storeToRefs(store)
  const {
    appointSpes,
    updateAppointment,
    concludeAppointment,
    closeAppointmentDialog,
    closeConcludeDialog,
    openReportsDialog,
  } = store

  const isEditMode = computed(() => editingAppointment.value !== null)

  /** Approved applicants not yet enrolled — appointing them enrolls them as new beneficiaries. */
  const applicantOptions = computed(() =>
    enrollableApplicants.value.map((form) => ({
      value: `form:${form.id}`,
      label: formatSpesFormName(form),
      hint: getSpesBeneficiaryType(form) === 'Returning' ? 'Returning (per SPES form)' : 'New applicant',
    }))
  )

  /** Former beneficiaries without an appointment in the selected year — they can become SPES again. */
  const beneficiaryOptions = computed(() =>
    reappointableBeneficiaries.value.map((spes) => {
      const years = spes.appointments.map((a) => a.spes_year)
      return {
        value: `spes:${spes.id}`,
        label: formatSpesFormName(spes.spes_form),
        hint: years.length ? `Last SPES ${Math.max(...years)} · ${years.length} availment(s)` : 'No appointment yet',
      }
    })
  )

  /** Name shown instead of the picker when editing or re-appointing a specific beneficiary. */
  const fixedAppointeeName = computed(() => {
    if (editingAppointment.value) return formatSpesFormName(editingAppointment.value.beneficiary.spes_form)
    if (!presetAppointee.value) return null
    const value = toAppointeeValue(presetAppointee.value)
    return [...applicantOptions.value, ...beneficiaryOptions.value].find((o) => o.value === value)?.label ?? null
  })

  // ─── Form Setup (the <Form> remounts per open via formKey) ───
  const appointmentSchema = toTypedSchema(appointmentZodSchema)
  const concludeSchema = toTypedSchema(concludeZodSchema)

  const appointmentInitialValues = computed<Partial<AppointmentFormValues>>(() => {
    if (editingAppointment.value) return toFormValues(editingAppointment.value)
    return {
      appointee: presetAppointee.value ? toAppointeeValue(presetAppointee.value) : '',
      spesYear: selectedYear.value,
      assignedOffice: '',
      supervisor: '',
      dailyWage: undefined,
      startDate: '',
      endDate: '',
      daysDuration: DEFAULT_DAYS_DURATION,
      notes: '',
    }
  })

  const appointmentFormKey = computed(() =>
    editingAppointment.value
      ? `edit-${editingAppointment.value.id}`
      : `new-${presetAppointee.value ? toAppointeeValue(presetAppointee.value) : 'any'}-${selectedYear.value}`
  )

  // ─── Conclude: Completed needs the DTR and Accomplishment Report ───
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

  /** End date = last working day of the chosen duration; PESO can still adjust it. */
  const fillEndDate = (
    startDate: string | undefined,
    daysDuration: number | undefined,
    setFieldValue: (field: 'endDate', value: string) => void
  ) => {
    const endDate = computeSpesEndDate(startDate, daysDuration)
    if (endDate) setFieldValue('endDate', endDate)
  }

  const onAppointmentOpenChange = (open: boolean) => {
    if (open) return
    closeAppointmentDialog()
  }

  const onConcludeOpenChange = (open: boolean) => {
    if (open) return
    closeConcludeDialog()
  }

  const submitAppointment = async (formValues: GenericObject) => {
    const values = formValues as AppointmentFormValues
    const details: SpesAppointmentDetails = {
      spes_year: values.spesYear,
      assigned_office: values.assignedOffice,
      supervisor: values.supervisor || null,
      daily_wage: values.dailyWage ?? null,
      days_duration: values.daysDuration,
      start_date: values.startDate,
      end_date: values.endDate,
      decision_notes: values.notes || null,
    }

    if (editingAppointment.value) {
      await updateAppointment(details)
      return
    }

    const appointee = parseAppointee(values.appointee)
    if (appointee) await appointSpes(appointee, details)
  }

  const submitConclusion = async (formValues: GenericObject) => {
    const values = formValues as ConcludeFormValues
    await concludeAppointment(values.status, values.notes || null)
  }

  return {
    isAppointmentFormOpen,
    isSubmitting,
    isEditMode,
    editingAppointment,
    concludingAppointment,
    applicantOptions,
    beneficiaryOptions,
    fixedAppointeeName,
    appointmentSchema,
    appointmentInitialValues,
    appointmentFormKey,
    concludeSchema,
    concludeInitialValues,
    concludeFormKey,
    concludeOptions: SPES_CONCLUDE_OPTIONS,
    canMarkCompleted,
    concludeReportCount,
    totalReports: SPES_COMPLETION_REPORTS.length,
    isLoadingReports,
    openConcludeReports,
    durationChoices: SPES_DURATION_CHOICES,
    fillEndDate,
    countSpesCalendarDays,
    onAppointmentOpenChange,
    onConcludeOpenChange,
    submitAppointment,
    submitConclusion,
  }
}
