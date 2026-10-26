import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useTupadStore } from '@/stores/peso/provincialPeso/tupadStore'
import {
  TUPAD_BATCH_STATUSES,
  type TupadBatchRow,
  type TupadBatchStatus,
} from '@/types/peso/provincialPeso/tupad'
import { normalizeStatusRemarks, refineStatusRemarks, requiresStatusRemarks } from '@/helpers/common/statusRemarksHelper'

const batchSchema = toTypedSchema(
  z
    .object({
      edl_number: z.string().trim().min(1, { message: 'EDL number is required.' }),
      status: z.enum(TUPAD_BATCH_STATUSES),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      remarks: z.string().trim().optional(),
    })
    .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
      message: 'End date cannot be before the start date.',
      path: ['end_date'],
    })
    // Cancelling needs remarks; the batch's applicants read them in their notification
    .superRefine(refineStatusRemarks)
)

const INITIAL_VALUES = {
  edl_number: '',
  status: 'Pending' as TupadBatchStatus,
  start_date: '',
  end_date: '',
  remarks: '',
}

function toFormValues(batch: TupadBatchRow): typeof INITIAL_VALUES {
  const status = TUPAD_BATCH_STATUSES.find((s) => s === batch.status) ?? 'Pending'
  return {
    edl_number: batch.edl_number,
    status,
    start_date: batch.start_date ?? '',
    end_date: batch.end_date ?? '',
    remarks: batch.status_remarks ?? '',
  }
}

/** Create / edit dialog of a TUPAD batch (`esmdd.tupad_batch`). */
export function useTupadBatchForm() {
  const store = useTupadStore()
  const { isBatchDialogOpen, editingBatch, isSubmitting } = storeToRefs(store)
  const { openCreateBatch, openEditBatch, closeBatchDialog, saveBatch } = store

  const { handleSubmit, resetForm, values: formValues } = useForm({
    validationSchema: batchSchema,
    initialValues: INITIAL_VALUES,
  })

  const isEditMode = computed(() => editingBatch.value !== null)
  const isRemarksRequired = computed(() => requiresStatusRemarks(formValues.status))

  // Load the batch (or a blank form) each time the dialog opens
  watch(isBatchDialogOpen, (open) => {
    if (open) resetForm({ values: editingBatch.value ? toFormValues(editingBatch.value) : INITIAL_VALUES })
  })

  const onBatchDialogOpenChange = (open: boolean) => {
    if (!open) closeBatchDialog()
  }

  const submitBatch = handleSubmit(async (values) => {
    await saveBatch({
      edl_number: values.edl_number,
      status: values.status,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      status_remarks: normalizeStatusRemarks(values.remarks),
    })
  })

  return {
    isBatchDialogOpen,
    isEditMode,
    isSubmitting,
    isRemarksRequired,
    batchStatusOptions: TUPAD_BATCH_STATUSES,
    openCreateBatch,
    openEditBatch,
    onBatchDialogOpenChange,
    submitBatch,
  }
}
