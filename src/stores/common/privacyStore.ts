import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { useAuthStore } from '@/stores/common/auth'
import { privacyService } from '@/services/common/privacyService'
import { toSafeErrorMessage } from '@/helpers/common/safeErrorMessage'
import { DATA_SUBJECT_REQUEST_LABELS } from '@/helpers/common/privacyHelper'
import type { DataSubjectRequestRow, DataSubjectRequestType, PrivacyPurpose } from '@/types/common/privacy'

const messageOf = (error: unknown) => (error instanceof Error ? error.message : '')

/**
 * The signed-in account's consents and data subject requests (RA 10173; .agents/PRIVACY.md).
 * The consent status itself lives in the auth store, which the router guard reads.
 */
export const usePrivacyStore = defineStore('privacy', () => {
  const toastAlert = useToastAlert()
  const authStore = useAuthStore()

  // ─── State ───
  const myRequests = ref<DataSubjectRequestRow[]>([])
  const isLoadingRequests = ref(false)
  const isAccepting = ref(false)
  const isSubmittingRequest = ref(false)
  const isExporting = ref(false)
  const withdrawingPurpose = ref<PrivacyPurpose | null>(null)

  // ─── UI Flags ───
  const isRequestSheetOpen = ref(false)
  const requestType = ref<DataSubjectRequestType | null>(null)

  // ─── Actions ───

  /** Records consent to the current notice; returns true when nothing required is left. */
  async function acceptNotice(purposes: PrivacyPurpose[]): Promise<boolean> {
    isAccepting.value = true
    try {
      const status = await privacyService.acceptPrivacyNotice(purposes)
      authStore.setPrivacyStatus(status)
      return status.missing.length === 0
    } catch (error) {
      toastAlert.error('Consent not saved', toSafeErrorMessage(messageOf(error)))
      return false
    } finally {
      isAccepting.value = false
    }
  }

  async function refreshStatus(): Promise<void> {
    try {
      authStore.setPrivacyStatus(await privacyService.fetchMyPrivacyStatus())
    } catch (error) {
      toastAlert.error('Privacy settings unavailable', toSafeErrorMessage(messageOf(error)))
    }
  }

  async function withdrawConsent(purpose: PrivacyPurpose): Promise<void> {
    withdrawingPurpose.value = purpose
    try {
      authStore.setPrivacyStatus(await privacyService.withdrawConsent(purpose))
      toastAlert.success('Consent withdrawn', 'PESO will no longer process this data.')
    } catch (error) {
      toastAlert.error('Consent not withdrawn', toSafeErrorMessage(messageOf(error)))
    } finally {
      withdrawingPurpose.value = null
    }
  }

  async function loadMyRequests(): Promise<void> {
    const profileId = authStore.profile?.id
    if (!profileId) return
    isLoadingRequests.value = true
    try {
      myRequests.value = await privacyService.fetchMyRequests(profileId)
    } catch (error) {
      toastAlert.error('Requests unavailable', toSafeErrorMessage(messageOf(error)))
    } finally {
      isLoadingRequests.value = false
    }
  }

  function openRequestSheet(type: DataSubjectRequestType) {
    requestType.value = type
    isRequestSheetOpen.value = true
  }

  function closeRequestSheet() {
    isRequestSheetOpen.value = false
  }

  async function submitRequest(details: string): Promise<boolean> {
    const type = requestType.value
    if (!type) return false
    isSubmittingRequest.value = true
    try {
      await privacyService.submitRequest(type, details)
      toastAlert.success('Request sent', `"${DATA_SUBJECT_REQUEST_LABELS[type]}" was sent to PESO.`)
      isRequestSheetOpen.value = false
      await loadMyRequests()
      return true
    } catch (error) {
      toastAlert.error('Request not sent', toSafeErrorMessage(messageOf(error)))
      return false
    } finally {
      isSubmittingRequest.value = false
    }
  }

  /** The account's data as JSON, or null when it could not be prepared */
  async function exportMyData(): Promise<unknown | null> {
    isExporting.value = true
    try {
      return await privacyService.exportMyData()
    } catch (error) {
      toastAlert.error('Download failed', toSafeErrorMessage(messageOf(error)))
      return null
    } finally {
      isExporting.value = false
    }
  }

  return {
    // State
    myRequests,
    isLoadingRequests,
    isAccepting,
    isSubmittingRequest,
    isExporting,
    withdrawingPurpose,
    isRequestSheetOpen,
    requestType,
    // Actions
    acceptNotice,
    refreshStatus,
    withdrawConsent,
    loadMyRequests,
    openRequestSheet,
    closeRequestSheet,
    submitRequest,
    exportMyData,
  }
})
