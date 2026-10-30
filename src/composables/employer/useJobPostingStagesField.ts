import { computed, ref } from 'vue'
import { useFieldValue, useSetFieldValue } from 'vee-validate'
import { cleanRequirementInput, toJobPostingStageValues, toRequirementKey } from '@/helpers/employer/jobPostingHelper'
import { HIRING_STAGE_NAME_MAX_LENGTH, MAX_HIRING_STAGES, MIN_HIRING_STAGES } from '@/types/common/jobVacancyApplication'
import type { JobPostingStageValue } from '@/types/employer/jobPosting'

/**
 * The `stages` field of the posting page (JobPostingStagesField.vue): the hiring steps applicants go through,
 * in order, the last one meaning hired (migration 089). Saved steps keep their id when renamed or moved, so
 * applicants at a step stay there. The first step is always Paper Screening and can't be renamed, moved or
 * removed: every application starts there (migration 091).
 */
export function useJobPostingStagesField() {
  const value = useFieldValue<JobPostingStageValue[]>('stages')
  const setValue = useSetFieldValue<JobPostingStageValue[]>('stages')

  const stages = computed(() => value.value ?? [])
  const draft = ref('')

  const isFull = computed(() => stages.value.length >= MAX_HIRING_STAGES)
  const canRemove = computed(() => stages.value.length > MIN_HIRING_STAGES)

  /** Paper Screening, locked in first place */
  const isLocked = (index: number) => index === 0

  const isTaken = (name: string, exceptIndex = -1) =>
    stages.value.some((item, index) => index !== exceptIndex && toRequirementKey(item.name) === toRequirementKey(name))

  const canAddDraft = computed(() => {
    const name = cleanRequirementInput(draft.value)
    return name.length >= 2 && !isTaken(name) && !isFull.value
  })

  /** Why the typed name can't be added */
  const draftHint = computed(() => (isTaken(cleanRequirementInput(draft.value)) ? 'That step is already listed.' : null))

  /** New steps go before the last one, which stays the hiring step */
  function addDraft() {
    if (!canAddDraft.value) return
    const step = { id: null, name: cleanRequirementInput(draft.value).slice(0, HIRING_STAGE_NAME_MAX_LENGTH) }
    const list = [...stages.value]
    list.splice(Math.max(list.length - 1, 0), 0, step)
    setValue(list)
    draft.value = ''
  }

  /** Enter adds what was typed instead of submitting the form */
  function onDraftKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addDraft()
  }

  function renameStage(index: number, name: string) {
    if (isLocked(index)) return
    setValue(stages.value.map((item, i) => (i === index ? { ...item, name: name.slice(0, HIRING_STAGE_NAME_MAX_LENGTH) } : item)))
  }

  function moveStage(index: number, offset: -1 | 1) {
    const target = index + offset
    if (isLocked(index) || isLocked(target) || target < 0 || target >= stages.value.length) return
    const list = [...stages.value]
    const [item] = list.splice(index, 1)
    list.splice(target, 0, item!)
    setValue(list)
  }

  function removeStage(index: number) {
    if (!canRemove.value || isLocked(index)) return
    setValue(stages.value.filter((_, i) => i !== index))
  }

  /** Back to the default steps; saved ones with the same name keep their id */
  function resetToDefault() {
    const saved = new Map(stages.value.filter((item) => item.id).map((item) => [toRequirementKey(item.name), item.id]))
    setValue(toJobPostingStageValues().map((item) => ({ ...item, id: saved.get(toRequirementKey(item.name)) ?? null })))
  }

  return {
    stages,
    draft,
    draftHint,
    canAddDraft,
    isFull,
    canRemove,
    isLocked,
    maxStages: MAX_HIRING_STAGES,
    maxLength: HIRING_STAGE_NAME_MAX_LENGTH,
    addDraft,
    onDraftKeydown,
    renameStage,
    moveStage,
    removeStage,
    resetToDefault,
  }
}
