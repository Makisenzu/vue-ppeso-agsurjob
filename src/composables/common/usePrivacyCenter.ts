import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/common/auth'
import { usePrivacyStore } from '@/stores/common/privacyStore'
import {
  DATA_SUBJECT_REQUEST_LABELS,
  PRIVACY_PURPOSE_LABELS,
  PRIVACY_REQUEST_OPTIONS,
  buildPersonalDataExportFileName,
  formatPrivacyDate,
  getDataSubjectRequestStatusBadgeClass,
  isOpenDataSubjectRequest,
} from '@/helpers/common/privacyHelper'
import type { DataSubjectRequestType, PrivacyPurpose } from '@/types/common/privacy'

/** Saves a JSON value as a file in the browser; nothing is uploaded or kept elsewhere. */
function saveJsonFile(value: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/** "Privacy & My Data": consents, download my data, and requests to the Data Protection Officer. */
export function usePrivacyCenter() {
  const authStore = useAuthStore()
  const { privacyStatus } = storeToRefs(authStore)
  const privacyStore = usePrivacyStore()
  const {
    myRequests,
    isLoadingRequests,
    isSubmittingRequest,
    isExporting,
    withdrawingPurpose,
    isRequestSheetOpen,
    requestType,
  } = storeToRefs(privacyStore)

  /** Current, not-withdrawn consents, newest first */
  const activeConsents = computed(() =>
    (privacyStatus.value?.consents ?? [])
      .filter((consent) => !consent.withdrawn_at)
      .map((consent) => ({
        ...consent,
        label: PRIVACY_PURPOSE_LABELS[consent.purpose],
        grantedOn: formatPrivacyDate(consent.granted_at),
        isCurrentVersion: consent.notice_version === privacyStatus.value?.notice_version,
        // Required purposes can only end with the account (erasure request)
        canWithdraw: !(privacyStatus.value?.required ?? []).includes(consent.purpose),
      }))
  )

  const requests = computed(() =>
    myRequests.value.map((request) => ({
      ...request,
      label: DATA_SUBJECT_REQUEST_LABELS[request.request_type],
      filedOn: formatPrivacyDate(request.created_at),
      resolvedOn: request.resolved_at ? formatPrivacyDate(request.resolved_at) : null,
      badgeClass: getDataSubjectRequestStatusBadgeClass(request.status),
      isOpen: isOpenDataSubjectRequest(request.status),
    }))
  )

  const openRequestTypes = computed(
    () => new Set(myRequests.value.filter((request) => isOpenDataSubjectRequest(request.status)).map((request) => request.request_type))
  )

  const requestOptions = computed(() =>
    PRIVACY_REQUEST_OPTIONS.map((option) => ({ ...option, isOpen: openRequestTypes.value.has(option.type) }))
  )

  const requestTitle = computed(() => (requestType.value ? DATA_SUBJECT_REQUEST_LABELS[requestType.value] : ''))
  const isErasure = computed(() => requestType.value === 'erasure')

  // ─── Request sheet ───
  const requestDetails = ref('')
  const REQUEST_DETAILS_MAX = 2000

  watch(isRequestSheetOpen, (open) => {
    if (open) requestDetails.value = ''
  })

  const canSubmitRequest = computed(
    () => requestDetails.value.length <= REQUEST_DETAILS_MAX && (isErasure.value || requestDetails.value.trim().length > 0)
  )

  function openRequest(type: DataSubjectRequestType) {
    privacyStore.openRequestSheet(type)
  }

  function setRequestSheetOpen(open: boolean) {
    if (open) isRequestSheetOpen.value = true
    else privacyStore.closeRequestSheet()
  }

  async function submitRequest() {
    if (!canSubmitRequest.value) return
    await privacyStore.submitRequest(requestDetails.value)
  }

  async function downloadMyData() {
    const data = await privacyStore.exportMyData()
    if (data) saveJsonFile(data, buildPersonalDataExportFileName())
  }

  function withdraw(purpose: PrivacyPurpose) {
    void privacyStore.withdrawConsent(purpose)
  }

  onMounted(() => {
    void privacyStore.refreshStatus()
    void privacyStore.loadMyRequests()
  })

  return {
    activeConsents,
    noticeVersion: computed(() => privacyStatus.value?.notice_version ?? ''),
    requests,
    requestOptions,
    isLoadingRequests,
    isExporting,
    withdrawingPurpose,
    // Request sheet
    isRequestSheetOpen,
    requestTitle,
    isErasure,
    requestDetails,
    requestDetailsMax: REQUEST_DETAILS_MAX,
    canSubmitRequest,
    isSubmittingRequest,
    openRequest,
    setRequestSheetOpen,
    submitRequest,
    // Actions
    downloadMyData,
    withdraw,
  }
}
