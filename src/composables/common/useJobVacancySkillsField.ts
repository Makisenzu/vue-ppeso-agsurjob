import { computed, ref } from 'vue'
import { useFieldValue, useSetFieldValue } from 'vee-validate'
import {
  MAX_VACANCY_SKILLS,
  NSRP_SKILL_OPTIONS,
  SKILL_NAME_MAX_LENGTH,
  cleanSkillInput,
  toSkillKey,
} from '@/helpers/common/skillHelper'
import type { JobVacancySkillValue } from '@/types/common/jobVacancy'

/**
 * The `skills` field of a vacancy form (JobVacancySkillsField.vue): add by typing or from the NSRP
 * checklist, mark must-haves, remove. Duplicates are compared the way migration 084 keys them.
 */
export function useJobVacancySkillsField() {
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

  /** Enter or comma adds what was typed instead of submitting the form */
  function onDraftKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ',') return
    event.preventDefault()
    addDraft()
  }

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
    onDraftKeydown,
    removeSkill,
    setRequired,
  }
}
