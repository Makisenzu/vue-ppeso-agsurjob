<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { AlertCircle, ArrowLeft, Download, Loader2, Printer, RefreshCw, Search, Trash2, X } from '@lucide/vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useGipAppointmentRecords } from '@/composables/peso/provincialPeso/useGipAppointmentRecords'

const {
  records,
  filteredRecords,
  isLoading,
  loadError,
  load,
  searchQuery,
  programFilter,
  programFilterOptions,
  hasFilters,
  clearFilters,
  table,
  columns,
  selectedRecords,
  clearSelection,
  getRecordCard,
  getRecordSwipeActions,
  generatingId,
  generate,
  viewedRecord,
  isViewOpen,
  pendingDelete,
  isDeleteDialogOpen,
  isDeleting,
  requestDelete,
  confirmDelete,
  formatRate,
  formatDisplayDateTime,
  programBadgeClass,
  goBack,
} = useGipAppointmentRecords()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
          <ArrowLeft class="size-4 shrink-0" />
          Back to Interns
        </Button>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Appointments</h1>
        <p class="text-sm text-muted-foreground">Saved appointment records.</p>
      </div>
      <Button variant="outline" size="sm" class="self-start cursor-pointer sm:self-auto" :disabled="isLoading" @click="load">
        <RefreshCw :class="['size-4 shrink-0', isLoading && 'animate-spin']" />
        Refresh
      </Button>
    </div>

    <Alert v-if="loadError" variant="destructive">
      <AlertCircle />
      <AlertTitle>Couldn't load the records</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
    </Alert>

    <Card class="gap-0 py-0">
      <CardHeader class="gap-3 border-b py-4 [.border-b]:pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative flex-1">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search intern, address, office, fund..."
              class="pr-9 pl-8"
              aria-label="Search appointment records"
            />
            <Button
              v-if="searchQuery"
              variant="ghost"
              size="icon"
              class="absolute top-1/2 right-1 size-7 -translate-y-1/2 cursor-pointer"
              aria-label="Clear search"
              @click="searchQuery = ''"
            >
              <X class="size-4 shrink-0" />
            </Button>
          </div>
          <SearchSelect
            v-model="programFilter"
            :options="programFilterOptions"
            size="sm"
            class="w-full sm:w-44"
            aria-label="Filter by program"
          />
        </div>
      </CardHeader>

      <CardContent class="grid gap-4 p-4">
        <!-- Bulk delete -->
        <div
          v-if="selectedRecords.length > 0"
          class="flex flex-col gap-2 rounded-md border bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium">{{ selectedRecords.length }} selected</span>
            <Button variant="ghost" size="sm" class="cursor-pointer" :disabled="isDeleting" @click="clearSelection">
              <X class="size-4" /> Clear
            </Button>
          </div>
          <Button variant="destructive" size="sm" class="cursor-pointer" :disabled="isDeleting" @click="requestDelete(selectedRecords)">
            <Trash2 class="size-4" /> Delete Selected ({{ selectedRecords.length }})
          </Button>
        </div>

        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="md:hidden"
          :items="table.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getRecordCard(row.original)"
          :actions="(row) => getRecordSwipeActions(row.original)"
          :loading="isLoading && records.length === 0"
          :is-selected="(row) => row.getIsSelected()"
          :all-selected="table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')"
          @toggle="(row, value) => row.toggleSelected(value)"
          @toggle-all="(value) => table.toggleAllPageRowsSelected(value)"
        >
          <template #empty>
            <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">
              {{ records.length ? 'No records match your search.' : 'No saved appointment records yet.' }}
            </p>
          </template>
        </SwipeCardList>

        <!-- Desktop: table -->
        <div class="hidden overflow-x-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                <TableHead v-for="header in headerGroup.headers" :key="header.id">
                  <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="isLoading && records.length === 0">
                <TableRow v-for="i in 3" :key="i">
                  <TableCell v-for="col in columns.length" :key="col"><Skeleton class="h-4 w-full" /></TableCell>
                </TableRow>
              </template>
              <template v-else-if="table.getRowModel().rows.length">
                <TableRow v-for="row in table.getRowModel().rows" :key="row.id" :data-state="row.getIsSelected() ? 'selected' : undefined">
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </template>
              <TableRow v-else>
                <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
                  <template v-if="records.length">
                    No records match your search.
                    <Button v-if="hasFilters" variant="link" size="sm" class="cursor-pointer" @click="clearFilters">Clear filters</Button>
                  </template>
                  <template v-else>No saved appointment records yet. Save one from the Appointment Record after deploying interns.</template>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
            {{ filteredRecords.length }} record{{ filteredRecords.length === 1 ? '' : 's' }}
          </p>
          <div class="flex justify-center gap-2 sm:justify-end">
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
              Previous
            </Button>
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ─── View a saved record ─── -->
    <Dialog v-model:open="isViewOpen">
      <DialogContent v-if="viewedRecord" class="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <div class="flex items-center justify-between gap-2 pr-8">
            <DialogTitle class="flex flex-wrap items-center gap-2">
              Appointment Record
              <Badge variant="outline" :class="programBadgeClass[viewedRecord.program]">
                {{ viewedRecord.program === 'Mixed' ? 'PGAS + DOLE' : viewedRecord.program }}
              </Badge>
            </DialogTitle>
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                class="size-8 cursor-pointer"
                title="Print"
                aria-label="Print"
                :disabled="!!generatingId"
                @click="generate(viewedRecord, 'print')"
              >
                <Loader2 v-if="generatingId === viewedRecord.id" class="size-4 shrink-0 animate-spin" />
                <Printer v-else class="size-4 shrink-0" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="size-8 cursor-pointer"
                title="Download PDF"
                aria-label="Download PDF"
                :disabled="!!generatingId"
                @click="generate(viewedRecord, 'download')"
              >
                <Loader2 v-if="generatingId === viewedRecord.id" class="size-4 shrink-0 animate-spin" />
                <Download v-else class="size-4 shrink-0" />
              </Button>
            </div>
          </div>
          <DialogDescription>
            Saved {{ formatDisplayDateTime(viewedRecord.created_at) }} · {{ viewedRecord.intern_count }}
            intern{{ viewedRecord.intern_count === 1 ? '' : 's' }}
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-4">
          <div class="grid gap-1 text-sm sm:grid-cols-2">
            <p><span class="text-muted-foreground">Source of funds:</span> {{ viewedRecord.source_of_funds }}</p>
            <p><span class="text-muted-foreground">Designation:</span> {{ viewedRecord.designation }}</p>
          </div>

          <div class="max-h-72 overflow-auto rounded-md border">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 text-left font-medium">No.</th>
                  <th class="px-3 py-2 text-left font-medium">Name</th>
                  <th class="hidden px-3 py-2 text-left font-medium sm:table-cell">Address</th>
                  <th class="px-3 py-2 text-right font-medium">Rate</th>
                  <th class="px-3 py-2 text-left font-medium">Period</th>
                  <th class="hidden px-3 py-2 text-left font-medium md:table-cell">Area of assignment</th>
                  <th class="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(entry, index) in viewedRecord.entries" :key="`${entry.internId}-${index}`" class="border-t">
                  <td class="px-3 py-2 tabular-nums text-muted-foreground">{{ index + 1 }}</td>
                  <td class="px-3 py-2 font-medium">{{ entry.name }}</td>
                  <td class="hidden px-3 py-2 text-muted-foreground sm:table-cell">{{ entry.address }}</td>
                  <td class="px-3 py-2 text-right tabular-nums">{{ formatRate(entry.rate) }}</td>
                  <td class="px-3 py-2 text-xs whitespace-nowrap">{{ entry.periodStart }} –<br>{{ entry.periodEnd }}</td>
                  <td class="hidden px-3 py-2 text-muted-foreground md:table-cell">{{ entry.areaOfAssignment }}</td>
                  <td class="px-3 py-2 text-xs whitespace-nowrap">{{ entry.currentStatus }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="grid gap-3 text-sm sm:grid-cols-4">
            <div v-for="signatory in viewedRecord.signatories" :key="signatory.label">
              <p class="text-xs text-muted-foreground">{{ signatory.label }}</p>
              <p class="font-semibold uppercase">{{ signatory.name }}</p>
              <p class="text-xs">{{ signatory.position }}</p>
            </div>
          </div>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="outline" class="cursor-pointer" :disabled="isDeleting" @click="requestDelete([viewedRecord])">
            <Trash2 class="size-4 shrink-0" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── Delete confirmation (one or many) ─── -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {{ pendingDelete.length === 1 ? 'this appointment record' : `${pendingDelete.length} appointment records` }}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Only the saved record{{ pendingDelete.length === 1 ? ' is' : 's are' }} removed. The interns and their appointments stay. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
            <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
