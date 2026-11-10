import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { directoryService } from '@/services/common/directoryService'
import type { DirectoryRow } from '@/types/common/directory'
import type { GipInternRecord } from '@/types/peso/provincialPeso/gip'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { LPII_CONFIG, normalizeDocumentName } from '@/helpers/peso/provincialPeso/gipHelper'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import { gipDocumentService } from '@/services/common/gipDocumentService'
import { privacyService } from '@/services/common/privacyService'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import type { GipApplicantDocumentRow } from '@/types/common/gipProgram'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { formatDeploymentPeriod } from '@/composables/peso/provincialPeso/useGipBulkDeploy'

/**
 * One GIP intern's page (/gip/details/:id): deployment details, documents, and inline edit.
 * The intern comes from the route, so the page survives a reload or a shared link; `?edit=1` opens it in edit mode.
 */
export function useGipInternDetails() {
  const route = useRoute()
  const router = useRouter()
  const store = useGipStore()
  const { interns, isLoading, isUpdatingIntern } = storeToRefs(store)
  const { fetchDetailsData, updateGipIntern } = store

  const internId = computed(() => String(route.params.id ?? ''))
  const intern = computed<GipInternRecord | null>(() => interns.value.find((i) => i.id === internId.value) ?? null)
  const isEditingIntern = ref<boolean>(false)

  // The registry's filters ride along in the query; `edit` is this page's own flag
  const registryQuery = computed(() => Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'edit')))

  // Back to where the user came from (the registry, filters intact); opened directly, the registry
  function goBack() {
    if (window.history.state?.back) router.back()
    else router.push({ name: 'provincial-peso-gip-details', query: registryQuery.value })
  }

  function openRenewalPage() {
    if (!intern.value) return
    router.push({ name: 'provincial-peso-gip-renew', params: { id: intern.value.id }, query: registryQuery.value })
  }

  // ─── Office Directory State ───
  const offices = ref<DirectoryRow[]>([])
  const officeSearchQuery = ref<string>('')
  const selectedOffice = ref<DirectoryRow | null>(null)
  const isLoadingOffices = ref<boolean>(false)

  const filteredOffices = computed(() => {
    if (!officeSearchQuery.value.trim()) return offices.value
    const q = officeSearchQuery.value.toLowerCase().trim()
    return offices.value.filter(
      (o) =>
        o.office_name.toLowerCase().includes(q) ||
        o.office_code.toLowerCase().includes(q) ||
        (o.office_head && o.office_head.toLowerCase().includes(q)),
    )
  })

  async function fetchOffices() {
    if (offices.value.length > 0) return // Already loaded
    isLoadingOffices.value = true
    try {
      offices.value = await directoryService.fetchActiveOffices()
    } catch (err: any) {
      console.error('Failed to fetch offices:', err.message)
    } finally {
      isLoadingOffices.value = false
    }
  }

  // ─── Date Range State ───
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

  const deploymentStartDate = ref<any>(null)
  const deploymentEndDate = ref<any>(null)

  /** "09/01/2026 - 02/28/2027" (MM/DD/YYYY); saved as the intern's period text */
  const formattedPeriod = computed<string>(() => formatDeploymentPeriod(deploymentStartDate.value, deploymentEndDate.value))

  /**
   * Parse a period string into CalendarDate start/end values.
   * Supports patterns like:
   *   - "01/01/2026 - 06/30/2026" (MM/DD/YYYY, how periods are saved now)
   *   - "Jan 1 - Jun 30, 2026" and "Jan 1, 2026 - Jun 30, 2027" (older records)
   *   - "Jan 2026 - Jun 2026" (day defaults to 1 and last-day-of-month)
   */
  function parsePeriodToDates(period: string): { start: any; end: any } | null {
    if (!period || !period.trim()) return null

    // Pattern: "MM/DD/YYYY - MM/DD/YYYY"
    const numericMatch = period.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (numericMatch) {
      const [, sm, sd, sy, em, ed, ey] = numericMatch.map(Number)
      return { start: new CalendarDate(sy!, sm!, sd!), end: new CalendarDate(ey!, em!, ed!) }
    }

    const monthMap: Record<string, number> = {}
    MONTH_NAMES.forEach((m, i) => { monthMap[m.toLowerCase()] = i + 1 })

    // Pattern: "MMM D - MMM D, YYYY" or "MMM D, YYYY - MMM D, YYYY"
    const rangeMatch = period.match(
      /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/
    )
    if (rangeMatch) {
      const [, sm, sd, sy, em, ed, ey] = rangeMatch
      const startMonth = monthMap[sm.toLowerCase().slice(0, 3)]
      const endMonth = monthMap[em.toLowerCase().slice(0, 3)]
      if (startMonth && endMonth) {
        const startYear = sy ? parseInt(sy) : parseInt(ey)
        return {
          start: new CalendarDate(startYear, startMonth, parseInt(sd)),
          end: new CalendarDate(parseInt(ey), endMonth, parseInt(ed)),
        }
      }
    }

    // Pattern: "MMM YYYY - MMM YYYY" (no day, month-only)
    const monthYearMatch = period.match(
      /^([A-Za-z]+)\s+(\d{4})\s*[-–]\s*([A-Za-z]+)\s+(\d{4})$/
    )
    if (monthYearMatch) {
      const [, sm, sy, em, ey] = monthYearMatch
      const startMonth = monthMap[sm.toLowerCase().slice(0, 3)]
      const endMonth = monthMap[em.toLowerCase().slice(0, 3)]
      if (startMonth && endMonth) {
        const endYear = parseInt(ey)
        // End date = last day of endMonth
        const nextMonth = endMonth === 12
          ? new CalendarDate(endYear + 1, 1, 1)
          : new CalendarDate(endYear, endMonth + 1, 1)
        const endDate = nextMonth.subtract({ days: 1 })
        return {
          start: new CalendarDate(parseInt(sy), startMonth, 1),
          end: endDate,
        }
      }
    }

    return null
  }

  // ─── Auto-fill supervisor when office is selected ───
  watch(selectedOffice, (office) => {
    if (office) {
      editForm.value.assignedOffice = office.office_name
      editForm.value.supervisor = office.office_head || ''
    }
  })

  // ─── Sync period from formatted date range ───
  watch(formattedPeriod, (fp) => {
    if (fp) {
      editForm.value.period = fp
    }
  })

  // ─── Inline Edit State ───
  const currentYear = new Date().getFullYear()

  const editForm = ref<{
    program: 'PGAS' | 'DOLE'
    assignedOffice: string
    supervisor: string
    stipend: string
    period: string
    status: string
  }>({
    program: 'PGAS',
    assignedOffice: '',
    supervisor: '',
    stipend: '₱479.35 / day',
    period: `Jan ${currentYear} - Jun ${currentYear}`,
    status: 'Active',
  })

  function startEdit() {
    if (intern.value) {
      editForm.value = {
        program: intern.value.program,
        assignedOffice: intern.value.assignedOffice,
        supervisor: intern.value.supervisor,
        stipend: intern.value.stipend,
        period: intern.value.period,
        status: intern.value.status,
      }
      isEditingIntern.value = true

      // Fetch offices if not already loaded
      fetchOffices()

      // Match the intern's assigned office with directory entries
      if (offices.value.length > 0) {
        const match = offices.value.find(
          (o) => o.office_name.toLowerCase() === intern.value!.assignedOffice.toLowerCase(),
        )
        selectedOffice.value = match || null
      } else {
        // Wait for offices to load, then match
        const stopWatch = watch(offices, (loaded) => {
          if (loaded.length > 0) {
            const match = loaded.find(
              (o) => o.office_name.toLowerCase() === intern.value!.assignedOffice.toLowerCase(),
            )
            selectedOffice.value = match || null
            stopWatch()
          }
        })
      }

      // Parse existing period into calendar dates
      const parsed = parsePeriodToDates(intern.value.period)
      if (parsed) {
        deploymentStartDate.value = parsed.start
        deploymentEndDate.value = parsed.end
      } else {
        // Fallback: set to current month range
        const td = today(getLocalTimeZone())
        deploymentStartDate.value = new CalendarDate(td.year, td.month, 1)
        const nextMonth = td.month === 12
          ? new CalendarDate(td.year + 1, 1, 1)
          : new CalendarDate(td.year, td.month + 1, 1)
        deploymentEndDate.value = nextMonth.subtract({ days: 1 })
      }
    }
  }

  function cancelEdit() {
    isEditingIntern.value = false
    selectedOffice.value = null
    officeSearchQuery.value = ''
    deploymentStartDate.value = null
    deploymentEndDate.value = null
  }

  function setEditProgram(prog: 'PGAS' | 'DOLE') {
    editForm.value.program = prog
    if (prog === 'PGAS' && (editForm.value.stipend === '₱475.00 / day' || editForm.value.stipend === '₱475 / day')) {
      editForm.value.stipend = '₱479.35 / day'
    } else if (prog === 'DOLE' && editForm.value.stipend === '₱479.35 / day') {
      editForm.value.stipend = '₱475.00 / day'
    }
  }

  async function saveEdit() {
    if (!intern.value) return
    const office = editForm.value.assignedOffice.trim() || (editForm.value.program === 'PGAS' ? 'Provincial PESO / PGAS Office' : 'DOLE AgSur Field Office')
    await updateGipIntern({
      id: intern.value.id,
      program: editForm.value.program,
      assignedOffice: office,
      supervisor: editForm.value.supervisor.trim(),
      stipend: editForm.value.stipend.trim(),
      period: editForm.value.period.trim(),
      status: editForm.value.status,
      applicationId: intern.value.rawGip?.application_id || undefined,
      appointmentId: intern.value.currentAppointment?.id,
      periodChanged: editForm.value.period.trim() !== intern.value.period.trim(),
    })
    isEditingIntern.value = false
  }


  // ─── Documents Submitted Extraction ───
  const internDocumentsSubmitted = computed<string[]>(() => {
    if (!intern.value) return []
    if (intern.value.rawApplicant?.documents_submitted && intern.value.rawApplicant.documents_submitted.length > 0) {
      return intern.value.rawApplicant.documents_submitted
    }
    if (intern.value.documentsSubmitted && intern.value.documentsSubmitted.length > 0) {
      return intern.value.documentsSubmitted
    }
    return []
  })

  // ─── Soft copies (esmdd.gip_applicant_documents) ───
  // Files live in the private `documents` bucket: listed without URLs, signed only when opened or downloaded
  const { openDocument, downloadDocument } = usePrivateDocuments()
  const documentFiles = ref<GipApplicantDocumentRow[]>([])
  const isLoadingDocuments = ref<boolean>(false)
  const hasDocumentsError = ref<boolean>(false)
  const downloadingDocumentId = ref<string | null>(null)

  // The gip_applicants row the intern was deployed from; the uploaded files hang off that application
  const applicationId = computed<string | null>(() => intern.value?.rawGip?.application_id ?? null)

  async function loadDocumentFiles(id: string | null) {
    documentFiles.value = []
    hasDocumentsError.value = false
    if (!id) return
    isLoadingDocuments.value = true
    try {
      const rows = await gipDocumentService.listDocuments(id)
      if (applicationId.value === id) documentFiles.value = rows
    } catch (err) {
      console.error('[useGipInternDetails] Failed to load documents:', err instanceof Error ? err.message : err)
      if (applicationId.value === id) hasDocumentsError.value = true
    } finally {
      if (applicationId.value === id) isLoadingDocuments.value = false
    }
  }

  watch(applicationId, loadDocumentFiles, { immediate: true })

  /** Every submitted document with its soft copy, if one was uploaded: ticked documents first, then files without a tick */
  const internDocuments = computed<{ name: string; file: GipApplicantDocumentRow | null }[]>(() => {
    const fileByName = new Map(documentFiles.value.map((file) => [normalizeDocumentName(file.document_name), file]))
    const names = [...new Set([...internDocumentsSubmitted.value.map(normalizeDocumentName), ...fileByName.keys()])]
    return names.filter(Boolean).map((name) => ({ name, file: fileByName.get(name) ?? null }))
  })

  // Opening or saving someone's file is an access to their personal data (PRIVACY.md rule 5); never logs the file itself
  function viewDocument(file: GipApplicantDocumentRow) {
    // Not awaited before opening: the new tab must open inside the click so popup blockers allow it
    void openDocument(file.path)
    void privacyService.logPersonalDataAccess('VIEW', 'esmdd.gip_applicant_documents', file.id, {
      document: file.document_name,
    })
  }

  async function downloadFile(file: GipApplicantDocumentRow) {
    if (downloadingDocumentId.value) return
    downloadingDocumentId.value = file.id
    try {
      void privacyService.logPersonalDataAccess('EXPORT', 'esmdd.gip_applicant_documents', file.id, {
        document: file.document_name,
        download: true,
      })
      await downloadDocument(file.path, file.file_name)
    } finally {
      downloadingDocumentId.value = null
    }
  }

  const formatDocumentSize = (size: number | null) => (size == null ? '' : formatFileSize(size))

  // Read-only deployment rows shown on the page
  const internDetailFields = computed(() => {
    const current = intern.value
    if (!current) return []
    return [
      { label: 'Assigned Office / Station', value: current.assignedOffice },
      { label: 'Designated Supervisor', value: current.supervisor },
      { label: 'Academic Background / Degree', value: current.course },
      { label: 'Daily Allowance / Stipend', value: current.stipend, mono: true },
      { label: 'Deployment Period', value: current.period },
      { label: 'Contact Information', value: current.contact, mono: true },
    ]
  })

  const formatCalendarDate = (date: { year: number; month: number; day: number }) =>
    formatDisplayDate(new Date(date.year, date.month - 1, date.day))

  // Opened with ?edit=1 (the registry's pencil button): start editing once the intern is available, then drop
  // the flag from the URL so a reload or Back does not reopen edit mode
  watch(
    intern,
    (current) => {
      if (!current || route.query.edit !== '1') return
      startEdit()
      router.replace({ query: registryQuery.value })
    },
    { immediate: true },
  )

  onMounted(() => {
    // Opened directly (reload / link): load the registry; otherwise it is already in the store
    if (!intern.value) fetchDetailsData()
  })

  return {
    intern,
    isLoading,
    LPII_CONFIG,
    internDetailFields,
    internDocuments,
    isLoadingDocuments,
    hasDocumentsError,
    downloadingDocumentId,
    viewDocument,
    downloadFile,
    formatDocumentSize,
    goBack,
    openRenewalPage,

    // Edit state & actions
    isEditingIntern,
    isUpdatingIntern,
    editForm,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditProgram,

    // Office directory (edit mode)
    officeSearchQuery,
    filteredOffices,
    selectedOffice,
    isLoadingOffices,

    // Date range (edit mode)
    deploymentStartDate,
    deploymentEndDate,
    formattedPeriod,
    formatCalendarDate,
  }
}
