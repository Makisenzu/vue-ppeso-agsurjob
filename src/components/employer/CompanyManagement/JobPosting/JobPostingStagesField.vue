<script setup lang="ts">
import { ChevronDown, ChevronUp, Plus, RotateCcw, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useJobPostingStagesField } from '@/composables/employer/useJobPostingStagesField'

/**
 * Hiring steps applicants go through for this vacancy (`esmdd.job_vacancy_stages`, migration 089), in order;
 * the last one marks the applicant hired. Renders inside the posting form with a `stages: JobPostingStageValue[]` field.
 */
defineProps<{ disabled?: boolean }>()

const {
  stages,
  draft,
  draftHint,
  canAddDraft,
  isFull,
  canRemove,
  maxStages,
  maxLength,
  addDraft,
  onDraftKeydown,
  renameStage,
  moveStage,
  removeStage,
  resetToDefault,
} = useJobPostingStagesField()
</script>

<template>
  <section class="grid gap-4">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold">Hiring Steps</h3>
      <Button type="button" variant="ghost" size="sm" class="h-10 sm:h-8" :disabled="disabled" @click="resetToDefault">
        <RotateCcw class="size-4" />
        Use default steps
      </Button>
    </div>

    <FormField name="stages">
      <FormItem>
        <FormLabel>Steps applicants go through, in order</FormLabel>
        <FormDescription>Applicants see these steps and are notified at each one. The last step marks them hired.</FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <ol class="divide-y rounded-md border">
      <li v-for="(item, index) in stages" :key="item.id ?? `new-${index}`" class="flex items-center gap-2 px-3 py-2">
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          :class="index === stages.length - 1 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'"
        >
          {{ index + 1 }}
        </span>
        <Input
          :model-value="item.name"
          class="h-10 min-w-0 flex-1 sm:h-9"
          :maxlength="maxLength"
          :disabled="disabled"
          :aria-label="`Step ${index + 1} name`"
          @update:model-value="(value) => renameStage(index, String(value))"
        />
        <span v-if="index === stages.length - 1" class="hidden shrink-0 text-xs text-success sm:inline">Hired</span>
        <div class="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-10 sm:size-8"
            :disabled="disabled || index === 0"
            :aria-label="`Move ${item.name} up`"
            @click="moveStage(index, -1)"
          >
            <ChevronUp class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-10 sm:size-8"
            :disabled="disabled || index === stages.length - 1"
            :aria-label="`Move ${item.name} down`"
            @click="moveStage(index, 1)"
          >
            <ChevronDown class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-10 sm:size-8"
            :disabled="disabled || !canRemove"
            :aria-label="`Remove ${item.name}`"
            @click="removeStage(index)"
          >
            <X class="size-4" />
          </Button>
        </div>
      </li>
    </ol>

    <div v-if="!isFull" class="grid gap-2">
      <div class="flex gap-2">
        <Input
          v-model="draft"
          placeholder="e.g. Medical Exam"
          :maxlength="maxLength"
          :disabled="disabled"
          aria-label="New step name"
          @keydown="onDraftKeydown"
        />
        <Button type="button" variant="outline" class="h-10 shrink-0 sm:h-9" :disabled="disabled || !canAddDraft" @click="addDraft">
          <Plus class="size-4" />
          Add step
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">{{ draftHint ?? 'New steps are added before the last step.' }}</p>
    </div>
    <p v-else class="text-xs text-muted-foreground">Up to {{ maxStages }} steps.</p>
  </section>
</template>
