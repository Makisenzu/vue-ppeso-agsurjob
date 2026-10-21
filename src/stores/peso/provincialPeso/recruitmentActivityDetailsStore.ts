import { ref } from 'vue'
import { defineStore } from 'pinia'
import { recruitmentActivityService } from '@/services/peso/provincialPeso/recruitmentActivityService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import {
  RECRUITMENT_ACTIVITY_DOCUMENT_MAX_SIZE_MB,
  RECRUITMENT_ACTIVITY_DOCUMENT_MIME_TYPES,
  type RecruitmentActivityAttachmentRow,
  type RecruitmentActivityDetails,
  type RecruitmentActivityRequirement,
  type RecruitmentActivityStatus,
  type RecruitmentActivityUpdate,
  type RecruitmentActivityVacancyDetails,
  type RecruitmentActivityVacancyFormPayload,
} from '@/types/peso/provincialPeso/recruitmentActivity'

export const useRecruitmentActivityDetailsStore = defineStore('pesoRecruitmentActivityDetails', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const activity = ref<RecruitmentActivityDetails | null>(null)
  const requirements = ref<RecruitmentActivityRequirement[]>([])
  const vacancies = ref<RecruitmentActivityVacancyDetails[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const isUpdatingActivity = ref(false)
  /** Requirement ids with a checkbox save or upload in flight. */
  const busyRequirementIds = ref<Set<string>>(new Set())
  const isSubmittingVacancy = ref(false)
  const isDeletingVacancy = ref(false)

  // ─── UI Flags ───
  const isVacancyFormOpen = ref(false)
  const editingVacancy = ref<RecruitmentActivityVacancyDetails | null>(null)
  const vacancyToDelete = ref<RecruitmentActivityVacancyDetails | null>(null)

  function setRequirementBusy(requirementId: string, busy: boolean) {
    const next = new Set(busyRequirementIds.value)
    if (busy) next.add(requirementId)
    else next.delete(requirementId)
    busyRequirementIds.value = next
  }

  // ─── Actions: Activity ───
  async function loadActivity(activityId: string): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    if (activity.value?.id !== activityId) {
      activity.value = null
      requirements.value = []
      vacancies.value = []
    }
    try {
      const [details, checklist, jobOrders] = await Promise.all([
        recruitmentActivityService.fetchActivityById(activityId),
        recruitmentActivityService.fetchRequirements(activityId),
        recruitmentActivityService.fetchVacancies(activityId),
      ])
      activity.value = details
      requirements.value = checklist
      vacancies.value = jobOrders
    } catch (error: any) {
      errorMessage.value = error.message
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  async function updateActivity(payload: RecruitmentActivityUpdate, successTitle: string): Promise<boolean> {
    const current = activity.value
    if (!current) return false

    isUpdatingActivity.value = true
    try {
      const updated = await recruitmentActivityService.updateActivity(current.id, payload)
      activity.value = { ...updated, establishment: current.establishment }
      toastAlert.success(successTitle, `${updated.type} for ${current.establishment.business_name}.`)
      return true
    } catch (error: any) {
      // The status guard explains what is missing (e.g. unchecked requirements)
      toastAlert.error('Not saved', error.message)
      return false
    } finally {
      isUpdatingActivity.value = false
    }
  }

  const changeStatus = (status: RecruitmentActivityStatus) => updateActivity({ status }, `Marked as ${status}`)

  // ─── Actions: Checklist ───
  async function setRequirementSubmitted(requirement: RecruitmentActivityRequirement, isSubmitted: boolean) {
    setRequirementBusy(requirement.id, true)
    try {
      const updated = await recruitmentActivityService.setRequirementSubmitted(requirement.id, isSubmitted)
      requirements.value = requirements.value.map((item) =>
        item.id === updated.id ? { ...updated, recruitment_activity_attachments: item.recruitment_activity_attachments } : item
      )
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      setRequirementBusy(requirement.id, false)
    }
  }

  async function uploadDocuments(requirement: RecruitmentActivityRequirement, files: File[]) {
    const current = activity.value
    if (!current || files.length === 0) return

    const rejected = files.filter(
      (file) =>
        !RECRUITMENT_ACTIVITY_DOCUMENT_MIME_TYPES.includes(file.type) ||
        file.size > RECRUITMENT_ACTIVITY_DOCUMENT_MAX_SIZE_MB * 1024 * 1024
    )
    if (rejected.length) {
      toastAlert.error(
        'File not accepted',
        `${rejected.map((file) => file.name).join(', ')}: use an image or PDF up to ${RECRUITMENT_ACTIVITY_DOCUMENT_MAX_SIZE_MB}MB.`
      )
      return
    }

    setRequirementBusy(requirement.id, true)
    try {
      const results = await Promise.allSettled(
        files.map((file) => recruitmentActivityService.uploadDocument(current.id, requirement.id, file))
      )
      const uploaded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
      const failed = results.flatMap((result, index) =>
        result.status === 'rejected' ? [`${files[index]!.name}: ${result.reason?.message ?? result.reason}`] : []
      )

      requirements.value = requirements.value.map((item) =>
        item.id === requirement.id
          ? { ...item, recruitment_activity_attachments: [...item.recruitment_activity_attachments, ...uploaded] }
          : item
      )
      if (uploaded.length) toastAlert.success('Uploaded', `${uploaded.length} file(s) added to ${requirement.requirement_name}.`)
      if (failed.length) toastAlert.error('Some files were not uploaded', failed.join(' • '))

      // A requirement with its document attached counts as submitted
      if (uploaded.length && !requirement.is_submitted) {
        setRequirementBusy(requirement.id, false)
        await setRequirementSubmitted(requirement, true)
      }
    } finally {
      setRequirementBusy(requirement.id, false)
    }
  }

  async function deleteDocument(requirement: RecruitmentActivityRequirement, attachment: RecruitmentActivityAttachmentRow) {
    setRequirementBusy(requirement.id, true)
    try {
      await recruitmentActivityService.deleteDocument(attachment)
      requirements.value = requirements.value.map((item) =>
        item.id === requirement.id
          ? {
              ...item,
              recruitment_activity_attachments: item.recruitment_activity_attachments.filter((file) => file.id !== attachment.id),
            }
          : item
      )
      toastAlert.success('File removed', `${attachment.filename} has been removed.`)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      setRequirementBusy(requirement.id, false)
    }
  }

  async function openDocument(attachment: RecruitmentActivityAttachmentRow) {
    // Open the tab synchronously so the browser doesn't block it as a popup
    const tab = window.open('', '_blank')
    try {
      const url = await recruitmentActivityService.getDocumentUrl(attachment.path)
      if (tab) tab.location.href = url
      else window.open(url, '_blank')
    } catch (error: any) {
      tab?.close()
      toastAlert.error('Error', error.message)
    }
  }

  // ─── Actions: Job Orders ───
  async function createVacancy(payload: RecruitmentActivityVacancyFormPayload): Promise<boolean> {
    const current = activity.value
    if (!current) return false

    isSubmittingVacancy.value = true
    try {
      const created = await recruitmentActivityService.createVacancy(current.id, current.establishment_id, payload)
      vacancies.value = [...vacancies.value, created].sort((a, b) => a.position_title.localeCompare(b.position_title))
      isVacancyFormOpen.value = false
      toastAlert.success('Job order added', `${created.position_title} has been added.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmittingVacancy.value = false
    }
  }

  async function updateVacancy(target: RecruitmentActivityVacancyDetails, payload: RecruitmentActivityVacancyFormPayload) {
    isSubmittingVacancy.value = true
    try {
      const updated = await recruitmentActivityService.updateVacancy(target, payload)
      vacancies.value = vacancies.value.map((row) => (row.id === updated.id ? updated : row))
      isVacancyFormOpen.value = false
      editingVacancy.value = null
      toastAlert.success('Job order updated', `${updated.position_title} has been updated.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isSubmittingVacancy.value = false
    }
  }

  async function deleteVacancy(): Promise<boolean> {
    const target = vacancyToDelete.value
    if (!target) return false

    isDeletingVacancy.value = true
    try {
      await recruitmentActivityService.deleteVacancy(target.id)
      vacancies.value = vacancies.value.filter((row) => row.id !== target.id)
      vacancyToDelete.value = null
      toastAlert.success('Job order removed', `${target.position_title} has been removed from this activity.`)
      return true
    } catch (error: any) {
      toastAlert.error('Error', error.message)
      return false
    } finally {
      isDeletingVacancy.value = false
    }
  }

  // ─── UI Actions ───
  function openCreateVacancyDialog() {
    editingVacancy.value = null
    isVacancyFormOpen.value = true
  }

  function openEditVacancyDialog(row: RecruitmentActivityVacancyDetails) {
    editingVacancy.value = row
    isVacancyFormOpen.value = true
  }

  function closeVacancyFormDialog() {
    isVacancyFormOpen.value = false
    editingVacancy.value = null
  }

  function requestVacancyDelete(row: RecruitmentActivityVacancyDetails) {
    vacancyToDelete.value = row
  }

  function cancelVacancyDelete() {
    if (isDeletingVacancy.value) return
    vacancyToDelete.value = null
  }

  return {
    activity,
    requirements,
    vacancies,
    isLoading,
    errorMessage,
    isUpdatingActivity,
    busyRequirementIds,
    isSubmittingVacancy,
    isDeletingVacancy,
    isVacancyFormOpen,
    editingVacancy,
    vacancyToDelete,
    loadActivity,
    updateActivity,
    changeStatus,
    setRequirementSubmitted,
    uploadDocuments,
    deleteDocument,
    openDocument,
    createVacancy,
    updateVacancy,
    deleteVacancy,
    openCreateVacancyDialog,
    openEditVacancyDialog,
    closeVacancyFormDialog,
    requestVacancyDelete,
    cancelVacancyDelete,
  }
})
