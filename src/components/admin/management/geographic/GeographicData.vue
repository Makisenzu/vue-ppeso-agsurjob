<script setup lang="ts">
import { Eye, RefreshCw } from '@lucide/vue'

import MapboxMap from './MapboxMap.vue'
import { useGeographicMap } from '@/composables/admin/useGeographicMap'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const {
  municipalityRows,
  isLoading,
  selectMunicipality,
  refreshRecords,
  selectedProvince,
  selectedMunicipality,
} = useGeographicMap()
</script>

<template>
  <div class="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Geographic Data</h1>
        <p class="text-sm text-muted-foreground">
          View municipalities, barangay counts, and total users across Agusan del Sur.
        </p>
      </div>

      <Button variant="outline" :disabled="isLoading" @click="refreshRecords">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
        <span class="ml-2">Refresh</span>
      </Button>
    </div>

    <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div class="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
        <div class="shrink-0 border-b px-4 py-3">
          <h2 class="text-base font-semibold">Summary</h2>
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader class="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Municipality</TableHead>
                <TableHead class="text-right">Barangays</TableHead>
                <TableHead class="text-right">Users</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">
                  Loading municipality data...
                </TableCell>
              </TableRow>

              <template v-else-if="municipalityRows.length">
                <TableRow v-for="row in municipalityRows" :key="row.name">
                  <TableCell class="font-medium">{{ row.name }}</TableCell>
                  <TableCell class="text-right">{{ row.barangays }}</TableCell>
                  <TableCell class="text-right">{{ row.users }}</TableCell>
                  <TableCell class="text-right">
                    <Button size="sm" variant="ghost" @click="selectMunicipality(row.name)">
                      <Eye class="h-4 w-4" />
                      <span class="ml-2">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <TableRow v-else>
                <TableCell colspan="4" class="h-24 text-center text-muted-foreground">
                  No municipality data available.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div class="min-h-0 w-full overflow-hidden">
        <MapboxMap
          height-class="h-full"
          :selected-province="selectedProvince"
          :selected-municipality="selectedMunicipality"
        />
      </div>
    </div>
  </div>
</template>