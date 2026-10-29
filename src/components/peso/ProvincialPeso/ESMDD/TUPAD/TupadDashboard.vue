<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Layers, Loader2, Plus, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import TupadBatchDialog from '@/components/peso/ProvincialPeso/ESMDD/TUPAD/TupadBatchDialog.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { useTupadBatches } from '@/composables/peso/provincialPeso/useTupadBatches'

const {
  table,
  columns,
  batches,
  stats,
  isLoading,
  errorMessage,
  batchToDelete,
  isDeleting,
  isDeleteDialogOpen,
  statusOptions,
  refresh,
  openApplicants,
  openCreateBatch,
  confirmDelete,
  getRowSwipeActions,
  getRowCard,
} = useTupadBatches()
</script>

<template>
  <div class="w-full min-w-0 space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-2xl space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">TUPAD</h1>
        <p class="text-sm text-muted-foreground">
          Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers (Tupad) monitoring and management dashboard.
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="outline" @click="openApplicants">View Applicants</Button>
        <Button @click="openCreateBatch">
          <Plus class="size-4 shrink-0" />
          Create Batch
        </Button>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Applicants</CardDescription>
          <CardTitle class="text-3xl font-semibold tabular-nums">{{ stats.applicants }}</CardTitle>
          <p class="text-xs text-muted-foreground">{{ stats.pendingApplicants }} pending review</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Batches</CardDescription>
          <CardTitle class="text-3xl font-semibold tabular-nums">{{ stats.batches }}</CardTitle>
          <p class="text-xs text-muted-foreground">all EDL numbers</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Open Batches</CardDescription>
          <CardTitle class="text-3xl font-semibold tabular-nums">{{ stats.openBatches }}</CardTitle>
          <p class="text-xs text-muted-foreground">pending or ongoing</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Beneficiaries</CardDescription>
          <CardTitle class="text-3xl font-semibold tabular-nums">{{ stats.engaged }}</CardTitle>
          <p class="text-xs text-muted-foreground">across all batches</p>
        </CardHeader>
      </Card>
    </div>

    <!-- Batches -->
    <section class="space-y-4">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            class="w-full sm:max-w-xs"
            placeholder="Search EDL number..."
            :model-value="(table.getColumn('edl_number')?.getFilterValue() as string) ?? ''"
            @update:model-value="table.getColumn('edl_number')?.setFilterValue($event)"
          />
          <SearchSelect
            :model-value="(table.getColumn('status')?.getFilterValue() as string) ?? 'all'"
            @update:model-value="(val) => table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)"
            :options="[{ value: 'all', label: 'All Statuses' }, ...statusOptions]"
            placeholder="Status"
            class="w-full sm:w-40"
          />
        </div>

        <Button variant="outline" :disabled="isLoading" @click="refresh">
          <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div
        v-if="errorMessage"
        class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
      >
        {{ errorMessage }}
      </div>

      <Empty v-if="!isLoading && !errorMessage && batches.length === 0" class="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Layers />
          </EmptyMedia>
          <EmptyTitle>No TUPAD batches yet</EmptyTitle>
          <EmptyDescription>Create a batch with its EDL number, then add beneficiaries from the TUPAD applicants.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button @click="openCreateBatch">
            <Plus class="size-4" />
            Create Batch
          </Button>
        </EmptyContent>
      </Empty>

      <template v-else>
        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="md:hidden"
          :items="table.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getRowCard(row.original)"
          :actions="(row) => getRowSwipeActions(row.original)"
          :loading="isLoading && batches.length === 0"
        >
          <template #empty>
            <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No batches match the current filters.</p>
          </template>
        </SwipeCardList>

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
              <template v-if="isLoading && batches.length === 0">
                <TableRow v-for="i in 5" :key="i">
                  <TableCell v-for="col in columns.length" :key="col">
                    <Skeleton class="h-4 w-full" />
                  </TableCell>
                </TableRow>
              </template>

              <template v-else-if="table.getRowModel().rows.length">
                <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </template>

              <TableRow v-else>
                <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
                  No batches match the current filters.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
            {{ table.getFilteredRowModel().rows.length }} batch(es)
          </p>
          <div class="flex justify-center gap-2 sm:justify-end">
            <Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
              Previous
            </Button>
            <Button variant="outline" size="sm" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
              Next
            </Button>
          </div>
        </div>
      </template>
    </section>
  </div>

  <TupadBatchDialog />

  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete TUPAD batch?</AlertDialogTitle>
        <AlertDialogDescription>
          Batch <strong class="font-medium text-foreground">{{ batchToDelete?.edl_number }}</strong>
          <template v-if="batchToDelete?.member_count">
            and its {{ batchToDelete.member_count }} beneficiary record(s)
          </template>
          will be deleted, along with their daily attachments. They stay in the TUPAD applicant list. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Deleting...' : 'Delete Batch' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
