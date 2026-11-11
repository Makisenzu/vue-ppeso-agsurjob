import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { skillsTrainingService } from '@/services/peso/provincialPeso/skillsTrainingService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { SKILLS_TRAINING_PAGE_SIZE, errorMessageOf } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type {
  ParticipantStatusFormValues,
  SkillsTraining,
  SkillsTrainingCandidate,
  SkillsTrainingFilterOptions,
  SkillsTrainingFilters,
  SkillsTrainingFormValues,
  SkillsTrainingParticipant,
  SkillsTrainingParticipantFilters,
} from '@/types/peso/provincialPeso/skillsTraining'

const plural = (count: number, word: string) => `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`

/**
 * Skills Training → Trainings Conducted (migration 118): the trainings, one training with its participants,
 * and the applicants who can be added to it. Every list is one page from the server.
 */
export const useSkillsTrainingStore = defineStore('pesoSkillsTraining', () => {
  const toastAlert = useToastAlert()

  // ─── Trainings list ───
  const trainings = ref<SkillsTraining[]>([])
  const trainingTotal = ref(0)
  const trainingPage = ref(0)
  const trainingFilters = reactive<SkillsTrainingFilters>({ search: '', agency: 'ALL', skill: 'ALL', year: 'ALL' })
  const filterOptions = ref<SkillsTrainingFilterOptions>({ agencies: [], years: [] })
  const isLoadingTrainings = ref(false)
  const trainingsError = ref<string | null>(null)
  let trainingsRequest = 0

  async function loadTrainings(): Promise<void> {
    const current = ++trainingsRequest
    isLoadingTrainings.value = true
    trainingsError.value = null
    try {
      const page = await skillsTrainingService.searchTrainings(trainingFilters, trainingPage.value, SKILLS_TRAINING_PAGE_SIZE)
      if (current !== trainingsRequest) return
      // The last row of the last page was deleted: step back
      if (page.rows.length === 0 && trainingPage.value > 0) {
        trainingPage.value -= 1
        return loadTrainings()
      }
      trainings.value = page.rows
      trainingTotal.value = page.total
    } catch (error) {
      if (current === trainingsRequest) trainingsError.value = errorMessageOf(error, 'Could not load the trainings.')
    } finally {
      if (current === trainingsRequest) isLoadingTrainings.value = false
    }
  }

  async function loadFilterOptions(): Promise<void> {
    try {
      filterOptions.value = await skillsTrainingService.fetchFilterOptions()
    } catch {
      // The filters just keep the options they had
    }
  }

  function setTrainingPage(page: number) {
    trainingPage.value = Math.max(0, page)
    return loadTrainings()
  }

  /** Filters changed: back to the first page */
  function reloadTrainingsFromStart() {
    trainingPage.value = 0
    return loadTrainings()
  }

  // ─── Save / delete a training ───
  const isSavingTraining = ref(false)
  const isDeletingTrainings = ref(false)

  /** Creates (id null) or updates a training; returns its id, or null when it failed */
  async function saveTraining(id: string | null, values: SkillsTrainingFormValues): Promise<string | null> {
    isSavingTraining.value = true
    try {
      const savedId = await skillsTrainingService.saveTraining(id, values)
      toastAlert.success(id ? 'Training Updated' : 'Training Added', `"${values.title.trim()}" has been saved.`)
      void loadFilterOptions()
      await Promise.all([loadTrainings(), training.value?.id === savedId ? loadTraining(savedId) : Promise.resolve()])
      return savedId
    } catch (error) {
      toastAlert.error('Save Failed', errorMessageOf(error, 'Could not save the training.'))
      return null
    } finally {
      isSavingTraining.value = false
    }
  }

  /** Returns the ids removed; an empty list means nothing was deleted */
  async function deleteTrainings(ids: string[]): Promise<string[]> {
    if (ids.length === 0 || isDeletingTrainings.value) return []
    isDeletingTrainings.value = true
    try {
      const removed = await skillsTrainingService.removeTrainings(ids)
      const missed = ids.length - removed.length
      if (removed.length > 0) {
        toastAlert.success('Trainings Deleted', `${plural(removed.length, 'training')} deleted.${missed > 0 ? ` ${missed} could not be deleted.` : ''}`)
        void loadFilterOptions()
        await loadTrainings()
      } else {
        toastAlert.error('Delete Failed', 'The selected trainings could not be deleted.')
      }
      return removed
    } catch (error) {
      toastAlert.error('Delete Failed', errorMessageOf(error, 'Could not delete the trainings.'))
      return []
    } finally {
      isDeletingTrainings.value = false
    }
  }

  // ─── One training ───
  const training = ref<SkillsTraining | null>(null)
  const isLoadingTraining = ref(false)
  const trainingError = ref<string | null>(null)

  async function loadTraining(id: string): Promise<void> {
    isLoadingTraining.value = true
    trainingError.value = null
    try {
      const row = await skillsTrainingService.fetchTraining(id)
      if (!row) trainingError.value = 'This training no longer exists.'
      training.value = row
    } catch (error) {
      trainingError.value = errorMessageOf(error, 'Could not load the training.')
    } finally {
      isLoadingTraining.value = false
    }
  }

  // ─── Its participants ───
  const participants = ref<SkillsTrainingParticipant[]>([])
  const participantTotal = ref(0)
  const participantPage = ref(0)
  const participantFilters = reactive<SkillsTrainingParticipantFilters>({ search: '', completion: 'ALL', employment: 'ALL' })
  const isLoadingParticipants = ref(false)
  const participantsError = ref<string | null>(null)
  let participantsRequest = 0

  async function loadParticipants(): Promise<void> {
    const trainingId = training.value?.id
    if (!trainingId) return
    const current = ++participantsRequest
    isLoadingParticipants.value = true
    participantsError.value = null
    try {
      const page = await skillsTrainingService.searchParticipants(trainingId, participantFilters, participantPage.value, SKILLS_TRAINING_PAGE_SIZE)
      if (current !== participantsRequest) return
      if (page.rows.length === 0 && participantPage.value > 0) {
        participantPage.value -= 1
        return loadParticipants()
      }
      participants.value = page.rows
      participantTotal.value = page.total
    } catch (error) {
      if (current === participantsRequest) participantsError.value = errorMessageOf(error, 'Could not load the participants.')
    } finally {
      if (current === participantsRequest) isLoadingParticipants.value = false
    }
  }

  function setParticipantPage(page: number) {
    participantPage.value = Math.max(0, page)
    return loadParticipants()
  }

  function reloadParticipantsFromStart() {
    participantPage.value = 0
    return loadParticipants()
  }

  /** Opens a training: clears what the previous one left, then loads it and its first page of participants */
  async function openTraining(id: string): Promise<void> {
    if (training.value?.id !== id) training.value = null
    participants.value = []
    participantTotal.value = 0
    participantPage.value = 0
    Object.assign(participantFilters, { search: '', completion: 'ALL', employment: 'ALL' })
    await loadTraining(id)
    await loadParticipants()
  }

  /** The counts in the header and the list both change with the participants */
  const refreshTraining = () =>
    training.value ? Promise.all([loadTraining(training.value.id), loadParticipants()]) : Promise.resolve([])

  // ─── Applicants who can be added ───
  const candidates = ref<SkillsTrainingCandidate[]>([])
  const candidateTotal = ref(0)
  const candidatePage = ref(0)
  const candidateFilters = reactive({ search: '', municipality: 'ALL' })
  const isLoadingCandidates = ref(false)
  let candidatesRequest = 0

  async function loadCandidates(): Promise<void> {
    const trainingId = training.value?.id
    if (!trainingId) return
    const current = ++candidatesRequest
    isLoadingCandidates.value = true
    try {
      const page = await skillsTrainingService.searchCandidates(
        trainingId,
        candidateFilters.search,
        candidateFilters.municipality,
        candidatePage.value,
        SKILLS_TRAINING_PAGE_SIZE,
      )
      if (current !== candidatesRequest) return
      candidates.value = page.rows
      candidateTotal.value = page.total
    } catch (error) {
      if (current === candidatesRequest) toastAlert.error('Error', errorMessageOf(error, 'Could not load the applicants.'))
    } finally {
      if (current === candidatesRequest) isLoadingCandidates.value = false
    }
  }

  function setCandidatePage(page: number) {
    candidatePage.value = Math.max(0, page)
    return loadCandidates()
  }

  function reloadCandidatesFromStart() {
    candidatePage.value = 0
    return loadCandidates()
  }

  function resetCandidates() {
    candidatesRequest++
    candidates.value = []
    candidateTotal.value = 0
    candidatePage.value = 0
    Object.assign(candidateFilters, { search: '', municipality: 'ALL' })
  }

  // ─── Change participants ───
  const isSavingParticipants = ref(false)
  const isRemovingParticipants = ref(false)

  async function addParticipants(applicantIds: string[]): Promise<boolean> {
    const trainingId = training.value?.id
    if (!trainingId || applicantIds.length === 0) return false
    isSavingParticipants.value = true
    try {
      const added = await skillsTrainingService.addParticipants(trainingId, applicantIds)
      const skipped = applicantIds.length - added
      toastAlert.success('Participants Added', `${plural(added, 'participant')} added.${skipped > 0 ? ` ${skipped} already listed.` : ''}`)
      await refreshTraining()
      return true
    } catch (error) {
      toastAlert.error('Add Failed', errorMessageOf(error, 'Could not add the participants.'))
      return false
    } finally {
      isSavingParticipants.value = false
    }
  }

  async function updateParticipantStatus(participant: SkillsTrainingParticipant, values: ParticipantStatusFormValues): Promise<boolean> {
    isSavingParticipants.value = true
    try {
      await skillsTrainingService.updateParticipantStatus(participant.id, values)
      toastAlert.success('Status Updated', `${participant.full_name} is now ${values.employmentStatus}.`)
      await refreshTraining()
      return true
    } catch (error) {
      toastAlert.error('Update Failed', errorMessageOf(error, 'Could not update the status.'))
      return false
    } finally {
      isSavingParticipants.value = false
    }
  }

  /** Returns the ids removed; an empty list means nothing was removed */
  async function removeParticipants(ids: string[]): Promise<string[]> {
    if (ids.length === 0 || isRemovingParticipants.value) return []
    isRemovingParticipants.value = true
    try {
      const removed = await skillsTrainingService.removeParticipants(ids)
      const missed = ids.length - removed.length
      if (removed.length > 0) {
        toastAlert.success('Participants Removed', `${plural(removed.length, 'participant')} removed.${missed > 0 ? ` ${missed} could not be removed.` : ''}`)
        await refreshTraining()
      } else {
        toastAlert.error('Remove Failed', 'The selected participants could not be removed.')
      }
      return removed
    } catch (error) {
      toastAlert.error('Remove Failed', errorMessageOf(error, 'Could not remove the participants.'))
      return []
    } finally {
      isRemovingParticipants.value = false
    }
  }

  return {
    trainings,
    trainingTotal,
    trainingPage,
    trainingFilters,
    filterOptions,
    isLoadingTrainings,
    trainingsError,
    loadTrainings,
    loadFilterOptions,
    setTrainingPage,
    reloadTrainingsFromStart,
    isSavingTraining,
    isDeletingTrainings,
    saveTraining,
    deleteTrainings,
    training,
    isLoadingTraining,
    trainingError,
    loadTraining,
    openTraining,
    participants,
    participantTotal,
    participantPage,
    participantFilters,
    isLoadingParticipants,
    participantsError,
    loadParticipants,
    setParticipantPage,
    reloadParticipantsFromStart,
    candidates,
    candidateTotal,
    candidatePage,
    candidateFilters,
    isLoadingCandidates,
    loadCandidates,
    setCandidatePage,
    reloadCandidatesFromStart,
    resetCandidates,
    isSavingParticipants,
    isRemovingParticipants,
    addParticipants,
    updateParticipantStatus,
    removeParticipants,
  }
})
