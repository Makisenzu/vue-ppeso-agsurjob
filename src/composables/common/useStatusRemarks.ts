import { computed, ref, watch, type Ref } from 'vue'
import {
  STATUS_REMARKS_REQUIRED_MESSAGE,
  normalizeStatusRemarks,
  requiresStatusRemarks,
} from '@/helpers/common/statusRemarksHelper'

/**
 * Remarks field for status dialogs that aren't vee-validate forms: required while `status` is
 * Rejected / Cancelled. Forms built on zod use `refineStatusRemarks` instead.
 */
export function useStatusRemarks(status: Ref<string | null | undefined>) {
  const remarks = ref('')
  const remarksError = ref('')

  const isRemarksRequired = computed(() => requiresStatusRemarks(status.value))

  watch([status, remarks], () => {
    remarksError.value = ''
  })

  /** False (and shows the error) when remarks are required but blank. */
  function validateRemarks(): boolean {
    if (isRemarksRequired.value && !normalizeStatusRemarks(remarks.value)) {
      remarksError.value = STATUS_REMARKS_REQUIRED_MESSAGE
      return false
    }
    return true
  }

  function resetRemarks(value: string | null = '') {
    remarks.value = value ?? ''
    remarksError.value = ''
  }

  /** What to save: the trimmed text, or null */
  const remarksToSave = computed(() => normalizeStatusRemarks(remarks.value))

  return { remarks, remarksError, isRemarksRequired, remarksToSave, validateRemarks, resetRemarks }
}
