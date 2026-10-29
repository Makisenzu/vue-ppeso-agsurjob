<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CheckIcon, ChevronDownIcon } from '@lucide/vue'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
  ComboboxViewport,
} from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { useSearchSelect } from '@/composables/common/useSearchSelect'
import { toSearchSelectKey } from '@/helpers/common/searchSelectHelper'
import type { SearchSelectOptionInput, SearchSelectValue } from '@/types/common/searchSelect'

/**
 * The app's dropdown (DESIGN.md 5.2): a searchable pick list that renders at most `limit` matches.
 * Works with v-model and with vee-validate's `componentField`; FormControl's id / aria attributes
 * land on the trigger. The optional `icon` slot (`{ option }`) renders before each label.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: SearchSelectValue | null
  options: readonly SearchSelectOptionInput[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  limit?: number
  size?: 'sm' | 'default'
  class?: HTMLAttributes['class']
  contentClass?: HTMLAttributes['class']
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: SearchSelectValue): void }>()

const { searchTerm, selectedOption, selectedKey, visibleGroups, hiddenCount, onSelect, onOpenChange } =
  useSearchSelect(props, emit)
</script>

<template>
  <!-- The Combobox root renders a wrapper div: it gets the classes too so width / grid-span classes reach the layout -->
  <Combobox
    :class="props.class"
    :model-value="selectedKey"
    v-model:search-term="searchTerm"
    :ignore-filter="true"
    :disabled="disabled"
    @update:model-value="onSelect"
    @update:open="onOpenChange"
  >
    <ComboboxAnchor as-child>
      <ComboboxTrigger as-child>
        <button
          type="button"
          v-bind="$attrs"
          :disabled="disabled"
          :data-size="size ?? 'default'"
          :class="cn(
            'border-input dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 flex w-fit min-w-0 items-center justify-between gap-1.5 rounded-md border bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 aria-invalid:ring-3 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8',
            props.class,
          )"
        >
          <span class="flex min-w-0 flex-1 items-center gap-1.5 text-left" :class="!selectedOption && 'text-muted-foreground'">
            <slot v-if="selectedOption" name="icon" :option="selectedOption" />
            <span class="truncate">{{ selectedOption?.label ?? placeholder ?? 'Select...' }}</span>
          </span>
          <ChevronDownIcon class="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </button>
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxList :class="cn('min-w-56', contentClass)" align="start">
      <!-- display-value: reka would otherwise prefill the search with the selected item key ("v:Private") -->
      <ComboboxInput
        :display-value="() => ''"
        :placeholder="searchPlaceholder ?? 'Search...'"
        @input="searchTerm = ($event.target as HTMLInputElement).value"
      />
      <ComboboxViewport>
        <ComboboxEmpty class="py-6 text-center text-sm text-muted-foreground">{{ emptyText ?? 'No match found.' }}</ComboboxEmpty>
        <ComboboxGroup v-for="group in visibleGroups" :key="group.label">
          <div v-if="group.label" class="px-2 py-1.5 text-xs font-medium text-muted-foreground">{{ group.label }}</div>
          <ComboboxItem
            v-for="option in group.options"
            :key="toSearchSelectKey(option.value)"
            :value="toSearchSelectKey(option.value)"
            :disabled="option.disabled"
          >
            <slot name="icon" :option="option" />
            <span class="min-w-0 flex-1">
              <span class="block truncate">{{ option.label }}</span>
              <span v-if="option.description" class="block truncate text-[11px] text-muted-foreground">
                {{ option.description }}
              </span>
            </span>
            <ComboboxItemIndicator>
              <CheckIcon class="size-4 shrink-0" />
            </ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxGroup>
        <p v-if="hiddenCount > 0" class="px-2 py-1.5 text-center text-xs text-muted-foreground">
          {{ hiddenCount }} more, type to narrow the list
        </p>
      </ComboboxViewport>
    </ComboboxList>
  </Combobox>
</template>
