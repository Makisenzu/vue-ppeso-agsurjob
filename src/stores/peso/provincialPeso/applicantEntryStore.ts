import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { applicantEntryService } from '@/services/peso/provincialPeso/applicantEntryService'
import { mapToApplicantEntryRecord } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import type { ApplicantEntryRecord, ApplicantInsert } from '@/types/peso/provincialPeso/applicantEntry'

export const useApplicantEntryStore = defineStore('applicantEntry', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const applicants = ref<ApplicantEntryRecord[]>([])
  const isLoading = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)

  // ─── UI & Selection State ───
  const selectedApplicant = ref<ApplicantEntryRecord | null>(null)
  const isAddApplicantOpen = ref<boolean>(false)

  // ─── Filter & Search State ───
  const searchQuery = ref<string>('')
  const selectedGenderFilter = ref<string>('ALL')
  const selectedEmploymentStatusFilter = ref<string>('ALL')
  const selectedProgramFilter = ref<string>('ALL')
  const selectedMunicipalityFilter = ref<string>('ALL')

  // ─── Pagination State ───
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(10)

  // ─── Actions ───
  const fetchApplicants = async (isManualRefresh: boolean = false, silent: boolean = false) => {
    if (!silent) {
      isLoading.value = true
    }
    try {
      const data = await applicantEntryService.fetchAllApplicants()
      applicants.value = data.map(mapToApplicantEntryRecord)
      if (isManualRefresh) {
        toastAlert.success('Success', `Refreshed ${data.length} applicant records`)
      }
    } catch (error: any) {
      console.error('[applicantEntryStore] Failed to fetch applicants:', error)
      toastAlert.error('Fetch Error', error.message || 'Unable to retrieve applicants registry.')
    } finally {
      if (!silent) {
        isLoading.value = false
      }
    }
  }

  const openDetails = (applicant: ApplicantEntryRecord) => {
    selectedApplicant.value = applicant
    isAddApplicantOpen.value = false
  }

  const closeDetails = () => {
    selectedApplicant.value = null
  }

  const openAddApplicant = () => {
    isAddApplicantOpen.value = true
    selectedApplicant.value = null
  }

  const closeAddApplicant = () => {
    isAddApplicantOpen.value = false
  }

  const createApplicant = async (payload: ApplicantInsert): Promise<ApplicantEntryRecord> => {
    isSubmitting.value = true
    try {
      const createdRow = await applicantEntryService.createApplicant(payload)
      const newRecord = mapToApplicantEntryRecord(createdRow)
      const progs = newRecord.referredPrograms
      const progDetail = progs.length > 0 ? ` and referred to ${progs.join(', ')}` : ''

      // Prepend to local state immediately so table and metric cards reflect the new applicant right away
      applicants.value = [newRecord, ...applicants.value.filter((a) => a.id !== newRecord.id)]

      // Reset filters and ensure page is at start so the newly created jobseeker is immediately visible in the data table
      resetFilters()

      toastAlert.success('Applicant Created', `${newRecord.fullName} has been successfully registered${progDetail}.`)
      isAddApplicantOpen.value = false

      // Silent background fetch to guarantee complete sync with database defaults and triggers
      fetchApplicants(false, true).catch((err) => {
        console.error('[applicantEntryStore] Background sync failed:', err)
      })

      return newRecord
    } catch (error: any) {
      console.error('[applicantEntryStore] Failed to create applicant:', error)
      toastAlert.error('Registration Error', error.message || 'Failed to register new applicant.')
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  const resetFilters = () => {
    searchQuery.value = ''
    selectedGenderFilter.value = 'ALL'
    selectedEmploymentStatusFilter.value = 'ALL'
    selectedProgramFilter.value = 'ALL'
    selectedMunicipalityFilter.value = 'ALL'
    currentPage.value = 1
  }

  return {
    applicants,
    isLoading,
    isSubmitting,
    selectedApplicant,
    isAddApplicantOpen,
    searchQuery,
    selectedGenderFilter,
    selectedEmploymentStatusFilter,
    selectedProgramFilter,
    selectedMunicipalityFilter,
    currentPage,
    pageSize,
    fetchApplicants,
    openDetails,
    closeDetails,
    openAddApplicant,
    closeAddApplicant,
    createApplicant,
    resetFilters,
  }
})

