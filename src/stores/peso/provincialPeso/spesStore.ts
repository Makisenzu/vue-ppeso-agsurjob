import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { spesService } from '@/services/peso/provincialPeso/spesService'
import { spesAttachmentService } from '@/services/common/spesAttachmentService'
import { spesCompletionReportService } from '@/services/common/spesCompletionReportService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import {
  buildSpesDrawRemark,
  formatSpesFormName,
  getSpesAppointmentTiming,
  getSpesBeneficiaryType,
  groupSpesDrawPool,
  hasAllSpesCompletionReports,
} from '@/helpers/peso/provincialPeso/spesHelper'
import type {
  SpesAppointee,
  SpesAppointmentDetails,
  SpesAppointmentEntry,
  SpesAppointmentUpdate,
  SpesBeneficiary,
  SpesConcludeStatus,
  SpesFormInsert,
  SpesFormReview,
  SpesFormRow,
  SpesFormUpdate,
  SpesLinkableJobseeker,
} from '@/types/peso/provincialPeso/spes'
import {
  SPES_COMPLETION_REPORTS,
  type SpesCompletionReportMap,
  type SpesCompletionReportType,
  type SpesDocumentAttachmentMap,
  type SpesDocumentKey,
  type SpesPendingAttachmentMap,
} from '@/types/common/spesForm'

export const useSpesStore = defineStore('pesoSpes', () => {
  const toastAlert = useToastAlert()
  const authStore = useAuthStore()

  // ─── State ───
  /** SPES applicants — every submitted SPES form (`applicants.spes_form`). */
  const spesForms = ref<SpesFormRow[]>([])
  /** Beneficiaries (`esmdd.spes`) with all of their yearly appointments. */
  const spesBeneficiaries = ref<SpesBeneficiary[]>([])
  /** SPES year shown on the dashboard — each year is its own batch of appointments. */
  const selectedYear = ref(new Date().getFullYear())
  const jobseekers = ref<SpesLinkableJobseeker[]>([])

  const isLoadingForms = ref(false)
  const isLoadingBeneficiaries = ref(false)
  const isLoadingJobseekers = ref(false)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)
  const formsError = ref<string | null>(null)
  /** Requirement attachments of the form being reviewed / edited. */
  const formAttachments = ref<SpesDocumentAttachmentMap>({})
  const attachmentsFormId = ref<string | null>(null)
  const isLoadingAttachments = ref(false)
  const beneficiariesError = ref<string | null>(null)
  /** Requirements with a file attached, per Pending form — decides who enters the randomizer draw. */
  const attachedDocKeysByForm = ref<Record<string, SpesDocumentKey[]>>({})
  const isLoadingDrawPool = ref(false)
  /** DTR / Accomplishment Report per appointment id. */
  const completionReports = ref<Record<string, SpesCompletionReportMap>>({})
  const isLoadingReports = ref(false)
  /** Report currently uploading or being removed. */
  const busyReportType = ref<SpesCompletionReportType | null>(null)

  // ─── UI Flags: SPES Applicants ───
  const viewingForm = ref<SpesFormRow | null>(null)
  const reviewingForm = ref<SpesFormRow | null>(null)
  const spesFormToDelete = ref<SpesFormRow | null>(null)

  // ─── UI Flags: SPES Appointments ───
  const isAppointmentFormOpen = ref(false)
  const editingAppointment = ref<SpesAppointmentEntry | null>(null)
  /** Appointee chosen before the form opens (re-appointing from the history dialog). */
  const presetAppointee = ref<SpesAppointee | null>(null)
  const concludingAppointment = ref<SpesAppointmentEntry | null>(null)
  const appointmentToDelete = ref<SpesAppointmentEntry | null>(null)
  const historySpesId = ref<string | null>(null)
  const reportsAppointmentId = ref<string | null>(null)

  // ─── UI Flags: Randomizer ───
  const isDrawOpen = ref(false)

  // ─── Getters ───
  /** Approved applicants not yet enrolled — the choices for "Add Beneficiary". */
  const enrollableApplicants = computed(() => {
    const enrolled = new Set(spesBeneficiaries.value.map((spes) => spes.application_id))
    return spesForms.value.filter((form) => form.status?.toLowerCase() === 'approved' && !enrolled.has(form.id))
  })

  /** Years that have appointments, plus the current and selected year, newest first. */
  const availableYears = computed(() => {
    const years = new Set([new Date().getFullYear(), selectedYear.value])
    for (const spes of spesBeneficiaries.value) {
      for (const appointment of spes.appointments) years.add(appointment.spes_year)
    }
    return [...years].sort((a, b) => b - a)
  })

  /** Appointments of the selected SPES year with their beneficiary, availment number and timing. */
  const yearAppointments = computed<SpesAppointmentEntry[]>(() =>
    spesBeneficiaries.value.flatMap((spes) => {
      const appointment = spes.appointments.find((a) => a.spes_year === selectedYear.value)
      if (!appointment) return []
      const availmentNumber = spes.appointments.filter((a) => a.spes_year <= appointment.spes_year).length
      return [{ ...appointment, ...getSpesAppointmentTiming(appointment), beneficiary: spes, availmentNumber }]
    })
  )

  /** Former beneficiaries not yet appointed for the selected year — they can become SPES again. */
  const reappointableBeneficiaries = computed(() =>
    spesBeneficiaries.value.filter((spes) => !spes.appointments.some((a) => a.spes_year === selectedYear.value))
  )

  /** Pending applicants with all 5 documents attached, grouped by municipality. */
  const drawPool = computed(() => groupSpesDrawPool(spesForms.value, attachedDocKeysByForm.value))

  /** Appointment whose completion reports dialog is open. */
  const reportsAppointment = computed(
    () => yearAppointments.value.find((entry) => entry.id === reportsAppointmentId.value) ?? null
  )

  const historyBeneficiary = computed(
    () => spesBeneficiaries.value.find((spes) => spes.id === historySpesId.value) ?? null
  )

  function replaceBeneficiary(updated: SpesBeneficiary) {
    const exists = spesBeneficiaries.value.some((spes) => spes.id === updated.id)
    spesBeneficiaries.value = exists
      ? spesBeneficiaries.value.map((spes) => (spes.id === updated.id ? updated : spes))
      : [updated, ...spesBeneficiaries.value]
  }

  /** Replaces a form everywhere it is shown (applicant list and joined beneficiary rows). */
  function syncForm(updated: SpesFormRow) {
    spesForms.value = spesForms.value.map((form) => (form.id === updated.id ? updated : form))
    spesBeneficiaries.value = spesBeneficiaries.value.map((spes) =>
      spes.application_id === updated.id ? { ...spes, spes_form: updated } : spes
    )
  }

  // ─── Actions: Fetch ───
  async function fetchSpesForms(): Promise<void> {
    isLoadingForms.value = true
    formsError.value = null
    try {
      spesForms.value = await spesService.fetchSpesForms()
    } catch (error: any) {
      formsError.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingForms.value = false
    }
  }

  async function fetchSpesBeneficiaries(): Promise<void> {
    isLoadingBeneficiaries.value = true
    beneficiariesError.value = null
    try {
      spesBeneficiaries.value = await spesService.fetchBeneficiaries()
    } catch (error: any) {
      beneficiariesError.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingBeneficiaries.value = false
    }
  }

  async function fetchJobseekers(): Promise<void> {
    isLoadingJobseekers.value = true
    try {
      jobseekers.value = await spesService.fetchLinkableJobseekers()
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingJobseekers.value = false
    }
  }

  /** Loads one form for the entry page; null when it could not be loaded. */
  async function fetchSpesFormById(formId: string): Promise<SpesFormRow | null> {
    isLoadingForms.value = true
    try {
      return await spesService.fetchSpesFormById(formId)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return null
    } finally {
      isLoadingForms.value = false
    }
  }

  async function fetchFormAttachments(formId: string): Promise<void> {
    attachmentsFormId.value = formId
    formAttachments.value = {}
    isLoadingAttachments.value = true
    try {
      const attachments = await spesAttachmentService.fetchAttachments(formId)
      // Ignore a slower response for a form that is no longer open
      if (attachmentsFormId.value === formId) formAttachments.value = attachments
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      if (attachmentsFormId.value === formId) isLoadingAttachments.value = false
    }
  }

  /**
   * Uploads the picked files and drops attachments of unchecked requirements. Attachments are
   * optional for PESO, so a failure is reported without undoing the saved form.
   */
  async function syncFormAttachments(form: SpesFormRow, pendingAttachments: SpesPendingAttachmentMap) {
    try {
      const uploaderId = authStore.user?.id
      if (!uploaderId) throw new Error('Your session has expired. Sign in again to upload attachments.')
      const checked: Partial<Record<SpesDocumentKey, boolean>> = form
      await spesAttachmentService.syncAttachments({
        formId: form.id,
        profileId: form.profile_id,
        uploaderId,
        checked,
        pending: pendingAttachments,
      })
    } catch (error: any) {
      toastAlert.error('Attachments not saved', `The SPES form was saved, but its attachments were not: ${error.message}`)
    }
  }

  // ─── Actions: Randomizer draw ───

  /** Reloads the applicants and which of the Pending ones have all 5 documents attached. */
  async function fetchDrawPool(): Promise<void> {
    isLoadingDrawPool.value = true
    try {
      spesForms.value = await spesService.fetchSpesForms()
      const pendingIds = spesForms.value
        .filter((form) => (form.status ?? 'Pending').toLowerCase() === 'pending')
        .map((form) => form.id)
      attachedDocKeysByForm.value = await spesAttachmentService.fetchAttachedKeysByForm(pendingIds)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingDrawPool.value = false
    }
  }

  /** Approves the drawn applicants so they can be given an appointment; the others stay Pending. */
  async function approveDrawWinners(formIds: string[], municipality: string): Promise<boolean> {
    if (!formIds.length) return false
    isSubmitting.value = true
    try {
      const approved = await spesService.approveDrawnForms(formIds, buildSpesDrawRemark(municipality))
      approved.forEach(syncForm)
      const skipped = formIds.length - approved.length
      toastAlert.success(
        'Applicants selected',
        `${approved.length} applicant(s) from ${municipality} are approved and ready for appointment.` +
          (skipped ? ` ${skipped} were already reviewed and were left unchanged.` : '')
      )
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Actions: Completion reports (DTR / Accomplishment Report) ───

  async function fetchCompletionReports(appointmentIds: string[]): Promise<void> {
    if (!appointmentIds.length) return
    isLoadingReports.value = true
    try {
      const reports = await spesCompletionReportService.fetchReports(appointmentIds)
      const next = { ...completionReports.value }
      for (const id of appointmentIds) next[id] = reports[id] ?? {}
      completionReports.value = next
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isLoadingReports.value = false
    }
  }

  async function uploadCompletionReport(type: SpesCompletionReportType, file: File): Promise<boolean> {
    const target = reportsAppointment.value
    const uploaderId = authStore.user?.id
    if (!target) return false
    if (!uploaderId) {
      toastAlert.error('Session expired', 'Sign in again to upload the report.')
      return false
    }

    busyReportType.value = type
    try {
      await spesCompletionReportService.uploadReport({ appointmentId: target.id, type, file, uploaderId })
      await fetchCompletionReports([target.id])
      const label = SPES_COMPLETION_REPORTS.find((report) => report.key === type)?.label ?? 'Report'
      toastAlert.success('Report uploaded', `${label} saved for ${formatSpesFormName(target.beneficiary.spes_form)}.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      busyReportType.value = null
    }
  }

  async function removeCompletionReport(type: SpesCompletionReportType): Promise<boolean> {
    const target = reportsAppointment.value
    const report = target ? completionReports.value[target.id]?.[type] : undefined
    if (!target || !report) return false

    busyReportType.value = type
    try {
      await spesCompletionReportService.removeReport(report.id, report.path)
      await fetchCompletionReports([target.id])
      toastAlert.success('Report removed', 'Upload a new PDF before marking the appointment as Completed.')
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      busyReportType.value = null
    }
  }

  // ─── Actions: SPES Applicants (applicants.spes_form) ───
  async function createSpesForm(payload: SpesFormInsert, pendingAttachments: SpesPendingAttachmentMap = {}): Promise<boolean> {
    isSubmitting.value = true
    try {
      const created = await spesService.createSpesForm(payload)
      spesForms.value = [created, ...spesForms.value]
      await syncFormAttachments(created, pendingAttachments)
      toastAlert.success('Applicant added', `${formatSpesFormName(created)} has been added as a SPES applicant.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateSpesForm(
    formId: string,
    payload: SpesFormUpdate,
    pendingAttachments: SpesPendingAttachmentMap = {}
  ): Promise<boolean> {
    isSubmitting.value = true
    try {
      const updated = await spesService.updateSpesForm(formId, payload)
      syncForm(updated)
      await syncFormAttachments(updated, pendingAttachments)
      toastAlert.success('SPES form updated', `${formatSpesFormName(updated)}'s SPES form has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function reviewSpesForm(review: SpesFormReview): Promise<boolean> {
    const target = reviewingForm.value
    if (!target) return false

    isSubmitting.value = true
    try {
      const updated = await spesService.reviewSpesForm(target.id, review)
      syncForm(updated)
      reviewingForm.value = null
      toastAlert.success('Applicant updated', `${formatSpesFormName(updated)} is now ${updated.status}.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteSpesForm(): Promise<boolean> {
    const target = spesFormToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      // Collect the attachment paths first: the requirement / media rows cascade with the form
      const filePaths = await spesAttachmentService.fetchFilePaths(target.id)
      await spesService.deleteSpesForm(target.id)
      await spesAttachmentService.removeFiles(filePaths)
      // The beneficiary record is cascade-deleted with the form
      spesForms.value = spesForms.value.filter((form) => form.id !== target.id)
      spesBeneficiaries.value = spesBeneficiaries.value.filter((spes) => spes.application_id !== target.id)
      spesFormToDelete.value = null
      toastAlert.success('Applicant deleted', `${formatSpesFormName(target)}'s SPES application has been deleted.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── Actions: SPES Appointments ───

  /**
   * Appoints someone for a SPES year: an approved applicant is enrolled as a beneficiary first,
   * a former beneficiary just gets a new appointment for the year.
   */
  async function appointSpes(appointee: SpesAppointee, details: SpesAppointmentDetails): Promise<boolean> {
    isSubmitting.value = true
    try {
      const decidedBy = authStore.user?.id ?? null
      let updated: SpesBeneficiary
      if (appointee.kind === 'applicant') {
        const form = spesForms.value.find((f) => f.id === appointee.formId) ?? null
        updated = await spesService.enrollBeneficiary(appointee.formId, getSpesBeneficiaryType(form), details, decidedBy)
      } else {
        await spesService.createAppointment(appointee.spesId, details, decidedBy)
        updated = await spesService.fetchBeneficiaryById(appointee.spesId)
      }
      replaceBeneficiary(updated)
      closeAppointmentDialog(true)
      toastAlert.success(
        'SPES appointment saved',
        `${formatSpesFormName(updated.spes_form)} has been appointed for SPES ${details.spes_year}.`
      )
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateAppointment(payload: SpesAppointmentUpdate): Promise<boolean> {
    const target = editingAppointment.value
    if (!target) return false

    isSubmitting.value = true
    try {
      await spesService.updateAppointment(target.id, payload)
      const updated = await spesService.fetchBeneficiaryById(target.spes_id)
      replaceBeneficiary(updated)
      closeAppointmentDialog(true)
      toastAlert.success('Appointment updated', `${formatSpesFormName(updated.spes_form)}'s SPES appointment has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function concludeAppointment(status: SpesConcludeStatus, notes: string | null): Promise<boolean> {
    const target = concludingAppointment.value
    if (!target) return false
    // Also enforced by the trg_spes_appointment_guard_completion trigger (migration 016)
    if (status === 'Completed' && !hasAllSpesCompletionReports(completionReports.value[target.id])) {
      toastAlert.error(
        'Reports required',
        'Upload the DTR and Accomplishment Report (PDF) before marking this appointment as Completed.'
      )
      return false
    }

    isSubmitting.value = true
    try {
      await spesService.concludeAppointment(target.id, status, notes, authStore.user?.id ?? null)
      const updated = await spesService.fetchBeneficiaryById(target.spes_id)
      replaceBeneficiary(updated)
      concludingAppointment.value = null
      toastAlert.success(
        'Appointment concluded',
        `${formatSpesFormName(updated.spes_form)}'s SPES ${target.spes_year} appointment is now ${status}.`
      )
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Removes an appointment. When it was the beneficiary's only one, the beneficiary record goes
   * too, so the approved applicant can be enrolled again from scratch.
   */
  async function deleteAppointment(): Promise<boolean> {
    const target = appointmentToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      // Collect the report paths first: the report rows cascade with the appointment
      const reportPaths = await spesCompletionReportService.fetchFilePaths([target.id])
      await spesService.deleteAppointment(target.id)
      await spesCompletionReportService.removeFiles(reportPaths)
      const name = formatSpesFormName(target.beneficiary.spes_form)
      if (target.beneficiary.appointments.length <= 1) {
        await spesService.deleteSpes(target.spes_id)
        spesBeneficiaries.value = spesBeneficiaries.value.filter((spes) => spes.id !== target.spes_id)
      } else {
        replaceBeneficiary(await spesService.fetchBeneficiaryById(target.spes_id))
      }
      appointmentToDelete.value = null
      toastAlert.success('Appointment removed', `${name} has been removed from SPES ${target.spes_year}.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── UI Actions: SPES Applicants ───
  function openApplicantDetails(row: SpesFormRow) {
    viewingForm.value = row
  }

  function closeApplicantDetails() {
    viewingForm.value = null
  }

  function openReviewDialog(row: SpesFormRow) {
    reviewingForm.value = row
    void fetchFormAttachments(row.id)
  }

  function closeReviewDialog() {
    if (isSubmitting.value) return
    reviewingForm.value = null
  }

  function requestDeleteSpesForm(row: SpesFormRow) {
    spesFormToDelete.value = row
  }

  function cancelDeleteSpesForm() {
    if (isDeleting.value) return
    spesFormToDelete.value = null
  }

  // ─── UI Actions: SPES Appointments ───
  function setSelectedYear(year: number) {
    selectedYear.value = year
  }

  function openAppointDialog(appointee: SpesAppointee | null = null) {
    editingAppointment.value = null
    presetAppointee.value = appointee
    isAppointmentFormOpen.value = true
  }

  function openEditAppointmentDialog(entry: SpesAppointmentEntry) {
    presetAppointee.value = null
    editingAppointment.value = entry
    isAppointmentFormOpen.value = true
  }

  function closeAppointmentDialog(force = false) {
    if (isSubmitting.value && !force) return
    isAppointmentFormOpen.value = false
    editingAppointment.value = null
    presetAppointee.value = null
  }

  function openConcludeDialog(entry: SpesAppointmentEntry) {
    concludingAppointment.value = entry
    // Completed needs both reports, so make sure they are current
    void fetchCompletionReports([entry.id])
  }

  function closeConcludeDialog() {
    if (isSubmitting.value) return
    concludingAppointment.value = null
  }

  function requestDeleteAppointment(entry: SpesAppointmentEntry) {
    appointmentToDelete.value = entry
  }

  function cancelDeleteAppointment() {
    if (isDeleting.value) return
    appointmentToDelete.value = null
  }

  function openReportsDialog(entry: SpesAppointmentEntry) {
    reportsAppointmentId.value = entry.id
    void fetchCompletionReports([entry.id])
  }

  function closeReportsDialog() {
    if (busyReportType.value) return
    reportsAppointmentId.value = null
  }

  // ─── UI Actions: Randomizer ───
  function openDrawDialog() {
    isDrawOpen.value = true
    void fetchDrawPool()
  }

  function closeDrawDialog() {
    if (isSubmitting.value) return
    isDrawOpen.value = false
  }

  function openHistoryDialog(spesId: string) {
    historySpesId.value = spesId
  }

  function closeHistoryDialog() {
    historySpesId.value = null
  }

  return {
    spesForms,
    spesBeneficiaries,
    jobseekers,
    isLoadingForms,
    isLoadingBeneficiaries,
    isLoadingJobseekers,
    isSubmitting,
    isDeleting,
    formsError,
    beneficiariesError,
    formAttachments,
    isLoadingAttachments,
    viewingForm,
    reviewingForm,
    spesFormToDelete,
    selectedYear,
    isAppointmentFormOpen,
    editingAppointment,
    presetAppointee,
    concludingAppointment,
    appointmentToDelete,
    historyBeneficiary,
    availableYears,
    yearAppointments,
    reappointableBeneficiaries,
    enrollableApplicants,
    drawPool,
    isLoadingDrawPool,
    isDrawOpen,
    completionReports,
    isLoadingReports,
    busyReportType,
    reportsAppointment,
    fetchDrawPool,
    approveDrawWinners,
    fetchCompletionReports,
    uploadCompletionReport,
    removeCompletionReport,
    openReportsDialog,
    closeReportsDialog,
    openDrawDialog,
    closeDrawDialog,
    fetchSpesForms,
    fetchSpesBeneficiaries,
    fetchJobseekers,
    fetchSpesFormById,
    fetchFormAttachments,
    createSpesForm,
    updateSpesForm,
    reviewSpesForm,
    deleteSpesForm,
    appointSpes,
    updateAppointment,
    concludeAppointment,
    deleteAppointment,
    openApplicantDetails,
    closeApplicantDetails,
    openReviewDialog,
    closeReviewDialog,
    requestDeleteSpesForm,
    cancelDeleteSpesForm,
    setSelectedYear,
    openAppointDialog,
    openEditAppointmentDialog,
    closeAppointmentDialog,
    openConcludeDialog,
    closeConcludeDialog,
    requestDeleteAppointment,
    cancelDeleteAppointment,
    openHistoryDialog,
    closeHistoryDialog,
  }
})
