<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CheckIcon, ChevronsUpDownIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useReferencePicker } from '@/composables/common/useReferencePicker'
import type { ReferenceOption } from '@/types/common/referenceList'

/**
 * Searchable pick list (religions, courses) bound to a plain-text value. Choosing "Others" shows a
 * text box for the value instead.
 */
const props = defineProps<{
  modelValue?: string | null
  options: ReferenceOption[]
  placeholder?: string
  searchPlaceholder?: string
  specifyPlaceholder?: string
  disabled?: boolean
  loading?: boolean
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const { searchTerm, selectedOption, selectedLabel, filteredOptions, isSpecifying, otherText, onSelect } =
  useReferencePicker(props, emit)
</script>

<template>
  <div class="space-y-1.5">
    <Combobox
      :model-value="selectedOption"
      v-model:search-term="searchTerm"
      :ignore-filter="true"
      by="name"
      :disabled="disabled"
      @update:model-value="(value) => onSelect(value as ReferenceOption | null)"
    >
      <ComboboxAnchor as-child>
        <ComboboxTrigger as-child>
          <Button
            type="button"
            variant="outline"
            :class="cn('w-full justify-between overflow-hidden font-normal', props.class)"
            :disabled="disabled"
          >
            <span class="min-w-0 flex-1 truncate text-left" :class="!selectedLabel && 'text-muted-foreground'">
              {{ loading ? 'Loading...' : selectedLabel || placeholder || 'Select...' }}
            </span>
            <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
          </Button>
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxList class="min-w-72">
        <ComboboxInput
          :placeholder="searchPlaceholder || 'Search...'"
          @input="searchTerm = ($event.target as HTMLInputElement).value"
        />
        <ComboboxViewport>
          <ComboboxEmpty>No match found.</ComboboxEmpty>
          <ComboboxGroup>
            <ComboboxItem v-for="option in filteredOptions" :key="option.name" :value="option">
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ option.name }}</span>
                <span v-if="option.abbreviation || option.group" class="block truncate text-[11px] text-muted-foreground">
                  {{ [option.abbreviation, option.group].filter(Boolean).join(' · ') }}
                </span>
              </span>
              <ComboboxItemIndicator>
                <CheckIcon class="size-4 shrink-0" />
              </ComboboxItemIndicator>
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxViewport>
      </ComboboxList>
    </Combobox>

    <Input
      v-if="isSpecifying"
      v-model="otherText"
      :placeholder="specifyPlaceholder || 'Please specify'"
      :disabled="disabled"
      :class="props.class"
    />
  </div>
</template>
