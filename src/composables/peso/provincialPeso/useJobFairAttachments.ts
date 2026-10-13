import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { jobFairService } from '@/services/peso/provincialPeso/jobFairService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { formatFileSize, validateUploadFile } from '@/helpers/common/uploadHelpers'
import {
  JOB_FAIR_ATTACHMENT_ACCEPT,
  JOB_FAIR_ATTACHMENT_MAX_FILES,
  JOB_FAIR_ATTACHMENT_MAX_SIZE_MB,
  JOB_FAIR_ATTACHMENT_MIME_TYPES,
  type JobFairAttachmentRow,
} from '@/types/peso/provincialPeso/jobFair'

export interface SavedAttachment extends JobFairAttachmentRow {
  url: string
  isImage: boolean
  sizeLabel: string
}

function toSavedAttachment(row: JobFairAttachmentRow): SavedAttachment {
  return {
    ...row,
    url: jobFairService.getAttachmentUrl(row.path),
    isImage: (row.mime_type ?? '').startsWith('image/'),
    sizeLabel: row.size != null ? formatFileSize(row.size) : '',
  }
}

function validateFile(file: File) {
  validateUploadFile(file, {
    allowedMimeTypes: JOB_FAIR_ATTACHMENT_MIME_TYPES,
    maxSizeMB: JOB_FAIR_ATTACHMENT_MAX_SIZE_MB,
  })
}

/**
 * Manages the saved attachments of an existing job fair. Every action is
 * persisted immediately (no separate save step).
 */
export function useJobFairAttachments(jobFairId: MaybeRefOrGetter<string | null | undefined>) {
  const toastAlert = useToastAlert()

  const attachments = ref<SavedAttachment[]>([])
  const isLoading = ref(false)
  const isUploading = ref(false)
  /** Ids of attachments with a delete/replace in flight. */
  const busyIds = ref<Set<string>>(new Set())
  const attachmentError = ref<string | null>(null)
  const attachmentToDelete = ref<SavedAttachment | null>(null)

  const remainingSlots = computed(() => Math.max(JOB_FAIR_ATTACHMENT_MAX_FILES - attachments.value.length, 0))

  const setBusy = (id: string, busy: boolean) => {
    const next = new Set(busyIds.value)
    if (busy) next.add(id)
    else next.delete(id)
    busyIds.value = next
  }

  async function loadAttachments() {
    const id = toValue(jobFairId)
    attachmentError.value = null
    if (!id) {
      attachments.value = []
      return
    }

    isLoading.value = true
    try {
      attachments.value = (await jobFairService.fetchAttachments(id)).map(toSavedAttachment)
    } catch (error: any) {
      attachmentError.value = error.message
    } finally {
      isLoading.value = false
    }
  }

  watch(() => toValue(jobFairId), loadAttachments, { immediate: true })

  async function addAttachments(files: FileList | File[] | null) {
    const id = toValue(jobFairId)
    attachmentError.value = null
    if (!id || !files) return

    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(files)) {
      if (accepted.length >= remainingSlots.value) {
        rejected.push(`You can attach up to ${JOB_FAIR_ATTACHMENT_MAX_FILES} files.`)
        break
      }
      try {
        validateFile(file)
        accepted.push(file)
      } catch (error: any) {
        rejected.push(`${file.name}: ${error.message}`)
      }
    }
    if (rejected.length) attachmentError.value = rejected.join(' ')
    if (!accepted.length) return

    isUploading.value = true
    try {
      const { uploaded, failed } = await jobFairService.uploadAttachments(id, accepted)
      attachments.value = [...attachments.value, ...uploaded.map(toSavedAttachment)]
      if (uploaded.length) {
        toastAlert.success('Attachments uploaded', `${uploaded.length} file(s) added.`)
      }
      if (failed.length) {
        console.error('Job fair attachment upload failed:', failed)
        toastAlert.error(
          'Some attachments were not uploaded',
          failed.map((f) => `${f.name}: ${f.reason}`).join(' • ')
        )
      }
    } finally {
      isUploading.value = false
    }
  }

  async function replaceAttachment(attachment: SavedAttachment, file: File | null | undefined) {
    attachmentError.value = null
    if (!file) return
    try {
      validateFile(file)
    } catch (error: any) {
      attachmentError.value = `${file.name}: ${error.message}`
      return
    }

    setBusy(attachment.id, true)
    try {
      const updated = toSavedAttachment(await jobFairService.replaceAttachment(attachment, file))
      attachments.value = attachments.value.map((a) => (a.id === updated.id ? updated : a))
      toastAlert.success('Attachment replaced', `${attachment.filename} was replaced with ${file.name}.`)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      setBusy(attachment.id, false)
    }
  }

  function requestDeleteAttachment(attachment: SavedAttachment) {
    attachmentToDelete.value = attachment
  }

  function cancelDeleteAttachment() {
    const target = attachmentToDelete.value
    if (target && busyIds.value.has(target.id)) return
    attachmentToDelete.value = null
  }

  async function confirmDeleteAttachment() {
    const target = attachmentToDelete.value
    if (!target) return

    setBusy(target.id, true)
    try {
      await jobFairService.deleteAttachment(target)
      attachments.value = attachments.value.filter((a) => a.id !== target.id)
      attachmentToDelete.value = null
      toastAlert.success('Attachment deleted', `${target.filename} has been removed.`)
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      setBusy(target.id, false)
    }
  }

  return {
    attachments,
    isLoading,
    isUploading,
    busyIds,
    attachmentError,
    attachmentToDelete,
    remainingSlots,
    attachmentAccept: JOB_FAIR_ATTACHMENT_ACCEPT,
    attachmentMaxSizeMB: JOB_FAIR_ATTACHMENT_MAX_SIZE_MB,
    attachmentMaxFiles: JOB_FAIR_ATTACHMENT_MAX_FILES,
    loadAttachments,
    addAttachments,
    replaceAttachment,
    requestDeleteAttachment,
    cancelDeleteAttachment,
    confirmDeleteAttachment,
  }
}
