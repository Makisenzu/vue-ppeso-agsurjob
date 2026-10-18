import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { applicantEntryService } from '@/services/peso/provincialPeso/applicantEntryService'
import { mapToApplicantEntryRecord } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import type { ApplicantEntryRecord, ApplicantInsert, ApplicantUpdate, ApplicantRegistryFilters, ApplicantStatsSummary, ExistingApplicantMatch } from '@/types/peso/provincialPeso/applicantEntry'

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

  // ─── Server Totals ───
  // `applicants` holds only the current page; these come from the database.
  const filteredCount = ref<number>(0)
  const stats = ref<ApplicantStatsSummary>({ total: 0, gip: 0, tupad: 0, spes: 0 })
  const municipalities = ref<string[]>([])

  // Incremented per fetch so a slow response for an old page/filter can't overwrite a newer one
  let fetchSequence = 0

  // Revisiting the page reuses the loaded page, and paging/filtering reuses the stat cards and
  // municipality list, while they are younger than this. Mutations and manual refresh bypass it.
  const REGISTRY_FRESH_MS = 1000 * 60 * 5
  let pageFetchedAt = 0
  let summaryFetchedAt = 0

  const currentFilters = (): ApplicantRegistryFilters => ({
    search: searchQuery.value,
    gender: selectedGenderFilter.value,
    employmentStatus: selectedEmploymentStatusFilter.value,
    program: selectedProgramFilter.value,
    municipality: selectedMunicipalityFilter.value,
  })

  // ─── Actions ───
  const fetchApplicants = async (isManualRefresh: boolean = false, silent: boolean = false) => {
    const sequence = ++fetchSequence
    if (!silent) {
      isLoading.value = true
    }

    const includeSummary = isManualRefresh || Date.now() - summaryFetchedAt > REGISTRY_FRESH_MS

    try {
      const [page, summary] = await Promise.all([
        applicantEntryService.fetchApplicantPage(currentFilters(), currentPage.value, pageSize.value),
        includeSummary
          ? Promise.all([applicantEntryService.fetchRegistryStats(), applicantEntryService.fetchRegistryMunicipalities()])
          : null,
      ])
      if (sequence !== fetchSequence) return

      // Fresh array reference ensures table and charts react immediately
      applicants.value = page.rows.map(mapToApplicantEntryRecord)
      filteredCount.value = page.total
      pageFetchedAt = Date.now()
      if (summary) {
        stats.value = summary[0]
        municipalities.value = summary[1]
        summaryFetchedAt = pageFetchedAt
      }
      if (isManualRefresh) {
        toastAlert.success('Data Refreshed', `Refreshed ${stats.value.total.toLocaleString()} applicant records.`)
      }
    } catch (error: any) {
      if (sequence !== fetchSequence) return
      console.error('[applicantEntryStore] Failed to fetch applicants:', error)
      toastAlert.error('Fetch Error', error.message || 'Unable to retrieve applicants registry.')
    } finally {
      if (!silent && sequence === fetchSequence) {
        isLoading.value = false
      }
    }
  }

  /** Fetches only when the loaded page is missing or older than REGISTRY_FRESH_MS (e.g. returning to the page). */
  const fetchApplicantsIfStale = async () => {
    if (Date.now() - pageFetchedAt > REGISTRY_FRESH_MS) {
      await fetchApplicants()
    }
  }

  /** Background resync after a create/update/delete — totals and municipalities may have changed. */
  const syncAfterMutation = () => {
    summaryFetchedAt = 0
    fetchApplicants(false, true).catch((err) => {
      console.error('[applicantEntryStore] Background sync failed:', err)
    })
  }

  /**
   * Every applicant matching the current filters, across all pages (for CSV export).
   */
  const fetchAllFilteredApplicants = async (): Promise<ApplicantEntryRecord[]> => {
    const rows = await applicantEntryService.fetchAllFilteredApplicants(currentFilters())
    return rows.map(mapToApplicantEntryRecord)
  }

  /**
   * Load a single applicant (e.g. opening a details URL directly) without fetching the registry.
   */
  const loadApplicantById = async (id: string): Promise<ApplicantEntryRecord | null> => {
    isLoading.value = true
    try {
      const row = await applicantEntryService.fetchApplicantById(id)
      const record = row ? mapToApplicantEntryRecord(row) : null
      selectedApplicant.value = record
      return record
    } catch (error: any) {
      console.error('[applicantEntryStore] Failed to fetch applicant:', error)
      toastAlert.error('Fetch Error', error.message || 'Unable to retrieve applicant record.')
      return null
    } finally {
      isLoading.value = false
    }
  }

  const refreshApplicants = async () => {
    await fetchApplicants(true)
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

      // If referred to GIP, seamlessly sync GIP store so the new jobseeker is visible without a manual refresh
      if (progs.some((p) => p.toUpperCase().includes('GIP'))) {
        try {
          const gipStore = useGipStore()
          await gipStore.fetchApplicantsData(true, true)
        } catch (gipErr) {
          console.warn('[applicantEntryStore] Non-blocking GIP sync error:', gipErr)
        }
      }

      // Silent background fetch to guarantee complete sync with database defaults and triggers
      syncAfterMutation()

      return newRecord
    } catch (error: any) {
      console.error('[applicantEntryStore] Failed to create applicant:', error)
      toastAlert.error('Registration Error', error.message || 'Failed to register new applicant.')
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Check if an applicant already exists in the registry by name and DOB.
   * Returns match info or null if no duplicate found.
   */
  const checkApplicantDuplicate = async (criteria: {
    firstName: string
    surname: string
    middleName?: string
    dateOfBirth?: string
  }): Promise<ExistingApplicantMatch | null> => {
    try {
      return await applicantEntryService.checkApplicantExists(criteria)
    } catch (error: any) {
      console.error('[applicantEntryStore] Duplicate check failed:', error)
      return null
    }
  }

  /**
   * Link an existing applicant to a new program/offer instead of creating a duplicate record.
   */
  const linkApplicantToProgram = async (
    applicantId: string,
    newProgram: string
  ): Promise<ApplicantEntryRecord | null> => {
    isSubmitting.value = true
    try {
      const result = await applicantEntryService.linkApplicantToProgram(applicantId, newProgram)
      const updatedRecord = mapToApplicantEntryRecord(result.applicant)

      // Update local state with the modified record
      applicants.value = applicants.value.map((a) =>
        a.id === updatedRecord.id ? updatedRecord : a
      )

      const referralInfo = result.referralResults
        .filter((r) => r.success)
        .map((r) => r.program)
        .join(', ')

      toastAlert.success(
        'Applicant Linked to Program',
        `${updatedRecord.fullName} has been linked to ${newProgram}.${referralInfo ? ` Routed to: ${referralInfo}.` : ''}`
      )

      // If linked to GIP, seamlessly sync GIP store so the new jobseeker is visible without a manual refresh
      if (newProgram.toUpperCase().includes('GIP')) {
        try {
          const gipStore = useGipStore()
          await gipStore.fetchApplicantsData(true, true)
        } catch (gipErr) {
          console.warn('[applicantEntryStore] Non-blocking GIP sync error on link:', gipErr)
        }
      }

      // Silent background sync
      syncAfterMutation()

      return updatedRecord
    } catch (error: any) {
      console.error('[applicantEntryStore] Failed to link applicant to program:', error)
      toastAlert.error('Link Error', error.message || `Failed to link applicant to ${newProgram}.`)
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Update an existing applicant record in applicants.applicants.
   * Used by the per-section inline editing in ApplicantNsrpDetails.
   */
  const updateApplicant = async (
    applicantId: string,
    payload: ApplicantUpdate
  ): Promise<ApplicantEntryRecord | null> => {
    isSubmitting.value = true
    try {
      const updatedRow = await applicantEntryService.updateApplicant(applicantId, payload)
      const updatedRecord = mapToApplicantEntryRecord(updatedRow)

      // Replace in local list state with new object reference
      applicants.value = applicants.value.map((a) =>
        a.id === updatedRecord.id ? updatedRecord : a
      )

      // Also update selectedApplicant if viewing this one
      if (selectedApplicant.value?.id === updatedRecord.id) {
        selectedApplicant.value = updatedRecord
      }

      toastAlert.success('Applicant Updated', `${updatedRecord.fullName}'s record has been updated.`)

      // Silent background sync
      syncAfterMutation()

      return updatedRecord
    } catch (error: any) {
      console.error('[applicantEntryStore] Failed to update applicant:', error)
      toastAlert.error('Update Error', error.message || 'Failed to update applicant record.')
      throw error
    } finally {
      isSubmitting.value = false
    }
  }

  const deleteApplicant = async (applicantId: string): Promise<boolean> => {
    isSubmitting.value = true
    try {
      const name = applicants.value.find((a) => a.id === applicantId)?.fullName ?? 'The applicant'
      await applicantEntryService.deleteApplicant(applicantId)

      applicants.value = applicants.value.filter((a) => a.id !== applicantId)
      if (selectedApplicant.value?.id === applicantId) {
        selectedApplicant.value = null
      }

      toastAlert.success('Applicant Deleted', `${name} has been removed from the registry.`)

      // Refill the page and refresh totals from the database
      syncAfterMutation()
      return true
    } catch (error: any) {
      console.error('[applicantEntryStore] Failed to delete applicant:', error)
      toastAlert.error('Delete Failed', error.message || 'Could not delete applicant.')
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const bulkDeleteApplicants = async (applicantIds: string[]) => {
    if (applicantIds.length === 0) return { deletedIds: [] as string[], errors: [] as string[] }
    isSubmitting.value = true
    try {
      const result = await applicantEntryService.bulkDeleteApplicants(applicantIds)
      const deleted = new Set(result.deletedIds)

      applicants.value = applicants.value.filter((a) => !deleted.has(a.id))
      if (selectedApplicant.value && deleted.has(selectedApplicant.value.id)) {
        selectedApplicant.value = null
      }

      if (result.deletedIds.length > 0) {
        const count = result.deletedIds.length
        toastAlert.success(
          'Bulk Delete Completed',
          `Deleted ${count} applicant${count > 1 ? 's' : ''}` +
            (result.errors.length > 0 ? ` (${result.errors.length} skipped).` : '.')
        )
      }
      if (result.deletedIds.length > 0) {
        syncAfterMutation()
      }
      if (result.errors.length > 0) {
        toastAlert.error(
          result.deletedIds.length > 0 ? 'Some Applicants Skipped' : 'Bulk Delete Failed',
          result.errors[0]
        )
      }
      return result
    } catch (error: any) {
      console.error('[applicantEntryStore] Bulk delete failed:', error)
      toastAlert.error('Bulk Delete Error', error.message || 'Could not complete bulk delete.')
      return { deletedIds: [] as string[], errors: [error.message as string] }
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
    filteredCount,
    stats,
    municipalities,
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
    fetchApplicantsIfStale,
    fetchAllFilteredApplicants,
    loadApplicantById,
    refreshApplicants,
    openDetails,
    closeDetails,
    openAddApplicant,
    closeAddApplicant,
    createApplicant,
    checkApplicantDuplicate,
    linkApplicantToProgram,
    updateApplicant,
    deleteApplicant,
    bulkDeleteApplicants,
    resetFilters,
  }
})

