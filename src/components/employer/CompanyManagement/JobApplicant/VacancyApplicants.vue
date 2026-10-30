<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { ArrowLeft, Eye, FileText, Loader2, Search, Users } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useVacancyApplicants } from '@/composables/employer/useVacancyApplicants'

/** Applicants of one job posting, with a review sheet to read their details and files and move their stage */
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
  isDetailOpen,
  review,
  stage,
  stageOptions,
  remarks,
  remarksError,
  isRemarksRequired,
  hasStageChange,
  isSavingStage,
  onDetailOpenChange,
  saveStage,
} = useVacancyApplicants()
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <div class="flex flex-col gap-3">
      <AppLink
        :to="{ name: 'job-applicants' }"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> Job Applicants
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
      <!-- Hiring steps: click to filter. Pills wrap, so any number of steps fits at 360px -->
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filter by hiring step">
        <button
          v-for="card in stageCards"
          :key="card.key"
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-3 text-sm transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:h-9"
          :class="stageFilter === card.key ? 'border-primary bg-primary/5 text-foreground' : 'text-muted-foreground'"
          :aria-pressed="stageFilter === card.key"
          @click="selectStage(card.key)"
        >
          <span class="max-w-48 truncate">{{ card.label }}</span>
          <span class="rounded-full bg-muted px-1.5 text-xs font-semibold text-foreground tabular-nums">{{ card.value }}</span>
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

  <!-- Review (stage field appears with remarks: Sheet, DESIGN.md 5.1) -->
  <Sheet :open="isDetailOpen" @update:open="onDetailOpenChange">
    <SheetContent class="flex h-full w-full flex-col p-0 sm:max-w-lg">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>{{ review?.name ?? 'Applicant' }}</SheetTitle>
        <SheetDescription>{{ review?.reference }} · Applied {{ review?.appliedOn }}</SheetDescription>
      </SheetHeader>

      <form class="contents" @submit.prevent="saveStage">
        <div v-if="review" class="grid flex-1 grid-cols-1 content-start gap-6 overflow-y-auto px-6 py-4">
          <section class="space-y-3" aria-labelledby="applicant-details-title">
            <h3 id="applicant-details-title" class="text-sm font-semibold">Details</h3>
            <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div v-for="detail in review.details" :key="detail.label" class="min-w-0">
                <span class="text-xs text-muted-foreground">{{ detail.label }}</span>
                <p class="text-sm font-medium break-words">{{ detail.value }}</p>
              </div>
            </div>
          </section>

          <Separator />

          <section class="space-y-2" aria-labelledby="applicant-documents-title">
            <h3 id="applicant-documents-title" class="text-sm font-semibold">Documents</h3>
            <ul class="flex flex-col">
              <li
                v-for="doc in review.documents"
                :key="doc.name"
                class="flex items-center justify-between gap-3 border-t border-border py-3 text-sm last:border-b"
              >
                <div class="flex min-w-0 flex-col">
                  <span class="text-foreground">
                    {{ doc.name }}<span v-if="doc.isOptional" class="text-muted-foreground"> (optional)</span>
                  </span>
                  <span v-if="doc.fileName" class="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <FileText class="size-3.5 shrink-0" />
                    <span class="truncate">{{ doc.fileName }}</span>
                  </span>
                  <span v-else class="text-xs text-muted-foreground">Not attached</span>
                </div>
                <Button v-if="doc.url" variant="outline" size="sm" as-child class="shrink-0">
                  <AppLink :href="doc.url" target="_blank" :aria-label="`View ${doc.name}`">
                    <Eye class="size-4" /> View
                  </AppLink>
                </Button>
              </li>
            </ul>
          </section>

          <Separator />

          <section class="space-y-4" aria-labelledby="applicant-stage-title">
            <h3 id="applicant-stage-title" class="text-sm font-semibold">Hiring step</h3>
            <div class="space-y-2">
              <Label for="applicant-stage">Move to</Label>
              <SearchSelect
                id="applicant-stage"
                v-model="stage"
                :options="stageOptions"
                placeholder="Select step"
                class="w-full"
                :disabled="isSavingStage"
              />
              <p class="text-xs text-muted-foreground">The applicant is notified of every change.</p>
            </div>
            <div v-if="isRemarksRequired" class="space-y-2">
              <Label for="applicant-remarks">Remarks</Label>
              <Textarea
                id="applicant-remarks"
                v-model="remarks"
                rows="3"
                maxlength="1000"
                placeholder="Tell the applicant why"
                :aria-invalid="!!remarksError"
                :disabled="isSavingStage"
              />
              <p v-if="remarksError" class="text-sm text-destructive">{{ remarksError }}</p>
            </div>
          </section>
        </div>

        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" :disabled="isSavingStage" @click="onDetailOpenChange(false)">Close</Button>
          <Button type="submit" :disabled="isSavingStage || !hasStageChange">
            <Loader2 v-if="isSavingStage" class="size-4 animate-spin" />
            {{ isSavingStage ? 'Saving...' : 'Move applicant' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
</template>
