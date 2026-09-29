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
    pendingDecisionCount,
    expiringAppointmentsCount,
    expiredAppointmentsCount,
  } = storeToRefs(store)

  const { fetchDashboardData, refreshDashboardData, fetchDetailsData } = store

  function navigateToDetails(program?: 'pgas' | 'dole') {
    router.push({
      name: 'provincial-peso-gip-details',
      query: program ? { program } : undefined,
    })
  }

  function navigateToPendingAppointments() {
    router.push({
      name: 'provincial-peso-gip-details',
    })
  }

  function navigateToApplicants(status?: string) {
    router.push({
      name: 'provincial-peso-gip-applicants',
      query: status ? { status } : undefined,
    })
  }

  function navigateToPriority() {
    router.push({
      name: 'provincial-peso-gip-priority',
    })
  }

  onMounted(() => {
    fetchDashboardData()
    fetchDetailsData()
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
    pendingDecisionCount,
    expiringAppointmentsCount,
    expiredAppointmentsCount,
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
    navigateToPendingAppointments,
    navigateToApplicants,
    navigateToPriority,
    fetchDashboardData,
    refreshDashboardData,
  }
}
