export type SearchSelectValue = string | number

/** One choice of a SearchSelect. `group` puts it under a heading; options of a group should be adjacent. */
export interface SearchSelectOption {
  value: SearchSelectValue
  label: string
  /** Second line under the label; also searched */
  description?: string
  group?: string
  disabled?: boolean
}

/** Plain strings / numbers are shorthand for options whose label is the value */
export type SearchSelectOptionInput = SearchSelectOption | SearchSelectValue

export interface SearchSelectGroup {
  label: string
  options: SearchSelectOption[]
}
