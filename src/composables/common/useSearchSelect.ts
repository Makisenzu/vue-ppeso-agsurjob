import { computed, ref } from 'vue'
import {
  SEARCH_SELECT_RENDER_LIMIT,
  filterSearchSelectOptions,
  groupSearchSelectOptions,
  isSameSearchSelectValue,
  normalizeSearchSelectOptions,
  toSearchSelectKey,
} from '@/helpers/common/searchSelectHelper'
import type { SearchSelectOptionInput, SearchSelectValue } from '@/types/common/searchSelect'

type SearchSelectProps = {
  modelValue?: SearchSelectValue | null
  options: readonly SearchSelectOptionInput[]
  limit?: number
}
type SearchSelectEmit = (e: 'update:modelValue', value: SearchSelectValue) => void

/**
 * State for SearchSelect: filters the options by the typed search and renders at most `limit`
 * matches, so long lists (municipalities, barangays, applicants) never render in full.
 */
export function useSearchSelect(props: SearchSelectProps, emit: SearchSelectEmit) {
  const searchTerm = ref('')

  const allOptions = computed(() => normalizeSearchSelectOptions(props.options))

  const selectedOption = computed(
    () => allOptions.value.find((option) => isSameSearchSelectValue(props.modelValue, option.value)) ?? null
  )

  const matches = computed(() => filterSearchSelectOptions(allOptions.value, searchTerm.value))
  const visibleGroups = computed(() =>
    groupSearchSelectOptions(matches.value.slice(0, props.limit ?? SEARCH_SELECT_RENDER_LIMIT))
  )
  /** Matches left out by the render limit */
  const hiddenCount = computed(() => Math.max(0, matches.value.length - (props.limit ?? SEARCH_SELECT_RENDER_LIMIT)))

  /** Combobox items carry this key instead of the value: reka rejects '' and it unifies 1 / '1' */
  const selectedKey = computed(() => (selectedOption.value ? toSearchSelectKey(selectedOption.value.value) : undefined))

  function onSelect(key: unknown) {
    const option = allOptions.value.find((candidate) => toSearchSelectKey(candidate.value) === key)
    if (!option) return
    searchTerm.value = ''
    emit('update:modelValue', option.value)
  }

  /** A closed dropdown opens again with the full list */
  function onOpenChange(open: boolean) {
    if (!open) searchTerm.value = ''
  }

  return {
    searchTerm,
    selectedOption,
    selectedKey,
    visibleGroups,
    hiddenCount,
    onSelect,
    onOpenChange,
  }
}
