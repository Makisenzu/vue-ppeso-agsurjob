import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { privacyRequestService } from '@/services/admin/privacyRequestService'
import { userAccountService } from '@/services/admin/userAccountService'
import { toSafeErrorMessage } from '@/helpers/common/safeErrorMessage'
import type { AdminPrivacyRequestRow, PrivacyRequestStatusFilter } from '@/types/admin/privacyRequests'
import type { DataSubjectRequestStatus } from '@/types/common/privacy'

const messageOf = (error: unknown) => (error instanceof Error ? error.message : '')

export const usePrivacyRequestStore = defineStore('privacyRequests', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const requests = ref<AdminPrivacyRequestRow[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const isSaving = ref(false)

  // ─── Filters & Paging ───
  const statusFilter = ref<PrivacyRequestStatusFilter>('ALL')
  const currentPage = ref(1)
  const pageSize = 20

  // ─── UI Flags ───
  const selectedRequest = ref<AdminPrivacyRequestRow | null>(null)
  const isDetailsOpen = ref(false)

  // Incremented per fetch so a slow response for an old page can't overwrite a newer one
  let fetchSequence = 0

  // ─── Actions ───
  async function fetchRequests() {
    const sequence = ++fetchSequence
    isLoading.value = true
    try {
      const page = await privacyRequestService.fetchRequestPage(statusFilter.value, currentPage.value, pageSize)
      if (sequence !== fetchSequence) return
      requests.value = [...page.rows]
      total.value = page.total
    } catch (error) {
      if (sequence === fetchSequence) toastAlert.error('Requests unavailable', toSafeErrorMessage(messageOf(error)))
    } finally {
      if (sequence === fetchSequence) isLoading.value = false
    }
  }

  function setStatusFilter(status: PrivacyRequestStatusFilter) {
    statusFilter.value = status
    currentPage.value = 1
    void fetchRequests()
  }

  function goToPage(page: number) {
    currentPage.value = page
    void fetchRequests()
  }

  function openDetails(request: AdminPrivacyRequestRow) {
    selectedRequest.value = request
    isDetailsOpen.value = true
  }

  function closeDetails() {
    isDetailsOpen.value = false
  }

  async function updateStatus(status: DataSubjectRequestStatus, note: string): Promise<boolean> {
    const request = selectedRequest.value
    if (!request) return false
    isSaving.value = true
    try {
      await privacyRequestService.updateRequest(request.id, status, note)
      toastAlert.success('Request updated', `Marked as ${status.toLowerCase()}.`)
      isDetailsOpen.value = false
      await fetchRequests()
      return true
    } catch (error) {
      toastAlert.error('Request not updated', toSafeErrorMessage(messageOf(error)))
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Erasure (Sec. 16(e)): deletes the account, its records and its files (migration 069), then closes
   * the request. The request row survives with profile_id NULL as proof it was handled.
   */
  async function completeErasure(note: string): Promise<boolean> {
    const request = selectedRequest.value
    if (!request?.profile_id) return false
    isSaving.value = true
    try {
      const { filesLeft } = await userAccountService.deleteAccount(request.profile_id)
      await privacyRequestService.updateRequest(
        request.id,
        'Completed',
        note.trim() || 'Your account, records and uploaded files were deleted.'
      )
      if (filesLeft) {
        toastAlert.error('Some files remain', 'The account was deleted, but some files could not be removed. Remove them from Storage.')
      } else {
        toastAlert.success('Account deleted', 'The request is completed.')
      }
      isDetailsOpen.value = false
      await fetchRequests()
      return true
    } catch (error) {
      toastAlert.error('Erasure failed', toSafeErrorMessage(messageOf(error)))
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    // State
    requests,
    total,
    isLoading,
    isSaving,
    statusFilter,
    currentPage,
    pageSize,
    selectedRequest,
    isDetailsOpen,
    // Actions
    fetchRequests,
    setStatusFilter,
    goToPage,
    openDetails,
    closeDetails,
    updateStatus,
    completeErasure,
  }
})
