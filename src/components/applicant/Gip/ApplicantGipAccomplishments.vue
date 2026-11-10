<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { ArrowLeft, CalendarDays, FileText, Loader2, Plus, Trash2, X } from '@lucide/vue'
import AppLink from '@/components/AppLink.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useGipAccomplishments } from '@/composables/applicant/useGipAccomplishments'

const {
  isLoading,
  isEnrolled,
  activeAppointment,
  termNotStarted,
  canAddReport,
  addAccomplishment,
  termTable,
  termColumns,
  termRows,
  getTermCard,
  getTermSwipeActions,
  openTerm,
  selectedTermId,
  selectedTerm,
  showAllTerms,
  monthFilter,
  monthOptions,
  termReports,
  reportTable,
  reportColumns,
  reportRows,
  getReportCard,
  getReportSwipeActions,
  selectedReports,
  clearSelection,
  requestBulkDiscard,
  removableSelectedCount,
  skippedCount,
  reportsToDiscard,
  isDiscardDialogOpen,
  isDiscarding,
  confirmDiscard,
  formatPeriodRange,
  formatDate,
} = useGipAccomplishments()
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Accomplishments</h1>
        <p class="text-sm text-pretty text-muted-foreground">Your accomplishment reports, by appointment term.</p>
      </div>
      <Button v-if="canAddReport" class="cursor-pointer self-start sm:self-auto" @click="addAccomplishment">
        <Plus class="size-4" /> Add Accomplishment
      </Button>
    </div>

    <!-- ─── Not an intern yet ─── -->
    <Card v-if="!isLoading && !isEnrolled">
      <CardContent>
        <Empty class="py-10">
          <EmptyHeader>
            <EmptyTitle>No internship yet</EmptyTitle>
            <EmptyDescription>You can write accomplishment reports once PESO deploys you as a GIP intern.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button as-child size="sm" variant="outline">
              <AppLink :to="{ name: 'gip-my-application' }">View my application</AppLink>
            </Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <template v-else>
      <Alert v-if="!isLoading && !activeAppointment">
        <FileText class="size-4" />
        <AlertTitle>No active term</AlertTitle>
        <AlertDescription>Your appointment term has ended, so new reports can't be written.</AlertDescription>
      </Alert>

      <Alert v-else-if="activeAppointment && termNotStarted">
        <CalendarDays class="size-4" />
        <AlertTitle>Your term hasn't started</AlertTitle>
        <AlertDescription>
          You can add your first report on {{ formatDate(activeAppointment.start_date) }}, the first day of Term {{ activeAppointment.term_number }}.
        </AlertDescription>
      </Alert>

      <!-- ═══ Table 1: terms ═══ -->
      <section v-if="!selectedTermId" aria-labelledby="gip-terms-title" class="flex flex-col gap-3">
        <h2 id="gip-terms-title" class="text-lg font-semibold text-foreground">Terms</h2>

        <!-- Mobile: cards (DESIGN.md 13.2); read-only, so no selection -->
        <SwipeCardList
          class="md:hidden"
          :items="termTable.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getTermCard(row.original)"
          :actions="(row) => getTermSwipeActions(row.original)"
          :loading="isLoading && termRows.length === 0"
          primary-tone="primary"
          hint="Swipe left on a term to see its reports."
        >
          <template #empty>
            <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No terms yet.</p>
          </template>
        </SwipeCardList>

        <!-- Desktop: table -->
        <div class="hidden overflow-x-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow v-for="headerGroup in termTable.getHeaderGroups()" :key="headerGroup.id">
                <TableHead v-for="header in headerGroup.headers" :key="header.id">
                  <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="isLoading && termRows.length === 0">
                <TableRow v-for="i in 2" :key="i">
                  <TableCell v-for="col in termColumns.length" :key="col"><Skeleton class="h-4 w-full" /></TableCell>
                </TableRow>
              </template>
              <template v-else-if="termTable.getRowModel().rows.length">
                <TableRow
                  v-for="row in termTable.getRowModel().rows"
                  :key="row.id"
                  class="cursor-pointer"
                  @click="openTerm(row.original.id)"
                >
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </template>
              <TableRow v-else>
                <TableCell :colspan="termColumns.length" class="h-24 text-center text-muted-foreground">No terms yet.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <!-- ═══ Table 2: the open term's reports ═══ -->
      <section v-else aria-labelledby="gip-reports-title" class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <Button variant="ghost" size="sm" class="-ml-2 w-fit cursor-pointer" @click="showAllTerms">
            <ArrowLeft class="size-4" /> All terms
          </Button>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div class="min-w-0">
              <h2 id="gip-reports-title" class="text-lg font-semibold text-foreground">
                <template v-if="selectedTerm">Term {{ selectedTerm.term_number }} reports</template>
                <template v-else>Reports</template>
              </h2>
              <p v-if="selectedTerm" class="truncate text-sm text-muted-foreground">
                {{ selectedTerm.program }} · {{ selectedTerm.assigned_office }} ·
                {{ formatPeriodRange(selectedTerm.start_date, selectedTerm.end_date) }}
              </p>
            </div>
            <SearchSelect
              v-if="termReports.length"
              v-model="monthFilter"
              :options="monthOptions"
              search-placeholder="Search month..."
              class="w-full sm:w-48"
              aria-label="Filter reports by month"
            />
          </div>
        </div>

        <p v-if="!isLoading && !selectedTerm" class="rounded-md border py-8 text-center text-sm text-muted-foreground">
          This term could not be found.
        </p>

        <template v-else>
          <!-- Bulk remove for the selected reports -->
          <div
            v-if="selectedReports.length > 0"
            class="flex flex-col gap-2 rounded-md border bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium">{{ selectedReports.length }} selected</span>
              <Button variant="ghost" size="sm" class="cursor-pointer" :disabled="isDiscarding" @click="clearSelection">
                <X class="size-4" /> Clear
              </Button>
            </div>
            <!-- The wrapper carries the reason: a disabled button ignores the pointer -->
            <span :title="removableSelectedCount === 0 ? `Reviewed reports can't be removed` : undefined" class="inline-flex">
              <Button
                variant="destructive"
                class="cursor-pointer"
                :disabled="isDiscarding || removableSelectedCount === 0"
                @click="requestBulkDiscard"
              >
                <Trash2 class="size-4" /> Remove{{ removableSelectedCount ? ` (${removableSelectedCount})` : '' }}
              </Button>
            </span>
          </div>

          <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
          <SwipeCardList
            class="md:hidden"
            :items="reportTable.getRowModel().rows"
            :item-key="(row) => row.id"
            :card="(row) => getReportCard(row.original)"
            :actions="(row) => getReportSwipeActions(row.original)"
            :loading="isLoading && termReports.length === 0"
            :is-selected="(row) => row.getIsSelected()"
            :all-selected="reportTable.getIsAllPageRowsSelected() || (reportTable.getIsSomePageRowsSelected() && 'indeterminate')"
            @toggle="(row, value) => row.toggleSelected(value)"
            @toggle-all="(value) => reportTable.toggleAllPageRowsSelected(value)"
          >
            <template #empty>
              <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">
                {{ termReports.length ? 'No reports in this month.' : 'No reports for this term yet.' }}
              </p>
            </template>
          </SwipeCardList>

          <!-- Desktop: table -->
          <div class="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow v-for="headerGroup in reportTable.getHeaderGroups()" :key="headerGroup.id">
                  <TableHead v-for="header in headerGroup.headers" :key="header.id">
                    <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <template v-if="isLoading && termReports.length === 0">
                  <TableRow v-for="i in 3" :key="i">
                    <TableCell v-for="col in reportColumns.length" :key="col"><Skeleton class="h-4 w-full" /></TableCell>
                  </TableRow>
                </template>
                <template v-else-if="reportTable.getRowModel().rows.length">
                  <TableRow
                    v-for="row in reportTable.getRowModel().rows"
                    :key="row.id"
                    :data-state="row.getIsSelected() ? 'selected' : undefined"
                  >
                    <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                      <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                    </TableCell>
                  </TableRow>
                </template>
                <TableRow v-else>
                  <TableCell :colspan="reportColumns.length" class="h-24 text-center text-muted-foreground">
                    {{ termReports.length ? 'No reports in this month.' : 'No reports for this term yet.' }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Pagination -->
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              {{ reportRows.length }} report{{ reportRows.length === 1 ? '' : 's' }}
            </p>
            <div class="flex justify-center gap-2 sm:justify-end">
              <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!reportTable.getCanPreviousPage()" @click="reportTable.previousPage()">
                Previous
              </Button>
              <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!reportTable.getCanNextPage()" @click="reportTable.nextPage()">
                Next
              </Button>
            </div>
          </div>
        </template>
      </section>
    </template>

    <!-- ─── Remove confirmation (one or many) ─── -->
    <AlertDialog v-model:open="isDiscardDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ reportsToDiscard.length === 1 ? 'Remove this report?' : `Remove ${reportsToDiscard.length} reports?` }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="reportsToDiscard.length === 1">
              The report for {{ formatPeriodRange(reportsToDiscard[0]!.period_start, reportsToDiscard[0]!.period_end) }}
              and its attached file will be removed.
            </template>
            <template v-else>The selected reports and their attached files will be removed.</template>
            This can't be undone.
            <template v-if="skippedCount"> {{ skippedCount }} reviewed report{{ skippedCount === 1 ? '' : 's' }} will be kept.</template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDiscarding">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDiscarding" @click="confirmDiscard">
            <Loader2 v-if="isDiscarding" class="size-4 animate-spin" />
            {{ isDiscarding ? 'Removing...' : 'Remove' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
