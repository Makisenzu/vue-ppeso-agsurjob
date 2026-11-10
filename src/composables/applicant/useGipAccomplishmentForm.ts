import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gipAccomplishmentService } from '@/services/common/gipAccomplishmentService'
import { directoryService } from '@/services/common/directoryService'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import { formatPesoAmount, pesoAmountInWords } from '@/helpers/common/amountInWordsHelper'
import { formatPeriodRange, nextDay, weekdaysBetween } from '@/helpers/common/gipAccomplishmentHelper'
import type { GipAccomplishmentPrintData } from '@/helpers/common/gipAccomplishmentReportHelper'
import { errorMessageOf, useGipAccomplishmentData } from '@/composables/applicant/useGipAccomplishmentData'
import type { DirectoryRow } from '@/types/common/directory'
import {
  GIP_ACCOMPLISHMENT_ACTIVITIES_MAX,
  GIP_ACCOMPLISHMENT_ACTIVITY_MAX,
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
  type GipAccomplishmentProgram,
} from '@/types/common/gipAccomplishment'

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

const minIso = (a: string, b: string) => (a < b ? a : b)
const maxIso = (a: string, b: string) => (a > b ? a : b)

/**
 * GIP portal → Accomplishments → Add Accomplishment / Edit: one report over the dates the intern picks (Date from /
 * Date to) inside their Active term, on their funding's form — DOLE: what they did each weekday; PGAS: Activities /
 * Output / Remarks and the pay they computed (figures and words). Reports of a term don't overlap. Drafts save any
 * time; submitting before the report's last day asks for confirmation first. The report can be generated as a PDF
 * or printed on the official form at any point. Rules match esmdd.save_gip_accomplishment (migrations 114 / 115),
 * which enforces them again. Route: `gip-accomplishment-new`, or `gip-accomplishment-edit` with the report id.
 */
export function useGipAccomplishmentForm() {
  const route = useRoute()
  const router = useRouter()
  const data = useGipAccomplishmentData()
  const {
    toastAlert,
    user,
    today,
    internName,
    appointments,
    activeAppointment,
    reports,
    hasLoadedReports,
    loadReports,
    termReports,
    generate,
  } = data

  // ─── The report in the form ───
  /** The saved report being edited (from the route); null while adding a new one */
  const editingId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
  const isNew = computed(() => editingId.value === null)
  const currentReport = computed(() => (editingId.value ? reports.value.find((r) => r.id === editingId.value) ?? null : null))
  /** The link points at a report that isn't the intern's, or no longer exists */
  const isNotFound = computed(() => !!editingId.value && hasLoadedReports.value && !currentReport.value)
  /** Only reports of the Active term can be changed; Reviewed ones are final */
  const isReadOnly = computed(
    () => currentReport.value?.status === 'Reviewed' || (!!currentReport.value && currentReport.value.appointment_id !== activeAppointment.value?.id)
  )
  /** The term the form belongs to: the edited report's (any term, read-only unless Active), else the Active one */
  const formAppointment = computed(() =>
    currentReport.value
      ? appointments.value.find((a) => a.id === currentReport.value!.appointment_id) ?? null
      : activeAppointment.value
  )
  /** The form follows the term's funding (a saved report keeps the one it was written under) */
  const program = computed<GipAccomplishmentProgram>(
    () => currentReport.value?.program ?? ((formAppointment.value?.program as GipAccomplishmentProgram | undefined) ?? 'PGAS')
  )
  const isDole = computed(() => program.value === 'DOLE')

  /** A Submitted report can only change by submitting it again */
  const canSaveDraft = computed(() => !isReadOnly.value && currentReport.value?.status !== 'Submitted')

  function goBack() {
    void router.push({ name: 'gip-accomplishments' })
  }

  // ─── Period (Date from / Date to) ───
  const periodFrom = ref('')
  const periodTo = ref('')
  /** Bounds of the pickers: the term, and a start no later than today */
  const periodMin = computed(() => formAppointment.value?.start_date ?? '')
  const periodMax = computed(() => formAppointment.value?.end_date ?? '')
  const periodFromMax = computed(() => (periodMax.value ? minIso(periodMax.value, today) : today))

  /** What's wrong with the picked dates (mirrors the RPC), or null */
  const periodError = computed<string | null>(() => {
    const from = periodFrom.value
    const to = periodTo.value
    if (!from || !to) return 'Pick both dates.'
    if (to < from) return 'The end date must be on or after the start date.'
    if (from < periodMin.value || to > periodMax.value)
      return `Pick dates within your term (${formatPeriodRange(periodMin.value, periodMax.value)}).`
    if (from > today) return 'The start date cannot be after today.'
    const overlap = termReports.value.find((r) => r.id !== editingId.value && r.period_start <= to && r.period_end >= from)
    if (overlap) return `You already have a report for ${formatPeriodRange(overlap.period_start, overlap.period_end)}.`
    return null
  })

  const canSubmit = computed(() => !isReadOnly.value && !periodError.value)
  /** The report's last day is still ahead: submitting now asks for confirmation first */
  const isEarly = computed(() => !!periodTo.value && periodTo.value > today)

  /** A new report starts the day after the term's latest report (or on the term's first day) and runs to today */
  function defaultPeriod(): { from: string; to: string } {
    const apt = activeAppointment.value
    if (!apt) return { from: '', to: '' }
    const lastEnd = termReports.value.reduce<string>((latest, r) => maxIso(latest, r.period_end), '')
    const to = minIso(apt.end_date, today)
    const from = lastEnd ? minIso(maxIso(nextDay(lastEnd), apt.start_date), to) : apt.start_date
    return { from: minIso(from, to), to }
  }

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
  const detailErrors = reactive<Partial<Record<keyof GipAccomplishmentDetails | 'activities' | 'period', string>>>({})
  const savingMode = ref<'draft' | 'submit' | null>(null)
  const isSaving = computed(() => savingMode.value !== null)

  function clearErrors() {
    for (const key of Object.keys(dayErrors)) delete dayErrors[key]
    for (const key of Object.keys(activityErrors)) delete activityErrors[Number(key)]
    for (const key of Object.keys(detailErrors)) delete detailErrors[key as keyof typeof detailErrors]
  }

  /** Weekday rows for the picked dates (up to today), keeping whatever was typed for days still in range */
  function rebuildDays(saved: GipAccomplishmentDay[] = []) {
    const typed = new Map(days.value.map((d) => [d.date, d]))
    const stored = new Map(saved.map((d) => [d.date, d]))
    const from = periodFrom.value
    const to = periodTo.value
    if (!from || !to || to < from) {
      days.value = []
      return
    }
    days.value = weekdaysBetween(from, minIso(to, today)).map((date) => {
      const day = typed.get(date) ?? stored.get(date)
      return { date, status: day?.status ?? 'Worked', entry: day?.entry ?? '' }
    })
  }

  watch([periodFrom, periodTo], () => {
    delete detailErrors.period
    rebuildDays()
  })

  // ─── Office head of the appointed office (office directory) ───
  // The report is approved by the head of the office the intern is appointed to: "Approved by" (name +
  // position, migration 113) fills from that office's directory entry. Every signed-in user reads the directory.
  const appointedOffice = ref<DirectoryRow | null>(null)

  watch(
    () => formAppointment.value?.assigned_office,
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
        console.warn('[useGipAccomplishmentForm] Could not load the office directory:', errorMessageOf(error, ''))
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

  /** The latest report of the term: its signatories carry over to a new report */
  const latestReportOfTerm = computed(() => termReports.value[0] ?? null)

  /** Fill the form from the report being edited, or a blank new report */
  function loadEditor() {
    clearErrors()
    pickedFile.value = null
    fileError.value = null
    const report = currentReport.value
    const previous = latestReportOfTerm.value
    keepCurrentFile.value = !!report?.file_path

    const period = report ? { from: report.period_start, to: report.period_end } : defaultPeriod()
    days.value = []
    periodFrom.value = period.from
    periodTo.value = period.to
    rebuildDays(report?.daily_entries ?? [])
    showDailyOptional.value = (report?.daily_entries.length ?? 0) > 0

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
  }

  // Fill once the reports and term are known; refill when the route switches reports or the report is saved
  watch(
    () => [hasLoadedReports.value && (!!currentReport.value || !!activeAppointment.value), editingId.value, currentReport.value?.updated_at] as const,
    ([ready]) => {
      if (ready) loadEditor()
    },
    { immediate: true }
  )

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
    if (periodError.value) detailErrors.period = periodError.value
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
        if (!collectActivities().length) detailErrors.activities = 'List at least one activity you accomplished.'
        if (!parsedAmount.value || parsedAmount.value <= 0) detailErrors.amount = 'Enter your pay for these dates.'
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
  /** Returns whether it saved */
  async function save(submit: boolean): Promise<boolean> {
    const appointment = activeAppointment.value
    const uploaderId = user.value?.id
    if (!appointment || !uploaderId || isSaving.value) return false
    if (!validate(submit)) {
      toastAlert.error('Check your report', detailErrors.period ?? (submit ? 'Some required parts are missing.' : 'Some entries need fixing.'))
      return false
    }

    const report = currentReport.value
    const keepFile =
      report && keepCurrentFile.value && !pickedFile.value && report.file_path && report.file_name
        ? { path: report.file_path, name: report.file_name, size: report.file_size }
        : null

    savingMode.value = submit ? 'submit' : 'draft'
    try {
      const saved = await gipAccomplishmentService.save({
        id: report?.id ?? null,
        appointmentId: appointment.id,
        periodStart: periodFrom.value,
        periodEnd: periodTo.value,
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
        submit ? 'PESO will review your accomplishment report.' : 'Keep adding to it, then submit it.'
      )
      if (submit) {
        // Done: back to the list
        goBack()
        return true
      }
      await loadReports()
      // A new draft now has an id: keep editing it at its own address
      if (!report) void router.replace({ name: 'gip-accomplishment-edit', params: { id: saved.id } })
      return true
    } catch (error) {
      toastAlert.error(submit ? 'Could not submit your report' : 'Could not save your draft', errorMessageOf(error, 'Please try again.'))
      return false
    } finally {
      savingMode.value = null
    }
  }

  const saveDraft = () => save(false)

  // Submitting before the report's last day is allowed, after a warning (migration 115)
  const isEarlySubmitDialogOpen = ref(false)

  function submitReport() {
    if (isEarly.value) {
      isEarlySubmitDialogOpen.value = true
      return
    }
    void save(true)
  }

  async function confirmEarlySubmit() {
    await save(true)
    isEarlySubmitDialogOpen.value = false
  }

  // ─── Generate / print on the official form ───
  /** The form's current values (saved or not), so a draft prints as it stands */
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

  function generateCurrent(mode: 'download' | 'print') {
    const apt = formAppointment.value
    if (!apt) return
    if (!periodFrom.value || !periodTo.value || periodTo.value < periodFrom.value) {
      toastAlert.error('Pick the dates first', 'The form prints the dates this report covers.')
      return
    }
    void generate(mode, editorPrintData(), {
      internName: internName.value,
      office: apt.assigned_office,
      from: periodFrom.value,
      to: periodTo.value,
    })
  }

  return {
    // State
    isLoading: data.isLoading,
    isEnrolled: data.isEnrolled,
    hasLoadedReports,
    activeAppointment,
    formAppointment,
    termNotStarted: data.termNotStarted,
    canAddReport: data.canAddReport,
    isDole,
    goBack,
    // The report in the form
    isNew,
    isNotFound,
    currentReport,
    isReadOnly,
    canSaveDraft,
    canSubmit,
    isEarly,
    // Period
    periodFrom,
    periodTo,
    periodMin,
    periodMax,
    periodFromMax,
    periodError,
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
    wordsMax: GIP_ACCOMPLISHMENT_WORDS_MAX,
    // File
    pickedFile,
    fileError,
    keepCurrentFile,
    onFilePicked,
    clearFile,
    fileAccept: GIP_ACCOMPLISHMENT_FILE_ACCEPT,
    viewOwnFile: data.viewOwnFile,
    // Save
    savingMode,
    isSaving,
    saveDraft,
    submitReport,
    isEarlySubmitDialogOpen,
    confirmEarlySubmit,
    // Generate / print
    generating: data.generating,
    generateCurrent,
    // Display
    badgeClass: data.badgeClass,
    formatWeekday: data.formatWeekday,
    formatDate: data.formatDate,
  }
}
