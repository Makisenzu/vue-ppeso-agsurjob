<script setup lang="ts">
import { toRef } from 'vue'
import { FlexRender } from '@tanstack/vue-table'
import { ArrowLeft, Check, Loader2, RefreshCw, X } from '@lucide/vue'
import GipAccomplishmentDays from '@/components/GipAccomplishmentDays.vue'
import GipAccomplishmentActivities from '@/components/GipAccomplishmentActivities.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { GipInternRecord } from '@/types/peso/provincialPeso/gip'
import { useGipInternAccomplishments } from '@/composables/peso/provincialPeso/useGipInternAccomplishments'

const props = defineProps<{ intern: GipInternRecord | null }>()

const {
  isLoading,
  hasError,
  reload,
  pendingCount,
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
  reportRows,
  draftCount,
  reportTable,
  reportColumns,
  getReportCard,
  getReportSwipeActions,
  selectedReports,
  reviewableSelected,
  clearSelection,
  isBulkReviewDialogOpen,
  isBulkReviewing,
  confirmBulkReview,
  viewedReport,
  reviewingId,
  reportToReturn,
  returnRemarks,
  returnRemarksError,
  closeReturn,
  confirmReturn,
  badgeClass,
  formatPeriod,
  formatDate,
  formatPesoAmount,
} = useGipInternAccomplishments(toRef(props, 'intern'))
</script>

<template>
  <Card class="min-w-0">
    <CardHeader>
      <CardTitle class="flex items-center gap-2 text-base">
        Accomplishments
        <Badge v-if="pendingCount > 0" variant="outline" :class="badgeClass.Submitted">{{ pendingCount }} to review</Badge>
      </CardTitle>
      <CardDescription>The intern's reports by term.</CardDescription>
      <CardAction>
        <Button variant="ghost" size="icon-sm" class="cursor-pointer" aria-label="Refresh reports" title="Refresh" :disabled="isLoading" @click="reload">
          <RefreshCw :class="['size-4', isLoading && 'animate-spin']" />
        </Button>
      </CardAction>
    </CardHeader>

    <CardContent class="grid gap-3">
      <p v-if="hasError" class="text-sm text-destructive">The reports could not be loaded. Use refresh to try again.</p>

      <!-- ═══ Table 1: terms ═══ -->
      <template v-else-if="!selectedTermId">
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
                <TableRow v-for="row in termTable.getRowModel().rows" :key="row.id" class="cursor-pointer" @click="openTerm(row.original.id)">
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
      </template>

      <!-- ═══ Table 2: the open term's reports ═══ -->
      <template v-else>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-w-0">
            <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="showAllTerms">
              <ArrowLeft class="size-4" /> All terms
            </Button>
            <p v-if="selectedTerm" class="truncate text-sm font-medium">
              Term {{ selectedTerm.termNumber }} · {{ selectedTerm.program }} · {{ formatPeriod(selectedTerm.startDate, selectedTerm.endDate) }}
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

        <!-- Bulk: mark the selected reports reviewed -->
        <div
          v-if="selectedReports.length > 0"
          class="flex flex-col gap-2 rounded-md border bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium">{{ selectedReports.length }} selected</span>
            <Button variant="ghost" size="sm" class="cursor-pointer" :disabled="isBulkReviewing" @click="clearSelection">
              <X class="size-4" /> Clear
            </Button>
          </div>
          <span :title="reviewableSelected.length === 0 ? 'Only submitted reports can be marked reviewed' : undefined" class="inline-flex">
            <Button class="cursor-pointer" :disabled="isBulkReviewing || reviewableSelected.length === 0" @click="isBulkReviewDialogOpen = true">
              <Check class="size-4" /> Mark reviewed{{ reviewableSelected.length ? ` (${reviewableSelected.length})` : '' }}
            </Button>
          </span>
        </div>

        <SwipeCardList
          class="md:hidden"
          :items="reportTable.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getReportCard(row.original)"
          :actions="(row) => getReportSwipeActions(row.original)"
          :loading="isLoading && termReports.length === 0"
          primary-tone="primary"
          :is-selected="(row) => row.getIsSelected()"
          :all-selected="reportTable.getIsAllPageRowsSelected() || (reportTable.getIsSomePageRowsSelected() && 'indeterminate')"
          @toggle="(row, value) => row.toggleSelected(value)"
          @toggle-all="(value) => reportTable.toggleAllPageRowsSelected(value)"
        >
          <template #empty>
            <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">
              {{ termReports.length ? 'No reports in this month.' : 'No reports submitted yet.' }}
            </p>
          </template>
        </SwipeCardList>

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
                <TableRow v-for="row in reportTable.getRowModel().rows" :key="row.id" :data-state="row.getIsSelected() ? 'selected' : undefined">
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </template>
              <TableRow v-else>
                <TableCell :colspan="reportColumns.length" class="h-24 text-center text-muted-foreground">
                  {{ termReports.length ? 'No reports in this month.' : 'No reports submitted yet.' }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
            {{ reportRows.length }} report{{ reportRows.length === 1 ? '' : 's' }}
            <template v-if="draftCount"> · {{ draftCount }} draft{{ draftCount === 1 ? '' : 's' }} not submitted</template>
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
    </CardContent>
  </Card>

  <!-- ─── View a report ─── -->
  <Dialog :open="!!viewedReport" @update:open="(open) => { if (!open) viewedReport = null }">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ viewedReport ? formatPeriod(viewedReport.period_start, viewedReport.period_end) : '' }}</DialogTitle>
        <DialogDescription v-if="viewedReport">
          {{ viewedReport.program }} · {{ viewedReport.status }} · Submitted {{ formatDate(viewedReport.submitted_at) }}
        </DialogDescription>
      </DialogHeader>
      <div v-if="viewedReport" class="grid gap-4">
        <GipAccomplishmentActivities v-if="viewedReport.activities.length" :activities="viewedReport.activities" />
        <GipAccomplishmentDays v-if="viewedReport.daily_entries.length" :days="viewedReport.daily_entries" />
        <p v-if="!viewedReport.activities.length && !viewedReport.daily_entries.length" class="text-sm text-muted-foreground">
          This report has no entries.
        </p>
        <div class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <p v-if="viewedReport.program === 'PGAS'" class="sm:col-span-2">
            <span class="text-muted-foreground">Pay:</span>
            ₱{{ formatPesoAmount(viewedReport.amount) || '—' }}
            <span v-if="viewedReport.amount_in_words" class="text-muted-foreground uppercase"> ({{ viewedReport.amount_in_words }})</span>
          </p>
          <p><span class="text-muted-foreground">Supervisor:</span> {{ viewedReport.supervisor_name || '—' }}</p>
          <p><span class="text-muted-foreground">Office head:</span> {{ viewedReport.approver_name || '—' }}</p>
        </div>
        <div v-if="viewedReport.status === 'Returned' && viewedReport.review_remarks" class="border-l-2 border-warning pl-3">
          <p class="text-xs font-semibold text-warning uppercase">Your remarks</p>
          <p class="text-sm text-pretty">{{ viewedReport.review_remarks }}</p>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- ─── Bulk mark reviewed ─── -->
  <AlertDialog v-model:open="isBulkReviewDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Mark {{ reviewableSelected.length }} report{{ reviewableSelected.length === 1 ? '' : 's' }} reviewed?
        </AlertDialogTitle>
        <AlertDialogDescription>
          The intern is notified for each report.
          <template v-if="selectedReports.length > reviewableSelected.length">
            {{ selectedReports.length - reviewableSelected.length }} selected report{{ selectedReports.length - reviewableSelected.length === 1 ? ' is' : 's are' }} not waiting for review and will be left as is.
          </template>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isBulkReviewing">Cancel</AlertDialogCancel>
        <Button class="cursor-pointer" :disabled="isBulkReviewing" @click="confirmBulkReview">
          <Loader2 v-if="isBulkReviewing" class="size-4 animate-spin" />
          {{ isBulkReviewing ? 'Saving...' : 'Mark reviewed' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- ─── Return with remarks (short form → Dialog, DESIGN.md §5.1) ─── -->
  <Dialog :open="!!reportToReturn" @update:open="(open) => { if (!open) closeReturn() }">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Return report</DialogTitle>
        <DialogDescription>
          {{ reportToReturn ? formatPeriod(reportToReturn.period_start, reportToReturn.period_end) : '' }} ·
          the intern sees your remarks, updates the report and submits it again.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-2">
        <Label for="returnRemarks">Remarks</Label>
        <Textarea
          id="returnRemarks"
          v-model="returnRemarks"
          rows="4"
          :aria-invalid="!!returnRemarksError"
          :disabled="reviewingId !== null"
        />
        <p v-if="returnRemarksError" class="text-sm text-destructive">{{ returnRemarksError }}</p>
      </div>
      <DialogFooter>
        <Button variant="outline" class="cursor-pointer" :disabled="reviewingId !== null" @click="closeReturn">Cancel</Button>
        <Button class="cursor-pointer" :disabled="reviewingId !== null" @click="confirmReturn">
          <Loader2 v-if="reviewingId !== null" class="size-4 animate-spin" />
          {{ reviewingId !== null ? 'Returning...' : 'Return report' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
