<script setup lang="ts">
import { ArrowRight, Banknote, BriefcaseBusiness, CalendarClock, Clock, MapPin, Search, Users } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useApplicantVacancies } from '@/composables/applicant/useApplicantVacancies'

const {
  searchInput,
  hasSearch,
  clearSearch,
  vacancies,
  isLoading,
  errorMessage,
  reload,
  rangeLabel,
  pageCount,
  canPreviousPage,
  canNextPage,
  previousPage,
  nextPage,
} = useApplicantVacancies()
</script>

<template>
  <div class="mx-auto w-full max-w-7xl min-w-0 flex-1 space-y-6 overflow-x-hidden">
    <CustomBreadcrumbs />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Vacancies</h1>
        <p class="text-sm text-muted-foreground">Open jobs from PESO-verified employers.</p>
      </div>
      <div class="relative w-full sm:max-w-xs">
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchInput"
          type="search"
          placeholder="Search position, company or place"
          class="pl-9"
          aria-label="Search vacancies"
        />
      </div>
    </div>

    <Alert v-if="errorMessage && !vacancies.length" variant="destructive">
      <AlertTitle>Vacancies could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <div v-else-if="isLoading && !vacancies.length" class="flex flex-col gap-4" aria-busy="true">
      <Skeleton v-for="i in 4" :key="i" class="h-56 w-full rounded-xl lg:h-48" />
    </div>

    <Empty v-else-if="!vacancies.length" class="rounded-md border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><BriefcaseBusiness /></EmptyMedia>
        <EmptyTitle>{{ hasSearch ? 'No matching vacancies' : 'No open vacancies yet' }}</EmptyTitle>
        <EmptyDescription>{{ hasSearch ? 'Try another search.' : 'Check back soon for new openings.' }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent v-if="hasSearch">
        <Button variant="outline" @click="clearSearch">Clear search</Button>
      </EmptyContent>
    </Empty>

    <template v-else>
      <!-- One full-width card per vacancy: title, the four facts applicants compare, then posted / action -->
      <ul class="flex flex-col gap-4" :class="isLoading ? 'opacity-60' : ''">
        <li v-for="vacancy in vacancies" :key="vacancy.id">
          <AppLink
            :to="vacancy.to"
            class="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <!-- Title -->
            <div class="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex min-w-0 flex-col gap-1">
                <span class="truncate text-xs font-semibold tracking-wide text-primary uppercase">{{ vacancy.company }}</span>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg font-semibold text-pretty text-foreground group-hover:text-primary sm:text-xl">
                    {{ vacancy.title }}
                  </h2>
                  <Badge v-if="vacancy.natureOfWork" variant="secondary" class="shrink-0">{{ vacancy.natureOfWork }}</Badge>
                </div>
              </div>
              <!-- Top right: days left, then the applicant's own status -->
              <div
                v-if="vacancy.countdown || vacancy.hasApplied"
                class="flex shrink-0 flex-wrap items-center gap-2 self-start sm:flex-col sm:items-end"
              >
                <Badge v-if="vacancy.countdown" variant="outline" :class="vacancy.countdown.class">
                  {{ vacancy.countdown.label }}
                </Badge>
                <Badge v-if="vacancy.hasApplied" variant="outline" :class="vacancy.stageClass">
                  Applied · {{ vacancy.stageLabel }}
                </Badge>
              </div>
            </div>

            <!-- Facts: 1 column on phones, 2 on tablets, one line on desktop -->
            <dl class="grid grid-cols-1 gap-4 border-t border-border px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Banknote class="size-4" />
                </span>
                <div class="min-w-0">
                  <dt class="text-xs text-muted-foreground">Salary rate / grade</dt>
                  <dd class="truncate text-sm font-semibold text-foreground" :title="vacancy.salary">{{ vacancy.salary }}</dd>
                </div>
              </div>
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin class="size-4" />
                </span>
                <div class="min-w-0">
                  <dt class="text-xs text-muted-foreground">Location</dt>
                  <dd class="truncate text-sm font-semibold text-foreground" :title="vacancy.location">{{ vacancy.location }}</dd>
                </div>
              </div>
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users class="size-4" />
                </span>
                <div class="min-w-0">
                  <dt class="text-xs text-muted-foreground">Position available</dt>
                  <dd class="truncate text-sm font-semibold text-foreground">{{ vacancy.positions }}</dd>
                </div>
              </div>
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarClock class="size-4" />
                </span>
                <div class="min-w-0">
                  <dt class="text-xs text-muted-foreground">Deadline</dt>
                  <dd class="truncate text-sm font-semibold text-foreground">{{ vacancy.deadline }}</dd>
                </div>
              </div>
            </dl>

            <!-- Posted / action -->
            <div class="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
              <span v-if="vacancy.postedAgo" class="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Clock class="size-3.5 shrink-0" /> {{ vacancy.postedAgo }}
              </span>
              <span v-else />
              <span
                class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90"
              >
                {{ vacancy.hasApplied ? 'View application' : 'View details' }}
                <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
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
