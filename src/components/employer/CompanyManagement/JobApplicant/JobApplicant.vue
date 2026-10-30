<script setup lang="ts">
import { ArrowRight, BriefcaseBusiness, Search } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useJobApplicants } from '@/composables/employer/useJobApplicants'

/** Job Applicants page: each posting and how many applied; opens that posting's applicants */
const {
  searchInput,
  hasSearch,
  clearSearch,
  cards,
  isLoading,
  rangeLabel,
  pageCount,
  canPreviousPage,
  canNextPage,
  previousPage,
  nextPage,
} = useJobApplicants()
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Job Applicants</h1>
        <p class="text-sm text-muted-foreground">Pick a job posting to review its applicants.</p>
      </div>
      <div class="relative w-full sm:max-w-xs">
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="searchInput" type="search" placeholder="Search position" class="pl-9" aria-label="Search position" />
      </div>
    </div>

    <div v-if="isLoading && cards.length === 0" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <Skeleton v-for="i in 6" :key="i" class="h-36 w-full rounded-lg" />
    </div>

    <Empty v-else-if="cards.length === 0" class="rounded-md border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><BriefcaseBusiness /></EmptyMedia>
        <EmptyTitle>{{ hasSearch ? 'No matching postings' : 'No job postings yet' }}</EmptyTitle>
        <EmptyDescription>
          {{ hasSearch ? 'Try another search.' : 'Applicants show up here once you post a job.' }}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent v-if="hasSearch">
        <Button variant="outline" @click="clearSearch">Clear search</Button>
      </EmptyContent>
    </Empty>

    <template v-else>
      <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" :class="isLoading ? 'opacity-60' : ''">
        <li v-for="card in cards" :key="card.id">
          <AppLink
            :to="card.to"
            class="group flex h-full flex-col gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex min-w-0 flex-col gap-1">
                <h2 class="line-clamp-2 text-base font-semibold text-pretty group-hover:text-primary">{{ card.title }}</h2>
                <p class="truncate text-xs text-muted-foreground">{{ card.summary }}</p>
              </div>
              <Badge :variant="card.statusVariant" class="shrink-0">{{ card.statusLabel }}</Badge>
            </div>
            <div class="mt-auto flex items-end justify-between gap-2">
              <div>
                <p class="text-2xl font-semibold tabular-nums">{{ card.applicantCount }}</p>
                <p class="text-xs text-muted-foreground">
                  applicant{{ card.applicantCount === 1 ? '' : 's' }}<template v-if="card.newCount"> · {{ card.newCount }} new</template>
                </p>
              </div>
              <span class="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                View <ArrowRight class="size-4" />
              </span>
            </div>
          </AppLink>
        </li>
      </ul>

      <!-- Pagination (server side) -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">{{ rangeLabel }}</p>
        <div v-if="pageCount > 1" class="flex justify-center gap-2 sm:justify-end">
          <Button variant="outline" class="h-10 sm:h-8" size="sm" :disabled="!canPreviousPage || isLoading" @click="previousPage">
            Previous
          </Button>
          <Button variant="outline" class="h-10 sm:h-8" size="sm" :disabled="!canNextPage || isLoading" @click="nextPage">
            Next
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
