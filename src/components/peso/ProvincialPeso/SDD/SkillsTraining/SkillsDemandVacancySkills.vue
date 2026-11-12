<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { AlertCircle, X } from '@lucide/vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSkillsDemandVacancy } from '@/composables/peso/provincialPeso/useSkillsDemandVacancy'
import { vacancyStatusBadgeClass, vacancyStatusLabel } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'

const {
  vacancy,
  vacancyDetails,
  rows,
  stats,
  isLoading,
  loadError,
  hasNarrowing,
  clearNarrowing,
  clearVacancy,
  table,
  columns,
  getCard,
  getSwipeActions,
  viewSkill,
} = useSkillsDemandVacancy()
</script>

<template>
  <div class="grid gap-0">
    <!-- The picked vacancy -->
    <div class="flex items-start justify-between gap-3 border-b px-4 py-3">
      <div class="flex min-w-0 items-start gap-2.5">
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-2">
            <p class="truncate text-sm font-semibold">{{ vacancy?.position_title ?? 'Job vacancy' }}</p>
            <Badge v-if="vacancy" variant="outline" :class="['shrink-0', vacancyStatusBadgeClass(vacancy.is_open)]">
              {{ vacancyStatusLabel(vacancy.is_open) }}
            </Badge>
          </div>
          <p class="text-xs text-muted-foreground">{{ vacancyDetails }}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" class="shrink-0 cursor-pointer" @click="clearVacancy">
        <X class="size-4 shrink-0" />
        All skills
      </Button>
    </div>

    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 border-b px-4 py-3 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label">
        <dt class="text-xs text-muted-foreground">{{ stat.label }}</dt>
        <dd class="text-lg font-bold tabular-nums">{{ stat.value.toLocaleString() }}</dd>
      </div>
    </dl>

    <Alert v-if="loadError" variant="destructive" class="m-4 w-auto">
      <AlertCircle />
      <AlertTitle>Couldn't load the vacancy's skills</AlertTitle>
      <AlertDescription>{{ loadError }}</AlertDescription>
    </Alert>

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
          {{ hasNarrowing ? 'No skills of this vacancy match your filters.' : 'This vacancy lists no skill from the Skill List.' }}
        </p>
      </template>
    </SwipeCardList>

    <!-- Desktop: table -->
    <div class="hidden overflow-x-auto md:block">
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
              <template v-if="hasNarrowing">
                No skills of this vacancy match your filters.
                <Button variant="link" size="sm" class="cursor-pointer" @click="clearNarrowing">Clear filters</Button>
              </template>
              <template v-else>This vacancy lists no skill from the Skill List.</template>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <p class="border-t px-4 py-3 text-xs text-muted-foreground">
      Demand: slots. Supply: jobseekers in {{ vacancy?.place ?? 'its municipality' }} with the skill. Surplus: supply left after the slots.
    </p>
  </div>
</template>
