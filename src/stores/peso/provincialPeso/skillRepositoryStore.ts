import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { skillRepositoryService } from '@/services/peso/provincialPeso/skillRepositoryService'
import type {
  ApplicantSkillProfile,
  MunicipalitySkillDetail,
  MunicipalitySkillSummaryRow,
  SkillCountEntry,
  SkillRepositoryStats,
} from '@/types/peso/provincialPeso/skillRepository'
import { matchesGeographicLabel, normalizeText } from '@/helpers/peso/provincialPeso/skillRepositoryHelper'
import type { SkillRepositoryApplicantFilters } from '@/types/peso/provincialPeso/skillRepository'

export const useSkillRepositoryStore = defineStore('pesoSkillRepository', () => {
  // ─── State ───
  // Computed in the database (migration 110): summaries and skill counts, never every applicant
  const municipalityRows = ref<MunicipalitySkillSummaryRow[]>([])
  const allSkillsList = ref<SkillCountEntry[]>([])
  const stats = ref<SkillRepositoryStats | null>(null)
  const currentDetail = ref<MunicipalitySkillDetail | null>(null)

  // One page of the open municipality's applicants
  const applicantsPage = ref<ApplicantSkillProfile[]>([])
  const applicantsTotal = ref(0)
  const isApplicantsLoading = ref(false)
  let applicantsRequestId = 0

  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const error = ref<string | null>(null)

  // Filters & Selection
  const selectedProvince = ref('Agusan del Sur')
  const selectedMunicipality = ref('')
  const selectedBarangay = ref('')
  const selectedSkillFilter = ref('')
  const searchQuery = ref('')
  const activeTab = ref<'agusan' | 'outside'>('agusan')

  // ─── Getters ───
  const agusanMunicipalityRows = computed(() =>
    municipalityRows.value.filter((row) => row.isAgusanDelSur)
  )

  const outsideMunicipalityRows = computed(() =>
    municipalityRows.value.filter((row) => !row.isAgusanDelSur)
  )

  const filteredMunicipalityRows = computed(() => {
    const query = normalizeText(searchQuery.value)
    const skillFilter = normalizeText(selectedSkillFilter.value)
    const muniFilter = normalizeText(selectedMunicipality.value)

    return municipalityRows.value.filter((row) => {
      // 1. Filter by selected municipality
      if (muniFilter && !matchesGeographicLabel(row.name, selectedMunicipality.value)) {
        return false
      }

      // 2. Filter by search query (matches municipality name OR skills)
      if (query) {
        const nameMatches = normalizeText(row.name).includes(query)
        const skillMatches = row.allSkills.some((s) => normalizeText(s.name).includes(query))
        if (!nameMatches && !skillMatches) return false
      }

      // 3. Filter by selected skill
      if (skillFilter) {
        const hasSkill = row.allSkills.some((s) => normalizeText(s.name) === skillFilter)
        if (!hasSkill) return false
      }

      return true
    })
  })

  const filteredAgusanMunicipalityRows = computed(() =>
    filteredMunicipalityRows.value.filter((row) => row.isAgusanDelSur)
  )

  const filteredOutsideMunicipalityRows = computed(() =>
    filteredMunicipalityRows.value.filter((row) => !row.isAgusanDelSur)
  )

  // ─── Actions ───

  async function loadRepositoryData(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const summary = await skillRepositoryService.fetchSummary()
      municipalityRows.value = summary.municipalities
      allSkillsList.value = summary.skills
      stats.value = summary.stats
    } catch (err: any) {
      error.value = err?.message || 'Failed to load skill repository data'
      console.error('[useSkillRepositoryStore] Error loading repository data:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadMunicipalityDetail(municipalityName: string): Promise<MunicipalitySkillDetail | null> {
    isDetailLoading.value = true
    error.value = null
    try {
      const detail = await skillRepositoryService.fetchMunicipalityDetail(municipalityName)
      currentDetail.value = detail
      return detail
    } catch (err: any) {
      error.value = err?.message || `Failed to load details for ${municipalityName}`
      console.error(`[useSkillRepositoryStore] Error loading details for ${municipalityName}:`, err)
      return null
    } finally {
      isDetailLoading.value = false
    }
  }

  /** One page of a municipality's applicants; a newer request wins over a slower older one */
  async function loadApplicantsPage(filters: SkillRepositoryApplicantFilters): Promise<void> {
    const current = ++applicantsRequestId
    isApplicantsLoading.value = true
    try {
      const { rows, total } = await skillRepositoryService.fetchApplicantsPage(filters)
      if (current !== applicantsRequestId) return
      applicantsPage.value = rows
      applicantsTotal.value = total
    } catch (err: any) {
      if (current !== applicantsRequestId) return
      error.value = err?.message || 'Failed to load the applicants'
      applicantsPage.value = []
      applicantsTotal.value = 0
    } finally {
      if (current === applicantsRequestId) isApplicantsLoading.value = false
    }
  }

  function setSelectedMunicipality(name: string): void {
    const trimmed = name.trim()
    if (selectedMunicipality.value === trimmed) {
      selectedMunicipality.value = ''
    } else {
      selectedMunicipality.value = trimmed
    }
    selectedBarangay.value = ''
  }

  function setSelectedBarangay(name: string): void {
    selectedBarangay.value = name.trim()
  }

  function setSelectedSkillFilter(skillName: string): void {
    selectedSkillFilter.value = skillName.trim()
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query
  }

  function setActiveTab(tab: 'agusan' | 'outside'): void {
    activeTab.value = tab
  }

  function resetFilters(): void {
    selectedMunicipality.value = ''
    selectedBarangay.value = ''
    selectedSkillFilter.value = ''
    searchQuery.value = ''
  }

  return {
    // State
    municipalityRows,
    agusanMunicipalityRows,
    outsideMunicipalityRows,
    stats,
    applicantsPage,
    applicantsTotal,
    isApplicantsLoading,
    currentDetail,
    isLoading,
    isDetailLoading,
    error,
    selectedProvince,
    selectedMunicipality,
    selectedBarangay,
    selectedSkillFilter,
    searchQuery,
    activeTab,

    // Getters
    allSkillsList,
    filteredMunicipalityRows,
    filteredAgusanMunicipalityRows,
    filteredOutsideMunicipalityRows,

    // Actions
    loadRepositoryData,
    loadMunicipalityDetail,
    loadApplicantsPage,
    setSelectedMunicipality,
    setSelectedBarangay,
    setSelectedSkillFilter,
    setSearchQuery,
    setActiveTab,
    resetFilters,
  }
})
