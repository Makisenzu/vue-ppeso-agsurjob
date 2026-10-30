<script setup lang="ts">
import { X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import ReferencePicker from '@/components/ReferencePicker.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { useJobVacancyCourseFields } from '@/composables/common/useJobVacancyCourseFields'

/**
 * Course a vacancy requires (core.courses, or "None") and the optional related courses also
 * accepted (job_vacancies.related_courses, migration 085). Renders inside a parent vee-validate form.
 */
defineProps<{ disabled?: boolean }>()

const {
  courseOptions,
  isLoadingCourses,
  hasCourse,
  relatedCourses,
  relatedCourseOptions,
  relatedPick,
  isRelatedFull,
  maxRelatedCourses,
  addRelatedCourse,
  removeRelatedCourse,
} = useJobVacancyCourseFields()
</script>

<template>
  <div class="grid gap-4">
    <FormField v-slot="{ componentField }" name="courseShsStrand">
      <FormItem>
        <FormLabel>Course / SHS Strand</FormLabel>
        <FormControl>
          <ReferencePicker
            v-bind="componentField"
            :options="courseOptions"
            :loading="isLoadingCourses"
            :disabled="disabled"
            placeholder="Select course, or None"
            search-placeholder="Search name or abbreviation (e.g. BSIT)..."
            specify-placeholder="Specify course / strand / qualification"
          />
        </FormControl>
        <FormDescription>Pick "None" if no particular course is needed.</FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-if="hasCourse" name="relatedCourses">
      <FormItem>
        <FormLabel>Related Courses <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
        <SearchSelect
          :model-value="relatedPick"
          :options="relatedCourseOptions"
          :disabled="disabled || isRelatedFull || isLoadingCourses"
          :placeholder="isRelatedFull ? `Up to ${maxRelatedCourses} courses` : 'Add a related course'"
          class="w-full"
          @update:model-value="addRelatedCourse"
        />
        <FormDescription>Other courses you'd also accept for this job.</FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <ul v-if="hasCourse && relatedCourses.length" class="flex flex-wrap gap-2">
      <li
        v-for="(name, index) in relatedCourses"
        :key="name"
        class="flex max-w-full items-center gap-1 rounded-full border bg-muted/50 py-0.5 pr-0.5 pl-3 text-sm"
      >
        <span class="min-w-0 truncate">{{ name }}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-8 shrink-0 rounded-full"
          :disabled="disabled"
          :aria-label="`Remove ${name}`"
          @click="removeRelatedCourse(index)"
        >
          <X class="size-3.5" />
        </Button>
      </li>
    </ul>
  </div>
</template>
