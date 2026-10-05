import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSkillRepositoryStore } from '@/stores/peso/provincialPeso/skillRepositoryStore'

export function useSkillRepository() {
  const router = useRouter()
  const store = useSkillRepositoryStore()

  const {
    municipalityRows,
    agusanMunicipalityRows,
    outsideMunicipalityRows,
    filteredMunicipalityRows,
    filteredAgusanMunicipalityRows,
    filteredOutsideMunicipalityRows,
    allApplicants,
    stats,
    isLoading,
    error,
    selectedProvince,
    selectedMunicipality,
    selectedBarangay,
    selectedSkillFilter,
    searchQuery,
    allSkillsList,
    activeTab,
  } = storeToRefs(store)

  onMounted(() => {
    if (municipalityRows.value.length === 0) {
      void store.loadRepositoryData()
    }
  })

  const hasActiveFilters = computed(
    () => Boolean(searchQuery.value) || Boolean(selectedSkillFilter.value) || Boolean(selectedMunicipality.value)
  )

  const currentDisplayRows = computed(() => {
    return activeTab.value === 'agusan'
      ? filteredAgusanMunicipalityRows.value
      : filteredOutsideMunicipalityRows.value
  })

  const hasAlternativeMatches = computed(() => {
    if (currentDisplayRows.value.length > 0) return false
    if (activeTab.value === 'agusan') {
      return filteredOutsideMunicipalityRows.value.length > 0
    } else {
      return filteredAgusanMunicipalityRows.value.length > 0
    }
  })

  const alternativeMatchesCount = computed(() => {
    if (activeTab.value === 'agusan') {
      return filteredOutsideMunicipalityRows.value.length
    } else {
      return filteredAgusanMunicipalityRows.value.length
    }
  })

  function refreshRecords() {
    return store.loadRepositoryData(true)
  }

  function gotoMunicipality(name: string) {
    void router.push({
      name: 'provincial-peso-skills-repository-details',
      params: { id: encodeURIComponent(name) },
    })
  }

  function selectMunicipality(name: string) {
    store.setSelectedMunicipality(name)
  }

  function selectSkillFilter(skillName: string) {
    if (store.selectedSkillFilter === skillName) {
      store.setSelectedSkillFilter('')
    } else {
      store.setSelectedSkillFilter(skillName)
    }
  }

  function setActiveTab(tab: 'agusan' | 'outside') {
    store.setActiveTab(tab)
  }

  function clearFilters() {
    store.resetFilters()
  }

  return {
    // State
    municipalityRows,
    agusanMunicipalityRows,
    outsideMunicipalityRows,
    filteredMunicipalityRows,
    filteredAgusanMunicipalityRows,
    filteredOutsideMunicipalityRows,
    allApplicants,
    stats,
    isLoading,
    error,
    selectedProvince,
    selectedMunicipality,
    selectedBarangay,
    selectedSkillFilter,
    searchQuery,
    allSkillsList,
    activeTab,

    // Computed Presentation State
    hasActiveFilters,
    currentDisplayRows,
    hasAlternativeMatches,
    alternativeMatchesCount,

    // Methods
    refreshRecords,
    gotoMunicipality,
    selectMunicipality,
    selectSkillFilter,
    setActiveTab,
    clearFilters,
  }
}
