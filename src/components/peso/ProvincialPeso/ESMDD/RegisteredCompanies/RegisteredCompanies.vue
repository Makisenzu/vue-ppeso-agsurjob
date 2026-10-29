<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Building2, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useRegisteredCompanies } from '@/composables/peso/provincialPeso/useRegisteredCompanies'

const {
  table,
  columns,
  companies,
  isLoading,
  errorMessage,
  statusOptions,
  refreshCompanies,
  getRowCard,
} = useRegisteredCompanies()
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Registered Companies</h1>
      <p class="text-sm text-muted-foreground">
        Company accounts that signed up through the system, with the status of their NSRP Form 2.
      </p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Input
          class="w-full sm:max-w-xs"
          placeholder="Search name or TIN..."
          :model-value="(table.getColumn('company')?.getFilterValue() as string) ?? ''"
          @update:model-value="table.getColumn('company')?.setFilterValue($event)"
        />
        <Select
          :model-value="(table.getColumn('status')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)"
        >
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem v-for="status in statusOptions" :key="status" :value="status">{{ status }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" :disabled="isLoading" @click="refreshCompanies">
        <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Empty State -->
    <Empty v-if="!isLoading && !errorMessage && companies.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>No registered companies yet</EmptyTitle>
        <EmptyDescription>Companies appear here once they sign up for an employer account.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <!-- Data Table -->
    <template v-else>
      <!-- Mobile: cards (DESIGN.md 13.2) -->
      <SwipeCardList
        class="md:hidden"
        :items="table.getRowModel().rows"
        :item-key="(row) => row.id"
        :card="(row) => getRowCard(row.original)"
        :loading="isLoading && companies.length === 0"
      >
        <template #empty>
          <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No companies match the current filters.</p>
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
            <template v-if="isLoading && companies.length === 0">
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
                No companies match the current filters.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          {{ table.getFilteredRowModel().rows.length }} compan{{ table.getFilteredRowModel().rows.length === 1 ? 'y' : 'ies' }}
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
  </div>
</template>
