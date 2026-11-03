<script setup lang="ts">
import { Search } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import type { JobFairListScope } from '@/types/common/jobFairEvent'

/** Upcoming / Past toggle and search of the Job Fairs lists */
const scope = defineModel<JobFairListScope>('scope', { required: true })
const search = defineModel<string>('search', { required: true })

const SCOPES: { value: JobFairListScope; label: string }[] = [
  { value: 'active', label: 'Upcoming & ongoing' },
  { value: 'past', label: 'Past' },
]
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="inline-flex w-full rounded-lg border bg-muted/40 p-1 sm:w-auto" role="group" aria-label="Show job fairs">
      <button
        v-for="option in SCOPES"
        :key="option.value"
        type="button"
        class="h-9 flex-1 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-8 sm:flex-none"
        :class="scope === option.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
        :aria-pressed="scope === option.value"
        @click="scope = option.value"
      >
        {{ option.label }}
      </button>
    </div>
    <div class="relative w-full sm:max-w-xs">
      <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="search" type="search" placeholder="Search title or venue" class="pl-9" aria-label="Search job fairs" />
    </div>
  </div>
</template>
