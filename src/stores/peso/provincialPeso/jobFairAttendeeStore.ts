import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { jobFairApplicantService } from '@/services/peso/provincialPeso/jobFairApplicantService'
import { jobFairService } from '@/services/peso/provincialPeso/jobFairService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { formatRegistryName } from '@/helpers/peso/provincialPeso/jobFairHelper'
import type {
  JobFairApplicantInsert,
  JobFairApplicantStatus,
  JobFairApplicantUpdate,
  JobFairAttendee,
  JobFairRegistryApplicant,
} from '@/types/peso/provincialPeso/jobFair'

const attendeeName = (row: JobFairAttendee) => (row.applicant ? formatRegistryName(row.applicant) : 'The applicant')

export const useJobFairAttendeeStore = defineStore('pesoJobFairAttendee', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const jobFairId = ref<string | null>(null)
  const attendees = ref<JobFairAttendee[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)
  /** Row whose status is being toggled from the table. */
  const updatingStatusId = ref<string | null>(null)

  // ─── UI Flags ───
  const isFormDialogOpen = ref(false)
  const editingAttendee = ref<JobFairAttendee | null>(null)
  /** Rows awaiting delete confirmation: one from a row action, or the bulk selection. */
  const attendeesToDelete = shallowRef<JobFairAttendee[]>([])

  // ─── Actions ───
  async function loadAttendees(fairId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    if (jobFairId.value !== fairId) {
      jobFairId.value = fairId
      attendees.value = []
    }
    try {
      attendees.value = await jobFairApplicantService.fetchAttendees(fairId)
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Reloads the current job fair's attendees, e.g. after a hire marked someone Attended. */
  function reloadAttendees(): void {
    if (jobFairId.value) void loadAttendees(jobFairId.value)
  }

  async function createAttendee(payload: JobFairApplicantInsert): Promise<boolean> {
    isSubmitting.value = true
    try {
      const created = await jobFairApplicantService.createAttendee(payload)
      attendees.value = [created, ...attendees.value]
      isFormDialogOpen.value = false
      toastAlert.success('Attendee added', `${attendeeName(created)} was added as ${created.status}.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateAttendee(attendeeId: string, payload: JobFairApplicantUpdate): Promise<boolean> {
    isSubmitting.value = true
    try {
      const updated = await jobFairApplicantService.updateAttendee(attendeeId, payload)
      attendees.value = attendees.value.map((row) => (row.id === updated.id ? updated : row))
      isFormDialogOpen.value = false
      editingAttendee.value = null
      toastAlert.success('Attendee updated', `${attendeeName(updated)}'s record has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function setAttendeeStatus(row: JobFairAttendee, status: JobFairApplicantStatus): Promise<void> {
    updatingStatusId.value = row.id
    try {
      const updated = await jobFairApplicantService.updateAttendee(row.id, { status })
      attendees.value = attendees.value.map((item) => (item.id === updated.id ? updated : item))
      toastAlert.success('Attendance updated', `${attendeeName(updated)} is now marked ${status}.`)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      updatingStatusId.value = null
    }
  }

  /** Removes the pending attendees and returns the ids actually deleted. */
  async function deleteAttendees(): Promise<string[]> {
    const targets = attendeesToDelete.value
    if (targets.length === 0) return []

    isDeleting.value = true
    try {
      const deletedIds = new Set(await jobFairApplicantService.deleteAttendees(targets.map((row) => row.id)))
      attendees.value = attendees.value.filter((row) => !deletedIds.has(row.id))
      attendeesToDelete.value = []

      if (targets.length === 1 && deletedIds.size === 1) {
        toastAlert.success('Attendee removed', `${attendeeName(targets[0]!)} has been removed from this job fair.`)
      } else if (deletedIds.size > 0) {
        toastAlert.success('Attendees removed', `${deletedIds.size} attendee(s) removed from this job fair.`)
      }
      const skipped = targets.length - deletedIds.size
      if (skipped > 0) toastAlert.error(`${skipped} attendee(s) not removed`, 'Refresh the list and try again.')
      return [...deletedIds]
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return []
    } finally {
      isDeleting.value = false
    }
  }

  /** Registry lookup for the attendee form; errors are surfaced as a toast and yield no results. */
  async function searchRegistryApplicants(term: string): Promise<JobFairRegistryApplicant[]> {
    try {
      return await jobFairService.searchRegistryApplicants(term)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return []
    }
  }

  // ─── UI Actions ───
  function openCreateDialog() {
    editingAttendee.value = null
    isFormDialogOpen.value = true
  }

  function openEditDialog(row: JobFairAttendee) {
    editingAttendee.value = row
    isFormDialogOpen.value = true
  }

  function closeFormDialog() {
    isFormDialogOpen.value = false
    editingAttendee.value = null
  }

  function requestDelete(rows: JobFairAttendee[]) {
    attendeesToDelete.value = rows
  }

  function cancelDelete() {
    if (isDeleting.value) return
    attendeesToDelete.value = []
  }

  return {
    jobFairId,
    attendees,
    isLoading,
    errorMessage,
    isSubmitting,
    isDeleting,
    updatingStatusId,
    isFormDialogOpen,
    editingAttendee,
    attendeesToDelete,
    loadAttendees,
    reloadAttendees,
    createAttendee,
    updateAttendee,
    setAttendeeStatus,
    deleteAttendees,
    searchRegistryApplicants,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    requestDelete,
    cancelDelete,
  }
})
