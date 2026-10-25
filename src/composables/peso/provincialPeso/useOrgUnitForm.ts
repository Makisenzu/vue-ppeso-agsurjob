import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useOrgChartManagerStore } from '@/stores/peso/provincialPeso/orgChartManagerStore'
import { ORG_CHART_LIMITS } from '@/types/common/siteContent'

// Limits mirror the column CHECKs in migration 052
const unitSchema = toTypedSchema(
  z.object({
    name: z
      .string({ required_error: 'Enter the division name.' })
      .trim()
      .min(1, 'Enter the division name.')
      .max(ORG_CHART_LIMITS.unitName, `Keep the name under ${ORG_CHART_LIMITS.unitName} characters.`),
    abbreviation: z
      .string()
      .trim()
      .max(ORG_CHART_LIMITS.abbreviation, `Keep it under ${ORG_CHART_LIMITS.abbreviation} characters.`)
      .optional(),
    sortOrder: z.coerce.number({ invalid_type_error: 'Enter a number.' }).int('Use a whole number.').min(0, 'Use 0 or higher.'),
  })
)

/** New / Edit Division dialog of the organizational chart. */
export function useOrgUnitForm() {
  const store = useOrgChartManagerStore()
  const { isUnitDialogOpen, editingUnit, isSubmitting, units } = storeToRefs(store)
  const { saveUnit, closeUnitDialog } = store

  const { handleSubmit, resetForm } = useForm({
    validationSchema: unitSchema,
    initialValues: { name: '', abbreviation: '', sortOrder: 0 },
  })

  // Load the selected division (or blank values, placed last) each time the dialog opens
  watch(isUnitDialogOpen, (open) => {
    if (!open) return
    const unit = editingUnit.value
    const nextOrder = units.value.reduce((max, item) => Math.max(max, item.sort_order + 1), 0)
    resetForm({
      values: unit
        ? { name: unit.name, abbreviation: unit.abbreviation ?? '', sortOrder: unit.sort_order }
        : { name: '', abbreviation: '', sortOrder: nextOrder },
    })
  })

  const onDialogOpenChange = (open: boolean) => {
    if (!open) closeUnitDialog()
  }

  const submitUnit = handleSubmit(async (values) => {
    await saveUnit({
      name: values.name.trim(),
      abbreviation: values.abbreviation?.trim() || null,
      sort_order: values.sortOrder,
    })
  })

  return {
    isUnitDialogOpen,
    isSubmitting,
    isEditMode: computed(() => editingUnit.value !== null),
    limits: ORG_CHART_LIMITS,
    onDialogOpenChange,
    submitUnit,
  }
}
