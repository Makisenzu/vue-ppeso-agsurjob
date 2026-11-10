import { computed, ref, watch, type Ref } from 'vue'
import { gipAccomplishmentService } from '@/services/common/gipAccomplishmentService'
import { privacyService } from '@/services/common/privacyService'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import { formatPesoAmount } from '@/helpers/common/amountInWordsHelper'
import { formatPeriodRange } from '@/helpers/common/gipAccomplishmentHelper'
import { downloadGipAccomplishmentPdf, printGipAccomplishment } from '@/helpers/common/gipAccomplishmentReportHelper'
import type { GipAppointmentRecord, GipInternRecord } from '@/types/peso/provincialPeso/gip'
import { GIP_ACCOMPLISHMENT_BADGE_CLASS, type GipAccomplishmentRow } from '@/types/common/gipAccomplishment'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback
const AUDIT_TABLE = 'esmdd.gip_accomplishments'

/**
 * Intern page → Accomplishments (Provincial PESO): the intern's half-month reports per appointment term — DOLE
 * daily entries, or PGAS activities with the payment receipt — their files (signed only when opened,
 * PRIVACY.md §4), the generated form (PDF / print) and the review: Mark reviewed, or Return with remarks.
 */
export function useGipInternAccomplishments(intern: Ref<GipInternRecord | null>) {
  const toastAlert = useToastAlert()
  const { openDocument, downloadDocument } = usePrivateDocuments()

  // ─── Terms ───
  /** Every appointment term of the intern, newest first (current + history, deduplicated) */
  const terms = computed<GipAppointmentRecord[]>(() => {
    const current = intern.value
    if (!current) return []
    const byId = new Map<string, GipAppointmentRecord>()
    for (const apt of [current.currentAppointment, ...(current.appointmentHistory ?? [])]) {
      if (apt?.id && !byId.has(apt.id)) byId.set(apt.id, apt)
    }
    return [...byId.values()].sort((a, b) => b.termNumber - a.termNumber)
  })
  const termIds = computed(() => terms.value.map((t) => t.id))

  // ─── Reports ───
  const reports = ref<GipAccomplishmentRow[]>([])
  const isLoading = ref(false)
  const hasError = ref(false)

  async function load() {
    const ids = termIds.value
    hasError.value = false
    if (!ids.length) {
      reports.value = []
      return
    }
    isLoading.value = true
    try {
      const rows = await gipAccomplishmentService.listByAppointments(ids)
      // A slower response for a previous intern must not overwrite this one
      if (termIds.value.join(',') === ids.join(',')) reports.value = rows
    } catch (error) {
      console.error('[useGipInternAccomplishments] Failed to load reports:', errorMessageOf(error, ''))
      hasError.value = true
    } finally {
      isLoading.value = false
    }
  }

  // Keyed on the term ids, not the record: a background refresh replaces the record but not its terms
  watch(() => termIds.value.join(','), () => void load(), { immediate: true })

  // Drafts are the intern's work in progress: PESO sees a report once it is submitted
  const submittedReports = computed(() => reports.value.filter((r) => r.status !== 'Draft'))
  const draftCount = computed(() => reports.value.length - submittedReports.value.length)

  /** Terms with at least one submitted report, each with its reports newest half first */
  const termGroups = computed(() =>
    terms.value
      .map((term) => ({ term, reports: submittedReports.value.filter((r) => r.appointment_id === term.id) }))
      .filter((group) => group.reports.length > 0)
  )
  const pendingCount = computed(() => reports.value.filter((r) => r.status === 'Submitted').length)

  // A report's activities / daily entries are collapsed until opened
  const openIds = ref<Set<string>>(new Set())
  function toggleOpen(id: string) {
    const next = new Set(openIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    openIds.value = next
  }

  // ─── Files & generated form (PRIVACY.md rule 5: every open / save is logged, never its contents) ───
  const downloadingId = ref<string | null>(null)
  const generatingId = ref<string | null>(null)

  function viewFile(report: GipAccomplishmentRow) {
    if (!report.file_path) return
    // Not awaited before opening: the new tab must open inside the click so popup blockers allow it
    void openDocument(report.file_path)
    void privacyService.logPersonalDataAccess('VIEW', AUDIT_TABLE, report.id, { file: true })
  }

  async function downloadFile(report: GipAccomplishmentRow) {
    if (!report.file_path || !report.file_name || downloadingId.value) return
    downloadingId.value = report.id
    try {
      void privacyService.logPersonalDataAccess('EXPORT', AUDIT_TABLE, report.id, { file: true, download: true })
      await downloadDocument(report.file_path, report.file_name)
    } finally {
      downloadingId.value = null
    }
  }

  /** The report on its funding's official form, as the intern prints it */
  async function generateReport(report: GipAccomplishmentRow, mode: 'download' | 'print') {
    const current = intern.value
    if (!current || generatingId.value) return
    const term = terms.value.find((t) => t.id === report.appointment_id)
    const from = term && term.startDate > report.period_start ? term.startDate : report.period_start
    const to = term && term.endDate < report.period_end ? term.endDate : report.period_end

    generatingId.value = report.id
    try {
      void privacyService.logPersonalDataAccess('EXPORT', AUDIT_TABLE, report.id, { form: true, mode })
      const data = {
        program: report.program,
        dailyEntries: report.daily_entries,
        activities: report.activities,
        designation: report.designation,
        supervisorName: report.supervisor_name,
        approverName: report.approver_name,
        approverPosition: report.approver_position,
        amount: report.amount,
        amountInWords: report.amount_in_words,
      }
      const ctx = { internName: current.fullName, office: term?.assignedOffice ?? current.assignedOffice, from, to }
      if (mode === 'download') await downloadGipAccomplishmentPdf(data, ctx)
      else await printGipAccomplishment(data, ctx)
    } catch (error) {
      toastAlert.error('Could not generate the report', errorMessageOf(error, 'Please try again.'))
    } finally {
      generatingId.value = null
    }
  }

  // ─── Review ───
  const reviewingId = ref<string | null>(null)

  function replace(updated: GipAccomplishmentRow) {
    reports.value = reports.value.map((r) => (r.id === updated.id ? updated : r))
  }

  async function markReviewed(report: GipAccomplishmentRow) {
    if (reviewingId.value) return
    reviewingId.value = report.id
    try {
      replace(await gipAccomplishmentService.review(report.id, 'Reviewed', null))
      toastAlert.success('Report reviewed', 'The intern has been notified.')
    } catch (error) {
      toastAlert.error('Could not update the report', errorMessageOf(error, 'Please try again.'))
    } finally {
      reviewingId.value = null
    }
  }

  // Return: remarks are required (CHECK in migration 112) and shown to the intern
  const reportToReturn = ref<GipAccomplishmentRow | null>(null)
  const returnRemarks = ref('')
  const returnRemarksError = ref<string | null>(null)

  function openReturn(report: GipAccomplishmentRow) {
    reportToReturn.value = report
    returnRemarks.value = report.review_remarks ?? ''
    returnRemarksError.value = null
  }

  function closeReturn() {
    if (reviewingId.value) return
    reportToReturn.value = null
  }

  async function confirmReturn() {
    const report = reportToReturn.value
    if (!report || reviewingId.value) return
    const remarks = returnRemarks.value.trim()
    if (!remarks) {
      returnRemarksError.value = 'Tell the intern what to fix.'
      return
    }
    reviewingId.value = report.id
    try {
      replace(await gipAccomplishmentService.review(report.id, 'Returned', remarks))
      reportToReturn.value = null
      toastAlert.success('Report returned', 'The intern has been notified with your remarks.')
    } catch (error) {
      toastAlert.error('Could not return the report', errorMessageOf(error, 'Please try again.'))
    } finally {
      reviewingId.value = null
    }
  }

  // ─── Display ───
  const formatDate = (iso: string | null) => (iso ? formatDisplayDate(iso, iso) : '')
  const formatSize = (size: number | null) => (size == null ? '' : formatFileSize(size))

  return {
    termGroups,
    pendingCount,
    draftCount,
    isLoading,
    hasError,
    reload: load,
    openIds,
    toggleOpen,
    downloadingId,
    viewFile,
    downloadFile,
    generatingId,
    generateReport,
    reviewingId,
    markReviewed,
    reportToReturn,
    returnRemarks,
    returnRemarksError,
    openReturn,
    closeReturn,
    confirmReturn,
    badgeClass: GIP_ACCOMPLISHMENT_BADGE_CLASS,
    formatPeriod: formatPeriodRange,
    formatDate,
    formatSize,
    formatPesoAmount,
  }
}
