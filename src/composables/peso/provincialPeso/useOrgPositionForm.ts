import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useOrgChartManagerStore } from '@/stores/peso/provincialPeso/orgChartManagerStore'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import { getNameInitials } from '@/helpers/common/siteContentHelper'
import { assertOrgChartPhoto } from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import {
  ORG_CHART_LIMITS,
  ORG_EMPLOYMENT_STATUS_LABELS,
  SITE_CONTENT_IMAGE_MAX_MB,
  type OrgChartPositionItem,
  type OrgEmploymentStatus,
} from '@/types/common/siteContent'

// Select value for the top of the chart (positions with no unit)
const TOP = 'top'
const STATUSES = Object.keys(ORG_EMPLOYMENT_STATUS_LABELS) as [OrgEmploymentStatus, ...OrgEmploymentStatus[]]

// Limits mirror the column CHECKs in migration 052
const positionSchema = toTypedSchema(
  z.object({
    unitId: z.string().min(1, 'Choose where the position belongs.'),
    title: z
      .string({ required_error: 'Enter the position title.' })
      .trim()
      .min(1, 'Enter the position title.')
      .max(ORG_CHART_LIMITS.title, `Keep the title under ${ORG_CHART_LIMITS.title} characters.`),
    holderName: z
      .string()
      .trim()
      .max(ORG_CHART_LIMITS.holderName, `Keep the name under ${ORG_CHART_LIMITS.holderName} characters.`)
      .optional(),
    status: z.enum(STATUSES),
    isHead: z.boolean(),
    sortOrder: z.coerce.number({ invalid_type_error: 'Enter a number.' }).int('Use a whole number.').min(0, 'Use 0 or higher.'),
  })
)

type PositionFormValues = {
  unitId: string
  title: string
  holderName: string
  status: OrgEmploymentStatus
  isHead: boolean
  sortOrder: number
}

const toFormValues = (position: OrgChartPositionItem): PositionFormValues => ({
  unitId: position.unit_id ?? TOP,
  title: position.title,
  holderName: position.holder_name ?? '',
  status: position.employment_status,
  isHead: position.is_head,
  sortOrder: position.sort_order,
})

/** New / Edit Position dialog: who holds it (empty = vacant), its title, status, group, order and photo. */
export function useOrgPositionForm() {
  const store = useOrgChartManagerStore()
  const { isPositionDialogOpen, editingPosition, newPositionUnitId, isSubmitting, units, positions } = storeToRefs(store)
  const { savePosition, closePositionDialog } = store

  const { handleSubmit, resetForm, values } = useForm({
    validationSchema: positionSchema,
    initialValues: { unitId: TOP, title: '', holderName: '', status: 'permanent', isHead: false, sortOrder: 0 },
  })

  const isEditMode = computed(() => editingPosition.value !== null)

  // ─── Photo ───
  const photoFile = ref<File | null>(null)
  const isPhotoRemoved = ref(false)
  const photoError = ref<string | null>(null)
  const localPreviewUrl = ref<string | null>(null)

  const setLocalPreview = (file: File | null) => {
    if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = file ? URL.createObjectURL(file) : null
  }

  const photoPreviewUrl = computed(() => {
    if (localPreviewUrl.value) return localPreviewUrl.value
    if (isPhotoRemoved.value) return null
    return editingPosition.value?.photo_url ?? null
  })
  const photoFileLabel = computed(() =>
    photoFile.value ? `${photoFile.value.name} · ${formatFileSize(photoFile.value.size)}` : null
  )
  const previewInitials = computed(() => getNameInitials(values.holderName?.trim() || null))

  const selectPhoto = (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      assertOrgChartPhoto(file)
    } catch (error: any) {
      photoError.value = error.message
      return
    }
    photoError.value = null
    photoFile.value = file
    isPhotoRemoved.value = false
    setLocalPreview(file)
  }

  const clearPhoto = () => {
    photoFile.value = null
    photoError.value = null
    setLocalPreview(null)
    isPhotoRemoved.value = !!editingPosition.value?.photo_path
  }

  // Load the selected position (or blank values, placed last in its group) each time the dialog opens
  watch(isPositionDialogOpen, (open) => {
    if (!open) return
    photoFile.value = null
    isPhotoRemoved.value = false
    photoError.value = null
    setLocalPreview(null)
    const position = editingPosition.value
    if (position) {
      resetForm({ values: toFormValues(position) })
      return
    }
    const unitId = newPositionUnitId.value
    const nextOrder = positions.value
      .filter((item) => item.unit_id === unitId)
      .reduce((max, item) => Math.max(max, item.sort_order + 1), 0)
    resetForm({
      values: { unitId: unitId ?? TOP, title: '', holderName: '', status: 'permanent', isHead: false, sortOrder: nextOrder },
    })
  })

  onBeforeUnmount(() => setLocalPreview(null))

  const onDialogOpenChange = (open: boolean) => {
    if (!open) closePositionDialog()
  }

  const submitPosition = handleSubmit(async (formValues) => {
    await savePosition(
      {
        unit_id: formValues.unitId === TOP ? null : formValues.unitId,
        title: formValues.title.trim(),
        holder_name: formValues.holderName?.trim() || null,
        employment_status: formValues.status,
        is_head: formValues.isHead,
        sort_order: formValues.sortOrder,
      },
      { file: photoFile.value, remove: isPhotoRemoved.value }
    )
  })

  const groupOptions = computed(() => [
    { value: TOP, label: 'Top of the chart' },
    ...units.value.map((unit) => ({ value: unit.id, label: unit.abbreviation ? `${unit.name} (${unit.abbreviation})` : unit.name })),
  ])

  const statusOptions = STATUSES.map((value) => ({ value, label: ORG_EMPLOYMENT_STATUS_LABELS[value] }))

  return {
    isPositionDialogOpen,
    isSubmitting,
    isEditMode,
    isTopGroup: computed(() => values.unitId === TOP),
    groupOptions,
    statusOptions,
    limits: ORG_CHART_LIMITS,
    photoPreviewUrl,
    photoFileLabel,
    photoError,
    previewInitials,
    photoAccept: '.jpg,.jpeg,.png,.webp',
    photoMaxMb: SITE_CONTENT_IMAGE_MAX_MB,
    selectPhoto,
    clearPhoto,
    onDialogOpenChange,
    submitPosition,
  }
}
