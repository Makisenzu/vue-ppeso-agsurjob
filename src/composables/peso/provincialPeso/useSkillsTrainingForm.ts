import { computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useSkillsTrainingStore } from '@/stores/peso/provincialPeso/skillsTrainingStore'
import { useSkillListStore } from '@/stores/peso/provincialPeso/skillListStore'
import { LANDING_MUNICIPALITIES } from '@/types/common/siteContent'
import {
  TRAINING_AGENCY_SUGGESTIONS,
  TRAINING_MAX_SKILLS,
  emptyTrainingForm,
  toTrainingForm,
  validateTrainingForm,
  type TrainingFormErrors,
} from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import type { SearchSelectValue } from '@/types/common/searchSelect'
import type { SkillsTraining, SkillsTrainingFormValues } from '@/types/peso/provincialPeso/skillsTraining'

const NO_MUNICIPALITY = 'NONE'
const OTHER_AGENCY = '__other__'

/** The Add / Edit Training sheet of the two training pages. `onSaved` gets the training's id and whether it is new. */
export function useSkillsTrainingForm(onSaved?: (id: string, created: boolean) => void) {
  const store = useSkillsTrainingStore()
  const skillStore = useSkillListStore()
  const { isSavingTraining, filterOptions } = storeToRefs(store)
  const { skills } = storeToRefs(skillStore)

  const form = reactive({
    open: false,
    id: null as string | null,
    values: emptyTrainingForm(),
    errors: {} as TrainingFormErrors,
    /** "Other agency" is picked: the name is typed */
    otherAgency: false,
  })

  const title = computed(() => (form.id ? 'Edit Training' : 'Add Training'))

  // The Skill List is reference data; loaded once for the picker
  function ensureSkills() {
    if (skills.value.length === 0) void skillStore.loadSkills()
  }

  function open(id: string | null, values: SkillsTrainingFormValues) {
    ensureSkills()
    const agency = values.agency.trim()
    Object.assign(form, { open: true, id, values, errors: {}, otherAgency: !!agency && !knownAgencies.value.includes(agency) })
  }

  const openCreate = (prefill: Partial<SkillsTrainingFormValues> = {}) => open(null, { ...emptyTrainingForm(), ...prefill })
  const openEdit = (training: SkillsTraining) => open(training.id, toTrainingForm(training))

  // ─── Skills: one or more, added one at a time from the Skill List ───
  /** The chosen skills in the order they were added; names come from the Skill List */
  const selectedSkills = computed(() =>
    form.values.skillIds.map((id) => ({ id, name: skills.value.find((skill) => skill.id === id)?.name ?? `Skill #${id}` })),
  )

  // Active skills not chosen yet
  const skillOptions = computed(() =>
    skills.value
      .filter((skill) => skill.is_active && !form.values.skillIds.includes(skill.id))
      .map((skill) => ({ value: skill.id, label: skill.name, description: skill.category ?? undefined })),
  )

  const canAddSkill = computed(() => form.values.skillIds.length < TRAINING_MAX_SKILLS)

  /** The picker never keeps a value: choosing a skill adds it to the list */
  const skillPickerModel = computed<SearchSelectValue | null>({
    get: () => null,
    set: (value) => {
      if (typeof value !== 'number' || form.values.skillIds.includes(value) || !canAddSkill.value) return
      form.values.skillIds = [...form.values.skillIds, value]
      if (form.errors.skillIds) form.errors = { ...form.errors, skillIds: undefined }
    },
  })

  function removeSkill(id: number) {
    form.values.skillIds = form.values.skillIds.filter((skillId) => skillId !== id)
  }

  // ─── Agency: the usual ones and those already on file, or "Other agency" to type a new name ───
  const knownAgencies = computed(() =>
    [...new Set([...TRAINING_AGENCY_SUGGESTIONS, ...filterOptions.value.agencies])].sort((a, b) => a.localeCompare(b)),
  )

  const agencyOptions = computed(() => [
    ...knownAgencies.value.map((agency) => ({ value: agency, label: agency })),
    { value: OTHER_AGENCY, label: 'Other agency' },
  ])

  const agencyModel = computed<SearchSelectValue | null>({
    get: () => (form.otherAgency ? OTHER_AGENCY : form.values.agency || null),
    set: (value) => {
      form.otherAgency = value === OTHER_AGENCY
      form.values.agency = form.otherAgency || value == null ? '' : String(value)
    },
  })

  const municipalityOptions = [
    { value: NO_MUNICIPALITY, label: 'Not specified' },
    ...LANDING_MUNICIPALITIES.map((municipality) => ({ value: municipality.name, label: municipality.name })),
  ]

  const municipalityModel = computed<SearchSelectValue>({
    get: () => form.values.municipality || NO_MUNICIPALITY,
    set: (value) => {
      form.values.municipality = value === NO_MUNICIPALITY ? '' : String(value)
    },
  })

  async function submit() {
    form.errors = validateTrainingForm(form.values)
    if (Object.keys(form.errors).length > 0) return
    const created = form.id === null
    const id = await store.saveTraining(form.id, form.values)
    if (!id) return
    form.open = false
    onSaved?.(id, created)
  }

  return {
    form,
    title,
    isSavingTraining,
    selectedSkills,
    skillOptions,
    skillPickerModel,
    canAddSkill,
    removeSkill,
    municipalityOptions,
    municipalityModel,
    agencyOptions,
    agencyModel,
    openCreate,
    openEdit,
    submit,
  }
}
