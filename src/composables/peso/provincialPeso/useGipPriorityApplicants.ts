import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { LPII_CONFIG, getInitials } from '@/helpers/peso/provincialPeso/gipHelper'
import type { GipPriorityApplicantRecord } from '@/types/peso/provincialPeso/gip'

export function useGipPriorityApplicants() {
  const router = useRouter()
  const store = useGipStore()

  const { priorityApplicants, isPriorityLoading } = storeToRefs(store)
  const { fetchPriorityApplicants, exportPriorityCsv } = store

  // ─── Filter & Pagination State ───
  const searchQuery = ref('')
  const selectedMunicipality = ref('ALL')
  const selectedTier = ref('ALL')
  const currentPage = ref(1)
  const pageSize = ref(10)

  // Municipalities present in priority records
  const availableMunicipalities = computed(() => {
    const set = new Set<string>()
    for (const item of priorityApplicants.value) {
      if (item.municipality && item.municipality !== 'N/A') {
        set.add(item.municipality)
      }
    }
    return Array.from(set).sort()
  })

  // Summary Statistics
  const stats = computed(() => {
    const total = priorityApplicants.value.length
    if (total === 0) return { total: 0, maxScore: 0, avgScore: 0, highCount: 0 }

    const scores = priorityApplicants.value.map((r) => r.totalPriorityScore)
    const maxScore = Math.max(...scores)
    const sum = scores.reduce((a, b) => a + b, 0)
    const avgScore = Math.round(sum / total)
    const highCount = priorityApplicants.value.filter((r) => r.totalPriorityScore >= 70).length

    return { total, maxScore, avgScore, highCount }
  })

  // Filtered priority applicants
  const filteredPriorityList = computed(() => {
    return priorityApplicants.value.filter((app) => {
      // Search query
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase().trim()
        const matchName = app.fullName.toLowerCase().includes(q)
        const matchCode = app.code.toLowerCase().includes(q)
        const matchCourse = app.course.toLowerCase().includes(q)
        const matchMuni = app.municipality.toLowerCase().includes(q)
        const matchBrgy = app.barangay.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchCourse && !matchMuni && !matchBrgy) {
          return false
        }
      }

      // Municipality filter
      if (selectedMunicipality.value !== 'ALL') {
        if (app.municipality.toLowerCase() !== selectedMunicipality.value.toLowerCase()) {
          return false
        }
      }

      // Score tier filter
      if (selectedTier.value === 'HIGH') {
        if (app.totalPriorityScore < 70) return false
      } else if (selectedTier.value === 'MODERATE') {
        if (app.totalPriorityScore < 40 || app.totalPriorityScore >= 70) return false
      } else if (selectedTier.value === 'BASELINE') {
        if (app.totalPriorityScore >= 40) return false
      }

      return true
    })
  })

  // Paginated records
  const totalPages = computed(() => {
    return Math.ceil(filteredPriorityList.value.length / pageSize.value) || 1
  })

  const paginatedPriorityList = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredPriorityList.value.slice(start, start + pageSize.value)
  })

  // Reset page whenever filters change
  watch([searchQuery, selectedMunicipality, selectedTier], () => {
    currentPage.value = 1
  })

  // ─── Actions & Navigation ───
  const handleRefresh = async () => {
    await fetchPriorityApplicants(true)
  }

  const resetFilters = () => {
    searchQuery.value = ''
    selectedMunicipality.value = 'ALL'
    selectedTier.value = 'ALL'
    currentPage.value = 1
  }

  const goBack = () => {
    router.push({ name: 'provincial-peso-gip-applicants' })
  }

  const navigateToProfile = (record: GipPriorityApplicantRecord) => {
    router.push({
      name: 'provincial-peso-gip-applicant-details',
      params: { id: record.applicantId },
    })
  }

  const navigateToDeploy = (record: GipPriorityApplicantRecord) => {
    router.push({
      name: 'provincial-peso-gip-add',
      query: { applicantId: record.applicantId || record.gipApplicantId },
    })
  }

  // Visual helpers
  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) {
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold'
    }
    if (rank === 2) {
      return 'bg-slate-400/20 text-slate-700 dark:text-slate-300 border-slate-400/40 font-bold'
    }
    if (rank === 3) {
      return 'bg-amber-700/20 text-amber-800 dark:text-amber-400 border-amber-700/40 font-bold'
    }
    return 'bg-muted text-muted-foreground border-border font-semibold'
  }

  const getScoreColorClass = (score: number) => {
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400 font-bold'
    if (score >= 50) return 'text-blue-600 dark:text-blue-400 font-bold'
    if (score >= 30) return 'text-amber-600 dark:text-amber-400 font-medium'
    return 'text-muted-foreground'
  }

  onMounted(async () => {
    if (priorityApplicants.value.length === 0) {
      await fetchPriorityApplicants()
    }
  })

  return {
    // State & Data
    priorityApplicants,
    isPriorityLoading,
    filteredPriorityList,
    paginatedPriorityList,
    availableMunicipalities,
    stats,

    // Filters & Pagination
    searchQuery,
    selectedMunicipality,
    selectedTier,
    currentPage,
    pageSize,
    totalPages,

    // Actions & Navigation
    handleRefresh,
    resetFilters,
    exportPriorityCsv,
    goBack,
    navigateToProfile,
    navigateToDeploy,

    // Visual Helpers
    getRankBadgeClass,
    getScoreColorClass,
    getInitials,
    LPII_CONFIG,
  }
}
