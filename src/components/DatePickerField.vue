<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { DateValue } from '@internationalized/date'
import { CalendarIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useDatePickerField } from '@/composables/common/useDatePickerField'

/**
 * Date field that shows MM/DD/YYYY whatever the browser's locale, bound to an ISO day (yyyy-MM-dd).
 * Use it instead of <Input type="date">. Works with `v-bind="componentField"` inside <FormControl>:
 * id / aria attributes and blur land on the button.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: string | null
  /** Earliest / latest selectable day (yyyy-MM-dd) */
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const { calendarValue, minValue, maxValue, label, select } = useDatePickerField(props, emit)
</script>

<template>
  <Popover v-slot="{ close }">
    <PopoverTrigger as-child>
      <Button
        v-bind="$attrs"
        type="button"
        variant="outline"
        :disabled="disabled"
        :class="cn('w-full justify-start gap-2 font-normal', !label && 'text-muted-foreground', props.class)"
      >
        <CalendarIcon class="size-4 shrink-0 opacity-60" />
        <span class="truncate">{{ label || placeholder || 'MM/DD/YYYY' }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        :model-value="calendarValue"
        :min-value="minValue"
        :max-value="maxValue"
        layout="month-and-year"
        initial-focus
        @update:model-value="(value) => { select(value as DateValue | undefined); close() }"
      />
    </PopoverContent>
  </Popover>
</template>
