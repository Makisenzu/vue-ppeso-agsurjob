<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { X } from '@lucide/vue'
import SkillSuggestionList from '@/components/SkillSuggestionList.vue'
import { useSkillTextPicker } from '@/composables/common/useSkillTextPicker'
import { SKILL_NAME_MAX_LENGTH } from '@/helpers/common/skillHelper'

/**
 * Drop-in for an `<Input>` on an NSRP skill text field: same comma-separated v-model, shown as chips with
 * suggestions from the skill list (migration 099). Works with `v-bind="componentField"` and `v-model`.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: string | null
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'default'
  id?: string
  name?: string
  class?: HTMLAttributes['class']
}>()

// input / change are declared (never emitted) so a form's onInput / onChange don't reach the inner box:
// it holds the half-typed skill, not the field's value
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur', event: FocusEvent): void
  (e: 'input' | 'change', value: never): void
}>()

const {
  draft,
  names,
  remove,
  isUnknown,
  listId,
  suggestions,
  typedOption,
  isOpen,
  activeIndex,
  activeOptionId,
  select,
  onKeydown,
  onFocus,
  onBlur,
} = useSkillTextPicker(props, emit)
</script>

<template>
  <SkillSuggestionList
    :id="listId"
    :open="isOpen"
    :suggestions="suggestions"
    :typed-option="typedOption"
    :active-index="activeIndex"
    @select="select"
  >
    <div
      class="flex w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30"
      :class="[
        size === 'sm' ? 'min-h-8 px-2 py-1 text-xs' : 'min-h-10 px-3 py-1.5 text-base sm:min-h-9 md:text-sm',
        disabled ? 'cursor-not-allowed opacity-50' : '',
        props.class,
      ]"
    >
      <span
        v-for="(skill, index) in names"
        :key="skill"
        class="inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5"
        :class="[size === 'sm' ? 'text-xs' : 'text-xs sm:text-sm', isUnknown(skill) ? 'border-dashed text-muted-foreground' : 'bg-muted text-foreground']"
        :title="isUnknown(skill) ? 'Not on the skill list yet; PESO will review it' : undefined"
      >
        <span class="truncate">{{ skill }}</span>
        <button
          type="button"
          class="shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :disabled="disabled"
          :aria-label="`Remove ${skill}`"
          @click="remove(index)"
        >
          <X class="size-3" />
        </button>
      </span>
      <input
        :id="id"
        v-model="draft"
        v-bind="$attrs"
        :name="name"
        type="text"
        role="combobox"
        autocomplete="off"
        :aria-expanded="isOpen"
        :aria-controls="listId"
        aria-autocomplete="list"
        :aria-activedescendant="activeOptionId"
        :maxlength="SKILL_NAME_MAX_LENGTH"
        :placeholder="names.length ? 'Add another skill' : placeholder"
        :disabled="disabled"
        class="min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        @keydown="onKeydown"
        @focus="onFocus"
        @blur="onBlur"
      />
    </div>
  </SkillSuggestionList>
</template>
