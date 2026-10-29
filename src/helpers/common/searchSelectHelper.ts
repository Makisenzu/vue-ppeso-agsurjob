import type {
  SearchSelectGroup,
  SearchSelectOption,
  SearchSelectOptionInput,
  SearchSelectValue,
} from '@/types/common/searchSelect'

/** Most options a dropdown renders at once; the user types to narrow a longer list (DESIGN.md 5.2) */
export const SEARCH_SELECT_RENDER_LIMIT = 50

export function normalizeSearchSelectOptions(options: readonly SearchSelectOptionInput[]): SearchSelectOption[] {
  return options.map((option) =>
    typeof option === 'object' ? option : { value: option, label: String(option) }
  )
}

/** Options and models can mix numbers and numeric strings (e.g. a year), so compare as text */
export function isSameSearchSelectValue(a: SearchSelectValue | null | undefined, b: SearchSelectValue): boolean {
  return a !== null && a !== undefined && String(a) === String(b)
}

/** Filter options for `{ name, count }` summaries: "All …" (value '') then "Name (count)" */
export function toCountedFilterOptions(
  items: readonly { name: string; count: number }[],
  allLabel: string
): SearchSelectOption[] {
  return [{ value: '', label: allLabel }, ...items.map((item) => ({ value: item.name, label: `${item.name} (${item.count})` }))]
}

/** Never-empty item key for the Combobox; values that look alike as text share a key */
export function toSearchSelectKey(value: SearchSelectValue): string {
  return `v:${String(value)}`
}

/** Every typed word must appear in the label, description or group (case-insensitive) */
export function filterSearchSelectOptions(options: SearchSelectOption[], term: string): SearchSelectOption[] {
  const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return options
  return options.filter((option) => {
    const haystack = [option.label, option.description, option.group].filter(Boolean).join(' ').toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

/** Groups adjacent options by `group`; ungrouped options form a group with an empty label */
export function groupSearchSelectOptions(options: SearchSelectOption[]): SearchSelectGroup[] {
  const groups: SearchSelectGroup[] = []
  for (const option of options) {
    const label = option.group ?? ''
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.options.push(option)
    else groups.push({ label, options: [option] })
  }
  return groups
}
