<script setup lang="ts">
import { computed } from 'vue'
import { Eye, RefreshCw, Search, X, Info, MapPin } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import SkillMapboxMap from './SkillMapboxMap.vue'
import { useSkillRepository } from '@/composables/peso/provincialPeso/useSkillRepository'

const {
  agusanMunicipalityRows,
  outsideMunicipalityRows,
  filteredAgusanMunicipalityRows,
  filteredOutsideMunicipalityRows,
  stats,
  isLoading,
  selectedMunicipality,
  selectedSkillFilter,
  searchQuery,
  allSkillsList,
  activeTab,
  refreshRecords,
  gotoMunicipality,
  selectMunicipality,
  selectSkillFilter,
  setActiveTab,
  clearFilters,
} = useSkillRepository()

const hasActiveFilters = computed(
  () => Boolean(searchQuery.value) || Boolean(selectedSkillFilter.value) || Boolean(selectedMunicipality.value)
)

const currentDisplayRows = computed(() => {
  return activeTab.value === 'agusan'
    ? filteredAgusanMunicipalityRows.value
    : filteredOutsideMunicipalityRows.value
})

const hasAlternativeMatches = computed(() => {
  if (currentDisplayRows.value.length > 0) return false
  if (activeTab.value === 'agusan') {
    return filteredOutsideMunicipalityRows.value.length > 0
  } else {
    return filteredAgusanMunicipalityRows.value.length > 0
  }
})

const alternativeMatchesCount = computed(() => {
  if (activeTab.value === 'agusan') {
    return filteredOutsideMunicipalityRows.value.length
  } else {
    return filteredAgusanMunicipalityRows.value.length
  }
})
</script>

<template>
  <div class="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Skills Repository</h1>
          <Badge variant="secondary" class="font-mono text-xs">Agusan del Sur</Badge>
          <Badge
            v-if="outsideMunicipalityRows.length > 0"
            variant="outline"
            class="text-[11px] font-mono text-amber-700 border-amber-500/30 bg-amber-500/10 dark:text-amber-300"
          >
            +{{ outsideMunicipalityRows.length }} Outside LGUs
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          View municipalities, applicant counts, LPII terrain classifications, and regional skill inventories across Agusan del Sur and external origin areas.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button variant="outline" :disabled="isLoading" @click="refreshRecords">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          <span class="ml-2">Refresh</span>
        </Button>
      </div>
    </div>

    <!-- Quick Metrics Strip -->
    <div v-if="stats" class="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
      <div class="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-2xs">
        <div>
          <p class="text-[11px] font-medium text-muted-foreground">Total Applicants</p>
          <p class="text-base font-bold text-foreground">{{ stats.totalApplicants }}</p>
          <p v-if="stats.outsideApplicants > 0" class="text-[10px] text-muted-foreground">
            {{ stats.agusanApplicants }} in Agusan • {{ stats.outsideApplicants }} outside
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-2xs">
        <div>
          <p class="text-[11px] font-medium text-muted-foreground">Lowland Applicants</p>
          <p class="text-base font-bold text-emerald-600 dark:text-emerald-400">
            {{ stats.lowlandApplicants }}
          </p>
          <p class="text-[10px] text-muted-foreground">Agusan del Sur LPII</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-2xs">
        <div>
          <p class="text-[11px] font-medium text-muted-foreground">Upland Applicants</p>
          <p class="text-base font-bold text-amber-600 dark:text-amber-400">
            {{ stats.uplandApplicants }}
          </p>
          <p class="text-[10px] text-muted-foreground">Agusan del Sur LPII</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-2xs">
        <div>
          <p class="text-[11px] font-medium text-muted-foreground">Wetland Applicants</p>
          <p class="text-base font-bold text-sky-600 dark:text-sky-400">
            {{ stats.wetlandApplicants }}
          </p>
          <p class="text-[10px] text-muted-foreground">Agusan del Sur LPII</p>
        </div>
      </div>

      <div class="col-span-2 sm:col-span-1 flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-2xs">
        <div>
          <p class="text-[11px] font-medium text-muted-foreground">Unique Skills</p>
          <p class="text-base font-bold text-foreground">{{ stats.totalUniqueSkills }}</p>
          <p class="text-[10px] text-muted-foreground">Repository wide</p>
        </div>
      </div>
    </div>

    <!-- Main Grid: Summary Table + Mapbox Map -->
    <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
      <!-- Left Column: Municipality Summary Card -->
      <div class="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-xs">
        <!-- Card Header with Segmented Tabs, Search & Filter -->
        <div class="shrink-0 border-b px-4 py-3 space-y-3">
          <!-- Segmented Tab Navigation: Agusan del Sur vs Outside Agusan -->
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="inline-flex items-center rounded-lg bg-muted p-1 text-xs">
              <button
                type="button"
                :class="[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition cursor-pointer',
                  activeTab === 'agusan'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                ]"
                @click="setActiveTab('agusan')"
              >
                <span>Agusan del Sur</span>
                <Badge
                  :variant="activeTab === 'agusan' ? 'default' : 'secondary'"
                  class="h-4 px-1.5 text-[10px] font-bold"
                >
                  {{ agusanMunicipalityRows.length }}
                </Badge>
              </button>

              <button
                type="button"
                :class="[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition cursor-pointer',
                  activeTab === 'outside'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                ]"
                @click="setActiveTab('outside')"
              >
                <span>Outside Agusan</span>
                <Badge
                  :variant="activeTab === 'outside' ? 'default' : 'secondary'"
                  class="h-4 px-1.5 text-[10px] font-bold"
                  :class="{ 'bg-amber-500/20 text-amber-700 dark:text-amber-300': activeTab !== 'outside' && outsideMunicipalityRows.length > 0 }"
                >
                  {{ outsideMunicipalityRows.length }}
                </Badge>
              </button>
            </div>

            <span class="text-xs text-muted-foreground">
              {{ currentDisplayRows.length }} {{ activeTab === 'agusan' ? 'Municipalities' : 'Outside LGUs' }}
            </span>
          </div>

          <!-- Search & Filter Controls -->
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <!-- Search bar -->
            <div class="relative">
              <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                :placeholder="activeTab === 'agusan' ? 'Search municipality or skill...' : 'Search outside municipality, province, skill...'"
                class="h-8 pl-8 pr-7 text-xs"
              />
              <button
                v-if="searchQuery"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                @click="searchQuery = ''"
              >
                <X class="size-3.5" />
              </button>
            </div>

            <!-- Skill filter dropdown -->
            <div class="flex items-center gap-1.5">
              <NativeSelect v-model="selectedSkillFilter" class="h-8 text-xs w-full">
                <NativeSelectOption value="">All Skills</NativeSelectOption>
                <NativeSelectOption
                  v-for="skill in allSkillsList"
                  :key="skill.name"
                  :value="skill.name"
                >
                  {{ skill.name }} ({{ skill.count }})
                </NativeSelectOption>
              </NativeSelect>

              <Button
                v-if="hasActiveFilters"
                variant="ghost"
                size="sm"
                class="h-8 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                @click="clearFilters"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <!-- Outside Province Scope Notice Banner -->
        <div
          v-if="activeTab === 'outside'"
          class="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 flex items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2">
            <MapPin class="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Applicants registered from other provinces/cities. LPII ecological zone tagging applies strictly to Agusan del Sur territory.
            </span>
          </div>
          <Badge variant="outline" class="shrink-0 text-[10px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-300">
            {{ stats?.outsideApplicants ?? 0 }} Registered
          </Badge>
        </div>

        <!-- Table Container -->
        <div class="min-h-0 flex-1 overflow-auto">
          <!-- ─── Table 1: Agusan del Sur Municipalities ─── -->
          <Table v-if="activeTab === 'agusan'">
            <TableHeader class="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Municipality</TableHead>
                <TableHead class="text-right">Barangays</TableHead>
                <TableHead class="text-right">Applicants</TableHead>
                <TableHead class="text-center">Lowland</TableHead>
                <TableHead class="text-center">Upland</TableHead>
                <TableHead class="text-center">Wetland</TableHead>
                <TableHead>Top Skills</TableHead>
                <TableHead class="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell colspan="8" class="h-32 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <RefreshCw class="size-5 animate-spin text-muted-foreground" />
                    <span>Loading municipality skills repository data...</span>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="currentDisplayRows.length">
                <TableRow
                  v-for="row in currentDisplayRows"
                  :key="row.name"
                  :class="[
                    'cursor-pointer transition-colors',
                    selectedMunicipality === row.name ? 'bg-primary/5 dark:bg-primary/10' : '',
                  ]"
                  @click="selectMunicipality(row.name)"
                >
                  <TableCell class="font-medium whitespace-nowrap">
                    {{ row.name }}
                  </TableCell>
                  <TableCell class="text-right tabular-nums text-muted-foreground">
                    {{ row.barangays }}
                  </TableCell>
                  <TableCell class="text-right font-bold tabular-nums text-foreground">
                    {{ row.totalApplicants }}
                  </TableCell>
                  <TableCell class="text-center tabular-nums">
                    <span
                      v-if="row.lowlandApplicants > 0"
                      class="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      <span class="size-1.5 rounded-full bg-emerald-500"></span>
                      {{ row.lowlandApplicants }}
                    </span>
                    <span v-else class="text-muted-foreground/60">—</span>
                  </TableCell>
                  <TableCell class="text-center tabular-nums">
                    <span
                      v-if="row.uplandApplicants > 0"
                      class="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400"
                    >
                      <span class="size-1.5 rounded-full bg-amber-500"></span>
                      {{ row.uplandApplicants }}
                    </span>
                    <span v-else class="text-muted-foreground/60">—</span>
                  </TableCell>
                  <TableCell class="text-center tabular-nums">
                    <span
                      v-if="row.wetlandApplicants > 0"
                      class="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400"
                    >
                      <span class="size-1.5 rounded-full bg-sky-500"></span>
                      {{ row.wetlandApplicants }}
                    </span>
                    <span v-else class="text-muted-foreground/60">—</span>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-wrap items-center gap-1 max-w-50">
                      <Badge
                        v-for="skill in row.topSkills.slice(0, 2)"
                        :key="skill.name"
                        variant="secondary"
                        class="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition"
                        @click.stop="selectSkillFilter(skill.name)"
                      >
                        {{ skill.name }} ({{ skill.count }})
                      </Badge>
                      <span
                        v-if="row.allSkills.length > 2"
                        class="text-[10px] text-muted-foreground whitespace-nowrap"
                      >
                        +{{ row.allSkills.length - 2 }} more
                      </span>
                      <span
                        v-if="row.topSkills.length === 0"
                        class="text-[11px] text-muted-foreground italic"
                      >
                        None
                      </span>
                    </div>
                  </TableCell>
                  <TableCell class="text-center" @click.stop>
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-8 px-2.5"
                      @click="gotoMunicipality(row.name)"
                    >
                      <Eye class="h-4 w-4" />
                      <span class="ml-1.5 text-xs">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <TableRow v-else>
                <TableCell colspan="8" class="h-32 text-center text-muted-foreground">
                  <div v-if="hasAlternativeMatches" class="flex flex-col items-center justify-center gap-2 p-3">
                    <p class="text-sm">
                      No Agusan del Sur municipalities matched your filter.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      class="text-xs h-8 gap-1.5 cursor-pointer"
                      @click="setActiveTab('outside')"
                    >
                      <span>Switch to Outside Agusan ({{ alternativeMatchesCount }} {{ alternativeMatchesCount === 1 ? 'match' : 'matches' }})</span>
                    </Button>
                  </div>
                  <div v-else>
                    No Agusan del Sur municipality data found matching your query.
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- ─── Table 2: Outside Agusan del Sur Municipalities ─── -->
          <Table v-else>
            <TableHeader class="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Municipality / City</TableHead>
                <TableHead>Province / Origin</TableHead>
                <TableHead class="text-right">Applicants</TableHead>
                <TableHead>Top Skills</TableHead>
                <TableHead class="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="isLoading">
                <TableCell colspan="5" class="h-32 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2">
                    <RefreshCw class="size-5 animate-spin text-muted-foreground" />
                    <span>Loading outside municipality data...</span>
                  </div>
                </TableCell>
              </TableRow>

              <template v-else-if="currentDisplayRows.length">
                <TableRow
                  v-for="row in currentDisplayRows"
                  :key="row.name"
                  :class="[
                    'cursor-pointer transition-colors',
                    selectedMunicipality === row.name ? 'bg-primary/5 dark:bg-primary/10' : '',
                  ]"
                  @click="selectMunicipality(row.name)"
                >
                  <TableCell class="font-medium whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-foreground">{{ row.name }}</span>
                      <Badge variant="outline" class="text-[9px] px-1.5 py-0 font-normal text-muted-foreground border-border/80">
                        Outside Agusan
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell class="whitespace-nowrap">
                    <Badge variant="secondary" class="font-medium text-xs">
                      {{ row.province }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right font-bold tabular-nums text-foreground">
                    {{ row.totalApplicants }}
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-wrap items-center gap-1 max-w-60">
                      <Badge
                        v-for="skill in row.topSkills.slice(0, 2)"
                        :key="skill.name"
                        variant="secondary"
                        class="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary hover:text-primary-foreground transition"
                        @click.stop="selectSkillFilter(skill.name)"
                      >
                        {{ skill.name }} ({{ skill.count }})
                      </Badge>
                      <span
                        v-if="row.allSkills.length > 2"
                        class="text-[10px] text-muted-foreground whitespace-nowrap"
                      >
                        +{{ row.allSkills.length - 2 }} more
                      </span>
                      <span
                        v-if="row.topSkills.length === 0"
                        class="text-[11px] text-muted-foreground italic"
                      >
                        None
                      </span>
                    </div>
                  </TableCell>
                  <TableCell class="text-center" @click.stop>
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-8 px-2.5"
                      @click="gotoMunicipality(row.name)"
                    >
                      <Eye class="h-4 w-4" />
                      <span class="ml-1.5 text-xs">View</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <TableRow v-else>
                <TableCell colspan="5" class="h-32 text-center text-muted-foreground">
                  <div v-if="hasAlternativeMatches" class="flex flex-col items-center justify-center gap-2 p-3">
                    <p class="text-sm">
                      No outside municipalities matched your filter.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      class="text-xs h-8 gap-1.5 cursor-pointer"
                      @click="setActiveTab('agusan')"
                    >
                      <span>Switch to Agusan del Sur ({{ alternativeMatchesCount }} {{ alternativeMatchesCount === 1 ? 'match' : 'matches' }})</span>
                    </Button>
                  </div>
                  <div v-else>
                    No outside municipality or skill data found matching your query.
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- Right Column: Interactive Mapbox Map -->
      <div class="flex min-h-0 w-full flex-col overflow-hidden">
        <!-- Outside Agusan Map Banner when outside tab is active -->
        <div
          v-if="activeTab === 'outside'"
          class="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300"
        >
          <div class="flex items-center gap-2">
            <Info class="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Outside Province Scope:</strong> Showing {{ outsideMunicipalityRows.length }} external municipalities. The terrain map below depicts Agusan del Sur provincial territory. Click "View" to open applicant dossiers.
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            class="h-7 text-[11px] text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 shrink-0"
            @click="setActiveTab('agusan')"
          >
            Show Agusan Map
          </Button>
        </div>

        <SkillMapboxMap
          height-class="h-full"
          :municipality-rows="agusanMunicipalityRows"
          :selected-municipality="activeTab === 'agusan' ? selectedMunicipality : ''"
          @select-municipality="selectMunicipality"
          @view-municipality="gotoMunicipality"
        />
      </div>
    </div>
  </div>
</template>