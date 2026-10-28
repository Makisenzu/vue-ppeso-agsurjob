import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrivacyRequestStore } from '@/stores/admin/privacyRequestStore'
import {
  DATA_SUBJECT_REQUEST_LABELS,
  DATA_SUBJECT_REQUEST_STATUSES,
  formatPrivacyDate,
  getDataSubjectRequestStatusBadgeClass,
  isOpenDataSubjectRequest,
} from '@/helpers/common/privacyHelper'
import type { PrivacyRequestStatusFilter } from '@/types/admin/privacyRequests'
import type { DataSubjectRequestStatus } from '@/types/common/privacy'

const ROLE_LABELS: Record<string, string> = {
  applicant: 'Applicant',
  company_owner: 'Employer',
  company_member: 'Employer',
  provincial_peso: 'Provincial PESO',
  municipal_peso: 'Municipal PESO',
  admin: 'Admin',
}

/**
 * Admin queue of data subject requests. Rows are never deleted from here: they are the record that
 * each request was handled (retention purges closed ones after 5 years, migration 073).
 */
export function usePrivacyRequests() {
  const store = usePrivacyRequestStore()
  const { requests, total, isLoading, isSaving, statusFilter, currentPage, selectedRequest, isDetailsOpen } =
    storeToRefs(store)

  const statusOptions: { value: PrivacyRequestStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All requests' },
    ...DATA_SUBJECT_REQUEST_STATUSES.map((status) => ({ value: status, label: status })),
  ]

  const rows = computed(() =>
    requests.value.map((request) => ({
      ...request,
      typeLabel: DATA_SUBJECT_REQUEST_LABELS[request.request_type],
      requester: request.requester_name || (request.profile_id ? 'Unnamed account' : 'Deleted account'),
      roleLabel: request.requester_role ? (ROLE_LABELS[request.requester_role] ?? request.requester_role) : null,
      filedOn: formatPrivacyDate(request.created_at),
      badgeClass: getDataSubjectRequestStatusBadgeClass(request.status),
    }))
  )

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / store.pageSize)))

  // ─── Details sheet ───
  const note = ref('')
  const noteError = ref('')

  watch(isDetailsOpen, (open) => {
    if (!open) return
    note.value = ''
    noteError.value = ''
  })

  const selected = computed(() => {
    const request = selectedRequest.value
    if (!request) return null
    return {
      ...request,
      typeLabel: DATA_SUBJECT_REQUEST_LABELS[request.request_type],
      filedOn: formatPrivacyDate(request.created_at),
      resolvedOn: request.resolved_at ? formatPrivacyDate(request.resolved_at) : null,
      badgeClass: getDataSubjectRequestStatusBadgeClass(request.status),
      isOpen: isOpenDataSubjectRequest(request.status),
      canErase: request.request_type === 'erasure' && !!request.profile_id && isOpenDataSubjectRequest(request.status),
    }
  })

  function setDetailsOpen(open: boolean) {
    if (open) isDetailsOpen.value = true
    else store.closeDetails()
  }

  async function setStatus(status: DataSubjectRequestStatus) {
    // A refusal always says why (BACKEND.md §17.8)
    if (status === 'Rejected' && !note.value.trim()) {
      noteError.value = 'Say why the request is rejected.'
      return
    }
    noteError.value = ''
    await store.updateStatus(status, note.value)
  }

  async function completeErasure() {
    await store.completeErasure(note.value)
  }

  function onStatusFilterChange(value: unknown) {
    store.setStatusFilter(String(value) as PrivacyRequestStatusFilter)
  }

  onMounted(() => {
    void store.fetchRequests()
  })

  return {
    rows,
    total,
    isLoading,
    isSaving,
    statusFilter,
    statusOptions,
    currentPage,
    pageCount,
    isDetailsOpen,
    selected,
    note,
    noteError,
    onStatusFilterChange,
    goToPage: store.goToPage,
    openDetails: store.openDetails,
    setDetailsOpen,
    setStatus,
    completeErasure,
  }
}
