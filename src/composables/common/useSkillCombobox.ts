import { computed, ref, useId, watch, type Ref } from 'vue'
import { useSkillSearch } from '@/composables/common/useSkillSearch'
import { skillOptionId } from '@/helpers/common/skillHelper'

/**
 * A skill box with suggestions from the shared list (SkillTextPicker, JobVacancySkillsField): arrow keys
 * move through the suggestions, Enter picks (or adds what's typed), comma adds what's typed, Escape closes.
 * `pick` gets the chosen name; the caller adds it and the box is cleared.
 */
export function useSkillCombobox(options: {
  query: Ref<string>
  takenKeys: Ref<Set<string>>
  disabled: Ref<boolean>
  pick: (name: string) => void
  /** Backspace in an empty box (removes the last chip) */
  onBackspaceEmpty?: () => void
}) {
  const { query, takenKeys, disabled, pick } = options
  const { suggestions, typedOption, isSearching } = useSkillSearch(query, takenKeys)

  const listId = `skill-list-${useId()}`
  const isFocused = ref(false)
  const activeIndex = ref(0)

  const optionCount = computed(() => suggestions.value.length + (typedOption.value ? 1 : 0))
  const isOpen = computed(() => isFocused.value && !disabled.value && optionCount.value > 0)
  const activeOptionId = computed(() => (isOpen.value ? skillOptionId(listId, activeIndex.value) : undefined))

  // New results start from the first suggestion
  watch([suggestions, typedOption], () => {
    activeIndex.value = 0
  })

  function select(name: string) {
    pick(name)
    query.value = ''
    activeIndex.value = 0
  }

  /** The highlighted option's name */
  const activeName = () =>
    suggestions.value[activeIndex.value]?.name ??
    (activeIndex.value === suggestions.value.length ? typedOption.value : null)

  function onKeydown(event: KeyboardEvent) {
    if (disabled.value) return
    switch (event.key) {
      case 'ArrowDown':
        if (!optionCount.value) return
        event.preventDefault()
        activeIndex.value = (activeIndex.value + 1) % optionCount.value
        break
      case 'ArrowUp':
        if (!optionCount.value) return
        event.preventDefault()
        activeIndex.value = (activeIndex.value - 1 + optionCount.value) % optionCount.value
        break
      case 'Enter': {
        // Never submits the form from the skill box
        event.preventDefault()
        const name = (isOpen.value ? activeName() : null) ?? typedOption.value
        if (name) select(name)
        break
      }
      case ',':
        event.preventDefault()
        if (typedOption.value) select(typedOption.value)
        break
      case 'Escape':
        if (isOpen.value) {
          event.preventDefault()
          isFocused.value = false
        }
        break
      case 'Backspace':
        if (!query.value) options.onBackspaceEmpty?.()
        break
    }
  }

  const onFocus = () => {
    isFocused.value = true
  }
  const onBlur = () => {
    isFocused.value = false
  }

  return {
    listId,
    suggestions,
    typedOption,
    isSearching,
    isOpen,
    activeIndex,
    activeOptionId,
    select,
    onKeydown,
    onFocus,
    onBlur,
  }
}
