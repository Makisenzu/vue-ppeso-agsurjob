<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { ArrowLeft, Search, Users } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useVacancyApplicants } from '@/composables/employer/useVacancyApplicants'

/** Applicants of one job posting; Review opens the applicant's own page (ApplicantReview.vue) */
const {
  vacancyHeader,
  errorMessage,
  reload,
  stageCards,
  selectStage,
  stageFilter,
  searchInput,
  hasFilters,
  clearFilters,
  table,
  columns,
  applicants,
  isLoading,
  getRowCard,
  getRowSwipeActions,
  rangeLabel,
  pageCount,
  canPreviousPage,
  canNextPage,
  previousPage,
  nextPage,
} = useVacancyApplicants()
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <div class="flex flex-col gap-3">
      <AppLink
        :to="{ name: 'job-postings' }"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> Job Posting
      </AppLink>
      <div v-if="vacancyHeader" class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight text-pretty sm:text-3xl">{{ vacancyHeader.title }}</h1>
        <p class="text-sm text-muted-foreground">{{ vacancyHeader.summary }}</p>
      </div>
      <Skeleton v-else-if="!errorMessage" class="h-9 w-64" />
    </div>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>Applicants could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <template v-else>
      <!-- Hiring steps: click to filter. Same stat cards as the Job Posting page; the grid wraps for any number of steps -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Filter by hiring step">
        <button
          v-for="card in stageCards"
          :key="card.key"
          type="button"
          class="min-w-0 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :class="stageFilter === card.key && card.key !== 'all' ? 'border-primary' : ''"
          :aria-pressed="stageFilter === card.key"
          @click="selectStage(card.key)"
        >
          <p class="truncate text-xs text-muted-foreground" :title="card.label">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-semibold tabular-nums">{{ card.value }}</p>
        </button>
      </div>

      <section class="space-y-4">
        <!-- Toolbar -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div class="relative w-full sm:max-w-xs">
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="searchInput" type="search" placeholder="Search applicant" class="pl-9" aria-label="Search applicant" />
          </div>
          <Button v-if="hasFilters" variant="ghost" size="sm" class="h-10 sm:h-8" @click="clearFilters">Clear filters</Button>
        </div>

        <Empty v-if="!isLoading && applicants.length === 0" class="rounded-md border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>{{ hasFilters ? 'No matching applicants' : 'No applicants yet' }}</EmptyTitle>
            <EmptyDescription>
              {{ hasFilters ? 'Try another search or stage.' : 'Applicants show up here when they apply.' }}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent v-if="hasFilters">
            <Button variant="outline" @click="clearFilters">Clear filters</Button>
          </EmptyContent>
        </Empty>

        <template v-else>
          <!-- Mobile: swipeable cards (DESIGN.md 13.2); Review is the main action -->
          <SwipeCardList
            class="md:hidden"
            :items="table.getRowModel().rows"
            :item-key="(row) => row.id"
            :card="(row) => getRowCard(row.original)"
            :actions="(row) => getRowSwipeActions(row.original)"
            :loading="isLoading && applicants.length === 0"
            primary-tone="primary"
            hint="Swipe left on an applicant to review."
          />

          <!-- Desktop: table -->
          <div class="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                  <TableHead v-for="header in headerGroup.headers" :key="header.id">
                    <FlexRender
                      v-if="!header.isPlaceholder"
                      :render="header.column.columnDef.header"
                      :props="header.getContext()"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <template v-if="isLoading && applicants.length === 0">
                  <TableRow v-for="i in 5" :key="i">
                    <TableCell v-for="col in columns.length" :key="col">
                      <Skeleton class="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                </template>

                <TableRow
                  v-for="row in table.getRowModel().rows"
                  v-else
                  :key="row.id"
                  :class="isLoading ? 'opacity-60' : ''"
                >
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

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
      </section>
    </template>
  </div>
</template>
