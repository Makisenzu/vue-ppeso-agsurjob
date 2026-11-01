import { ref } from 'vue'
import { defineStore } from 'pinia'
import { skillListService } from '@/services/peso/provincialPeso/skillListService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { toSkillListErrorMessage } from '@/helpers/common/skillHelper'
import type { SkillFormValues, SkillLinkCoverage, SkillRow, UnmappedSkillRow } from '@/types/common/skillCatalog'

export const SKILL_QUEUE_PAGE_SIZE = 20

const EMPTY_COVERAGE = (): SkillLinkCoverage => ({ vacancy_total: 0, vacancy_linked: 0, applicant_total: 0, applicant_linked: 0 })

/**
 * PESO's Skill List (migrations 099, 100): the skills with their other wordings, and the queue of typed
 * wordings not on the list yet. Every change relinks postings and applicants in the database.
 */
export const useSkillListStore = defineStore('pesoSkillList', () => {
  const toastAlert = useToastAlert()

  // ─── Skills ───
  const skills = ref<SkillRow[]>([])
  const isLoadingSkills = ref(false)
  const skillsError = ref<string | null>(null)

  // ─── Review queue ───
  const queue = ref<UnmappedSkillRow[]>([])
  const queueTotal = ref(0)
  const queueSearch = ref('')
  const queuePage = ref(0)
  const isLoadingQueue = ref(false)

  const coverage = ref<SkillLinkCoverage>(EMPTY_COVERAGE())
  /** A save is on its way (dialogs and row actions wait for it) */
  const isSaving = ref(false)

  let queueRequestId = 0

  async function loadSkills(): Promise<void> {
    isLoadingSkills.value = true
    skillsError.value = null
    try {
      skills.value = await skillListService.fetchSkills()
    } catch (error: unknown) {
      skillsError.value = toSkillListErrorMessage(error, 'Failed to load the skill list.')
    } finally {
      isLoadingSkills.value = false
    }
  }

  async function loadQueue(): Promise<void> {
    const current = ++queueRequestId
    isLoadingQueue.value = true
    try {
      const page = await skillListService.fetchUnmapped(queueSearch.value, queuePage.value, SKILL_QUEUE_PAGE_SIZE)
      if (current !== queueRequestId) return
      queue.value = page.rows
      queueTotal.value = page.total
    } catch (error: unknown) {
      if (current === queueRequestId) toastAlert.error('Error', toSkillListErrorMessage(error, 'Failed to load the wordings to review.'))
    } finally {
      if (current === queueRequestId) isLoadingQueue.value = false
    }
  }

  async function loadCoverage(): Promise<void> {
    try {
      coverage.value = await skillListService.fetchCoverage()
    } catch {
      // The figures just stay as they were
    }
  }

  const loadAll = () => Promise.all([loadSkills(), loadQueue(), loadCoverage()])

  function setQueueSearch(value: string) {
    queueSearch.value = value
    queuePage.value = 0
    return loadQueue()
  }

  function setQueuePage(value: number) {
    queuePage.value = Math.max(0, value)
    return loadQueue()
  }

  /**
   * Runs a change, shows the outcome, then reloads what it touches. Links change in the database, so the
   * queue and coverage reload after any change; the skills reload unless `skillsChanged` is false.
   */
  async function save(action: () => Promise<void>, success: string, fallback: string, skillsChanged = true): Promise<boolean> {
    isSaving.value = true
    try {
      await action()
      toastAlert.success(success)
      await Promise.all([skillsChanged ? loadSkills() : Promise.resolve(), loadQueue(), loadCoverage()])
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', toSkillListErrorMessage(error, fallback))
      return false
    } finally {
      isSaving.value = false
    }
  }

  const createSkill = (values: SkillFormValues) =>
    save(() => skillListService.createSkill(values), 'Skill added', 'Failed to add the skill.')

  const updateSkill = (id: number, values: SkillFormValues) =>
    save(() => skillListService.updateSkill(id, values), 'Skill updated', 'Failed to update the skill.')

  const setSkillActive = (id: number, isActive: boolean) =>
    save(
      () => skillListService.setSkillActive(id, isActive),
      isActive ? 'Skill shown in the pickers again' : 'Skill hidden from the pickers',
      'Failed to update the skill.',
    )

  const mergeSkills = (fromId: number, intoId: number) =>
    save(() => skillListService.mergeSkills(fromId, intoId), 'Skills merged', 'Failed to merge the skills.')

  const addAlias = (skillId: number, alias: string) =>
    save(() => skillListService.addAlias(skillId, alias), 'Wording added', 'Failed to add the wording.')

  const removeAlias = (aliasId: number) =>
    save(() => skillListService.removeAlias(aliasId), 'Wording removed', 'Failed to remove the wording.')

  /** A queued wording becomes another wording of an existing skill */
  const mapWording = (wording: string, skillId: number) =>
    save(() => skillListService.addAlias(skillId, wording), 'Wording mapped', 'Failed to map the wording.')

  const addSkillFromWording = (values: SkillFormValues, wording: string) =>
    save(() => skillListService.addSkillFromWording(values, wording), 'Skill added', 'Failed to add the skill.')

  const ignoreWording = (wordingKey: string) =>
    save(() => skillListService.ignoreWording(wordingKey), 'Wording ignored', 'Failed to ignore the wording.', false)

  return {
    skills,
    isLoadingSkills,
    skillsError,
    queue,
    queueTotal,
    queueSearch,
    queuePage,
    isLoadingQueue,
    coverage,
    isSaving,
    loadAll,
    loadSkills,
    setQueueSearch,
    setQueuePage,
    createSkill,
    updateSkill,
    setSkillActive,
    mergeSkills,
    addAlias,
    removeAlias,
    mapWording,
    addSkillFromWording,
    ignoreWording,
  }
})
