import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { useGipApplicationStore } from '@/stores/applicant/gipApplicationStore'
import { gipAccomplishmentService } from '@/services/common/gipAccomplishmentService'
import { directoryService } from '@/services/common/directoryService'
import { usePrivateDocuments } from '@/composables/common/usePrivateDocuments'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { todayIso } from '@/helpers/common/dateRuleHelper'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import { formatPesoAmount, pesoAmountInWords } from '@/helpers/common/amountInWordsHelper'
import {
  accomplishmentRequirement,
  formatPeriodRange,
  formatWeekday,
  startedHalves,
  weekdaysBetween,
} from '@/helpers/common/gipAccomplishmentHelper'
import {
  downloadGipAccomplishmentPdf,
  printGipAccomplishment,
  type GipAccomplishmentPrintData,
} from '@/helpers/common/gipAccomplishmentReportHelper'
import type { MyGipAppointment } from '@/types/applicant/gipApplication'
import type { DirectoryRow } from '@/types/common/directory'
import {
  GIP_ACCOMPLISHMENT_ACTIVITIES_MAX,
  GIP_ACCOMPLISHMENT_ACTIVITY_MAX,
  GIP_ACCOMPLISHMENT_BADGE_CLASS,
  GIP_ACCOMPLISHMENT_DAY_STATUSES,
  GIP_ACCOMPLISHMENT_DEFAULT_REMARKS,
  GIP_ACCOMPLISHMENT_ENTRY_MAX,
  GIP_ACCOMPLISHMENT_FILE_ACCEPT,
  GIP_ACCOMPLISHMENT_FILE_MAX_BYTES,
  GIP_ACCOMPLISHMENT_NAME_MAX,
  GIP_ACCOMPLISHMENT_OUTPUT_MAX,
  GIP_ACCOMPLISHMENT_REMARKS_MAX,
  GIP_ACCOMPLISHMENT_WORDS_MAX,
  type GipAccomplishmentActivity,
  type GipAccomplishmentDay,
  type GipAccomplishmentDayStatus,
  type GipAccomplishmentDetails,
  type GipAccomplishmentPrintContext,
  type GipAccomplishmentProgram,
  type GipAccomplishmentRow,
} from '@/types/common/gipAccomplishment'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** One weekday row of the editor */
interface DayDraft {
  date: string
  status: GipAccomplishmentDayStatus
  entry: string
}

/** One PGAS activity row of the editor (key keeps rows stable while editing) */
interface ActivityDraft {
  key: number
  activity: string
  output: string
  remarks: string
}

const DEFAULT_DESIGNATION = 'GIP'
let activityKey = 0
const newActivity = (row?: Partial<GipAccomplishmentActivity>): ActivityDraft => ({
  key: ++activityKey,
  activity: row?.activity ?? '',
  output: row?.output ?? '',
  remarks: row?.remarks ?? GIP_ACCOMPLISHMENT_DEFAULT_REMARKS,
})

/**
 * GIP portal → Accomplishments: one report per half-month (1–15, 16–end) of the intern's Active term, on their
 * funding's form — DOLE: what they did each weekday; PGAS: Activities / Output / Remarks and the pay they computed
 * for the half (figures and words). Drafts save any time; submitting opens once the half ends. The report can be
 * generated as a PDF or printed on the official form at any point. Rules match esmdd.save_gip_accomplishment
 * (migration 112), which enforces them again.
 */
export function useGipAccomplishments() {
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
  const requirement = computed(() => accomplishmentRequirement(program.value))
  const isDole = computed(() => program.value === 'DOLE')

  // ─── Reports ───
  const reports = ref<GipAccomplishmentRow[]>([])
  const isLoadingReports = ref(false)
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
    } catch (error) {
      toastAlert.error('Could not load your reports', errorMessageOf(error, 'Please try again.'))
    } finally {
      isLoadingReports.value = false
    }
  }

  watch(() => appointmentIds.value.join(','), () => void loadReports(), { immediate: true })

  const isLoading = computed(() => isLoadingInternship.value || isLoadingReports.value)
  const isEnrolled = computed(() => appointments.value.length > 0)

  const reportOf = (appointmentId: string, periodStart: string) =>
    reports.value.find((r) => r.appointment_id === appointmentId && r.period_start === periodStart) ?? null

  // ─── Halves of the Active term ───
  /** Halves that have started, newest first */
  const halves = computed(() => {
    const apt = activeAppointment.value
    return apt ? startedHalves(apt.start_date, apt.end_date, today) : []
  })

  const halfOptions = computed(() =>
    halves.value.map((half) => {
      const report = activeAppointment.value ? reportOf(activeAppointment.value.id, half.start) : null
      return {
        value: half.start,
        label: half.label,
        description: report ? report.status : half.isComplete ? 'Not started · ready to submit' : 'In progress',
      }
    })
  )

  const selectedHalfStart = ref<string>('')

  // Default: the oldest ended half still waiting to be submitted, else the current half
  watch(
    () => [halves.value.map((h) => h.start).join(','), isLoadingReports.value] as const,
    ([, loading]) => {
      if (loading || !halves.value.length) return
      if (halves.value.some((h) => h.start === selectedHalfStart.value)) return
      const apt = activeAppointment.value
      const pending = [...halves.value].reverse().find((half) => {
        const status = apt ? reportOf(apt.id, half.start)?.status : undefined
        return half.isComplete && (!status || status === 'Draft' || status === 'Returned')
      })
      selectedHalfStart.value = (pending ?? halves.value[0]!).start
    },
    { immediate: true }
  )

  const selectedHalf = computed(() => halves.value.find((h) => h.start === selectedHalfStart.value) ?? null)
  const currentReport = computed(() =>
    activeAppointment.value && selectedHalf.value ? reportOf(activeAppointment.value.id, selectedHalf.value.start) : null
  )
  /** Reviewed reports are final */
  const isReadOnly = computed(() => currentReport.value?.status === 'Reviewed')
  /** A Submitted report can only change by submitting it again */
  const canSaveDraft = computed(() => !isReadOnly.value && currentReport.value?.status !== 'Submitted')
  const canSubmit = computed(() => !isReadOnly.value && !!selectedHalf.value?.isComplete)

  // ─── Editor ───
  const days = ref<DayDraft[]>([])
  const activities = ref<ActivityDraft[]>([])
  const details = reactive<GipAccomplishmentDetails>({
    designation: '',
    supervisor_name: '',
    approver_name: '',
    approver_position: '',
    amount: '',
    amount_in_words: '',
  })
  /** PGAS: daily entries are optional and hidden until opened (shown when the report already has some) */
  const showDailyOptional = ref(false)
  const showDaily = computed(() => isDole.value || showDailyOptional.value)
  const pickedFile = ref<File | null>(null)
  const fileError = ref<string | null>(null)
  const keepCurrentFile = ref(true)
  const dayErrors = reactive<Record<string, string>>({})
  const activityErrors = reactive<Record<number, string>>({})
  const detailErrors = reactive<Partial<Record<keyof GipAccomplishmentDetails | 'activities', string>>>({})
  const savingMode = ref<'draft' | 'submit' | null>(null)
  const isSaving = computed(() => savingMode.value !== null)

  function clearErrors() {
    for (const key of Object.keys(dayErrors)) delete dayErrors[key]
    for (const key of Object.keys(activityErrors)) delete activityErrors[Number(key)]
    for (const key of Object.keys(detailErrors)) delete detailErrors[key as keyof typeof detailErrors]
  }

  /** The latest saved report of the term: its signatories carry over to a new half */
  const latestReportOfTerm = computed(() =>
    activeAppointment.value ? reports.value.find((r) => r.appointment_id === activeAppointment.value!.id) ?? null : null
  )

  // ─── Office head of the appointed office (office directory) ───
  // The report is approved by the head of the office the intern is appointed to: "Approved by" (name +
  // position, migration 113) fills from that office's directory entry. Every signed-in user reads the directory.
  const appointedOffice = ref<DirectoryRow | null>(null)

  watch(
    () => activeAppointment.value?.assigned_office,
    async (officeName) => {
      appointedOffice.value = null
      const key = officeName?.trim().toLowerCase()
      if (!key) return
      try {
        const offices = await directoryService.fetchActiveOffices()
        // Appointments store the office name (older ones may hold its code)
        appointedOffice.value =
          offices.find((o) => o.office_name.trim().toLowerCase() === key || o.office_code.trim().toLowerCase() === key) ?? null
      } catch (error) {
        // The intern can still type the office head by hand
        console.warn('[useGipAccomplishments] Could not load the office directory:', errorMessageOf(error, ''))
      }
    },
    { immediate: true }
  )

  const officeHeadName = computed(() => appointedOffice.value?.office_head?.trim() ?? '')
  const officeHeadPosition = computed(() => appointedOffice.value?.office_head_position?.trim() ?? '')

  /** Fill "Approved by" from the directory where the report leaves it empty (the directory may load after the form) */
  function applyOfficeHead() {
    if (isReadOnly.value) return
    if (!details.approver_name.trim() && officeHeadName.value) details.approver_name = officeHeadName.value
    if (!details.approver_position.trim() && officeHeadPosition.value) details.approver_position = officeHeadPosition.value
  }

  watch([officeHeadName, officeHeadPosition], applyOfficeHead)

  /** Fill the editor from the selected half's saved report (or a blank form) */
  function loadEditor() {
    clearErrors()
    pickedFile.value = null
    fileError.value = null
    const half = selectedHalf.value
    const report = currentReport.value
    const previous = latestReportOfTerm.value
    keepCurrentFile.value = !!report?.file_path

    details.designation = report?.designation ?? previous?.designation ?? DEFAULT_DESIGNATION
    // The supervisor is not the office head: left for the intern, carried over from their last report of the term
    // (unless that one still held the office head's name, as earlier reports pre-filled it)
    const previousSupervisor = previous?.supervisor_name?.trim() ?? ''
    details.supervisor_name =
      report?.supervisor_name ??
      (previousSupervisor && previousSupervisor.toLowerCase() !== officeHeadName.value.toLowerCase() ? previousSupervisor : '')
    // Office head: the saved report's, else the appointed office's directory entry, else the last report's
    details.approver_name = report?.approver_name || officeHeadName.value || previous?.approver_name || ''
    details.approver_position = report?.approver_position || officeHeadPosition.value || previous?.approver_position || ''
    details.amount = report?.amount != null ? report.amount.toFixed(2) : ''
    details.amount_in_words = report?.amount_in_words ?? ''

    activities.value = report?.activities.length ? report.activities.map((row) => newActivity(row)) : [newActivity()]

    if (!half) {
      days.value = []
      return
    }
    const lastDay = half.to < today ? half.to : today
    const saved = new Map((report?.daily_entries ?? []).map((d) => [d.date, d]))
    days.value = weekdaysBetween(half.from, lastDay).map((date) => {
      const day = saved.get(date)
      return { date, status: day?.status ?? 'Worked', entry: day?.entry ?? '' }
    })
    showDailyOptional.value = (report?.daily_entries.length ?? 0) > 0
  }

  watch(() => [selectedHalfStart.value, currentReport.value?.id, currentReport.value?.updated_at], loadEditor, { immediate: true })

  // ─── Daily entries ───
  function setDayStatus(day: DayDraft, status: GipAccomplishmentDayStatus) {
    day.status = status
    delete dayErrors[day.date]
  }

  function onDayInput(day: DayDraft) {
    if (day.entry.trim()) delete dayErrors[day.date]
  }

  const missingDays = computed(() =>
    isDole.value ? days.value.filter((day) => day.status === 'Worked' && !day.entry.trim()).length : 0
  )

  // ─── PGAS activities ───
  function addActivity() {
    if (activities.value.length >= GIP_ACCOMPLISHMENT_ACTIVITIES_MAX) return
    activities.value.push(newActivity())
    delete detailErrors.activities
  }

  function removeActivity(key: number) {
    activities.value = activities.value.filter((row) => row.key !== key)
    delete activityErrors[key]
    if (!activities.value.length) activities.value.push(newActivity())
  }

  function onActivityInput(row: ActivityDraft) {
    if (row.activity.trim()) delete activityErrors[row.key]
    delete detailErrors.activities
  }

  // ─── PGAS payment ───
  /** Words suggested from the amount; replaced automatically until the intern edits them by hand */
  let suggestedWords = ''
  function onAmountInput() {
    delete detailErrors.amount
    const words = pesoAmountInWords(details.amount)
    if (!details.amount_in_words.trim() || details.amount_in_words === suggestedWords) {
      details.amount_in_words = words
      if (words) delete detailErrors.amount_in_words
    }
    suggestedWords = words
  }

  function fillAmountInWords() {
    const words = pesoAmountInWords(details.amount)
    if (!words) {
      detailErrors.amount = 'Enter the amount first.'
      return
    }
    details.amount_in_words = words
    suggestedWords = words
    delete detailErrors.amount_in_words
  }

  const amountPreview = computed(() => formatPesoAmount(details.amount))

  // ─── File ───
  function onFilePicked(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] ?? null
    input.value = ''
    fileError.value = null
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      fileError.value = 'Attach a PDF file.'
      return
    }
    if (file.size > GIP_ACCOMPLISHMENT_FILE_MAX_BYTES) {
      fileError.value = `The PDF must be ${formatFileSize(GIP_ACCOMPLISHMENT_FILE_MAX_BYTES)} or smaller.`
      return
    }
    pickedFile.value = file
  }

  function clearFile() {
    pickedFile.value = null
    keepCurrentFile.value = false
    fileError.value = null
  }

  // ─── Collect & validate ───
  /** Entries to save: blank Worked days are left out (a draft keeps logging them later) */
  function collectEntries(): GipAccomplishmentDay[] {
    if (!showDaily.value) return []
    return days.value
      .filter((day) => day.status !== 'Worked' || day.entry.trim())
      .map((day) => ({ date: day.date, status: day.status, entry: day.entry.trim() || null }))
  }

  /** Rows to save (PGAS): blank rows are left out */
  function collectActivities(): GipAccomplishmentActivity[] {
    if (isDole.value) return []
    return activities.value
      .filter((row) => row.activity.trim() || row.output.trim())
      .map((row) => ({ activity: row.activity.trim(), output: row.output.trim() || null, remarks: row.remarks.trim() || null }))
  }

  const parsedAmount = computed(() => {
    const value = Number(details.amount.replace(/,/g, ''))
    return details.amount.trim() && Number.isFinite(value) ? value : null
  })

  /** Client copy of the RPC's rules, so mistakes show on the right field */
  function validate(submit: boolean): boolean {
    clearErrors()
    for (const day of days.value) {
      if (day.entry.length > GIP_ACCOMPLISHMENT_ENTRY_MAX) dayErrors[day.date] = `Keep it under ${GIP_ACCOMPLISHMENT_ENTRY_MAX} characters.`
    }
    for (const field of ['designation', 'supervisor_name', 'approver_name', 'approver_position'] as const) {
      if (details[field].length > GIP_ACCOMPLISHMENT_NAME_MAX) detailErrors[field] = `Keep it under ${GIP_ACCOMPLISHMENT_NAME_MAX} characters.`
    }

    if (!isDole.value) {
      for (const row of activities.value) {
        if (!row.activity.trim() && row.output.trim()) activityErrors[row.key] = 'Write the activity for this output.'
        else if (row.activity.length > GIP_ACCOMPLISHMENT_ACTIVITY_MAX || row.output.length > GIP_ACCOMPLISHMENT_OUTPUT_MAX || row.remarks.length > GIP_ACCOMPLISHMENT_REMARKS_MAX)
          activityErrors[row.key] = 'This row is too long.'
      }
      if (details.amount.trim() && (parsedAmount.value == null || parsedAmount.value < 0)) detailErrors.amount = 'Enter the amount as a number, e.g. 5300.00.'
      if (details.amount_in_words.length > GIP_ACCOMPLISHMENT_WORDS_MAX) detailErrors.amount_in_words = `Keep it under ${GIP_ACCOMPLISHMENT_WORDS_MAX} characters.`
    }

    if (submit) {
      if (isDole.value) {
        for (const day of days.value) {
          if (day.status === 'Worked' && !day.entry.trim()) dayErrors[day.date] = 'Write what you did, or mark the day as a holiday or leave.'
        }
      } else {
        if (!collectActivities().length) detailErrors.activities = 'List at least one activity you accomplished this half.'
        if (!parsedAmount.value || parsedAmount.value <= 0) detailErrors.amount = 'Enter your pay for this half.'
        if (!details.amount_in_words.trim()) detailErrors.amount_in_words = 'Write the amount in words.'
      }
    }

    return (
      Object.keys(dayErrors).length === 0 &&
      Object.keys(activityErrors).length === 0 &&
      Object.keys(detailErrors).length === 0 &&
      !fileError.value
    )
  }

  // ─── Save / submit ───
  async function save(submit: boolean) {
    const appointment = activeAppointment.value
    const half = selectedHalf.value
    const uploaderId = user.value?.id
    if (!appointment || !half || !uploaderId || isSaving.value) return
    if (!validate(submit)) {
      toastAlert.error('Check your report', submit ? 'Some required parts are missing.' : 'Some entries need fixing.')
      return
    }

    const report = currentReport.value
    const keepFile =
      report && keepCurrentFile.value && !pickedFile.value && report.file_path && report.file_name
        ? { path: report.file_path, name: report.file_name, size: report.file_size }
        : null

    savingMode.value = submit ? 'submit' : 'draft'
    try {
      await gipAccomplishmentService.save({
        appointmentId: appointment.id,
        periodStart: half.start,
        dailyEntries: collectEntries(),
        activities: collectActivities(),
        details: { ...details, amount: details.amount.replace(/,/g, '').trim() },
        submit,
        file: pickedFile.value,
        keepFile,
        uploaderId,
        previousFilePath: report?.file_path ?? null,
      })
      toastAlert.success(
        submit ? 'Report submitted' : 'Draft saved',
        submit ? 'PESO will review your accomplishment report.' : 'Keep adding to it until the half ends, then submit it.'
      )
      await loadReports()
    } catch (error) {
      toastAlert.error(submit ? 'Could not submit your report' : 'Could not save your draft', errorMessageOf(error, 'Please try again.'))
    } finally {
      savingMode.value = null
    }
  }

  const saveDraft = () => save(false)
  const submitReport = () => save(true)

  // ─── Generate / print on the official form ───
  const generating = ref<'download' | 'print' | null>(null)

  /** The days a report covers: its half clipped to its term */
  function coverage(report: Pick<GipAccomplishmentRow, 'appointment_id' | 'period_start' | 'period_end'>) {
    const apt = appointments.value.find((a) => a.id === report.appointment_id)
    const from = apt && apt.start_date > report.period_start ? apt.start_date : report.period_start
    const to = apt && apt.end_date < report.period_end ? apt.end_date : report.period_end
    return { from, to, office: apt?.assigned_office ?? '' }
  }

  /** The editor's current values (saved or not), so a draft prints as it stands */
  function editorPrintData(): GipAccomplishmentPrintData {
    return {
      program: program.value,
      dailyEntries: days.value
        .filter((day) => day.status !== 'Worked' || day.entry.trim())
        .map((day) => ({ date: day.date, status: day.status, entry: day.entry.trim() || null })),
      activities: collectActivities(),
      designation: details.designation,
      supervisorName: details.supervisor_name,
      approverName: details.approver_name,
      approverPosition: details.approver_position,
      amount: parsedAmount.value,
      amountInWords: details.amount_in_words,
    }
  }

  function reportPrintData(report: GipAccomplishmentRow): GipAccomplishmentPrintData {
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

  function generateCurrent(mode: 'download' | 'print') {
    const half = selectedHalf.value
    const apt = activeAppointment.value
    if (!half || !apt) return
    void generate(mode, editorPrintData(), { internName: internName.value, office: apt.assigned_office, from: half.from, to: half.to })
  }

  function generateSaved(report: GipAccomplishmentRow, mode: 'download' | 'print') {
    const { from, to, office } = coverage(report)
    void generate(mode, reportPrintData(report), { internName: internName.value, office, from, to })
  }

  // ─── Discard ───
  const reportToRemove = ref<GipAccomplishmentRow | null>(null)
  const isRemoving = ref(false)

  async function confirmRemove() {
    const report = reportToRemove.value
    if (!report) return
    isRemoving.value = true
    try {
      await gipAccomplishmentService.remove(report)
      reports.value = reports.value.filter((r) => r.id !== report.id)
      reportToRemove.value = null
      toastAlert.success('Report discarded', 'The accomplishment report was removed.')
    } catch (error) {
      toastAlert.error('Could not discard the report', errorMessageOf(error, 'Please try again.'))
    } finally {
      isRemoving.value = false
    }
  }

  // ─── My reports (every term) ───
  const termGroups = computed(() =>
    appointments.value
      .map((appointment) => ({
        appointment,
        reports: reports.value.filter((r) => r.appointment_id === appointment.id),
      }))
      .filter((group) => group.reports.length > 0)
  )

  /** Open a report of the Active term in the editor */
  function openReport(report: GipAccomplishmentRow) {
    if (report.appointment_id !== activeAppointment.value?.id) return
    selectedHalfStart.value = report.period_start
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const isOpenable = (report: GipAccomplishmentRow) =>
    report.appointment_id === activeAppointment.value?.id && report.period_start !== selectedHalfStart.value

  // Expand a past report's details
  const expandedIds = ref<Set<string>>(new Set())
  function toggleExpanded(id: string) {
    const next = new Set(expandedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    expandedIds.value = next
  }

  // ─── Display ───
  const formatDate = (iso: string | null) => (iso ? formatDisplayDate(iso, iso) : '')
  const formatSize = (size: number | null) => (size == null ? '' : formatFileSize(size))
  const termNotStarted = computed(() => !!activeAppointment.value && activeAppointment.value.start_date > today)

  function viewOwnFile(report: GipAccomplishmentRow) {
    void openDocument(report.file_path)
  }

  return {
    // State
    isLoading,
    isEnrolled,
    activeAppointment,
    termNotStarted,
    internName,
    isDole,
    requirement,
    // Halves
    halfOptions,
    selectedHalfStart,
    selectedHalf,
    currentReport,
    isReadOnly,
    canSaveDraft,
    canSubmit,
    // Daily entries
    days,
    dayErrors,
    showDaily,
    showDailyOptional,
    missingDays,
    dayStatuses: GIP_ACCOMPLISHMENT_DAY_STATUSES,
    setDayStatus,
    onDayInput,
    entryMax: GIP_ACCOMPLISHMENT_ENTRY_MAX,
    // PGAS activities & payment
    activities,
    activityErrors,
    addActivity,
    removeActivity,
    onActivityInput,
    activitiesMax: GIP_ACCOMPLISHMENT_ACTIVITIES_MAX,
    activityMax: GIP_ACCOMPLISHMENT_ACTIVITY_MAX,
    outputMax: GIP_ACCOMPLISHMENT_OUTPUT_MAX,
    remarksMax: GIP_ACCOMPLISHMENT_REMARKS_MAX,
    details,
    detailErrors,
    onAmountInput,
    fillAmountInWords,
    amountPreview,
    nameMax: GIP_ACCOMPLISHMENT_NAME_MAX,
    officeHeadName,
    officeHeadPosition,
    wordsMax: GIP_ACCOMPLISHMENT_WORDS_MAX,
    // File
    pickedFile,
    fileError,
    keepCurrentFile,
    onFilePicked,
    clearFile,
    fileAccept: GIP_ACCOMPLISHMENT_FILE_ACCEPT,
    fileMaxLabel: formatFileSize(GIP_ACCOMPLISHMENT_FILE_MAX_BYTES),
    // Save
    savingMode,
    isSaving,
    saveDraft,
    submitReport,
    // Generate / print
    generating,
    generateCurrent,
    generateSaved,
    // Discard
    reportToRemove,
    isRemoving,
    confirmRemove,
    // My reports
    termGroups,
    openReport,
    isOpenable,
    expandedIds,
    toggleExpanded,
    // Display
    badgeClass: GIP_ACCOMPLISHMENT_BADGE_CLASS,
    formatPeriodRange,
    formatWeekday,
    formatDate,
    formatSize,
    formatPesoAmount,
    viewOwnFile,
  }
}
