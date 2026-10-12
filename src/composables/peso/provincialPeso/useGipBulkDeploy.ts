import { computed, ref, watch, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { GenericObject } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { directoryService } from '@/services/common/directoryService'
import type { GipApplicantRecord } from '@/types/peso/provincialPeso/gip'
import type { DirectoryRow } from '@/types/common/directory'
import pgasLogo from '@/assets/images/agsur.png'
import doleLogo from '@/assets/images/dole.png'

export const GIP_PROGRAM_OPTIONS = [
  { value: 'PGAS', label: 'PGAS - Agusan del Sur', description: "Provincial Gov't Funded • ₱479.35/day", logo: pgasLogo, stipend: '₱479.35 / day' },
  { value: 'DOLE', label: 'DOLE - Field Office', description: 'National DOLE Program • ₱475/day', logo: doleLogo, stipend: '₱475.00 / day' },
] as const

export const GIP_DEPLOYMENT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active (Ongoing Deployment)' },
  { value: 'Pending', label: 'Pending (Awaiting Orientation)' },
  { value: 'Hired', label: 'Hired (Absorbed by Agency)' },
] as const

type GipProgram = (typeof GIP_PROGRAM_OPTIONS)[number]['value']

// Hired applicants are already deployed; Rejected applicants are not eligible for deployment
const NON_DEPLOYABLE_STATUSES = ['Hired', 'Rejected']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const bulkDeployZodSchema = z
  .object({
    program: z.enum(['PGAS', 'DOLE']),
    office: z.custom<DirectoryRow>((v) => !!v, { message: 'Please select an assigned station or office.' }),
    supervisor: z.string().trim().optional(),
    stipend: z.string().trim().optional(),
    startDate: z.custom<DateValue>((v) => !!v, { message: 'Pick a start date.' }),
    endDate: z.custom<DateValue>((v) => !!v, { message: 'Pick an end date.' }),
    status: z.enum(['Active', 'Pending', 'Hired']),
    notes: z.string().trim().optional(),
  })
  .refine((v) => v.endDate.compare(v.startDate) >= 0, {
    message: 'End date must be on or after the start date.',
    path: ['endDate'],
  })

type BulkDeployFormValues = z.infer<typeof bulkDeployZodSchema>

function formatShortDate(d: DateValue): string {
  return `${MONTHS[d.month - 1]} ${d.day}`
}

export function formatDeploymentDate(d?: DateValue | null): string {
  return d ? `${formatShortDate(d)}, ${d.year}` : ''
}

export function formatDeploymentPeriod(start?: DateValue | null, end?: DateValue | null): string {
  if (!start || !end) return ''
  if (start.year === end.year) return `${formatShortDate(start)} - ${formatShortDate(end)}, ${end.year}`
  return `${formatShortDate(start)}, ${start.year} - ${formatShortDate(end)}, ${end.year}`
}

// Program affiliation only swaps the stipend when it is still a program default
export function stipendForProgram(program: GipProgram, currentStipend?: string): string | null {
  const defaults: string[] = GIP_PROGRAM_OPTIONS.map((p) => p.stipend)
  if (currentStipend && !defaults.includes(currentStipend)) return null
  return GIP_PROGRAM_OPTIONS.find((p) => p.value === program)!.stipend
}

function createInitialValues() {
  const td = today(getLocalTimeZone())
  const start = new CalendarDate(td.year, td.month, 1)
  return {
    program: 'PGAS' as GipProgram,
    office: undefined,
    supervisor: '',
    stipend: GIP_PROGRAM_OPTIONS[0].stipend,
    startDate: start,
    endDate: start.add({ months: 1 }).subtract({ days: 1 }),
    status: 'Active' as const,
    notes: '',
  }
}

export function useGipBulkDeploy(
  selectedApplicants: Ref<GipApplicantRecord[]>,
  isOpen: Ref<boolean>,
  onDeployed: () => void,
) {
  const gipStore = useGipStore()
  const { isSubmitting } = storeToRefs(gipStore)

  // ─── Eligibility Split ───
  const deployableApplicants = computed(() =>
    selectedApplicants.value.filter((a) => !NON_DEPLOYABLE_STATUSES.includes(a.status)),
  )
  const skippedApplicants = computed(() =>
    selectedApplicants.value.filter((a) => NON_DEPLOYABLE_STATUSES.includes(a.status)),
  )

  // ─── Form Setup (scoped via <Form>, which remounts with the dialog content) ───
  const bulkDeploySchema = toTypedSchema(bulkDeployZodSchema)
  const bulkDeployInitialValues = ref(createInitialValues())

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

  async function fetchOffices() {
    if (offices.value.length > 0) return
    isLoadingOffices.value = true
    try {
      offices.value = await directoryService.fetchActiveOffices()
    } catch (err: any) {
      console.error('Failed to fetch offices:', err.message)
    } finally {
      isLoadingOffices.value = false
    }
  }

  watch(isOpen, (open) => {
    if (!open) return
    bulkDeployInitialValues.value = createInitialValues()
    officeSearchQuery.value = ''
    fetchOffices()
  })

  const onBulkDeployOpenChange = (open: boolean) => {
    if (!open && isSubmitting.value) return
    isOpen.value = open
  }

  const submitBulkDeploy = async (formValues: GenericObject) => {
    const values = formValues as BulkDeployFormValues
    if (deployableApplicants.value.length === 0) return

    try {
      const result = await gipStore.bulkDeployInternsFromApplicants(
        deployableApplicants.value.map((a) => a.id),
        {
          program: values.program,
          assignedOffice: values.office.office_name.trim(),
          supervisor: values.supervisor || undefined,
          stipend: values.stipend || undefined,
          period: formatDeploymentPeriod(values.startDate, values.endDate) || undefined,
          status: values.status,
          remarks: values.notes || undefined,
        },
      )
      if (result.successCount > 0) {
        isOpen.value = false
        onDeployed()
      }
    } catch {
      // Store already surfaces the failure via toast; keep the dialog open for retry
    }
  }

  return {
    isBulkDeploying: isSubmitting,
    deployableApplicants,
    skippedApplicants,
    bulkDeploySchema,
    bulkDeployInitialValues,
    programOptions: GIP_PROGRAM_OPTIONS,
    deploymentStatusOptions: GIP_DEPLOYMENT_STATUS_OPTIONS,
    officeSearchQuery,
    filteredOffices,
    isLoadingOffices,
    stipendForProgram,
    formatDeploymentDate,
    formatDeploymentPeriod,
    onBulkDeployOpenChange,
    submitBulkDeploy,
  }
}
