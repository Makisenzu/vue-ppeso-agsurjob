<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { skillOptionId as optionId } from '@/helpers/common/skillHelper'
import type { SkillSuggestion } from '@/types/common/skillCatalog'

/**
 * Suggestions for a skill box (SkillTextPicker, JobVacancySkillsField): skills from the shared list
 * (migration 099), then "Add … as typed". The default slot is the box the list hangs from. The list
 * renders in a portal, so a card's overflow never cuts it off, and opens upward when there's no room below.
 * Options are picked on mousedown and the popover never takes focus, so typing carries on in the box.
 */
defineProps<{
  id: string
  open: boolean
  suggestions: SkillSuggestion[]
  typedOption: string | null
  /** Index across suggestions, then the typed option */
  activeIndex: number
}>()

const emit = defineEmits<{ (e: 'select', name: string): void }>()
</script>

<template>
  <Popover :open="open">
    <PopoverAnchor as-child>
      <slot />
    </PopoverAnchor>
    <PopoverContent
      align="start"
      :side-offset="4"
      :collision-padding="8"
      class="w-(--reka-popover-trigger-width) max-w-[calc(100vw-1rem)] gap-0 p-1"
      @open-auto-focus.prevent
      @close-auto-focus.prevent
      @interact-outside.prevent
    >
      <ul :id="id" role="listbox" class="max-h-[min(16rem,var(--reka-popover-content-available-height))] overflow-y-auto">
        <li
          v-for="(skill, index) in suggestions"
          :id="optionId(id, index)"
          :key="skill.id"
          role="option"
          :aria-selected="activeIndex === index"
          class="flex cursor-pointer flex-col rounded-sm px-2 py-1.5 text-sm"
          :class="activeIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'"
          @mousedown.prevent="emit('select', skill.name)"
        >
          <span class="truncate">{{ skill.name }}</span>
          <span v-if="skill.matched_alias || skill.category" class="truncate text-xs text-muted-foreground">
            {{ [skill.matched_alias ? `matches “${skill.matched_alias}”` : null, skill.category].filter(Boolean).join(' · ') }}
          </span>
        </li>
        <li
          v-if="typedOption"
          :id="optionId(id, suggestions.length)"
          role="option"
          :aria-selected="activeIndex === suggestions.length"
          class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
          :class="activeIndex === suggestions.length ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'"
          @mousedown.prevent="emit('select', typedOption)"
        >
          <Plus class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="truncate">Add “{{ typedOption }}” as typed</span>
        </li>
      </ul>
    </PopoverContent>
  </Popover>
</template>
