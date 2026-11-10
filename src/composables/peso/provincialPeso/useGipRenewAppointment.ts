import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { GenericObject } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { directoryService } from '@/services/common/directoryService'
import {
  GIP_PROGRAM_OPTIONS,
  formatDeploymentDate,
  stipendForProgram,
} from '@/composables/peso/provincialPeso/useGipBulkDeploy'
import type { GipInternRecord } from '@/types/peso/provincialPeso/gip'
import type { DirectoryRow } from '@/types/common/directory'

export const GIP_CONCLUDE_OPTIONS = [
  { value: 'Completed', label: 'Completed', description: 'Finished term' },
  { value: 'Hired', label: 'Hired / Absorbed', description: 'Employed by office' },
  { value: 'Terminated', label: 'Resigned', description: 'Discontinued early' },
] as const

export const GIP_DURATION_PRESETS = [3, 6] as const

type GipProgram = (typeof GIP_PROGRAM_OPTIONS)[number]['value']
type ActionMode = 'renew' | 'conclude'

// minStart: the renewed term cannot start before the day after the latest earlier term ends
function buildRenewZodSchema(minStart: DateValue | null) {
  return z
    .object({
      program: z.enum(['PGAS', 'DOLE']),
      office: z.custom<DirectoryRow>((v) => !!v, { message: 'Please select an assigned station or office.' }),
      supervisor: z.string().trim().optional(),
      stipend: z.string().trim().min(1, 'Please specify the daily stipend.'),
      startDate: z.custom<DateValue>((v) => !!v, { message: 'Pick a start date.' }),
      endDate: z.custom<DateValue>((v) => !!v, { message: 'Pick an end date.' }),
      notes: z.string().trim().optional(),
    })
    .refine((v) => !minStart || v.startDate.compare(minStart) >= 0, {
      message: minStart ? `Must start on or after ${formatDeploymentDate(minStart)}, after the previous term ends.` : '',
      path: ['startDate'],
    })
    .refine((v) => v.endDate.compare(v.startDate) >= 0, {
      message: 'End date must be on or after the start date.',
      path: ['endDate'],
    })
}

const concludeZodSchema = z.object({
  action: z.enum(['Completed', 'Hired', 'Terminated']),
  notes: z.string().trim().optional(),
})

type RenewFormValues = z.infer<ReturnType<typeof buildRenewZodSchema>>
type ConcludeFormValues = z.infer<typeof concludeZodSchema>

function toIsoString(d: DateValue): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

// The last day of any of the intern's terms so far (current + history); null when no term has an end date
function latestTermEnd(intern: GipInternRecord): DateValue | null {
  const ends = [intern.currentAppointment?.endDate, ...(intern.appointmentHistory ?? []).map((a) => a.endDate)]
    .map((iso) => (iso ?? '').split('-').map(Number))
    .filter(([y, m, d]) => y && m && d)
    .map(([y, m, d]) => new CalendarDate(y!, m!, d!))
  if (ends.length === 0) return null
  return ends.reduce((latest, d) => (d.compare(latest) > 0 ? d : latest))
}

// Earliest allowed start of the renewed term: the day after the latest term ends, so terms never overlap
function renewalMinStart(intern: GipInternRecord): DateValue | null {
  return latestTermEnd(intern)?.add({ days: 1 }) ?? null
}

// Renewed term starts the day after the previous term ends, or today if unknown
function resolveRenewalStart(intern: GipInternRecord): DateValue {
  return renewalMinStart(intern) ?? today(getLocalTimeZone())
}

export function addDurationMonths(start: DateValue, months: number): DateValue {
  return start.add({ months }).subtract({ days: 1 })
}

export function useGipRenewAppointment() {
  const route = useRoute()
  const router = useRouter()
  const gipStore = useGipStore()
  const { interns, isLoading, isSubmittingRenewal: isSubmitting } = storeToRefs(gipStore)

  // The intern comes from the route (/gip/details/:id/renew), so the page survives a reload or a shared link
  const internId = computed(() => String(route.params.id ?? ''))
  const intern = computed<GipInternRecord | null>(() => interns.value.find((i) => i.id === internId.value) ?? null)
  // Set once a decision is saved, so the page keeps its form (not the not-found state) while it navigates away
  const isDone = ref<boolean>(false)
  // Only active interns have an appointment to renew or conclude
  const canDecide = computed(() => isDone.value || intern.value?.status === 'Active')

  const actionMode = ref<ActionMode>('renew')

  const currentTermNumber = computed(() => intern.value?.currentAppointment?.termNumber || 1)
  const nextTermNumber = computed(() => currentTermNumber.value + 1)

  // ─── Office Directory State ───
  const offices = ref<DirectoryRow[]>([])
  const officeSearchQuery = ref<string>('')
  const isLoadingOffices = ref<boolean>(false)

  const filteredOffices = computed(() => {
    const q = officeSearchQuery.value.toLowerCase().trim()
    if (!q) return offices.value
    return offices.value.filter(
      (o) =>
        o.office_name.toLowerCase().includes(q) ||
        o.office_code.toLowerCase().includes(q) ||
        (o.office_head && o.office_head.toLowerCase().includes(q)),
    )
  })

  // Appointments store the office name; resolve it (or a stored code) back to its directory entry
  function findOffice(nameOrCode?: string | null): DirectoryRow | undefined {
    const key = nameOrCode?.trim().toLowerCase()
    if (!key) return undefined
    return offices.value.find((o) => o.office_name.toLowerCase() === key || o.office_code.toLowerCase() === key)
  }

  async function fetchOffices() {
    if (offices.value.length > 0) return
    isLoadingOffices.value = true
    try {
      offices.value = await directoryService.fetchActiveOffices()
    } catch (err) {
      console.error('Failed to fetch offices:', err instanceof Error ? err.message : err)
    } finally {
      isLoadingOffices.value = false
    }
  }

  // ─── Form Setup (each <Form> remounts per mode / intern) ───
  // Snapshot per intern (set with the initial values), so a background refresh after saving cannot shift it
  const minStartDate = shallowRef<DateValue | null>(null)
  const renewSchema = computed(() => toTypedSchema(buildRenewZodSchema(minStartDate.value)))
  const concludeSchema = toTypedSchema(concludeZodSchema)
  // Null until offices load, so the renew form mounts with the current office preselected
  const renewInitialValues = ref<Partial<RenewFormValues> | null>(null)
  const concludeInitialValues: ConcludeFormValues = { action: 'Completed', notes: '' }

  // Keyed on the id, not the record: a background refresh replaces the record but must not reset the form
  watch(
    () => intern.value?.id,
    async (id) => {
      const current = intern.value
      if (!id || !current || isDone.value) return
      actionMode.value = 'renew'
      officeSearchQuery.value = ''
      renewInitialValues.value = null

      await fetchOffices()
      if (intern.value?.id !== current.id) return

      const program: GipProgram = current.program || 'PGAS'
      minStartDate.value = renewalMinStart(current)
      const startDate = resolveRenewalStart(current)
      const office = findOffice(current.assignedOffice)
      renewInitialValues.value = {
        program,
        office,
        supervisor: office?.office_head || current.supervisor || '',
        stipend: current.stipend || stipendForProgram(program) || '',
        startDate,
        endDate: addDurationMonths(startDate, 6),
        notes: '',
      }
    },
    { immediate: true },
  )

  // Back to where the user came from (the registry or the intern's page, filters intact); opened directly, the intern's page
  function leave() {
    if (window.history.state?.back) router.back()
    else router.push({ name: 'provincial-peso-gip-intern', params: { id: internId.value }, query: route.query })
  }

  function goBack() {
    if (isSubmitting.value) return
    leave()
  }

  onMounted(() => {
    // Opened directly (reload / link): load the registry; otherwise the details page already has it
    if (!intern.value) gipStore.fetchDetailsData()
  })

  const submitRenewal = async (formValues: GenericObject) => {
    const values = formValues as RenewFormValues
    if (!intern.value) return
    try {
      await gipStore.renewInternAppointment({
        gipId: intern.value.id,
        currentAppointmentId: intern.value.currentAppointment?.id,
        nextTermNumber: nextTermNumber.value,
        program: values.program,
        assignedOffice: values.office.office_name.trim(),
        supervisor: values.supervisor || undefined,
        stipend: values.stipend,
        startDate: toIsoString(values.startDate),
        endDate: toIsoString(values.endDate),
        remarks: values.notes || undefined,
      })
      isDone.value = true
      leave()
    } catch {
      // Store already surfaces the failure via toast; keep the page open for retry
    }
  }

  const submitConclusion = async (formValues: GenericObject) => {
    const values = formValues as ConcludeFormValues
    if (!intern.value) return
    try {
      await gipStore.concludeInternAppointment({
        gipId: intern.value.id,
        appointmentId: intern.value.currentAppointment?.id,
        action: values.action,
        remarks: values.notes || undefined,
      })
      isDone.value = true
      leave()
    } catch {
      // Store already surfaces the failure via toast; keep the page open for retry
    }
  }

  return {
    intern,
    isLoading,
    canDecide,
    isSubmitting,
    actionMode,
    currentTermNumber,
    nextTermNumber,
    programOptions: GIP_PROGRAM_OPTIONS,
    concludeOptions: GIP_CONCLUDE_OPTIONS,
    durationPresets: GIP_DURATION_PRESETS,
    officeSearchQuery,
    filteredOffices,
    isLoadingOffices,
    findOffice,
    renewSchema,
    minStartDate,
    renewInitialValues,
    concludeSchema,
    concludeInitialValues,
    stipendForProgram,
    addDurationMonths,
    formatDeploymentDate,
    goBack,
    submitRenewal,
    submitConclusion,
  }
}
