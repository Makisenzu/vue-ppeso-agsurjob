import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

/** off: only the select-all checkbox shows · picking: row checkboxes show · all: every row on the page is selected */
export type SelectionCycleMode = 'off' | 'picking' | 'all'

interface SelectionCycleOptions {
  /** Current selection state of the page, as the table reports it */
  allSelected: MaybeRefOrGetter<boolean | 'indeterminate' | undefined>
  /** Select (true) or clear (false) every row on the page */
  setAll: (value: boolean) => void
}

/**
 * Mobile card lists hide the row checkboxes until they're needed (DESIGN.md 13.2). The select-all checkbox
 * cycles: 1st click shows the row checkboxes, 2nd selects every row, 3rd clears the selection and hides them.
 */
export function useSelectionCycle({ allSelected, setAll }: SelectionCycleOptions) {
  const mode = ref<SelectionCycleMode>('off')

  const showRowCheckboxes = computed(() => mode.value !== 'off')

  // The master checkbox shows the real selection once rows are pickable, and stays empty before that
  const masterValue = computed<boolean | 'indeterminate'>(() =>
    mode.value === 'off' ? false : (toValue(allSelected) ?? false),
  )

  const masterLabel = computed(() => {
    if (mode.value === 'off') return 'Show selection checkboxes'
    if (mode.value === 'picking') return 'Select all rows on page'
    return 'Clear selection and hide checkboxes'
  })

  function cycle() {
    if (mode.value === 'off') {
      mode.value = 'picking'
    } else if (mode.value === 'picking') {
      setAll(true)
      mode.value = 'all'
    } else {
      setAll(false)
      mode.value = 'off'
    }
  }

  watch(
    () => toValue(allSelected),
    (value) => {
      // A selection made elsewhere (e.g. on the desktop table before resizing) must stay visible
      if (mode.value === 'off' && value) mode.value = 'picking'
      // Rows deselected one by one, or the selection cleared after a bulk action: back to picking
      else if (mode.value === 'all' && value !== true) mode.value = 'picking'
    },
    { immediate: true },
  )

  return { mode, showRowCheckboxes, masterValue, masterLabel, cycle }
}
