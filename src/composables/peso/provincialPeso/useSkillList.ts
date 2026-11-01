import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import { SKILL_QUEUE_PAGE_SIZE, useSkillListStore } from '@/stores/peso/provincialPeso/skillListStore'
import { SKILL_CATEGORY_OPTIONS, cleanSkillInput, formatSkillCoverage, toSkillKey } from '@/helpers/common/skillHelper'
import type { SkillRow, UnmappedSkillRow } from '@/types/common/skillCatalog'
import type { SearchSelectOption } from '@/types/common/searchSelect'

export type SkillListTab = 'review' | 'skills'

const SOURCE_LABEL: Record<SkillRow['source'], string> = {
  nsrp: 'NSRP Form 1',
  tesda: 'TESDA',
  peso: 'PESO',
  esco: 'ESCO',
}

/**
 * Skill List page (PESO): review the wordings people typed that the list doesn't know, and keep the list
 * itself. Mapping a wording or renaming a skill relinks postings and applicants at once (migration 100).
 */
export function useSkillList() {
  const store = useSkillListStore()
  const {
    skills,
    isLoadingSkills,
    skillsError,
    queue,
    queueTotal,
    queuePage,
    isLoadingQueue,
    coverage,
    isSaving,
  } = storeToRefs(store)

  const tab = ref<SkillListTab>('review')

  // ─── Coverage ───
  const coverageCards = computed(() => [
    { key: 'vacancy', label: 'Posting skills on the list', ...formatSkillCoverage(coverage.value.vacancy_linked, coverage.value.vacancy_total) },
    { key: 'applicant', label: 'Applicant skills on the list', ...formatSkillCoverage(coverage.value.applicant_linked, coverage.value.applicant_total) },
  ])

  // ─── Review queue (searched and paged on the server) ───
  const queueSearchInput = ref(store.queueSearch)
  watchDebounced(queueSearchInput, (value) => store.setQueueSearch(value), { debounce: 300 })

  const queuePageCount = computed(() => Math.max(1, Math.ceil(queueTotal.value / SKILL_QUEUE_PAGE_SIZE)))
  const queueRangeLabel = computed(() => {
    if (queueTotal.value === 0) return '0 wordings'
    const from = queuePage.value * SKILL_QUEUE_PAGE_SIZE + 1
    const to = Math.min(queueTotal.value, from + queue.value.length - 1)
    return `${from}–${to} of ${queueTotal.value} wording${queueTotal.value === 1 ? '' : 's'}`
  })
  const canPreviousQueuePage = computed(() => queuePage.value > 0)
  const canNextQueuePage = computed(() => queuePage.value + 1 < queuePageCount.value)
  const previousQueuePage = () => store.setQueuePage(queuePage.value - 1)
  const nextQueuePage = () => store.setQueuePage(queuePage.value + 1)

  const usageLabel = (row: UnmappedSkillRow) =>
    [
      row.vacancy_count ? `${row.vacancy_count} posting${row.vacancy_count === 1 ? '' : 's'}` : null,
      row.applicant_count ? `${row.applicant_count} applicant${row.applicant_count === 1 ? '' : 's'}` : null,
    ]
      .filter(Boolean)
      .join(' · ')

  // ─── Skills (a reference list: filtered on screen) ───
  const skillSearch = ref('')
  const filteredSkills = computed(() => {
    const key = toSkillKey(skillSearch.value)
    if (!key) return skills.value
    return skills.value.filter(
      (skill) =>
        toSkillKey(skill.name).includes(key) ||
        skill.skill_aliases.some((alias) => toSkillKey(alias.alias).includes(key)) ||
        toSkillKey(skill.category ?? '').includes(key),
    )
  })
  const skillMeta = (skill: SkillRow) =>
    [skill.category, SOURCE_LABEL[skill.source], skill.is_active ? null : 'Hidden from pickers'].filter(Boolean).join(' · ')

  const activeSkillOptions = computed<SearchSelectOption[]>(() =>
    skills.value
      .filter((skill) => skill.is_active)
      .map((skill) => ({ value: skill.id, label: skill.name, description: skill.category ?? undefined })),
  )
  const categoryOptions = [...SKILL_CATEGORY_OPTIONS]

  // ─── Another wording, typed on a skill's row ───
  const aliasDrafts = reactive<Record<number, string>>({})
  async function addAlias(skill: SkillRow) {
    const alias = cleanSkillInput(aliasDrafts[skill.id] ?? '')
    if (alias.length < 2) return
    if (await store.addAlias(skill.id, alias)) aliasDrafts[skill.id] = ''
  }
  const onAliasKeydown = (event: KeyboardEvent, skill: SkillRow) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void addAlias(skill)
  }

  // ─── Skill dialog: add, edit, or add from a queued wording ───
  const skillDialog = reactive({
    open: false,
    mode: 'create' as 'create' | 'edit' | 'from-wording',
    skillId: null as number | null,
    wording: '',
    name: '',
    category: '',
    error: null as string | null,
  })
  const skillDialogTitle = computed(
    () => ({ create: 'Add skill', edit: 'Edit skill', 'from-wording': 'Add as a new skill' })[skillDialog.mode],
  )

  function openSkillDialog(mode: typeof skillDialog.mode, values: { skill?: SkillRow; wording?: string } = {}) {
    Object.assign(skillDialog, {
      open: true,
      mode,
      skillId: values.skill?.id ?? null,
      wording: values.wording ?? '',
      name: values.skill?.name ?? values.wording ?? '',
      category: values.skill?.category ?? '',
      error: null,
    })
  }
  const openCreateSkill = () => openSkillDialog('create')
  const openEditSkill = (skill: SkillRow) => openSkillDialog('edit', { skill })
  const openAddFromWording = (row: UnmappedSkillRow) => openSkillDialog('from-wording', { wording: row.example_text })

  async function saveSkillDialog() {
    const name = cleanSkillInput(skillDialog.name)
    if (name.length < 2 || name.length > 80) {
      skillDialog.error = 'Enter a name of 2 to 80 characters.'
      return
    }
    skillDialog.error = null
    const values = { name, category: skillDialog.category }
    const saved =
      skillDialog.mode === 'edit' && skillDialog.skillId != null
        ? await store.updateSkill(skillDialog.skillId, values)
        : skillDialog.mode === 'from-wording'
          ? await store.addSkillFromWording(values, skillDialog.wording)
          : await store.createSkill(values)
    if (saved) skillDialog.open = false
  }

  // ─── Map a queued wording to an existing skill ───
  const mapDialog = reactive({ open: false, wording: '', skillId: null as number | null })
  const openMapDialog = (row: UnmappedSkillRow) => Object.assign(mapDialog, { open: true, wording: row.example_text, skillId: null })
  const mapSkillModel = computed({
    get: () => mapDialog.skillId,
    set: (value: unknown) => {
      mapDialog.skillId = typeof value === 'number' ? value : null
    },
  })
  async function saveMapDialog() {
    if (mapDialog.skillId == null) return
    if (await store.mapWording(mapDialog.wording, mapDialog.skillId)) mapDialog.open = false
  }

  const ignoreWording = (row: UnmappedSkillRow) => store.ignoreWording(row.wording_key)

  // ─── Merge one skill into another ───
  const mergeDialog = reactive({ open: false, from: null as SkillRow | null, intoId: null as number | null })
  const openMergeDialog = (skill: SkillRow) => Object.assign(mergeDialog, { open: true, from: skill, intoId: null })
  const mergeTargetOptions = computed(() => activeSkillOptions.value.filter((option) => option.value !== mergeDialog.from?.id))
  const mergeTargetModel = computed({
    get: () => mergeDialog.intoId,
    set: (value: unknown) => {
      mergeDialog.intoId = typeof value === 'number' ? value : null
    },
  })
  async function saveMergeDialog() {
    if (!mergeDialog.from || mergeDialog.intoId == null) return
    if (await store.mergeSkills(mergeDialog.from.id, mergeDialog.intoId)) mergeDialog.open = false
  }

  const toggleSkillActive = (skill: SkillRow) => store.setSkillActive(skill.id, !skill.is_active)
  const removeAlias = (aliasId: number) => store.removeAlias(aliasId)

  void store.loadAll()

  return {
    tab,
    coverageCards,
    isSaving,
    // Review queue
    queue,
    isLoadingQueue,
    queueSearchInput,
    queueRangeLabel,
    queuePageCount,
    canPreviousQueuePage,
    canNextQueuePage,
    previousQueuePage,
    nextQueuePage,
    usageLabel,
    openMapDialog,
    openAddFromWording,
    ignoreWording,
    // Skills
    skills,
    filteredSkills,
    isLoadingSkills,
    skillsError,
    reloadSkills: store.loadSkills,
    skillSearch,
    skillMeta,
    aliasDrafts,
    addAlias,
    onAliasKeydown,
    removeAlias,
    toggleSkillActive,
    openCreateSkill,
    openEditSkill,
    openMergeDialog,
    // Dialogs
    categoryOptions,
    activeSkillOptions,
    skillDialog,
    skillDialogTitle,
    saveSkillDialog,
    mapDialog,
    mapSkillModel,
    saveMapDialog,
    mergeDialog,
    mergeTargetOptions,
    mergeTargetModel,
    saveMergeDialog,
  }
}
