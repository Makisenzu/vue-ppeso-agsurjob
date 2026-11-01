import { computed } from 'vue'
import { parseDate, type DateValue } from '@internationalized/date'
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { toIsoDay } from '@/helpers/common/dateRuleHelper'

type DatePickerFieldProps = { modelValue?: string | null; min?: string; max?: string }
type DatePickerFieldEmit = (e: 'update:modelValue', value: string) => void

const toCalendarDate = (value?: string | null) => {
  const day = toIsoDay(value)
  return day ? parseDate(day) : undefined
}

/**
 * State for DatePickerField: the model stays an ISO day (yyyy-MM-dd) as the database and schemas expect,
 * while the button shows it MM/DD/YYYY (DESIGN.md §3.1) — a native date input shows the browser's locale order.
 */
export function useDatePickerField(props: DatePickerFieldProps, emit: DatePickerFieldEmit) {
  const calendarValue = computed(() => toCalendarDate(props.modelValue))
  const minValue = computed(() => toCalendarDate(props.min))
  const maxValue = computed(() => toCalendarDate(props.max))
  const label = computed(() => formatDisplayDate(props.modelValue))

  /** Calendar's DateValue → yyyy-MM-dd; clearing the selection keeps the value */
  const select = (value: DateValue | undefined) => {
    if (value) emit('update:modelValue', value.toString())
  }

  return { calendarValue, minValue, maxValue, label, select }
}
