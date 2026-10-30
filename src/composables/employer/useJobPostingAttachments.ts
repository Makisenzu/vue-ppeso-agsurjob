import { computed, onBeforeUnmount, ref } from 'vue'
import { formatFileSize, validateUploadFile } from '@/helpers/common/uploadHelpers'
import {
  JOB_VACANCY_ATTACHMENT_ACCEPT,
  JOB_VACANCY_ATTACHMENT_MAX_FILES,
  JOB_VACANCY_ATTACHMENT_MAX_SIZE_MB,
  JOB_VACANCY_ATTACHMENT_MIME_TYPES,
  type JobVacancyAttachment,
} from '@/types/common/jobVacancyAttachment'
import type { JobPostingAttachmentChanges } from '@/types/employer/jobPosting'

/** One card in the attachments field: a saved file or one waiting to upload on save */
export interface AttachmentItem {
  key: string
  filename: string
  sizeLabel: string
  isImage: boolean
  /** Signed URL of a saved file, or a local preview of a new image */
  url: string | null
  isNew: boolean
}

type StagedFile = { key: string; file: File; previewUrl: string | null }

/**
 * Optional attachments of the posting sheet (migration 086). Changes are staged here and handed to
 * the store on save, because a new posting has no id to upload under until it exists.
 */
export function useJobPostingAttachments() {
  const saved = ref<JobVacancyAttachment[]>([])
  const removedIds = ref<Set<string>>(new Set())
  const staged = ref<StagedFile[]>([])
  const attachmentError = ref<string | null>(null)

  const keptSaved = computed(() => saved.value.filter((attachment) => !removedIds.value.has(attachment.id)))
  const remainingSlots = computed(() =>
    Math.max(JOB_VACANCY_ATTACHMENT_MAX_FILES - keptSaved.value.length - staged.value.length, 0),
  )

  const attachmentItems = computed<AttachmentItem[]>(() => [
    ...keptSaved.value.map((attachment) => ({
      key: attachment.id,
      filename: attachment.filename,
      sizeLabel: attachment.size != null ? formatFileSize(attachment.size) : '',
      isImage: (attachment.mime_type ?? '').startsWith('image/'),
      url: attachment.url,
      isNew: false,
    })),
    ...staged.value.map((item) => ({
      key: item.key,
      filename: item.file.name,
      sizeLabel: formatFileSize(item.file.size),
      isImage: item.file.type.startsWith('image/'),
      url: item.previewUrl,
      isNew: true,
    })),
  ])

  const attachmentChanges = computed<JobPostingAttachmentChanges>(() => ({
    add: staged.value.map((item) => item.file),
    remove: saved.value
      .filter((attachment) => removedIds.value.has(attachment.id))
      .map((attachment) => ({ id: attachment.id, path: attachment.path })),
  }))

  function revokePreviews() {
    for (const item of staged.value) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  }

  /** Starts over with the posting's saved files (or none) each time the sheet opens */
  function resetAttachments(attachments: JobVacancyAttachment[] = []) {
    revokePreviews()
    saved.value = attachments
    removedIds.value = new Set()
    staged.value = []
    attachmentError.value = null
  }

  /** Adds what fits; says why the rest were skipped */
  function addAttachments(files: FileList | File[] | null) {
    attachmentError.value = null
    const list = Array.from(files ?? [])
    const skipped: string[] = []

    for (const file of list) {
      if (remainingSlots.value === 0) {
        skipped.push(`Up to ${JOB_VACANCY_ATTACHMENT_MAX_FILES} files.`)
        break
      }
      try {
        validateUploadFile(file, {
          allowedMimeTypes: JOB_VACANCY_ATTACHMENT_MIME_TYPES,
          maxSizeMB: JOB_VACANCY_ATTACHMENT_MAX_SIZE_MB,
        })
      } catch (error: unknown) {
        skipped.push(`${file.name}: ${error instanceof Error ? error.message : 'Invalid file.'}`)
        continue
      }
      staged.value = [
        ...staged.value,
        {
          key: crypto.randomUUID(),
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        },
      ]
    }
    if (skipped.length) attachmentError.value = skipped.join(' ')
  }

  /** A saved file is deleted on save; a new one is simply dropped */
  function removeAttachment(item: AttachmentItem) {
    attachmentError.value = null
    if (!item.isNew) {
      removedIds.value = new Set([...removedIds.value, item.key])
      return
    }
    const target = staged.value.find((entry) => entry.key === item.key)
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
    staged.value = staged.value.filter((entry) => entry.key !== item.key)
  }

  onBeforeUnmount(revokePreviews)

  return {
    attachmentItems,
    attachmentChanges,
    attachmentError,
    remainingSlots,
    attachmentAccept: JOB_VACANCY_ATTACHMENT_ACCEPT,
    attachmentMaxSizeMB: JOB_VACANCY_ATTACHMENT_MAX_SIZE_MB,
    attachmentMaxFiles: JOB_VACANCY_ATTACHMENT_MAX_FILES,
    resetAttachments,
    addAttachments,
    removeAttachment,
  }
}
