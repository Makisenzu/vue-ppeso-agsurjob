import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSkillRepositoryStore } from '@/stores/peso/provincialPeso/skillRepositoryStore'
import { Eye } from '@lucide/vue'
import type { SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import type { ApplicantSkillProfile, BarangaySkillRow, LpiiCategory } from '@/types/peso/provincialPeso/skillRepository'
import { getLpiiBadgeProps, normalizeText } from '@/helpers/peso/provincialPeso/skillRepositoryHelper'

export function useMunicipalitySkillData(initialMunicipality?: string) {
  const route = useRoute()
  const router = useRouter()
  const store = useSkillRepositoryStore()
  const { currentDetail, isDetailLoading } = storeToRefs(store)

  const resolvedName =
    initialMunicipality ?? decodeURIComponent(((route?.params?.id as string) ?? '').trim())

  const municipalityName = ref(resolvedName)
  const searchQuery = ref('')
  const selectedCategory = ref<string>('All')
  const selectedSkill = ref<string>('')
  const selectedLpii = ref<LpiiCategory | 'ALL'>('ALL')

  async function loadData(targetName?: string, options?: { forceRefresh?: boolean }) {
    const name = targetName || municipalityName.value
    if (!name) return
    municipalityName.value = name
    await store.loadMunicipalityDetail(name, options?.forceRefresh)
  }

  onMounted(() => {
    void loadData()
  })

  function goBack() {
    void router.push({ name: 'provincial-peso-skills-repository' })
  }

  function handleRefresh() {
    void loadData(undefined, { forceRefresh: true })
  }

  function viewApplicantEntry(id: string) {
    void router.push({
      name: 'provincial-peso-entry-details',
      params: { id },
    })
  }

  // Filter skills by category
  const filteredSkills = computed(() => {
    if (!currentDetail.value) return []
    if (selectedCategory.value === 'All') {
      return currentDetail.value.skillsBreakdown
    }
    return currentDetail.value.skillsBreakdown.filter(
      (s) => s.category === selectedCategory.value
    )
  })

  // Filter barangays based on search, LPII filter, and selected skill
  const filteredBarangays = computed(() => {
    if (!currentDetail.value) return []
    const q = normalizeText(searchQuery.value)
    const targetSkill = normalizeText(selectedSkill.value)

    return currentDetail.value.barangayRows.filter((b) => {
      if (selectedLpii.value !== 'ALL' && b.lpiiTag !== selectedLpii.value) {
        return false
      }
      if (q && !normalizeText(b.name).includes(q)) {
        return false
      }
      if (targetSkill && !b.allSkills.some((s) => normalizeText(s).includes(targetSkill))) {
        return false
      }
      return true
    })
  })

  // Filter applicants based on search, LPII filter, and selected skill
  const filteredApplicants = computed(() => {
    if (!currentDetail.value) return []
    const q = normalizeText(searchQuery.value)
    const targetSkill = normalizeText(selectedSkill.value)

    return currentDetail.value.applicants.filter((app) => {
      if (selectedLpii.value !== 'ALL' && app.lpiiTag !== selectedLpii.value) {
        return false
      }
      if (targetSkill && !app.skillNames.some((s) => normalizeText(s) === targetSkill)) {
        return false
      }
      if (q) {
        const matchesName = normalizeText(app.fullName).includes(q)
        const matchesBrgy = normalizeText(app.barangay).includes(q)
        const matchesSkill = app.skillNames.some((s) => normalizeText(s).includes(q))
        if (!matchesName && !matchesBrgy && !matchesSkill) return false
      }
      return true
    })
  })

  function toggleSkillFilter(skillName: string) {
    if (selectedSkill.value === skillName) {
      selectedSkill.value = ''
    } else {
      selectedSkill.value = skillName
    }
  }

  function setLpiiFilter(tag: LpiiCategory | 'ALL') {
    selectedLpii.value = tag
  }

  function setCategory(cat: string) {
    selectedCategory.value = cat
  }

  function clearAllFilters() {
    searchQuery.value = ''
    selectedCategory.value = 'All'
    selectedSkill.value = ''
    selectedLpii.value = 'ALL'
  }

  // ─── Mobile Card View (DESIGN.md 13.2) ───
  // Barangays are read-only (no swipe actions); applicants swipe to their profile
  function getBarangayCard(row: BarangaySkillRow): SwipeCard {
    const topSkill = row.topSkills[0]?.name
    return {
      title: row.name,
      subtitle: [
        getLpiiBadgeProps(row.lpiiTag).label,
        `${row.applicantsCount} applicant${row.applicantsCount === 1 ? '' : 's'}`,
        topSkill ? `Top: ${topSkill}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }
  }

  function getApplicantCard(applicant: ApplicantSkillProfile): SwipeCard {
    return {
      title: applicant.fullName,
      subtitle: [applicant.barangay, applicant.skillNames.slice(0, 2).join(', ') || 'No skills listed'].filter(Boolean).join(' · '),
    }
  }

  function getApplicantSwipeActions(applicant: ApplicantSkillProfile): SwipeAction[] {
    return [{ id: 'profile', label: 'Profile', icon: Eye, dismiss: false, onSelect: () => viewApplicantEntry(applicant.id) }]
  }

  return {
    getBarangayCard,
    getApplicantCard,
    getApplicantSwipeActions,
    municipalityName,
    detail: currentDetail,
    isLoading: isDetailLoading,
    searchQuery,
    selectedCategory,
    selectedSkill,
    selectedLpii,
    filteredSkills,
    filteredBarangays,
    filteredApplicants,
    loadData,
    toggleSkillFilter,
    setLpiiFilter,
    setCategory,
    clearAllFilters,
    goBack,
    handleRefresh,
    viewApplicantEntry,
  }
}
