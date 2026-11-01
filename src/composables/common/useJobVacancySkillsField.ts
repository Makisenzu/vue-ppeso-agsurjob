import { computed, ref, toRef } from 'vue'
import { useFieldValue, useSetFieldValue } from 'vee-validate'
import {
  MAX_VACANCY_SKILLS,
  NSRP_SKILL_OPTIONS,
  SKILL_NAME_MAX_LENGTH,
  cleanSkillInput,
  toSkillKey,
} from '@/helpers/common/skillHelper'
import type { JobVacancySkillValue } from '@/types/common/jobVacancy'
import { useSkillCombobox } from '@/composables/common/useSkillCombobox'
import { useUnknownSkillNames } from '@/composables/common/useSkillSearch'

/**
 * The `skills` field of a vacancy form (JobVacancySkillsField.vue): add from the skill list's suggestions
 * (migration 099), by typing, or from the NSRP checklist; mark must-haves, remove. Duplicates are compared
 * the way migration 084 keys them. Typed skills the list doesn't know are allowed and flagged; PESO reviews them.
 */
export function useJobVacancySkillsField(options: { disabled?: () => boolean } = {}) {
  const value = useFieldValue<JobVacancySkillValue[]>('skills')
  const setValue = useSetFieldValue<JobVacancySkillValue[]>('skills')

  const skills = computed(() => value.value ?? [])
  const draft = ref('')

  const takenKeys = computed(() => new Set(skills.value.map((skill) => toSkillKey(skill.name))))
  const isFull = computed(() => skills.value.length >= MAX_VACANCY_SKILLS)

  /** NSRP checklist names not picked yet: tapping one adds it with the applicant's exact wording */
  const suggestions = computed(() => NSRP_SKILL_OPTIONS.filter((name) => !takenKeys.value.has(toSkillKey(name))))

  const canAddDraft = computed(() => {
    const name = cleanSkillInput(draft.value)
    return name.length >= 2 && !takenKeys.value.has(toSkillKey(name)) && !isFull.value
  })

  function addSkill(rawName: string) {
    const name = cleanSkillInput(rawName).slice(0, SKILL_NAME_MAX_LENGTH)
    if (name.length < 2 || takenKeys.value.has(toSkillKey(name)) || isFull.value) return
    setValue([...skills.value, { name, isRequired: true }])
  }

  function addDraft() {
    if (!canAddDraft.value) return
    addSkill(draft.value)
    draft.value = ''
  }

  // Suggestions from the skill list; Enter picks the highlighted one (or adds what's typed), comma adds what's typed
  const combobox = useSkillCombobox({
    query: draft,
    takenKeys,
    disabled: toRef(() => !!options.disabled?.() || isFull.value),
    pick: addSkill,
  })

  const skillNames = computed(() => skills.value.map((skill) => skill.name))
  const { isUnknown } = useUnknownSkillNames(skillNames)

  function removeSkill(index: number) {
    setValue(skills.value.filter((_, i) => i !== index))
  }

  function setRequired(index: number, isRequired: boolean) {
    setValue(skills.value.map((skill, i) => (i === index ? { ...skill, isRequired } : skill)))
  }

  return {
    skills,
    draft,
    suggestions,
    canAddDraft,
    isFull,
    maxSkills: MAX_VACANCY_SKILLS,
    maxLength: SKILL_NAME_MAX_LENGTH,
    addSkill,
    addDraft,
    removeSkill,
    isUnknown,
    listId: combobox.listId,
    skillSuggestions: combobox.suggestions,
    typedOption: combobox.typedOption,
    isSuggestionsOpen: combobox.isOpen,
    activeIndex: combobox.activeIndex,
    activeOptionId: combobox.activeOptionId,
    selectSuggestion: combobox.select,
    onDraftKeydown: combobox.onKeydown,
    onDraftFocus: combobox.onFocus,
    onDraftBlur: combobox.onBlur,
    setRequired,
  }
}
