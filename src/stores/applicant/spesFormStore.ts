import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { spesFormService } from '@/services/applicant/spesFormService'
import { spesAttachmentService } from '@/services/common/spesAttachmentService'
import { spesCompletionReportService } from '@/services/common/spesCompletionReportService'
import { mediaService } from '@/services/common/mediaService'
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
  type SpesReusedAttachmentMap,
} from '@/types/common/spesForm'
import type { SpesProfilingOptions, SpesProfilingSource } from '@/helpers/common/spesProfilingFormHelper'

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
  const isGeneratingSpesForm = ref(false)

  // ─── Getters ───
  /** PESO's review of the form — status / remarks live on the form itself. */
  const applicationRecord = computed<SpesApplicationRecord | null>(() => {
    const form = myForm.value
    if (!form) return null
    return { id: form.id, status: form.status, remarks: form.remarks, created_at: form.created_at, updated_at: form.updated_at }
  })

  /** PESO has finished reviewing the application, so its files can no longer be changed (details still can). */
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

  /** Saved SPES details can change at any time; the review fields stay PESO's (guard, migration 067). */
  async function saveDetails(payload: Omit<SpesFormInsert, 'profile_id'>): Promise<boolean> {
    if (!myForm.value) return false
    isSubmitting.value = true
    try {
      myForm.value = await spesFormService.updateForm(myForm.value.id, payload)
      toastAlert.success('Details saved', 'Your SPES details are updated for this and future applications.')
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /** Requirement files of the current round; ticks each document that has one. */
  async function syncDocuments(
    profileId: string,
    checked: Record<SpesDocumentKey, boolean>,
    pending: SpesPendingAttachmentMap,
    reused: SpesReusedAttachmentMap
  ): Promise<void> {
    const form = myForm.value!
    myForm.value = await spesFormService.updateForm(form.id, checked)
    try {
      await spesAttachmentService.syncAttachments({ formId: form.id, profileId, uploaderId: profileId, checked, pending, reused })
    } finally {
      attachments.value = await spesAttachmentService.fetchAttachments(form.id)
    }
  }

  /**
   * Submits an application: the first one saves the SPES details too, a later round reuses them
   * (reapply_spes_form), and a Pending one only updates its files.
   */
  async function submitApplication(options: {
    profileId: string
    /** Details of a first application; null when they are already saved */
    details: Omit<SpesFormInsert, 'profile_id'> | null
    isReapplying: boolean
    checked: Record<SpesDocumentKey, boolean>
    pending: SpesPendingAttachmentMap
    reused: SpesReusedAttachmentMap
  }): Promise<boolean> {
    const { profileId, details, isReapplying, checked, pending, reused } = options
    isSubmitting.value = true
    try {
      const isNew = !myForm.value
      if (!myForm.value) {
        if (!details) throw new Error('Fill in your SPES details first.')
        myForm.value = await spesFormService.createForm({ ...details, ...checked, profile_id: profileId })
      } else if (isReapplying) {
        myForm.value = await spesFormService.reapply()
      }
      await syncDocuments(profileId, checked, pending, reused)

      if (isNew || isReapplying) toastAlert.success('Application submitted', 'PESO will review your SPES application.')
      else toastAlert.success('Documents saved', 'PESO will review your updated files.')
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

  /** The applicant's profile picture as a file, to attach as their passport size ID picture; null without one */
  async function fetchProfilePictureFile(profileId: string): Promise<File | null> {
    try {
      return await mediaService.fetchProfilePictureFile(profileId)
    } catch (error: unknown) {
      toastAlert.error('Profile picture not attached', (error instanceof Error && error.message) || 'Please upload a picture instead.')
      return null
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

  /**
   * Builds the SPES form PDF from the applicant's SPES details (saved, or entered in this application).
   * The PDF libraries load only when asked. Returns null on failure.
   */
  async function generateSpesFormPdf(source: SpesProfilingSource, options: SpesProfilingOptions = {}): Promise<File | null> {
    isGeneratingSpesForm.value = true
    try {
      const { generateSpesProfilingFormPdfFile } = await import('@/helpers/common/spesProfilingFormHelper')
      return await generateSpesProfilingFormPdfFile(source, options)
    } catch (error: unknown) {
      console.error('Failed to generate SPES form PDF:', error)
      toastAlert.error('SPES form not generated', (error instanceof Error && error.message) || 'Please try again.')
      return null
    } finally {
      isGeneratingSpesForm.value = false
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
    isGeneratingSpesForm,
    fetchMyForm,
    generateSpesFormPdf,
    fetchProfilePictureFile,
    saveDetails,
    submitApplication,
    uploadCompletionReport,
    removeCompletionReport,
  }
})
