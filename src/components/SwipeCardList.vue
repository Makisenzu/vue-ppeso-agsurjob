<script setup lang="ts" generic="T">
import { Check, Minus } from '@lucide/vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import SwipeRow, { type SwipeAction } from '@/components/SwipeRow.vue'
import type { SwipeCard } from '@/types/common/swipeCard'
import { useSelectionCycle } from '@/composables/common/useSelectionCycle'

/**
 * Mobile card view of a data table (DESIGN.md 13.2): one SwipeRow card per item, swipe left for the
 * row actions. Pass `isSelected` + `allSelected` for selection: the row checkboxes sit beside the cards (not
 * inside: SwipeRow captures the pointer, so a nested checkbox wouldn't receive taps) and stay hidden until the
 * select-all checkbox is clicked (see useSelectionCycle).
 */
const props = withDefaults(
  defineProps<{
    items: T[]
    itemKey: (item: T) => string | number
    /** Title + one detail line; the default card content, and the title labels the card for screen readers */
    card: (item: T) => SwipeCard
    actions?: (item: T) => SwipeAction[]
    loading?: boolean
    hint?: string
    height?: number
    actionWidth?: number
    isSelected?: (item: T) => boolean
    allSelected?: boolean | 'indeterminate'
    /** Color of the first (outer-edge) action: destructive for Delete, primary for a non-destructive main action */
    primaryTone?: 'destructive' | 'primary'
  }>(),
  {
    actions: () => [],
    loading: false,
    hint: 'Swipe left on a row for actions.',
    height: 72,
    actionWidth: 72,
    isSelected: undefined,
    allSelected: undefined,
    primaryTone: 'destructive',
  },
)

const emit = defineEmits<{
  toggle: [item: T, value: boolean]
  toggleAll: [value: boolean]
}>()

defineSlots<{
  default?(props: { item: T; card: SwipeCard }): unknown
  empty?(): unknown
}>()

const onToggle = (item: T, value: boolean | 'indeterminate') => emit('toggle', item, value === true)
const hasActions = (item: T) => props.actions(item).length > 0

const { showRowCheckboxes, masterValue, masterLabel, cycle } = useSelectionCycle({
  allSelected: () => props.allSelected,
  setAll: (value) => emit('toggleAll', value),
})
</script>

<template>
  <div class="grid gap-2">
    <template v-if="loading">
      <Skeleton v-for="n in 5" :key="n" class="w-full rounded-[10px]" :style="{ height: `${height}px` }" />
    </template>

    <template v-else-if="items.length > 0">
      <div v-if="allSelected !== undefined || (hint && items.some(hasActions))" class="flex items-center gap-3">
        <Checkbox
          v-if="allSelected !== undefined"
          :model-value="masterValue"
          :aria-label="masterLabel"
          :title="masterLabel"
          @update:model-value="cycle"
        >
          <template #default="{ modelValue }">
            <Minus v-if="modelValue === 'indeterminate'" class="size-3 stroke-3" />
            <Check v-else class="size-3.5" />
          </template>
        </Checkbox>
        <p v-if="hint && items.some(hasActions)" class="text-xs text-muted-foreground">{{ hint }}</p>
      </div>

      <div v-for="item in items" :key="itemKey(item)" class="flex items-center gap-3">
        <Checkbox
          v-if="isSelected && showRowCheckboxes"
          :model-value="isSelected(item)"
          :aria-label="`Select ${card(item).title}`"
          @update:model-value="(value) => onToggle(item, value)"
        />
        <SwipeRow
          class-name="min-w-0 flex-1"
          :label="card(item).title"
          :actions="actions(item)"
          :full-swipe="false"
          :height="height"
          :radius="10"
          :action-width="actionWidth"
          row-color="var(--muted)"
          text-color="var(--foreground)"
          :action-color="primaryTone === 'primary' ? 'var(--primary)' : 'var(--destructive)'"
          :action-text-color="primaryTone === 'primary' ? 'var(--primary-foreground)' : 'var(--background)'"
          drawer-color="var(--secondary)"
          drawer-text-color="var(--secondary-foreground)"
        >
          <slot :item="item" :card="card(item)">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ card(item).title }}</p>
              <p v-if="card(item).subtitle" class="truncate text-xs text-muted-foreground">{{ card(item).subtitle }}</p>
            </div>
          </slot>
        </SwipeRow>
      </div>
    </template>

    <slot v-else name="empty" />
  </div>
</template>
