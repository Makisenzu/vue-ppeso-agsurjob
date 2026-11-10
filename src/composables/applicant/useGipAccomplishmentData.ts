import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useGipApplicationStore } from '@/stores/applicant/gipApplicationStore'
import { gipAccomplishmentService } from '@/services/common/gipAccomplishmentService'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { todayIso } from '@/helpers/common/dateRuleHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import { formatPesoAmount } from '@/helpers/common/amountInWordsHelper'
import { formatPeriodRange, formatWeekday } from '@/helpers/common/gipAccomplishmentHelper'
import {
  downloadGipAccomplishmentPdf,
  printGipAccomplishment,
  type GipAccomplishmentPrintData,
} from '@/helpers/common/gipAccomplishmentReportHelper'
import type { MyGipAppointment } from '@/types/applicant/gipApplication'
import {
  GIP_ACCOMPLISHMENT_BADGE_CLASS,
  type GipAccomplishmentPrintContext,
  type GipAccomplishmentProgram,
  type GipAccomplishmentRow,
} from '@/types/common/gipAccomplishment'

export const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** The saved report on its funding's form */
export function reportPrintData(report: GipAccomplishmentRow): GipAccomplishmentPrintData {
  return {
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
}

/**
 * What both GIP portal accomplishment pages (the list and the report form) need: the intern's appointment terms
 * and reports, their name on the form, generating / printing a report, and display helpers.
 */
export function useGipAccomplishmentData() {
  const toastAlert = useToastAlert()
  const { user, applicantProfile } = storeToRefs(useAuthStore())
  const gipStore = useGipApplicationStore()
  const { internships, isLoading: isLoadingInternship } = storeToRefs(gipStore)
  const { openDocument } = usePrivateDocuments()

  const applicantId = computed(() => applicantProfile.value?.id ?? null)
  const today = todayIso()

  // The sidebar reads the same store, so the page loads it (the auth store may still be hydrating)
  watch(applicantId, (id) => { if (id) void gipStore.fetchMyApplication(id) }, { immediate: true })

  /** "JUAN A. DELA CRUZ JR." style full name for the form */
  const internName = computed(() => {
    const p = applicantProfile.value
    if (!p) return ''
    const middle = p.middle_name?.trim() ? `${p.middle_name.trim()[0]}.` : ''
    return [p.first_name, middle, p.surname, p.suffix].map((part) => part?.trim()).filter(Boolean).join(' ')
  })

  // ─── Terms ───
  /** Every appointment term, newest first */
  const appointments = computed<MyGipAppointment[]>(() =>
    internships.value.flatMap((internship) => internship.appointments).sort((a, b) => b.term_number - a.term_number)
  )
  /** Reports can only be written for the term still Active */
  const activeAppointment = computed(() => appointments.value.find((a) => a.status === 'Active') ?? null)
  const program = computed<GipAccomplishmentProgram>(() => (activeAppointment.value?.program as GipAccomplishmentProgram) ?? 'PGAS')
  const isDole = computed(() => program.value === 'DOLE')
  const termNotStarted = computed(() => !!activeAppointment.value && activeAppointment.value.start_date > today)
  /** A new report can be written: there is an Active term and it has started */
  const canAddReport = computed(() => !!activeAppointment.value && !termNotStarted.value)

  // ─── Reports ───
  const reports = ref<GipAccomplishmentRow[]>([])
  const isLoadingReports = ref(false)
  const hasLoadedReports = ref(false)
  const appointmentIds = computed(() => appointments.value.map((a) => a.id))

  async function loadReports() {
    const ids = appointmentIds.value
    if (!ids.length) {
      reports.value = []
      return
    }
    isLoadingReports.value = true
    try {
      reports.value = await gipAccomplishmentService.listByAppointments(ids)
      hasLoadedReports.value = true
    } catch (error) {
      toastAlert.error('Could not load your reports', errorMessageOf(error, 'Please try again.'))
    } finally {
      isLoadingReports.value = false
    }
  }

  watch(() => appointmentIds.value.join(','), () => void loadReports(), { immediate: true })

  const isLoading = computed(() => isLoadingInternship.value || isLoadingReports.value)
  const isEnrolled = computed(() => appointments.value.length > 0)

  /** Reports of the Active term, newest first */
  const termReports = computed(() =>
    activeAppointment.value ? reports.value.filter((r) => r.appointment_id === activeAppointment.value!.id) : []
  )

  // ─── Generate / print on the official form ───
  const generating = ref<'download' | 'print' | null>(null)

  async function generate(mode: 'download' | 'print', data: GipAccomplishmentPrintData, ctx: GipAccomplishmentPrintContext) {
    if (generating.value) return
    generating.value = mode
    try {
      if (mode === 'download') await downloadGipAccomplishmentPdf(data, ctx)
      else await printGipAccomplishment(data, ctx)
    } catch (error) {
      toastAlert.error('Could not generate the report', errorMessageOf(error, 'Please try again.'))
    } finally {
      generating.value = null
    }
  }

  function generateSaved(report: GipAccomplishmentRow, mode: 'download' | 'print') {
    const office = appointments.value.find((a) => a.id === report.appointment_id)?.assigned_office ?? ''
    void generate(mode, reportPrintData(report), {
      internName: internName.value,
      office,
      from: report.period_start,
      to: report.period_end,
    })
  }

  function viewOwnFile(report: GipAccomplishmentRow) {
    void openDocument(report.file_path)
  }

  // ─── Display ───
  const formatDate = (iso: string | null) => (iso ? formatDisplayDate(iso, iso) : '')
  const formatSize = (size: number | null) => (size == null ? '' : formatFileSize(size))

  return {
    toastAlert,
    user,
    today,
    internName,
    appointments,
    activeAppointment,
    program,
    isDole,
    termNotStarted,
    canAddReport,
    reports,
    isLoadingReports,
    hasLoadedReports,
    loadReports,
    isLoading,
    isEnrolled,
    termReports,
    generating,
    generate,
    generateSaved,
    viewOwnFile,
    badgeClass: GIP_ACCOMPLISHMENT_BADGE_CLASS,
    formatPeriodRange,
    formatWeekday,
    formatDate,
    formatSize,
    formatPesoAmount,
  }
}
