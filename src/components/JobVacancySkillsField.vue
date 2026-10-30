<script setup lang="ts">
import { Plus, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useJobVacancySkillsField } from '@/composables/common/useJobVacancySkillsField'

/**
 * Skills a vacancy needs (`esmdd.job_vacancy_skills`, migration 084), used to match applicants.
 * Renders inside a parent vee-validate form with a `skills: JobVacancySkillValue[]` field.
 */
defineProps<{ disabled?: boolean }>()

const {
  skills,
  draft,
  suggestions,
  canAddDraft,
  isFull,
  maxSkills,
  maxLength,
  addSkill,
  addDraft,
  onDraftKeydown,
  removeSkill,
  setRequired,
} = useJobVacancySkillsField()
</script>

<template>
  <section class="grid gap-4">
    <h3 class="text-sm font-semibold">Skills</h3>

    <FormField name="skills">
      <FormItem>
        <FormLabel>Skills needed</FormLabel>
        <div class="flex gap-2">
          <Input
            v-model="draft"
            placeholder="e.g. Forklift operation"
            :maxlength="maxLength"
            :disabled="disabled || isFull"
            aria-label="Skill name"
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
        <FormDescription>Applicants are matched on these. Turn off "Must have" for nice-to-haves.</FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <ul v-if="skills.length" class="divide-y rounded-md border">
      <li v-for="(skill, index) in skills" :key="skill.name" class="flex items-center gap-3 px-3 py-2">
        <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ skill.name }}</span>
        <label class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <Switch
            :model-value="skill.isRequired"
            :disabled="disabled"
            :aria-label="`${skill.name} is a must have`"
            @update:model-value="(value: boolean) => setRequired(index, value)"
          />
          Must have
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-10 shrink-0 sm:size-8"
          :disabled="disabled"
          :aria-label="`Remove ${skill.name}`"
          @click="removeSkill(index)"
        >
          <X class="size-4" />
        </Button>
      </li>
    </ul>
    <p v-if="isFull" class="text-xs text-muted-foreground">Up to {{ maxSkills }} skills.</p>

    <div v-if="suggestions.length && !isFull" class="grid gap-2">
      <p class="text-xs text-muted-foreground">From the NSRP skills list</p>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="name in suggestions"
          :key="name"
          type="button"
          variant="outline"
          size="sm"
          class="h-9 rounded-full sm:h-8"
          :disabled="disabled"
          @click="addSkill(name)"
        >
          <Plus class="size-3.5" />
          {{ name }}
        </Button>
      </div>
    </div>
  </section>
</template>
