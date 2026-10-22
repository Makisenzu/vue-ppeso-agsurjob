import { computed, ref } from 'vue'
import { filterReferenceOptions, findReferenceOption } from '@/helpers/common/referenceListHelper'
import type { ReferenceOption } from '@/types/common/referenceList'

type ReferencePickerProps = { modelValue?: string | null; options: ReferenceOption[] }
type ReferencePickerEmit = (e: 'update:modelValue', value: string) => void

/**
 * State for ReferencePicker. The model stays plain text: a listed name, or what the user typed
 * after choosing "Others" (any stored value that isn't listed also shows as "Others"). Re-key the
 * picker to reset it when the parent form clears.
 */
export function useReferencePicker(props: ReferencePickerProps, emit: ReferencePickerEmit) {
  const searchTerm = ref('')
  // "Others" was picked but nothing is typed yet, so the model alone can't tell
  const isOthersPicked = ref(false)

  const othersOption = computed(() => props.options.find((option) => option.requiresSpecify) ?? null)
  const listedOption = computed(() => findReferenceOption(props.options, props.modelValue))

  const isSpecifying = computed(
    () => !listedOption.value && (isOthersPicked.value || !!props.modelValue?.trim())
  )

  const selectedOption = computed<ReferenceOption | null>(() =>
    listedOption.value ?? (isSpecifying.value ? othersOption.value : null)
  )

  const selectedLabel = computed(() => selectedOption.value?.name ?? '')

  const filteredOptions = computed(() => filterReferenceOptions(props.options, searchTerm.value))

  const otherText = computed({
    get: () => (isSpecifying.value ? (props.modelValue ?? '') : ''),
    set: (value: string) => emit('update:modelValue', value),
  })

  const onSelect = (option: ReferenceOption | null) => {
    if (!option) return
    searchTerm.value = ''
    if (option.requiresSpecify) {
      isOthersPicked.value = true
      // Keep an already typed value; a listed name is replaced by blank text to fill in
      if (listedOption.value) emit('update:modelValue', '')
      return
    }
    isOthersPicked.value = false
    emit('update:modelValue', option.name)
  }

  return {
    searchTerm,
    selectedOption,
    selectedLabel,
    filteredOptions,
    isSpecifying,
    otherText,
    onSelect,
  }
}
