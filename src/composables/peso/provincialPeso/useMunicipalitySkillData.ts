import { computed, onMounted, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
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
  const { currentDetail, isDetailLoading, applicantsPage, applicantsTotal, isApplicantsLoading } = storeToRefs(store)

  const resolvedName =
    initialMunicipality ?? decodeURIComponent(((route?.params?.id as string) ?? '').trim())

  const municipalityName = ref(resolvedName)
  const searchQuery = ref('')
  const selectedCategory = ref<string>('All')
  const selectedSkill = ref<string>('')
  const selectedLpii = ref<LpiiCategory | 'ALL'>('ALL')

  // ─── Applicants: filtered and paged in the database (migration 110) ───
  const APPLICANTS_PAGE_SIZE = 25
  const applicantsPageNumber = ref(1)
  const debouncedSearch = refDebounced(searchQuery, 300)
  const applicantsPageCount = computed(() => Math.max(Math.ceil(applicantsTotal.value / APPLICANTS_PAGE_SIZE), 1))
  const applicantsRange = computed(() => {
    if (!applicantsTotal.value) return ''
    const from = (applicantsPageNumber.value - 1) * APPLICANTS_PAGE_SIZE + 1
    const to = Math.min(applicantsPageNumber.value * APPLICANTS_PAGE_SIZE, applicantsTotal.value)
    return `${from}–${to} of ${applicantsTotal.value}`
  })

  function loadApplicants() {
    if (!municipalityName.value) return
    void store.loadApplicantsPage({
      municipality: municipalityName.value,
      search: debouncedSearch.value.trim(),
      skill: selectedSkill.value,
      lpii: selectedLpii.value,
      page: applicantsPageNumber.value,
      pageSize: APPLICANTS_PAGE_SIZE,
    })
  }

  // A filter change goes back to page 1; the page watcher then loads it
  watch([debouncedSearch, selectedSkill, selectedLpii], () => {
    if (applicantsPageNumber.value === 1) loadApplicants()
    else applicantsPageNumber.value = 1
  })
  watch(applicantsPageNumber, loadApplicants)

  function goToApplicantsPage(page: number) {
    applicantsPageNumber.value = Math.min(Math.max(page, 1), applicantsPageCount.value)
  }

  async function loadData(targetName?: string) {
    const name = targetName || municipalityName.value
    if (!name) return
    municipalityName.value = name
    applicantsPageNumber.value = 1
    loadApplicants()
    await store.loadMunicipalityDetail(name)
  }

  onMounted(() => {
    void loadData()
  })

  function goBack() {
    void router.push({ name: 'provincial-peso-skills-repository' })
  }

  function handleRefresh() {
    void loadData()
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
    applicants: applicantsPage,
    applicantsTotal,
    isApplicantsLoading,
    applicantsPageNumber,
    applicantsPageCount,
    applicantsRange,
    goToApplicantsPage,
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
