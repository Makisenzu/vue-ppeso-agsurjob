import { ref } from 'vue'
import { defineStore } from 'pinia'
import { jobFairService } from '@/services/peso/provincialPeso/jobFairService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type {
  JobFairParticipantInsert,
  JobFairParticipantRow,
  JobFairParticipantUpdate,
  JobFairParticipantWithCount,
  JobFairRow,
  JobVacancyInsert,
  JobVacancyRow,
  JobVacancyUpdate,
} from '@/types/peso/provincialPeso/jobFair'

export const useJobFairParticipantStore = defineStore('pesoJobFairParticipant', () => {
  const toastAlert = useToastAlert()

  // ─── State: Job Fair + Participants ───
  const jobFair = ref<JobFairRow | null>(null)
  const participants = ref<JobFairParticipantWithCount[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)

  // ─── State: Participant Vacancies ───
  const participant = ref<JobFairParticipantRow | null>(null)
  const vacancies = ref<JobVacancyRow[]>([])
  const isVacanciesLoading = ref(false)
  const vacanciesErrorMessage = ref<string | null>(null)

  // ─── UI Flags ───
  const isFormDialogOpen = ref(false)
  const editingParticipant = ref<JobFairParticipantWithCount | null>(null)
  const participantToDelete = ref<JobFairParticipantWithCount | null>(null)
  const isVacancyFormOpen = ref(false)
  const editingVacancy = ref<JobVacancyRow | null>(null)
  const vacancyToDelete = ref<JobVacancyRow | null>(null)

  // ─── Actions: Job Fair + Participants ───
  async function loadJobFair(jobFairId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    if (jobFair.value?.id !== jobFairId) {
      jobFair.value = null
      participants.value = []
    }
    try {
      const [fair, rows] = await Promise.all([
        jobFairService.fetchJobFairById(jobFairId),
        jobFairService.fetchParticipants(jobFairId),
      ])
      jobFair.value = fair
      participants.value = rows
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  async function createParticipant(payload: JobFairParticipantInsert): Promise<boolean> {
    isSubmitting.value = true
    try {
      const created = await jobFairService.createParticipant(payload)
      participants.value = [...participants.value, created].sort((a, b) =>
        a.business_name.localeCompare(b.business_name)
      )
      isFormDialogOpen.value = false
      toastAlert.success('Participant added', `${created.business_name} has been added to the job fair.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateParticipant(participantId: string, payload: JobFairParticipantUpdate): Promise<boolean> {
    isSubmitting.value = true
    try {
      const updated = await jobFairService.updateParticipant(participantId, payload)
      participants.value = participants.value.map((p) => (p.id === updated.id ? updated : p))
      if (participant.value?.id === updated.id) participant.value = updated
      isFormDialogOpen.value = false
      editingParticipant.value = null
      toastAlert.success('Participant updated', `${updated.business_name} has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteParticipant(): Promise<boolean> {
    const target = participantToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      await jobFairService.deleteParticipant(target.id)
      participants.value = participants.value.filter((p) => p.id !== target.id)
      participantToDelete.value = null
      toastAlert.success('Participant deleted', `${target.business_name} has been removed from the job fair.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── Actions: Participant Vacancies ───
  async function loadParticipantVacancies(jobFairId: string, participantId: string): Promise<void> {
    isVacanciesLoading.value = true
    vacanciesErrorMessage.value = null
    if (participant.value?.id !== participantId) {
      participant.value = null
      vacancies.value = []
    }
    try {
      const [fair, owner, rows] = await Promise.all([
        jobFair.value?.id === jobFairId ? Promise.resolve(jobFair.value) : jobFairService.fetchJobFairById(jobFairId),
        jobFairService.fetchParticipantById(jobFairId, participantId),
        jobFairService.fetchParticipantVacancies(jobFairId, participantId),
      ])
      jobFair.value = fair
      participant.value = owner
      vacancies.value = rows
    } catch (error: any) {
      vacanciesErrorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isVacanciesLoading.value = false
    }
  }

  /** Keeps the cached vacancy count on the participants table in sync. */
  function syncParticipantVacancyCount(participantId: string) {
    const count = vacancies.value.length
    participants.value = participants.value.map((p) =>
      p.id === participantId ? { ...p, job_vacancies: [{ count }] } : p
    )
  }

  async function createVacancy(payload: JobVacancyInsert): Promise<boolean> {
    isSubmitting.value = true
    try {
      const created = await jobFairService.createVacancy(payload)
      vacancies.value = [...vacancies.value, created].sort((a, b) => a.position_title.localeCompare(b.position_title))
      syncParticipantVacancyCount(created.participant_id)
      isVacancyFormOpen.value = false
      toastAlert.success('Vacancy added', `${created.position_title} has been added.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function updateVacancy(vacancyId: string, payload: JobVacancyUpdate): Promise<boolean> {
    isSubmitting.value = true
    try {
      const updated = await jobFairService.updateVacancy(vacancyId, payload)
      vacancies.value = vacancies.value.map((v) => (v.id === updated.id ? updated : v))
      isVacancyFormOpen.value = false
      editingVacancy.value = null
      toastAlert.success('Vacancy updated', `${updated.position_title} has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  async function deleteVacancy(): Promise<boolean> {
    const target = vacancyToDelete.value
    if (!target) return false

    isDeleting.value = true
    try {
      await jobFairService.deleteVacancy(target.id)
      vacancies.value = vacancies.value.filter((v) => v.id !== target.id)
      syncParticipantVacancyCount(target.participant_id)
      vacancyToDelete.value = null
      toastAlert.success('Vacancy deleted', `${target.position_title} has been deleted.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ─── UI Actions ───
  function openCreateDialog() {
    editingParticipant.value = null
    isFormDialogOpen.value = true
  }

  function openEditDialog(row: JobFairParticipantWithCount) {
    editingParticipant.value = row
    isFormDialogOpen.value = true
  }

  function closeFormDialog() {
    isFormDialogOpen.value = false
    editingParticipant.value = null
  }

  function requestDelete(row: JobFairParticipantWithCount) {
    participantToDelete.value = row
  }

  function cancelDelete() {
    if (isDeleting.value) return
    participantToDelete.value = null
  }

  function openCreateVacancyDialog() {
    editingVacancy.value = null
    isVacancyFormOpen.value = true
  }

  function openEditVacancyDialog(row: JobVacancyRow) {
    editingVacancy.value = row
    isVacancyFormOpen.value = true
  }

  function closeVacancyFormDialog() {
    isVacancyFormOpen.value = false
    editingVacancy.value = null
  }

  function requestVacancyDelete(row: JobVacancyRow) {
    vacancyToDelete.value = row
  }

  function cancelVacancyDelete() {
    if (isDeleting.value) return
    vacancyToDelete.value = null
  }

  return {
    jobFair,
    participants,
    isLoading,
    errorMessage,
    isSubmitting,
    isDeleting,
    participant,
    vacancies,
    isVacanciesLoading,
    vacanciesErrorMessage,
    isFormDialogOpen,
    editingParticipant,
    participantToDelete,
    loadJobFair,
    createParticipant,
    updateParticipant,
    deleteParticipant,
    loadParticipantVacancies,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    requestDelete,
    cancelDelete,
    isVacancyFormOpen,
    editingVacancy,
    vacancyToDelete,
    createVacancy,
    updateVacancy,
    deleteVacancy,
    openCreateVacancyDialog,
    openEditVacancyDialog,
    closeVacancyFormDialog,
    requestVacancyDelete,
    cancelVacancyDelete,
  }
})
