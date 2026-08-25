import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import {
  pgasChartConfig,
  doleChartConfig,
  applicantsChartConfig,
  formatTickYear,
  formatTooltipLabel,
} from '@/helpers/peso/provincialPeso/gipHelper'

export function useGipDashboard() {
  const router = useRouter()
  const store = useGipStore()

  const {
    pgasYearlyData,
    doleYearlyData,
    applicantsYearlyData,
    totalPgasYearly,
    totalDoleYearly,
    totalApplicantsYearly,
    overallMaleInterns,
    overallFemaleInterns,
    isLoading,
    errorMessage,
  } = storeToRefs(store)

  const { fetchDashboardData } = store

  function navigateToDetails(program?: 'pgas' | 'dole') {
    router.push({
      name: 'provincial-peso-gip-details',
      query: program ? { program } : undefined,
    })
  }

  function navigateToApplicants(status?: string) {
    router.push({
      name: 'provincial-peso-gip-applicants',
      query: status ? { status } : undefined,
    })
  }

  onMounted(() => {
    fetchDashboardData()
  })

  return {
    // Data & State
    pgasYearlyData,
    doleYearlyData,
    applicantsYearlyData,
    totalPgasYearly,
    totalDoleYearly,
    totalApplicantsYearly,
    overallMaleInterns,
    overallFemaleInterns,
    isLoading,
    errorMessage,

    // Chart Configuration & Formatters
    pgasConfig: pgasChartConfig,
    doleConfig: doleChartConfig,
    applicantsConfig: applicantsChartConfig,
    formatTickYear,
    formatTooltipLabel,

    // Navigation & Actions
    navigateToDetails,
    navigateToApplicants,
    fetchDashboardData,
  }
}
