import { ref } from 'vue'
import { defineStore } from 'pinia'
import { registeredCompanyService } from '@/services/peso/provincialPeso/registeredCompanyService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { RegisteredCompanyListItem } from '@/types/peso/provincialPeso/registeredCompany'

export const useRegisteredCompanyStore = defineStore('pesoRegisteredCompany', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const companies = ref<RegisteredCompanyListItem[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  // ─── Actions ───
  async function fetchCompanies(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      companies.value = await registeredCompanyService.fetchCompanies()
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    companies,
    isLoading,
    errorMessage,
    // Actions
    fetchCompanies,
  }
})
