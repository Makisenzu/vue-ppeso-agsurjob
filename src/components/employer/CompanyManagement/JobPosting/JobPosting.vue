<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { BriefcaseBusiness, Loader2, Plus, Search, ShieldAlert } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import JobVacancyFields from '@/components/JobVacancyFields.vue'
import JobPostingAttachmentsField from '@/components/employer/CompanyManagement/JobPosting/JobPostingAttachmentsField.vue'
import { Separator } from '@/components/ui/separator'
import { useJobPostings } from '@/composables/employer/useJobPostings'

/** Job Posting page (owner only): the company's vacancies, shown to applicants and PESO */
const {
  isCompanyVerified,
  statCards,
  isLoadingStats,
  selectStat,
  searchInput,
  statusFilter,
  statusFilterOptions,
  hasFilters,
  clearFilters,
  table,
  columns,
  rows,
  isLoading,
  getRowCard,
  getRowSwipeActions,
  selectedIds,
  clearSelection,
  rangeLabel,
  pageCount,
  canPreviousPage,
  canNextPage,
  previousPage,
  nextPage,
  postingToDelete,
  isDeleteOpen,
  busyId,
  confirmDelete,
  isBulkDeleteOpen,
  isBulkDeleting,
  confirmBulkDelete,
  isFormOpen,
  isEditMode,
  formTitle,
  isSaving,
  openCreate,
  onFormOpenChange,
  submitPosting,
  attachmentItems,
  attachmentError,
  attachmentRemainingSlots,
  attachmentAccept,
  attachmentMaxSizeMB,
  attachmentMaxFiles,
  addAttachments,
  removeAttachment,
} = useJobPostings()
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-6xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Job Posting</h1>
        <p class="text-sm text-muted-foreground">Post openings and keep their status up to date.</p>
      </div>
      <Button class="h-10 w-full sm:h-9 sm:w-auto" :disabled="!isCompanyVerified" @click="openCreate">
        <Plus class="size-4" />
        Post a job
      </Button>
    </div>

    <Alert v-if="!isCompanyVerified">
      <ShieldAlert />
      <AlertTitle>Waiting for PESO verification</AlertTitle>
      <AlertDescription>You can post jobs once PESO approves your company documents.</AlertDescription>
    </Alert>

    <!-- Stats: click to filter -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <button
        v-for="stat in statCards"
        :key="stat.key"
        type="button"
        class="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        :class="statusFilter === stat.key && stat.key !== 'all' ? 'border-primary' : ''"
        :aria-pressed="statusFilter === stat.key"
        @click="selectStat(stat.key)"
      >
        <p class="text-xs text-muted-foreground">{{ stat.label }}</p>
        <Skeleton v-if="isLoadingStats && stat.value === 0" class="mt-2 h-7 w-10" />
        <p v-else class="mt-1 text-2xl font-semibold tabular-nums">{{ stat.value }}</p>
      </button>
    </div>

    <section class="space-y-4">
      <!-- Toolbar -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div class="relative w-full sm:max-w-xs">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="searchInput" type="search" placeholder="Search position" class="pl-9" aria-label="Search position" />
        </div>
        <SearchSelect
          v-model="statusFilter"
          :options="statusFilterOptions"
          placeholder="All statuses"
          class="w-full sm:w-44"
        />
        <Button v-if="hasFilters" variant="ghost" size="sm" class="h-10 sm:h-8" @click="clearFilters">Clear filters</Button>
      </div>

      <Empty v-if="!isLoading && rows.length === 0" class="rounded-md border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><BriefcaseBusiness /></EmptyMedia>
          <EmptyTitle>{{ hasFilters ? 'No matching postings' : 'No job postings yet' }}</EmptyTitle>
          <EmptyDescription>
            {{ hasFilters ? 'Try another search or status.' : 'Post your first opening to reach applicants.' }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent v-if="!hasFilters && isCompanyVerified">
          <Button @click="openCreate">
            <Plus class="size-4" />
            Post a job
          </Button>
        </EmptyContent>
      </Empty>

      <template v-else>
        <!-- Bulk action bar (DESIGN.md 13.1) -->
        <div
          v-if="selectedIds.length > 0"
          class="flex items-center justify-between gap-4 rounded-md border bg-muted/50 px-4 py-2"
        >
          <span class="text-sm text-muted-foreground">{{ selectedIds.length }} selected</span>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" @click="clearSelection">Clear</Button>
            <Button variant="destructive" size="sm" :disabled="isBulkDeleting" @click="isBulkDeleteOpen = true">
              Delete selected
            </Button>
          </div>
        </div>

        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="md:hidden"
          :items="table.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getRowCard(row.original)"
          :actions="(row) => getRowSwipeActions(row.original)"
          :loading="isLoading && rows.length === 0"
          :is-selected="(row) => row.getIsSelected()"
          :all-selected="table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')"
          @toggle="(row, value) => row.toggleSelected(value)"
          @toggle-all="(value) => table.toggleAllPageRowsSelected(value)"
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
              <template v-if="isLoading && rows.length === 0">
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
                :data-state="row.getIsSelected() ? 'selected' : undefined"
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
  </div>

  <!-- Post / Edit (long form: Sheet, DESIGN.md 5.1) -->
  <Sheet :open="isFormOpen" @update:open="onFormOpenChange">
    <SheetContent class="flex h-full w-full flex-col p-0 sm:max-w-2xl">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>{{ formTitle }}</SheetTitle>
        <SheetDescription>Applicants and PESO see every detail you enter here.</SheetDescription>
      </SheetHeader>

      <form class="contents" @submit="submitPosting">
        <div class="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto px-6 py-4">
          <JobVacancyFields :disabled="isSaving" />
          <Separator />
          <JobPostingAttachmentsField
            :items="attachmentItems"
            :remaining-slots="attachmentRemainingSlots"
            :max-files="attachmentMaxFiles"
            :max-size-mb="attachmentMaxSizeMB"
            :accept="attachmentAccept"
            :error="attachmentError"
            :disabled="isSaving"
            @add="addAttachments"
            @remove="removeAttachment"
          />
        </div>

        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" :disabled="isSaving" @click="onFormOpenChange(false)">Cancel</Button>
          <Button type="submit" :disabled="isSaving">
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            {{ isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Post Job' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>

  <!-- Delete one -->
  <AlertDialog v-model:open="isDeleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete this job posting?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ postingToDelete?.position_title }}</strong> will be removed for
          applicants and from any job fair listing it, with its attachments. This cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="busyId !== null">Cancel</AlertDialogCancel>
        <Button variant="destructive" :disabled="busyId !== null" @click="confirmDelete">
          <Loader2 v-if="busyId !== null" class="size-4 animate-spin" />
          {{ busyId !== null ? 'Deleting...' : 'Delete' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- Delete selected -->
  <AlertDialog v-model:open="isBulkDeleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Delete {{ selectedIds.length }} job posting{{ selectedIds.length === 1 ? '' : 's' }}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          They will be removed for applicants and from any job fair listing them, with their attachments. This cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isBulkDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" :disabled="isBulkDeleting" @click="confirmBulkDelete">
          <Loader2 v-if="isBulkDeleting" class="size-4 animate-spin" />
          {{ isBulkDeleting ? 'Deleting...' : `Delete ${selectedIds.length}` }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
