import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { spesFormService } from '@/services/applicant/spesFormService'
import { spesAttachmentService } from '@/services/common/spesAttachmentService'
import { spesCompletionReportService } from '@/services/common/spesCompletionReportService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import {
  SPES_COMPLETION_REPORTS,
  type SpesApplicationRecord,
  type SpesCompletionReportMap,
  type SpesCompletionReportType,
  type SpesDocumentAttachmentMap,
  type SpesDocumentKey,
  type SpesFormInsert,
  type SpesFormRow,
  type SpesOwnAppointment,
  type SpesPendingAttachmentMap,
} from '@/types/common/spesForm'

export const useSpesFormStore = defineStore('applicantSpesForm', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const myForm = ref<SpesFormRow | null>(null)
  const attachments = ref<SpesDocumentAttachmentMap>({})
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const errorMessage = ref<string | null>(null)
  /** SPES appointments of the form, newest year first — present once PESO appoints the applicant. */
  const myAppointments = ref<SpesOwnAppointment[]>([])
  /** DTR / Accomplishment Report of the current appointment. */
  const completionReports = ref<SpesCompletionReportMap>({})
  const busyReportType = ref<SpesCompletionReportType | null>(null)

  // ─── Getters ───
  /** PESO's review of the form — status / remarks live on the form itself. */
  const applicationRecord = computed<SpesApplicationRecord | null>(() => {
    const form = myForm.value
    if (!form) return null
    return { id: form.id, status: form.status, remarks: form.remarks, created_at: form.created_at, updated_at: form.updated_at }
  })

  /** PESO has finished reviewing the application, so the form can no longer be changed. */
  const isLocked = computed(() => {
    const status = (applicationRecord.value?.status ?? '').toLowerCase()
    return status === 'approved' || status === 'rejected'
  })

  /** The latest SPES year's appointment. */
  const currentAppointment = computed(() => myAppointments.value[0] ?? null)

  // ─── Actions ───
  async function loadAppointment(formId: string): Promise<void> {
    myAppointments.value = await spesFormService.fetchMyAppointments(formId)
    const appointment = myAppointments.value[0]
    completionReports.value = appointment
      ? (await spesCompletionReportService.fetchReports([appointment.id]))[appointment.id] ?? {}
      : {}
  }

  async function fetchMyForm(profileId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      myForm.value = await spesFormService.fetchMyForm(profileId)
      attachments.value = myForm.value ? await spesAttachmentService.fetchAttachments(myForm.value.id) : {}
      if (myForm.value) await loadAppointment(myForm.value.id)
      else {
        myAppointments.value = []
        completionReports.value = {}
      }
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  async function saveForm(
    profileId: string,
    payload: Omit<SpesFormInsert, 'profile_id'>,
    pendingAttachments: SpesPendingAttachmentMap = {}
  ): Promise<boolean> {
    if (isLocked.value) {
      toastAlert.error('Application locked', 'Your SPES application has already been reviewed by PESO.')
      return false
    }

    isSubmitting.value = true
    try {
      const isNew = !myForm.value
      myForm.value = myForm.value
        ? await spesFormService.updateForm(myForm.value.id, payload)
        : await spesFormService.createForm({ ...payload, profile_id: profileId })

      const checked: Partial<Record<SpesDocumentKey, boolean>> = payload
      try {
        await spesAttachmentService.syncAttachments({
          formId: myForm.value.id,
          profileId,
          uploaderId: profileId,
          checked,
          pending: pendingAttachments,
        })
      } finally {
        attachments.value = await spesAttachmentService.fetchAttachments(myForm.value.id)
      }

      if (isNew) toastAlert.success('Application submitted', 'PESO will review your SPES application form.')
      else toastAlert.success('Application updated', 'Your SPES application form has been updated.')
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /** Uploads the DTR / Accomplishment Report PDF of the current (Active) appointment. */
  async function uploadCompletionReport(profileId: string, type: SpesCompletionReportType, file: File): Promise<boolean> {
    const appointment = currentAppointment.value
    if (!appointment || appointment.status !== 'Active') {
      toastAlert.error('Upload closed', 'Reports can only be submitted while your SPES appointment is active.')
      return false
    }

    busyReportType.value = type
    try {
      await spesCompletionReportService.uploadReport({ appointmentId: appointment.id, type, file, uploaderId: profileId })
      completionReports.value = (await spesCompletionReportService.fetchReports([appointment.id]))[appointment.id] ?? {}
      const label = SPES_COMPLETION_REPORTS.find((report) => report.key === type)?.label ?? 'Report'
      toastAlert.success('Report submitted', `Your ${label} has been sent to PESO.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      busyReportType.value = null
    }
  }

  async function removeCompletionReport(type: SpesCompletionReportType): Promise<boolean> {
    const appointment = currentAppointment.value
    const report = completionReports.value[type]
    if (!appointment || !report) return false

    busyReportType.value = type
    try {
      await spesCompletionReportService.removeReport(report.id, report.path)
      completionReports.value = (await spesCompletionReportService.fetchReports([appointment.id]))[appointment.id] ?? {}
      toastAlert.success('Report removed', 'Upload the PDF again so PESO can complete your SPES.')
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      busyReportType.value = null
    }
  }

  return {
    myForm,
    attachments,
    applicationRecord,
    isLoading,
    isSubmitting,
    errorMessage,
    isLocked,
    myAppointments,
    currentAppointment,
    completionReports,
    busyReportType,
    fetchMyForm,
    saveForm,
    uploadCompletionReport,
    removeCompletionReport,
  }
})
