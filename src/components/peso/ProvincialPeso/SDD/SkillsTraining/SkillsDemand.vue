<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { AlertCircle, ArrowLeft, Info, RefreshCw, Search, X } from '@lucide/vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSkillsDemand } from '@/composables/peso/provincialPeso/useSkillsDemand'

const {
  rows,
  filters,
  summary,
  stats,
  isLoading,
  loadError,
  reload,
  municipalityOptions,
  categoryOptions,
  supplyOptions,
  gapOptions,
  gapModel,
  hasFilters,
  clearFilters,
  table,
  columns,
  canPrevious,
  canNext,
  previousPage,
  nextPage,
  rangeLabel,
  getCard,
  getSwipeActions,
  viewSkill,
  goToTrainings,
  goToSkillList,
} = useSkillsDemand()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goToTrainings">
          <ArrowLeft class="size-4 shrink-0" />
          Trainings Conducted
        </Button>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Skills Demand</h1>
        <p class="text-sm text-muted-foreground">Vacancy skill demand versus jobseeker supply.</p>
      </div>
      <Button variant="outline" size="sm" class="cursor-pointer self-start sm:self-auto" :disabled="isLoading" @click="reload">
        <RefreshCw :class="['size-4 shrink-0', isLoading && 'animate-spin']" />
        Refresh
      </Button>
    </div>

    <Alert v-if="loadError" variant="destructive">
      <AlertCircle />
      <AlertTitle>Couldn't load the skills demand</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
    </Alert>

    <!-- Vacancy skills that aren't on the Skill List can't be counted -->
    <Alert v-if="summary.unlinked_wordings > 0">
      <Info />
      <AlertTitle>
        {{ summary.unlinked_wordings.toLocaleString() }} required skill{{ summary.unlinked_wordings === 1 ? '' : 's' }} not counted
      </AlertTitle>
      <AlertDescription>
        <p>Employers typed {{ summary.unlinked_wordings === 1 ? 'a wording that is' : 'wordings that are' }} not on the Skill List yet.</p>
        <Button variant="outline" size="sm" class="mt-2 cursor-pointer" @click="goToSkillList">Review in Skill List</Button>
      </AlertDescription>
    </Alert>

    <!-- ─── Totals ─── -->
    <dl class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card v-for="stat in stats" :key="stat.label" class="py-4">
        <CardContent class="px-4">
          <dt class="text-xs text-muted-foreground sm:text-sm">{{ stat.label }}</dt>
          <dd class="text-2xl font-bold tabular-nums">{{ stat.value.toLocaleString() }}</dd>
        </CardContent>
      </Card>
    </dl>

    <Card class="gap-0 py-0">
      <CardHeader class="gap-3 border-b py-4 [.border-b]:pb-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div class="relative sm:col-span-2">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="filters.search" placeholder="Search skill..." class="pr-9 pl-8" aria-label="Search skills" />
            <Button
              v-if="filters.search"
              variant="ghost"
              size="icon"
              class="absolute top-1/2 right-1 size-7 -translate-y-1/2 cursor-pointer"
              aria-label="Clear search"
              @click="filters.search = ''"
            >
              <X class="size-4 shrink-0" />
            </Button>
          </div>
          <SearchSelect v-model="filters.municipality" :options="municipalityOptions" class="w-full" aria-label="Filter by municipality" />
          <SearchSelect v-model="filters.category" :options="categoryOptions" class="w-full" aria-label="Filter by skill category" />
          <SearchSelect v-model="filters.supply" :options="supplyOptions" class="w-full" aria-label="Who counts as supply" />
          <SearchSelect v-model="gapModel" :options="gapOptions" class="w-full" aria-label="Show all skills or only gaps" />
        </div>
      </CardHeader>

      <CardContent class="grid gap-0 p-0">
        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="m-4 md:hidden"
          :items="table.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getCard(row.original)"
          :actions="(row) => getSwipeActions(row.original)"
          :loading="isLoading && rows.length === 0"
          primary-tone="primary"
        >
          <template #empty>
            <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">
              {{ hasFilters ? 'No skills match your filters.' : 'No open vacancy lists a required skill yet.' }}
            </p>
          </template>
        </SwipeCardList>

        <!-- Desktop: table -->
        <div class="hidden overflow-x-auto border-b md:block">
          <Table>
            <TableHeader>
              <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                <TableHead v-for="header in headerGroup.headers" :key="header.id">
                  <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="isLoading && rows.length === 0">
                <TableRow v-for="i in 3" :key="i">
                  <TableCell v-for="col in columns.length" :key="col"><Skeleton class="h-4 w-full" /></TableCell>
                </TableRow>
              </template>
              <template v-else-if="table.getRowModel().rows.length">
                <TableRow v-for="row in table.getRowModel().rows" :key="row.id" class="cursor-pointer" @click="viewSkill(row.original)">
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </template>
              <TableRow v-else>
                <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
                  <template v-if="hasFilters">
                    No skills match your filters.
                    <Button variant="link" size="sm" class="cursor-pointer" @click="clearFilters">Clear filters</Button>
                  </template>
                  <template v-else>No open vacancy lists a required skill yet.</template>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="flex flex-col-reverse gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between md:pt-4">
          <p class="text-center text-xs text-muted-foreground tabular-nums sm:text-left sm:text-sm">{{ rangeLabel }}</p>
          <div class="flex justify-center gap-2 sm:justify-end">
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canPrevious || isLoading" @click="previousPage">Previous</Button>
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canNext || isLoading" @click="nextPage">Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
