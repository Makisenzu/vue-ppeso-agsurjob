import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { tupadService } from '@/services/peso/provincialPeso/tupadService'
import { tupadDocumentService } from '@/services/common/tupadDocumentService'
import { applicantEntryService } from '@/services/peso/provincialPeso/applicantEntryService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { formatTupadApplicantName, formatTupadMemberName } from '@/helpers/peso/provincialPeso/tupadHelper'
import type {
  TupadApplicantDocumentMap,
  TupadApplicantReview,
  TupadApplicantStatus,
  TupadApplicantWithRegistry,
  TupadAttachmentWithUrl,
  TupadBatchFormValues,
  TupadBatchRow,
  TupadBatchWithCount,
  TupadMember,
  TupadMemberFormValues,
} from '@/types/peso/provincialPeso/tupad'

const errorMessage = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

export const useTupadStore = defineStore('pesoTupad', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  // shallowRef: rows carry the registry `address` (Json), which is too deep for ref unwrapping; arrays are always reassigned
  const batches = ref<TupadBatchWithCount[]>([])
  /** TUPAD applicants — registry applicants whose referred_programs include TUPAD. */
  const tupadApplicants = shallowRef<TupadApplicantWithRegistry[]>([])
  /** Batch opened on the batch details page, with its engagements (`esmdd.tupad`). */
  const currentBatch = ref<TupadBatchRow | null>(null)
  const members = shallowRef<TupadMember[]>([])
  /** TUPAD applicant ids with an Active engagement in any batch. */
  const activeTupadApplicantIds = ref<string[]>([])

  const isLoadingBatches = ref(false)
  const isLoadingApplicants = ref(false)
  const isLoadingBatch = ref(false)
  const isSubmitting = ref(false)
  const isDeleting = ref(false)
  const batchesError = ref<string | null>(null)
  const applicantsError = ref<string | null>(null)
  const batchError = ref<string | null>(null)

  // ─── UI Flags ───
  const isBatchDialogOpen = ref(false)
  /** Batch being edited in the batch dialog; null when creating one. */
  const editingBatch = ref<TupadBatchRow | null>(null)
  const batchToDelete = ref<TupadBatchWithCount | null>(null)
  const reviewingApplicant = shallowRef<TupadApplicantWithRegistry | null>(null)
  /** Files the applicant attached to their required documents (migration 023). */
  const reviewDocuments = ref<TupadApplicantDocumentMap>({})
  const isLoadingReviewDocuments = ref(false)
  /** TUPAD applicants waiting for delete confirmation (one row or a bulk selection). */
  const applicantsToDelete = shallowRef<TupadApplicantWithRegistry[]>([])
  const isAddMembersOpen = ref(false)
  const editingMember = shallowRef<TupadMember | null>(null)
  const memberToRemove = shallowRef<TupadMember | null>(null)
  /** Beneficiary whose daily attachments are being viewed. */
  const viewingMember = shallowRef<TupadMember | null>(null)
  const memberAttachments = shallowRef<TupadAttachmentWithUrl[]>([])
  const isLoadingAttachments = ref(false)
  const attachmentsError = ref<string | null>(null)

  /**
   * Applicants that can still join the current batch: not Rejected, not already in it,
   * and not Active in another batch.
   */
  const eligibleApplicants = computed(() => {
    const inBatch = new Set(members.value.map((member) => member.tupad_applicant_id))
    const active = new Set(activeTupadApplicantIds.value)
    return tupadApplicants.value.filter(
      (row) => row.status !== 'Rejected' && !inBatch.has(row.id) && !active.has(row.id)
    )
  })

  // ─── Batches ───

  const fetchBatches = async () => {
    isLoadingBatches.value = true
    batchesError.value = null
    try {
      batches.value = await tupadService.fetchBatches()
    } catch (error: unknown) {
      batchesError.value = errorMessage(error, 'Failed to load TUPAD batches')
      toastAlert.error('Unable to load batches', batchesError.value)
    } finally {
      isLoadingBatches.value = false
    }
  }

  const openCreateBatch = () => {
    editingBatch.value = null
    isBatchDialogOpen.value = true
  }

  const openEditBatch = (batch: TupadBatchRow) => {
    editingBatch.value = batch
    isBatchDialogOpen.value = true
  }

  const closeBatchDialog = () => {
    isBatchDialogOpen.value = false
    editingBatch.value = null
  }

  /** Creates or updates a batch; returns the saved batch, or null on failure. */
  const saveBatch = async (values: TupadBatchFormValues): Promise<TupadBatchRow | null> => {
    isSubmitting.value = true
    try {
      const editing = editingBatch.value
      const saved = editing ? await tupadService.updateBatch(editing.id, values) : await tupadService.createBatch(values)

      if (currentBatch.value?.id === saved.id) currentBatch.value = saved
      toastAlert.success(editing ? 'Batch updated' : 'Batch created', `EDL ${saved.edl_number}`)
      closeBatchDialog()
      await fetchBatches()
      return saved
    } catch (error: unknown) {
      toastAlert.error('Unable to save batch', errorMessage(error, 'Failed to save the TUPAD batch'))
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  const requestDeleteBatch = (batch: TupadBatchWithCount) => {
    batchToDelete.value = batch
  }

  const cancelDeleteBatch = () => {
    batchToDelete.value = null
  }

  const deleteBatch = async () => {
    const batch = batchToDelete.value
    if (!batch) return
    isDeleting.value = true
    try {
      await tupadService.deleteBatch(batch.id)
      batches.value = batches.value.filter((row) => row.id !== batch.id)
      toastAlert.success('Batch deleted', `EDL ${batch.edl_number}`)
      batchToDelete.value = null
    } catch (error: unknown) {
      toastAlert.error('Unable to delete batch', errorMessage(error, 'Failed to delete the TUPAD batch'))
    } finally {
      isDeleting.value = false
    }
  }

  // ─── TUPAD applicants ───

  const fetchTupadApplicants = async () => {
    isLoadingApplicants.value = true
    applicantsError.value = null
    try {
      tupadApplicants.value = await tupadService.fetchTupadApplicants()
    } catch (error: unknown) {
      applicantsError.value = errorMessage(error, 'Failed to load TUPAD applicants')
      toastAlert.error('Unable to load applicants', applicantsError.value)
    } finally {
      isLoadingApplicants.value = false
    }
  }

  const openReviewApplicant = async (row: TupadApplicantWithRegistry) => {
    reviewingApplicant.value = row
    reviewDocuments.value = {}
    isLoadingReviewDocuments.value = true
    try {
      const docs = await tupadDocumentService.fetchDocuments(row.id)
      // Ignore a late response for an applicant the user already closed or switched from
      if (reviewingApplicant.value?.id === row.id) reviewDocuments.value = docs
    } catch (error: unknown) {
      toastAlert.error('Unable to load documents', errorMessage(error, 'Failed to load the TUPAD documents'))
    } finally {
      isLoadingReviewDocuments.value = false
    }
  }

  const closeReviewApplicant = () => {
    reviewingApplicant.value = null
    reviewDocuments.value = {}
  }

  const saveApplicantReview = async (review: TupadApplicantReview) => {
    const row = reviewingApplicant.value
    if (!row) return
    isSubmitting.value = true
    try {
      const saved = await tupadService.updateTupadApplicant(row.id, review)
      tupadApplicants.value = tupadApplicants.value.map((item) =>
        item.id === saved.id ? { ...saved, applicant: item.applicant } : item
      )
      toastAlert.success('Applicant updated', formatTupadApplicantName(row))
      reviewingApplicant.value = null
    } catch (error: unknown) {
      toastAlert.error('Unable to update applicant', errorMessage(error, 'Failed to update the TUPAD applicant'))
    } finally {
      isSubmitting.value = false
    }
  }

  /** Sets the status of several TUPAD applicants; returns true on success. */
  const bulkUpdateApplicantStatus = async (ids: string[], status: TupadApplicantStatus): Promise<boolean> => {
    if (ids.length === 0) return false
    isSubmitting.value = true
    try {
      const updated = await tupadService.bulkUpdateTupadApplicantStatus(ids, status)
      const byId = new Map(updated.map((row) => [row.id, row]))
      tupadApplicants.value = tupadApplicants.value.map((item) => {
        const saved = byId.get(item.id)
        return saved ? { ...saved, applicant: item.applicant } : item
      })
      toastAlert.success('Status updated', `${updated.length} applicant(s) set to ${status}`)
      return true
    } catch (error: unknown) {
      toastAlert.error('Unable to update status', errorMessage(error, 'Failed to update the TUPAD applicants'))
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const requestDeleteApplicants = (rows: TupadApplicantWithRegistry[]) => {
    applicantsToDelete.value = rows
  }

  const cancelDeleteApplicants = () => {
    applicantsToDelete.value = []
  }

  /**
   * Deletes the applicants waiting for confirmation (skipping anyone already in a batch), removes their
   * uploaded files, and unticks TUPAD in their referred programs. Returns the deleted ids.
   */
  const deleteApplicants = async (): Promise<string[]> => {
    const rows = applicantsToDelete.value
    if (rows.length === 0) return []
    isDeleting.value = true
    try {
      const ids = rows.map((row) => row.id)
      const files = await tupadDocumentService.fetchFilePaths(ids)
      const { deleted, skippedIds } = await tupadService.deleteTupadApplicants(ids)
      const deletedIds = new Set(deleted.map((row) => row.id))

      tupadApplicants.value = tupadApplicants.value.filter((item) => !deletedIds.has(item.id))
      await tupadDocumentService.removeFiles(files.filter((f) => deletedIds.has(f.tupad_applicant_id)).map((f) => f.path))

      try {
        await applicantEntryService.removeTupadReferrals(deleted.map((row) => row.applicant_id))
      } catch (referralErr: unknown) {
        // The TUPAD records are gone; only the registry tick is left behind
        console.error('[tupadStore] Failed to untick TUPAD in referred programs:', referralErr)
        toastAlert.error(
          'Referred programs not updated',
          'Untick TUPAD for these applicants in Entry of Applicants, or they will be added back when edited.'
        )
      }

      if (deleted.length > 0) toastAlert.success('Applicants deleted', `${deleted.length} TUPAD applicant(s) deleted`)
      if (skippedIds.length > 0) {
        toastAlert.error(
          `${skippedIds.length} applicant(s) not deleted`,
          'They are already beneficiaries in a TUPAD batch. Remove them from the batch first.'
        )
      }
      applicantsToDelete.value = []
      return [...deletedIds]
    } catch (error: unknown) {
      toastAlert.error('Unable to delete applicants', errorMessage(error, 'Failed to delete the TUPAD applicants'))
      return []
    } finally {
      isDeleting.value = false
    }
  }

  // ─── Batch details ───

  const loadBatch = async (batchId: string) => {
    isLoadingBatch.value = true
    batchError.value = null
    try {
      const [batch, batchMembers, activeIds, applicants] = await Promise.all([
        tupadService.fetchBatchById(batchId),
        tupadService.fetchBatchMembers(batchId),
        tupadService.fetchActiveTupadApplicantIds(),
        tupadService.fetchTupadApplicants(),
      ])
      if (!batch) throw new Error('This TUPAD batch no longer exists.')
      currentBatch.value = batch
      members.value = batchMembers
      activeTupadApplicantIds.value = activeIds
      tupadApplicants.value = applicants
    } catch (error: unknown) {
      currentBatch.value = null
      members.value = []
      batchError.value = errorMessage(error, 'Failed to load the TUPAD batch')
      toastAlert.error('Unable to load batch', batchError.value)
    } finally {
      isLoadingBatch.value = false
    }
  }

  const refreshMembers = async () => {
    const batch = currentBatch.value
    if (!batch) return
    const [batchMembers, activeIds] = await Promise.all([
      tupadService.fetchBatchMembers(batch.id),
      tupadService.fetchActiveTupadApplicantIds(),
    ])
    members.value = batchMembers
    activeTupadApplicantIds.value = activeIds
  }

  /** Adds applicants to the current batch; returns true on success. */
  const addMembers = async (tupadApplicantIds: string[], daysDuration: number): Promise<boolean> => {
    const batch = currentBatch.value
    if (!batch || tupadApplicantIds.length === 0) return false
    isSubmitting.value = true
    try {
      await tupadService.addApplicantsToBatch(batch.id, tupadApplicantIds, daysDuration)
      await refreshMembers()
      toastAlert.success('Beneficiaries added', `${tupadApplicantIds.length} beneficiary(ies) added to EDL ${batch.edl_number}`)
      isAddMembersOpen.value = false
      return true
    } catch (error: unknown) {
      toastAlert.error('Unable to add beneficiaries', errorMessage(error, 'Failed to add beneficiaries to the batch'))
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const openEditMember = (member: TupadMember) => {
    editingMember.value = member
  }

  const closeEditMember = () => {
    editingMember.value = null
  }

  const saveMember = async (values: TupadMemberFormValues) => {
    const member = editingMember.value
    if (!member) return
    isSubmitting.value = true
    try {
      await tupadService.updateMember(member.id, values)
      await refreshMembers()
      toastAlert.success('Beneficiary updated', formatTupadMemberName(member))
      editingMember.value = null
    } catch (error: unknown) {
      toastAlert.error('Unable to update beneficiary', errorMessage(error, 'Failed to update the beneficiary'))
    } finally {
      isSubmitting.value = false
    }
  }

  const loadMemberAttachments = async (member: TupadMember) => {
    isLoadingAttachments.value = true
    attachmentsError.value = null
    try {
      const attachments = await tupadService.fetchMemberAttachments(member.id)
      // Ignore a late response for a beneficiary the user already closed or switched from
      if (viewingMember.value?.id === member.id) memberAttachments.value = attachments
    } catch (error: unknown) {
      attachmentsError.value = errorMessage(error, 'Failed to load the beneficiary attachments')
      toastAlert.error('Unable to load attachments', attachmentsError.value)
    } finally {
      isLoadingAttachments.value = false
    }
  }

  const openMemberDetails = (member: TupadMember) => {
    viewingMember.value = member
    memberAttachments.value = []
    void loadMemberAttachments(member)
  }

  const refreshMemberAttachments = () => {
    if (viewingMember.value) void loadMemberAttachments(viewingMember.value)
  }

  const closeMemberDetails = () => {
    viewingMember.value = null
    memberAttachments.value = []
    attachmentsError.value = null
  }

  const requestRemoveMember = (member: TupadMember) => {
    memberToRemove.value = member
  }

  const cancelRemoveMember = () => {
    memberToRemove.value = null
  }

  const removeMember = async () => {
    const member = memberToRemove.value
    if (!member) return
    isDeleting.value = true
    try {
      await tupadService.removeMember(member.id)
      await refreshMembers()
      toastAlert.success('Beneficiary removed', formatTupadMemberName(member))
      memberToRemove.value = null
    } catch (error: unknown) {
      toastAlert.error('Unable to remove beneficiary', errorMessage(error, 'Failed to remove the beneficiary from the batch'))
    } finally {
      isDeleting.value = false
    }
  }

  return {
    batches,
    tupadApplicants,
    currentBatch,
    members,
    eligibleApplicants,
    isLoadingBatches,
    isLoadingApplicants,
    isLoadingBatch,
    isSubmitting,
    isDeleting,
    batchesError,
    applicantsError,
    batchError,
    isBatchDialogOpen,
    editingBatch,
    batchToDelete,
    reviewingApplicant,
    reviewDocuments,
    isLoadingReviewDocuments,
    applicantsToDelete,
    isAddMembersOpen,
    editingMember,
    memberToRemove,
    viewingMember,
    memberAttachments,
    isLoadingAttachments,
    attachmentsError,
    fetchBatches,
    openCreateBatch,
    openEditBatch,
    closeBatchDialog,
    saveBatch,
    requestDeleteBatch,
    cancelDeleteBatch,
    deleteBatch,
    fetchTupadApplicants,
    openReviewApplicant,
    closeReviewApplicant,
    saveApplicantReview,
    bulkUpdateApplicantStatus,
    requestDeleteApplicants,
    cancelDeleteApplicants,
    deleteApplicants,
    loadBatch,
    addMembers,
    openEditMember,
    closeEditMember,
    saveMember,
    requestRemoveMember,
    cancelRemoveMember,
    removeMember,
    openMemberDetails,
    refreshMemberAttachments,
    closeMemberDetails,
  }
})
