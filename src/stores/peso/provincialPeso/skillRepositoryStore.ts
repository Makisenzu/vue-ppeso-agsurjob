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
import {
  computeRepositoryStats,
  matchesGeographicLabel,
  normalizeText,
} from '@/helpers/peso/provincialPeso/skillRepositoryHelper'

export const useSkillRepositoryStore = defineStore('pesoSkillRepository', () => {
  // ─── State ───
  const municipalityRows = ref<MunicipalitySkillSummaryRow[]>([])
  const allApplicants = ref<ApplicantSkillProfile[]>([])
  const stats = ref<SkillRepositoryStats | null>(null)
  const currentDetail = ref<MunicipalitySkillDetail | null>(null)

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

  const allSkillsList = computed<SkillCountEntry[]>(() => {
    const counts = new Map<string, { count: number; category: string; originalName: string }>()
    for (const app of allApplicants.value) {
      for (const skill of app.skills) {
        const key = normalizeText(skill.name)
        const existing = counts.get(key)
        if (existing) {
          existing.count++
        } else {
          counts.set(key, { count: 1, category: skill.category, originalName: skill.name })
        }
      }
    }
    return Array.from(counts.values())
      .map((item) => ({
        name: item.originalName,
        count: item.count,
        category: item.category,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  })

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

  const filteredApplicants = computed(() => {
    return allApplicants.value.filter((app) => {
      if (selectedMunicipality.value && !matchesGeographicLabel(app.municipality, selectedMunicipality.value)) {
        return false
      }
      if (selectedBarangay.value && normalizeText(app.barangay) !== normalizeText(selectedBarangay.value)) {
        return false
      }
      if (selectedSkillFilter.value) {
        const target = normalizeText(selectedSkillFilter.value)
        if (!app.skillNames.some((s) => normalizeText(s) === target)) return false
      }
      if (searchQuery.value) {
        const q = normalizeText(searchQuery.value)
        const nameMatches = normalizeText(app.fullName).includes(q)
        const brgyMatches = normalizeText(app.barangay).includes(q)
        const skillMatches = app.skillNames.some((s) => normalizeText(s).includes(q))
        if (!nameMatches && !brgyMatches && !skillMatches) return false
      }
      return true
    })
  })

  // ─── Actions ───

  async function loadRepositoryData(forceRefresh = false): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const [summaries, applicants] = await Promise.all([
        skillRepositoryService.fetchMunicipalitySummaries(forceRefresh),
        skillRepositoryService.fetchAllApplicantProfiles(forceRefresh),
      ])

      municipalityRows.value = summaries
      allApplicants.value = applicants
      stats.value = computeRepositoryStats(summaries, applicants)
    } catch (err: any) {
      error.value = err?.message || 'Failed to load skill repository data'
      console.error('[useSkillRepositoryStore] Error loading repository data:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadMunicipalityDetail(municipalityName: string, forceRefresh = false): Promise<MunicipalitySkillDetail | null> {
    isDetailLoading.value = true
    error.value = null
    try {
      const detail = await skillRepositoryService.fetchMunicipalityDetail(municipalityName, forceRefresh)
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
    allApplicants,
    stats,
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
    filteredApplicants,

    // Actions
    loadRepositoryData,
    loadMunicipalityDetail,
    setSelectedMunicipality,
    setSelectedBarangay,
    setSelectedSkillFilter,
    setSearchQuery,
    setActiveTab,
    resetFilters,
  }
})
