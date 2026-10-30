import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  deleteJobPostings,
  fetchJobPostingById,
  fetchJobPostings,
  fetchJobPostingStats,
  saveJobPosting,
  updateJobPostingStatus,
} from '@/services/employer/jobPostingService'
import { jobVacancyAttachmentService } from '@/services/common/jobVacancyAttachmentService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import {
  JOB_POSTING_PAGE_SIZE,
  getJobPostingStatusLabel,
  toJobPostingErrorMessage,
} from '@/helpers/employer/jobPostingHelper'
import type { JobVacancyStatus } from '@/types/peso/provincialPeso/jobFair'
import type {
  JobPostingAttachmentChanges,
  JobPostingDetails,
  JobPostingListRow,
  JobPostingPayload,
  JobPostingStats,
  JobPostingStatusFilter,
} from '@/types/employer/jobPosting'

const EMPTY_STATS: JobPostingStats = { all: 0, open: 0, filled: 0, closed: 0, cancelled: 0 }

/**
 * The owner's job postings (esmdd.job_vacancies of their establishment). One page is held at a time;
 * search, status filter and counts run on the server (BACKEND.md §19).
 */
export const useJobPostingStore = defineStore('employerJobPosting', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── State ───
  const rows = ref<JobPostingListRow[]>([])
  const total = ref(0)
  const stats = ref<JobPostingStats>({ ...EMPTY_STATS })
  const search = ref('')
  const statusFilter = ref<JobPostingStatusFilter>('all')
  const page = ref(0)
  const pageSize = ref(JOB_POSTING_PAGE_SIZE)
  const isLoading = ref(false)
  const isLoadingStats = ref(false)

  const isFormOpen = ref(false)
  const editingPosting = ref<JobPostingDetails | null>(null)
  const isLoadingPosting = ref(false)
  const isSaving = ref(false)
  const busyId = ref<string | null>(null)
  const isBulkDeleting = ref(false)

  /** Ignores a slower, older response that lands after a newer one */
  let requestId = 0

  // ─── Actions ───

  async function fetchPostings(): Promise<void> {
    const establishmentId = authStore.employerEstablishment?.id
    if (!establishmentId) {
      rows.value = []
      total.value = 0
      return
    }
    const current = ++requestId
    isLoading.value = true
    try {
      const result = await fetchJobPostings(establishmentId, {
        search: search.value,
        status: statusFilter.value,
        page: page.value,
        pageSize: pageSize.value,
      })
      if (current !== requestId) return
      // A deletion can empty the last page: step back one
      if (result.rows.length === 0 && page.value > 0 && result.total > 0) {
        page.value -= 1
        await fetchPostings()
        return
      }
      rows.value = result.rows
      total.value = result.total
    } catch (error: unknown) {
      if (current === requestId) toastAlert.error('Error', toJobPostingErrorMessage(error, 'Failed to load your job postings.'))
    } finally {
      if (current === requestId) isLoading.value = false
    }
  }

  async function fetchStats(): Promise<void> {
    const establishmentId = authStore.employerEstablishment?.id
    if (!establishmentId) {
      stats.value = { ...EMPTY_STATS }
      return
    }
    isLoadingStats.value = true
    try {
      stats.value = await fetchJobPostingStats(establishmentId)
    } catch {
      // The list shows its own error; the counts just stay as they were
    } finally {
      isLoadingStats.value = false
    }
  }

  const refresh = () => Promise.all([fetchPostings(), fetchStats()])

  function setSearch(value: string) {
    search.value = value
    page.value = 0
    return fetchPostings()
  }

  function setStatusFilter(value: JobPostingStatusFilter) {
    statusFilter.value = value
    page.value = 0
    return fetchPostings()
  }

  function setPage(value: number) {
    page.value = Math.max(0, value)
    return fetchPostings()
  }

  // ─── Create / edit sheet ───

  function openCreate() {
    editingPosting.value = null
    isFormOpen.value = true
  }

  /** Loads every field of the posting and its attachments before the sheet opens */
  async function openEdit(id: string): Promise<void> {
    busyId.value = id
    isLoadingPosting.value = true
    try {
      const [posting, attachments] = await Promise.all([
        fetchJobPostingById(id),
        jobVacancyAttachmentService.fetchAttachments(id),
      ])
      editingPosting.value = { ...posting, attachments }
      isFormOpen.value = true
    } catch (error: unknown) {
      toastAlert.error('Error', toJobPostingErrorMessage(error, 'Failed to open the job posting.'))
    } finally {
      isLoadingPosting.value = false
      busyId.value = null
    }
  }

  function closeForm() {
    isFormOpen.value = false
    editingPosting.value = null
  }

  /**
   * Removed attachments go first (freeing slots), then new files upload. Returns how many changes
   * failed; the posting itself is already saved by then.
   */
  async function applyAttachmentChanges(vacancyId: string, changes: JobPostingAttachmentChanges): Promise<number> {
    let failed = 0
    if (changes.remove.length) {
      await jobVacancyAttachmentService.deleteAttachments(changes.remove).catch(() => {
        failed += changes.remove.length
      })
    }
    const uploads = await Promise.allSettled(
      changes.add.map((file) => jobVacancyAttachmentService.uploadAttachment(vacancyId, file)),
    )
    return failed + uploads.filter((result) => result.status === 'rejected').length
  }

  async function savePosting(
    payload: JobPostingPayload,
    attachmentChanges: JobPostingAttachmentChanges = { add: [], remove: [] },
  ): Promise<boolean> {
    const establishmentId = authStore.employerEstablishment?.id
    if (!establishmentId) return false

    const existing = editingPosting.value
    isSaving.value = true
    try {
      const vacancyId = await saveJobPosting(existing?.id ?? null, establishmentId, payload)
      const failedFiles = await applyAttachmentChanges(vacancyId, attachmentChanges)

      if (failedFiles > 0) {
        toastAlert.error(
          'Some files were not saved',
          `The posting was saved, but ${failedFiles} attachment change${failedFiles === 1 ? '' : 's'} failed. Edit it to try again.`,
        )
      } else {
        toastAlert.success(existing ? 'Job posting updated' : 'Job posted', `"${payload.vacancy.position_title}" has been saved.`)
      }
      closeForm()
      if (!existing) page.value = 0
      await refresh()
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', toJobPostingErrorMessage(error, 'Failed to save the job posting.'))
      return false
    } finally {
      isSaving.value = false
    }
  }

  async function setPostingStatus(row: JobPostingListRow, status: JobVacancyStatus): Promise<void> {
    busyId.value = row.id
    try {
      await updateJobPostingStatus(row.id, status)
      toastAlert.success('Status updated', `"${row.position_title}" is now ${getJobPostingStatusLabel(status).toLowerCase()}.`)
      await refresh()
    } catch (error: unknown) {
      toastAlert.error('Error', toJobPostingErrorMessage(error, 'Failed to update the status.'))
    } finally {
      busyId.value = null
    }
  }

  async function deletePostings(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return false
    const isBulk = ids.length > 1
    if (isBulk) isBulkDeleting.value = true
    else busyId.value = ids[0] ?? null
    try {
      // Read the file paths first: the rows go with the postings, the stored files don't
      const paths = await jobVacancyAttachmentService.fetchPathsOfVacancies(ids)
      await deleteJobPostings(ids)
      await jobVacancyAttachmentService.removeFiles(paths)
      toastAlert.success(
        isBulk ? `${ids.length} job postings deleted` : 'Job posting deleted',
      )
      await refresh()
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', toJobPostingErrorMessage(error, 'Failed to delete the job posting.'))
      return false
    } finally {
      isBulkDeleting.value = false
      busyId.value = null
    }
  }

  return {
    // State
    rows,
    total,
    stats,
    search,
    statusFilter,
    page,
    pageSize,
    isLoading,
    isLoadingStats,
    isFormOpen,
    editingPosting,
    isLoadingPosting,
    isSaving,
    busyId,
    isBulkDeleting,
    // Actions
    fetchPostings,
    fetchStats,
    refresh,
    setSearch,
    setStatusFilter,
    setPage,
    openCreate,
    openEdit,
    closeForm,
    savePosting,
    setPostingStatus,
    deletePostings,
  }
})
