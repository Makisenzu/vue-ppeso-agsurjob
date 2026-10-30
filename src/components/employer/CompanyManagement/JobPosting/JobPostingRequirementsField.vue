<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useJobPostingRequirementsField } from '@/composables/employer/useJobPostingRequirementsField'

/**
 * Documents applicants submit when applying (`esmdd.job_vacancy_requirements`, migration 088), each
 * required or optional. Renders inside the posting form with a `requirements: JobPostingRequirementValue[]` field.
 */
defineProps<{ disabled?: boolean }>()

const {
  requirements,
  draft,
  draftHint,
  suggestions,
  canAddDraft,
  isFull,
  maxRequirements,
  maxLength,
  addRequirement,
  addDraft,
  onDraftKeydown,
  removeRequirement,
  setRequired,
} = useJobPostingRequirementsField()
</script>

<template>
  <section class="grid gap-4">
    <h3 class="text-sm font-semibold">Application Requirements</h3>

    <FormField name="requirements">
      <FormItem>
        <FormLabel>Documents applicants must submit</FormLabel>
        <div class="flex gap-2">
          <Input
            v-model="draft"
            placeholder="e.g. NBI Clearance"
            :maxlength="maxLength"
            :disabled="disabled || isFull"
            aria-label="Requirement name"
            @keydown="onDraftKeydown"
          />
          <Button
            type="button"
            variant="outline"
            class="h-10 shrink-0 sm:h-9"
            :disabled="disabled || !canAddDraft"
            @click="addDraft"
          >
            <Plus class="size-4" />
            Add
          </Button>
        </div>
        <p v-if="draftHint" class="text-xs text-muted-foreground">{{ draftHint }}</p>
        <FormDescription>
          Applicants can't apply without a "Required" document. Turn it off for documents they may skip.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <ul v-if="requirements.length" class="divide-y rounded-md border">
      <li v-for="(item, index) in requirements" :key="item.name" class="flex items-center gap-3 px-3 py-2">
        <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ item.name }}</span>
        <label class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <Switch
            :model-value="item.isRequired"
            :disabled="disabled"
            :aria-label="`${item.name} is required`"
            @update:model-value="(value: boolean) => setRequired(index, value)"
          />
          {{ item.isRequired ? 'Required' : 'Optional' }}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-10 shrink-0 sm:size-8"
          :disabled="disabled"
          :aria-label="`Remove ${item.name}`"
          @click="removeRequirement(index)"
        >
          <X class="size-4" />
        </Button>
      </li>
    </ul>
    <p v-if="isFull" class="text-xs text-muted-foreground">Up to {{ maxRequirements }} requirements.</p>

    <div v-if="suggestions.length && !isFull" class="grid gap-2">
      <p class="text-xs text-muted-foreground">Common requirements</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="name in suggestions"
          :key="name"
          type="button"
          variant="outline"
          size="sm"
          class="h-9 rounded-full sm:h-8"
          :disabled="disabled"
          @click="addRequirement(name)"
        >
          <Plus class="size-3.5" />
          {{ name }}
        </Button>
      </div>
    </div>
  </section>
</template>
