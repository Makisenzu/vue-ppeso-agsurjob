import { computed, ref } from 'vue'
import { useFieldValue, useSetFieldValue } from 'vee-validate'
import { cleanRequirementInput, isNsrpRequirement, toRequirementKey } from '@/helpers/employer/jobPostingHelper'
import {
  MAX_VACANCY_REQUIREMENTS,
  REQUIREMENT_NAME_MAX_LENGTH,
  VACANCY_REQUIREMENT_SUGGESTIONS,
} from '@/types/common/jobVacancyApplication'
import type { JobPostingRequirementValue } from '@/types/employer/jobPosting'

/**
 * The `requirements` field of the posting form (JobPostingRequirementsField.vue): the documents applicants
 * submit, added by typing or from the common list, each required or optional. Duplicates are compared the
 * way migration 088 keys them; the NSRP Form is left out (only PESO programs use it).
 */
export function useJobPostingRequirementsField() {
  const value = useFieldValue<JobPostingRequirementValue[]>('requirements')
  const setValue = useSetFieldValue<JobPostingRequirementValue[]>('requirements')

  const requirements = computed(() => value.value ?? [])
  const draft = ref('')

  const takenKeys = computed(() => new Set(requirements.value.map((item) => toRequirementKey(item.name))))
  const isFull = computed(() => requirements.value.length >= MAX_VACANCY_REQUIREMENTS)

  /** Common documents not added yet */
  const suggestions = computed(() =>
    VACANCY_REQUIREMENT_SUGGESTIONS.filter((name) => !takenKeys.value.has(toRequirementKey(name)))
  )

  const isAddable = (name: string) =>
    name.length >= 2 && !isNsrpRequirement(name) && !takenKeys.value.has(toRequirementKey(name)) && !isFull.value

  const canAddDraft = computed(() => isAddable(cleanRequirementInput(draft.value)))

  /** Why the typed name can't be added, when it's the NSRP Form */
  const draftHint = computed(() =>
    isNsrpRequirement(draft.value) ? 'The NSRP Form is only used for PESO programs, not job applications.' : null
  )

  /** New requirements are required; the employer switches off the ones applicants may skip */
  function addRequirement(rawName: string) {
    const name = cleanRequirementInput(rawName).slice(0, REQUIREMENT_NAME_MAX_LENGTH)
    if (!isAddable(name)) return
    setValue([...requirements.value, { name, isRequired: true }])
  }

  function addDraft() {
    if (!canAddDraft.value) return
    addRequirement(draft.value)
    draft.value = ''
  }

  /** Enter adds what was typed instead of submitting the form (names may contain commas) */
  function onDraftKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    addDraft()
  }

  function removeRequirement(index: number) {
    setValue(requirements.value.filter((_, i) => i !== index))
  }

  function setRequired(index: number, isRequired: boolean) {
    setValue(requirements.value.map((item, i) => (i === index ? { ...item, isRequired } : item)))
  }

  return {
    requirements,
    draft,
    draftHint,
    suggestions,
    canAddDraft,
    isFull,
    maxRequirements: MAX_VACANCY_REQUIREMENTS,
    maxLength: REQUIREMENT_NAME_MAX_LENGTH,
    addRequirement,
    addDraft,
    onDraftKeydown,
    removeRequirement,
    setRequired,
  }
}
