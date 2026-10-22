import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useSiteContentManagerStore } from '@/stores/peso/provincialPeso/siteContentManagerStore'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import {
  fromDateTimeLocal,
  getSiteContentMediaType,
  toDateTimeLocal,
} from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import { Constants } from '@/types/database.types'
import {
  SITE_CONTENT_IMAGE_MAX_MB,
  SITE_CONTENT_LINK_PATTERN,
  SITE_CONTENT_MEDIA_ACCEPT,
  SITE_CONTENT_VIDEO_MAX_MB,
  type SiteContentInsert,
  type SiteContentListItem,
  type SiteContentMediaType,
  type SiteContentStatus,
} from '@/types/common/siteContent'

const STATUSES = Constants.system.Enums.announcement_status
const STATUS_LABELS: Record<SiteContentStatus, string> = {
  draft: 'Draft — hidden from visitors',
  published: 'Published — shown during its schedule',
  archived: 'Archived — hidden, kept for later',
}

const LINK_MESSAGE = 'Start with / (a page), # (a landing section) or https:// (another site).'
const optionalText = z.string().trim().optional()

const contentSchema = toTypedSchema(
  z
    .object({
      eyebrow: optionalText,
      title: z.string().trim().max(120, 'Keep the title under 120 characters.').optional(),
      description: z.string().trim().max(300, 'Keep the description under 300 characters.').optional(),
      // True while an image is attached (new file or the saved one); the photo is the one required part
      hasImage: z.boolean(),
      imageAlt: optionalText,
      primaryLabel: optionalText,
      primaryLink: optionalText,
      secondaryLabel: optionalText,
      secondaryLink: optionalText,
      sortOrder: z.coerce.number({ invalid_type_error: 'Enter a number.' }).int('Use a whole number.').min(0, 'Use 0 or higher.'),
      status: z.enum(STATUSES),
      publishedAt: optionalText,
      expiresAt: optionalText,
    })
    .superRefine((values, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

      if (!values.hasImage) issue('hasImage', 'Upload the background photo or video.')

      // A button needs both its label and its link (CHECK in migration 046)
      for (const [label, link] of [['primaryLabel', 'primaryLink'], ['secondaryLabel', 'secondaryLink']] as const) {
        if (values[label] && !values[link]) issue(link, 'Add the link for this button.')
        if (!values[label] && values[link]) issue(label, 'Add the label for this button.')
        if (values[link] && !SITE_CONTENT_LINK_PATTERN.test(values[link]!)) issue(link, LINK_MESSAGE)
      }
      if (!values.primaryLabel && values.secondaryLabel) issue('primaryLabel', 'Fill the main button before the second one.')

      if (values.publishedAt && values.expiresAt && values.expiresAt <= values.publishedAt) {
        issue('expiresAt', 'End must be after the start.')
      }
    })
)

type ContentFormValues = {
  eyebrow: string
  title: string
  description: string
  hasImage: boolean
  imageAlt: string
  primaryLabel: string
  primaryLink: string
  secondaryLabel: string
  secondaryLink: string
  sortOrder: number
  status: SiteContentStatus
  publishedAt: string
  expiresAt: string
}

const INITIAL_VALUES: ContentFormValues = {
  eyebrow: '',
  title: '',
  description: '',
  hasImage: false,
  imageAlt: '',
  primaryLabel: '',
  primaryLink: '',
  secondaryLabel: '',
  secondaryLink: '',
  sortOrder: 0,
  status: 'draft',
  publishedAt: '',
  expiresAt: '',
}

function toFormValues(row: SiteContentListItem): ContentFormValues {
  return {
    eyebrow: row.eyebrow ?? '',
    title: row.title ?? '',
    description: row.description,
    hasImage: !!row.image_path,
    imageAlt: row.image_alt ?? '',
    primaryLabel: row.primary_label ?? '',
    primaryLink: row.primary_link ?? '',
    secondaryLabel: row.secondary_label ?? '',
    secondaryLink: row.secondary_link ?? '',
    sortOrder: row.sort_order,
    status: row.status,
    publishedAt: toDateTimeLocal(row.published_at),
    expiresAt: toDateTimeLocal(row.expires_at),
  }
}

const orNull = (value?: string | null) => (value && value.trim() ? value.trim() : null)

export function useSiteContentForm() {
  const store = useSiteContentManagerStore()
  const { isFormDialogOpen, editingContent, isSubmitting, contents } = storeToRefs(store)
  const { createContent, updateContent, closeFormDialog } = store

  const { handleSubmit, resetForm, setFieldValue, errors } = useForm({
    validationSchema: contentSchema,
    initialValues: INITIAL_VALUES,
  })

  const isEditMode = computed(() => editingContent.value !== null)

  // ─── Background photo / video ───
  const imageFile = ref<File | null>(null)
  const imageFileType = ref<SiteContentMediaType>('image')
  const isImageRemoved = ref(false)
  const imageError = ref<string | null>(null)
  const localPreviewUrl = ref<string | null>(null)

  const setLocalPreview = (file: File | null) => {
    if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = file ? URL.createObjectURL(file) : null
  }

  const imagePreviewUrl = computed(() => {
    if (localPreviewUrl.value) return localPreviewUrl.value
    if (isImageRemoved.value) return null
    return editingContent.value?.image_url ?? null
  })
  const isPreviewVideo = computed(() =>
    imageFile.value ? imageFileType.value === 'video' : editingContent.value?.media_type === 'video'
  )
  const photoError = computed(() => errors.value.hasImage ?? null)
  const imageFileLabel = computed(() =>
    imageFile.value ? `${imageFile.value.name} · ${formatFileSize(imageFile.value.size)}` : null
  )

  const selectImage = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      imageFileType.value = getSiteContentMediaType(file)
    } catch (error: any) {
      imageError.value = error.message
      return
    }
    imageError.value = null
    imageFile.value = file
    isImageRemoved.value = false
    setLocalPreview(file)
    setFieldValue('hasImage', true)
  }

  const clearImage = () => {
    imageFile.value = null
    imageError.value = null
    setLocalPreview(null)
    isImageRemoved.value = !!editingContent.value?.image_path
    setFieldValue('hasImage', false)
    setFieldValue('imageAlt', '')
  }

  // Load the selected row (or blank values) each time the dialog opens
  watch(isFormDialogOpen, (open) => {
    if (!open) return
    imageFile.value = null
    isImageRemoved.value = false
    imageError.value = null
    setLocalPreview(null)
    const nextOrder = contents.value.reduce((max, row) => Math.max(max, row.sort_order + 1), 0)
    resetForm({ values: editingContent.value ? toFormValues(editingContent.value) : { ...INITIAL_VALUES, sortOrder: nextOrder } })
  })

  onBeforeUnmount(() => setLocalPreview(null))

  const onFormDialogOpenChange = (open: boolean) => {
    if (open || isSubmitting.value) return
    closeFormDialog()
  }

  const submitContent = handleSubmit(async (formValues) => {
    const payload: SiteContentInsert = {
      eyebrow: orNull(formValues.eyebrow),
      title: orNull(formValues.title),
      description: formValues.description?.trim() ?? '',
      image_alt: formValues.hasImage ? orNull(formValues.imageAlt) : null,
      primary_label: orNull(formValues.primaryLabel),
      primary_link: orNull(formValues.primaryLink),
      secondary_label: orNull(formValues.secondaryLabel),
      secondary_link: orNull(formValues.secondaryLink),
      sort_order: formValues.sortOrder,
      status: formValues.status,
      // Left empty, the database fills published_at with now() on publish (migration 046)
      published_at: fromDateTimeLocal(formValues.publishedAt),
      expires_at: fromDateTimeLocal(formValues.expiresAt),
    }
    const image = { file: imageFile.value, mediaType: imageFileType.value, remove: isImageRemoved.value }

    if (editingContent.value) await updateContent(editingContent.value, payload, image)
    else await createContent(payload, image)
  })

  const statusOptions = STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))

  return {
    isFormDialogOpen,
    isSubmitting,
    isEditMode,
    onFormDialogOpenChange,
    submitContent,
    statusOptions,
    imagePreviewUrl,
    imageFileLabel,
    imageError,
    photoError,
    isPreviewVideo,
    imageAccept: SITE_CONTENT_MEDIA_ACCEPT,
    imageMaxMb: SITE_CONTENT_IMAGE_MAX_MB,
    videoMaxMb: SITE_CONTENT_VIDEO_MAX_MB,
    selectImage,
    clearImage,
  }
}
