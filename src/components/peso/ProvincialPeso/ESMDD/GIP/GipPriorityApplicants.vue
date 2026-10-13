<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, RefreshCw, Search, X } from '@lucide/vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useGipPriorityApplicants } from '@/composables/peso/provincialPeso/useGipPriorityApplicants'

const {
  priorityApplicants,
  isPriorityLoading,
  filteredPriorityList,
  paginatedPriorityList,
  availableMunicipalities,
  stats,
  searchQuery,
  selectedMunicipality,
  selectedTier,
  currentPage,
  pageSize,
  totalPages,
  handleRefresh,
  resetFilters,
  exportPriorityCsv,
  goBack,
  navigateToProfile,
  navigateToDeploy,
  getRankBadgeClass,
  getScoreColorClass,
  getInitials,
  LPII_CONFIG,
} = useGipPriorityApplicants()

const hasActiveFilters = computed(
  () => !!searchQuery.value || selectedMunicipality.value !== 'ALL' || selectedTier.value !== 'ALL',
)

const kpis = computed(() => [
  { label: 'Total Ranked Applicants', value: stats.value.total, hint: 'Assessed across all municipalities' },
  { label: 'Highest Priority Score', value: stats.value.maxScore, suffix: '/ 100', hint: 'Top composite score achieved' },
  { label: 'Average Score', value: stats.value.avgScore, suffix: 'pts', hint: 'Mean rating among applicants' },
  { label: 'High Priority Tier (≥70)', value: stats.value.highCount, hint: 'Top-recommendation applicants' },
])

const scoreBreakdown = (record: (typeof paginatedPriorityList.value)[number]) => [
  { label: 'Student / Fresh Grad', score: record.statusScore, max: 15 },
  { label: 'Academic Awards', score: record.academicScore, max: 15 },
  { label: 'Civil Service / Board', score: record.eligibilityScore, max: 10 },
  { label: 'Certifications / TESDA', score: record.certScore, max: 10 },
  { label: 'Poverty Incidence (LPII)', score: record.povertyScore, max: 25 },
  { label: 'Unemployment Rate (LPII)', score: record.unemploymentScore, max: 25 },
]
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
          <ArrowLeft class="size-4 shrink-0" />
          Back to Applicants
        </Button>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">GIP Applicants Priority Ranking</h1>
        <p class="text-sm text-muted-foreground">
          Auto-calculated priority rankings based on applicants' submitted documents.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="cursor-pointer"
          :disabled="priorityApplicants.length === 0"
          @click="exportPriorityCsv"
        >
          Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="cursor-pointer"
          :disabled="isPriorityLoading"
          @click="handleRefresh"
        >
          <RefreshCw :class="['size-4 shrink-0', isPriorityLoading && 'animate-spin']" />
          {{ isPriorityLoading ? 'Refreshing...' : 'Refresh' }}
        </Button>
      </div>
    </div>

    <!-- ─── KPI Cards ─── -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card v-for="kpi in kpis" :key="kpi.label">
        <CardHeader>
          <CardDescription>{{ kpi.label }}</CardDescription>
          <Skeleton v-if="isPriorityLoading" class="h-8 w-16" />
          <CardTitle v-else class="text-2xl font-semibold tabular-nums">
            {{ kpi.value }}
            <span v-if="kpi.suffix" class="text-sm font-normal text-muted-foreground">{{ kpi.suffix }}</span>
          </CardTitle>
          <p class="text-xs text-muted-foreground">{{ kpi.hint }}</p>
        </CardHeader>
      </Card>
    </div>

    <!-- ─── Ranked Registry ─── -->
    <Card class="gap-0 py-0">
      <CardHeader class="gap-4 border-b py-4 [.border-b]:pb-4">
        <div class="space-y-1">
          <CardTitle class="text-base">Ranked Applicant Registry</CardTitle>
          <CardDescription>
            Showing {{ filteredPriorityList.length }} of {{ priorityApplicants.length }} applicants
          </CardDescription>
        </div>

        <!-- Search & Filters -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div class="relative sm:col-span-2 lg:col-span-5">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search name, course, municipality, code..."
              class="pr-9 pl-8"
              aria-label="Search priority applicants"
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

          <Select v-model="selectedMunicipality">
            <SelectTrigger class="w-full lg:col-span-3" aria-label="Filter by municipality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Municipalities</SelectItem>
              <SelectItem v-for="m in availableMunicipalities" :key="m" :value="m">{{ m }}</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="selectedTier">
            <SelectTrigger class="w-full lg:col-span-2" aria-label="Filter by score tier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Score Tiers</SelectItem>
              <SelectItem value="HIGH">High Priority (70–100)</SelectItem>
              <SelectItem value="MODERATE">Moderate (40–69)</SelectItem>
              <SelectItem value="BASELINE">Baseline (0–39)</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="pageSize">
            <SelectTrigger class="w-full lg:col-span-2" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="10">10 per page</SelectItem>
              <SelectItem :value="25">25 per page</SelectItem>
              <SelectItem :value="50">50 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/40 hover:bg-muted/40">
                <TableHead class="w-16 text-center">Rank</TableHead>
                <TableHead class="min-w-50">Applicant</TableHead>
                <TableHead>Municipality & LPII</TableHead>
                <TableHead>Course</TableHead>
                <TableHead class="w-40">Priority Score</TableHead>
                <TableHead class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading -->
              <template v-if="isPriorityLoading">
                <TableRow v-for="n in 5" :key="`skeleton-${n}`">
                  <TableCell><Skeleton class="mx-auto size-6 rounded-full" /></TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2.5">
                      <Skeleton class="size-8 rounded-full" />
                      <div class="space-y-1.5">
                        <Skeleton class="h-4 w-32" />
                        <Skeleton class="h-3 w-20" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton class="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton class="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton class="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton class="ml-auto h-8 w-32" /></TableCell>
                </TableRow>
              </template>

              <!-- Empty -->
              <TableRow v-else-if="filteredPriorityList.length === 0" class="hover:bg-transparent">
                <TableCell colspan="6" class="p-0 whitespace-normal">
                  <Empty class="py-10">
                    <EmptyHeader>
                      <EmptyTitle>No priority applicants found</EmptyTitle>
                      <EmptyDescription>
                        {{ hasActiveFilters ? 'No applicants match the current search or filters.' : 'Priority scores appear once applicants are registered.' }}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent v-if="hasActiveFilters">
                      <Button size="sm" variant="outline" class="cursor-pointer" @click="resetFilters">
                        Clear Filters
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>

              <!-- Rows -->
              <template v-else>
                <TableRow v-for="record in paginatedPriorityList" :key="record.applicantId">
                  <TableCell class="text-center">
                    <Badge
                      variant="outline"
                      :class="['mx-auto size-7 justify-center rounded-full p-0 tabular-nums', getRankBadgeClass(record.rank)]"
                    >
                      {{ record.rank }}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div class="flex items-center gap-2.5">
                      <Avatar class="size-8 shrink-0 border">
                        <AvatarFallback class="text-xs font-semibold">
                          {{ getInitials(record.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex min-w-0 flex-col">
                        <span class="truncate text-sm font-medium">{{ record.fullName }}</span>
                        <span class="text-xs text-muted-foreground">
                          <span class="font-mono">{{ record.code }}</span> · {{ record.gender }}<template v-if="record.age"> · {{ record.age }} y.o.</template>
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div class="flex flex-col items-start gap-1">
                      <span class="text-sm">{{ record.municipality }}</span>
                      <div class="flex items-center gap-1.5">
                        <Badge variant="outline" :class="LPII_CONFIG[record.lpiiTag]?.badgeClass">
                          {{ LPII_CONFIG[record.lpiiTag]?.label }}
                        </Badge>
                        <span class="truncate text-xs text-muted-foreground">{{ record.barangay }}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span class="block max-w-50 truncate text-sm" :title="record.course">{{ record.course }}</span>
                  </TableCell>

                  <TableCell>
                    <Popover>
                      <PopoverTrigger as-child>
                        <button
                          type="button"
                          class="flex w-full max-w-35 cursor-pointer flex-col gap-1.5 rounded-md p-1 text-left hover:bg-muted"
                          :aria-label="`Score breakdown for ${record.fullName}`"
                        >
                          <span class="flex items-baseline justify-between text-sm">
                            <span :class="['tabular-nums', getScoreColorClass(record.totalPriorityScore)]">
                              {{ record.totalPriorityScore }}
                            </span>
                            <span class="text-xs text-muted-foreground">/ 100</span>
                          </span>
                          <Progress :model-value="record.totalPriorityScore" :max="100" class="h-1.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent class="w-72" align="start">
                        <div class="grid gap-3">
                          <div class="flex items-center justify-between">
                            <h4 class="text-sm font-semibold">Score Breakdown</h4>
                            <span class="text-sm font-semibold tabular-nums">{{ record.totalPriorityScore }} / 100</span>
                          </div>
                          <dl class="grid gap-2 text-sm">
                            <div v-for="item in scoreBreakdown(record)" :key="item.label" class="flex items-center justify-between gap-4">
                              <dt class="text-muted-foreground">{{ item.label }}</dt>
                              <dd class="font-medium tabular-nums">{{ item.score }} / {{ item.max }}</dd>
                            </div>
                          </dl>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" class="cursor-pointer" @click="navigateToProfile(record)">
                        Profile
                      </Button>
                      <Button size="sm" class="cursor-pointer" @click="navigateToDeploy(record)">
                        Deploy
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!isPriorityLoading && filteredPriorityList.length > 0"
          class="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row"
        >
          <p>
            Showing
            <span class="font-medium text-foreground">{{ (currentPage - 1) * pageSize + 1 }}</span>–<span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredPriorityList.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredPriorityList.length }}</span> applicants
          </p>
          <div class="flex flex-wrap items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              Previous
            </Button>
            <Button
              v-for="p in totalPages"
              :key="p"
              size="icon"
              :variant="currentPage === p ? 'default' : 'ghost'"
              class="size-8 cursor-pointer"
              :aria-current="currentPage === p ? 'page' : undefined"
              @click="currentPage = p"
            >
              {{ p }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
