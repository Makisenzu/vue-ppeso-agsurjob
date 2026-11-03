<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { ArrowDown, CalendarDays } from '@lucide/vue'
import JobFairHero from '@/components/JobFairHero.vue'
import JobFairFeedPost from '@/components/JobFairFeedPost.vue'
import JobFairListToolbar from '@/components/JobFairListToolbar.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { JobFairEventCard } from '@/helpers/common/jobFairEventHelper'
import type { JobFairListScope } from '@/types/common/jobFairEvent'
import type { JobFairProgramFact, JobFairProgramStep } from '@/types/common/jobFairProgram'

/**
 * Job Fairs page of applicants and employers, laid out like the GIP / SPES / TUPAD pages:
 * hero, "What is a Job Fair?" beside "How it works", then "Explore Job Fairs" with PESO's posts.
 */
defineProps<{
  hero: { eyebrow: string; title: string; description: string; backgroundImage: string | null }
  about: { title: string; definition: string; purpose: string }
  facts: readonly JobFairProgramFact[]
  steps: readonly JobFairProgramStep[]
  cards: (JobFairEventCard & { to: RouteLocationRaw; actionLabel: string })[]
  isLoading: boolean
  errorMessage: string | null
  hasSearch: boolean
}>()

const emit = defineEmits<{ reload: []; clearSearch: [] }>()

const scope = defineModel<JobFairListScope>('scope', { required: true })
const search = defineModel<string>('search', { required: true })

const headingClass = "font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:tracking-[0.2em]"
</script>

<template>
  <!-- Single root: App.vue's out-in <transition> needs one -->
  <div class="w-full min-w-0 overflow-x-hidden">
    <JobFairHero v-bind="hero">
      <div class="pt-2">
        <Button as-child size="lg" class="w-full sm:w-auto">
          <AppLink href="#explore-job-fairs">
            Explore job fairs
            <ArrowDown class="size-4" />
          </AppLink>
        </Button>
      </div>
    </JobFairHero>

    <div class="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[2fr_3fr] lg:gap-16 lg:px-8 lg:py-24">
      <!-- ─── What is a Job Fair? (stays in view beside the steps on desktop) ─── -->
      <section aria-labelledby="what-is-job-fair-title" class="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <!-- Same Times New Roman treatment as the other program headings (DESIGN.md exception) -->
        <h2 id="what-is-job-fair-title" :class="headingClass">{{ about.title }}</h2>
        <p class="text-base text-pretty text-foreground sm:text-lg">{{ about.definition }}</p>
        <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ about.purpose }}</p>

        <dl class="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
          <div v-for="fact in facts" :key="fact.label" class="flex flex-col">
            <dt class="text-sm font-semibold text-primary">{{ fact.label }}</dt>
            <dd class="text-sm text-muted-foreground">{{ fact.value }}</dd>
          </div>
        </dl>
      </section>

      <!-- ─── How it works: numbered rows, like the GIP requirements ─── -->
      <section aria-labelledby="job-fair-steps-title" class="flex flex-col gap-6">
        <h2 id="job-fair-steps-title" :class="headingClass">How it works</h2>
        <ol class="flex flex-col" aria-label="How job fairs work">
          <li
            v-for="(step, index) in steps"
            :key="step.title"
            class="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-border py-5 last:border-b sm:grid-cols-[3rem_1fr]"
          >
            <span class="pt-0.5 text-sm font-semibold text-muted-foreground tabular-nums" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div class="flex flex-col">
              <span class="text-base font-semibold text-foreground sm:text-lg">{{ step.title }}</span>
              <span class="text-sm text-muted-foreground">{{ step.note }}</span>
            </div>
          </li>
        </ol>
      </section>
    </div>

    <!-- ─── Explore Job Fairs: PESO's posts, newest first ─── -->
    <section
      id="explore-job-fairs"
      aria-labelledby="explore-job-fairs-title"
      class="scroll-mt-20 border-t border-border bg-muted/40"
    >
      <div class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div class="flex flex-col gap-2 text-center">
          <h2 id="explore-job-fairs-title" :class="headingClass">Explore Job Fairs</h2>
          <p class="text-sm text-pretty text-muted-foreground sm:text-base">The latest job fairs posted by PESO.</p>
        </div>

        <JobFairListToolbar v-model:scope="scope" v-model:search="search" />

        <Alert v-if="errorMessage && !cards.length" variant="destructive">
          <AlertTitle>Job fairs could not be loaded</AlertTitle>
          <AlertDescription class="flex flex-col items-start gap-2">
            {{ errorMessage }}
            <Button type="button" variant="outline" size="sm" @click="emit('reload')">Try again</Button>
          </AlertDescription>
        </Alert>

        <div v-else-if="isLoading && !cards.length" class="space-y-4" aria-busy="true">
          <Skeleton v-for="i in 2" :key="i" class="h-96 w-full rounded-xl" />
        </div>

        <Empty v-else-if="!cards.length" class="rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
            <EmptyTitle>{{ hasSearch ? 'No matching job fairs' : scope === 'past' ? 'No past job fairs' : 'No job fairs scheduled' }}</EmptyTitle>
            <EmptyDescription>{{ hasSearch ? 'Try another search.' : 'Check back soon.' }}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent v-if="hasSearch">
            <Button variant="outline" @click="emit('clearSearch')">Clear search</Button>
          </EmptyContent>
        </Empty>

        <ul v-else class="space-y-5" :class="isLoading ? 'opacity-60' : ''">
          <li v-for="card in cards" :key="card.id">
            <JobFairFeedPost :card="card" :to="card.to" :action-label="card.actionLabel" />
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
