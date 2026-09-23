<script setup lang="ts">
import {
  ArrowLeft,
  Award,
  Download,
  Eye,
  GraduationCap,
  Info,
  Loader2,
  MapPin,
  Mountain,
  RefreshCw,
  Search,
  TreePine,
  Trophy,
  Waves,
  X,
} from '@lucide/vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Progress } from '@/components/ui/progress'
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
  getRankBadgeClass,
  getScoreColorClass,
  getInitials,
  LPII_CONFIG,
} = useGipPriorityApplicants()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header & Breadcrumb Navigation ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" class="gap-1.5 px-2 cursor-pointer" @click="goBack">
            <ArrowLeft class="h-4 w-4" />
            <span>Back to Applicants</span>
          </Button>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
            GIP Candidate Priority Ranking
          </h1>
          <Badge variant="outline" class="border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
            Auto-Scored (100 Pts Max)
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          Auto-calculated priority rankings based on working student status, academic awards, TESDA/certifications, and LPII poverty & unemployment indices.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer"
          :disabled="isPriorityLoading"
          @click="handleRefresh"
        >
          <RefreshCw :class="['h-3.5 w-3.5', isPriorityLoading && 'animate-spin']" />
          <span>Refresh</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer"
          :disabled="priorityApplicants.length === 0"
          @click="exportPriorityCsv"
        >
          <Download class="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>
    </div>

    <!-- ─── KPI Metric Cards ─── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card class="p-3.5 sm:p-4 shadow-2xs">
        <span class="text-xs font-medium text-muted-foreground">Total Ranked Candidates</span>
        <div class="mt-1 text-2xl font-bold font-mono">{{ stats.total }}</div>
        <p class="text-[11px] text-muted-foreground mt-0.5">Assessed across all municipalities</p>
      </Card>
      <Card class="p-3.5 sm:p-4 shadow-2xs">
        <span class="text-xs font-medium text-muted-foreground">Highest Priority Score</span>
        <div class="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
          {{ stats.maxScore }} <span class="text-xs text-muted-foreground font-normal">/ 100</span>
        </div>
        <p class="text-[11px] text-muted-foreground mt-0.5">Top composite score achieved</p>
      </Card>
      <Card class="p-3.5 sm:p-4 shadow-2xs">
        <span class="text-xs font-medium text-muted-foreground">Average Score</span>
        <div class="mt-1 text-2xl font-bold font-mono text-primary">
          {{ stats.avgScore }} <span class="text-xs text-muted-foreground font-normal">pts</span>
        </div>
        <p class="text-[11px] text-muted-foreground mt-0.5">Mean rating among applicants</p>
      </Card>
      <Card class="p-3.5 sm:p-4 shadow-2xs">
        <span class="text-xs font-medium text-muted-foreground">High Priority Tier (≥70)</span>
        <div class="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {{ stats.highCount }}
        </div>
        <p class="text-[11px] text-muted-foreground mt-0.5">Top-recommendation candidates</p>
      </Card>
    </div>

    <!-- ─── Search & Filter Bar ─── -->
    <Card class="p-3.5 sm:p-4 shadow-2xs">
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <!-- Search Input -->
        <div class="sm:col-span-5 relative">
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search candidate name, course, municipality, code..."
            class="pl-8 text-xs h-9"
          />
          <button
            v-if="searchQuery"
            class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            @click="searchQuery = ''"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- Municipality Select -->
        <div class="sm:col-span-3">
          <select
            v-model="selectedMunicipality"
            class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Municipalities</option>
            <option v-for="m in availableMunicipalities" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
        </div>

        <!-- Score Tier Select -->
        <div class="sm:col-span-3">
          <select
            v-model="selectedTier"
            class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Score Tiers</option>
            <option value="HIGH">High Priority (70–100 pts)</option>
            <option value="MODERATE">Moderate Priority (40–69 pts)</option>
            <option value="BASELINE">Baseline (0–39 pts)</option>
          </select>
        </div>

        <!-- Reset Button -->
        <div class="sm:col-span-1 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            class="h-9 w-full sm:w-auto px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            :disabled="!searchQuery && selectedMunicipality === 'ALL' && selectedTier === 'ALL'"
            @click="resetFilters"
            title="Reset Filters"
          >
            <X class="h-3.5 w-3.5 sm:mr-1" />
            <span class="sm:inline hidden">Reset</span>
          </Button>
        </div>
      </div>
    </Card>

    <!-- ─── Main Priority Table Card ─── -->
    <Card class="border shadow-xs">
      <CardHeader class="pb-4 border-b">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-base font-semibold flex items-center gap-2">
              <Trophy class="h-4.5 w-4.5 text-amber-500" />
              <span>Ranked Candidate Registry</span>
            </CardTitle>
            <CardDescription class="text-xs">
              Showing <span class="font-semibold text-foreground">{{ filteredPriorityList.length }}</span> of {{ priorityApplicants.length }} candidates
            </CardDescription>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Show:</span>
            <select
              v-model="pageSize"
              class="h-7 rounded border border-input bg-background px-2 text-xs"
            >
              <option :value="10">10 per page</option>
              <option :value="25">25 per page</option>
              <option :value="50">50 per page</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- Loading State -->
        <div v-if="isPriorityLoading" class="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 class="h-8 w-8 animate-spin text-primary" />
          <p class="text-xs">Computing priority candidate scores...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredPriorityList.length === 0" class="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <Award class="h-10 w-10 text-muted-foreground/40" />
          <p class="text-sm font-medium text-foreground">No priority applicants found</p>
          <p class="text-xs text-muted-foreground max-w-sm text-center">
            No applicants match the current search or filters. Try adjusting your search query or tier filters.
          </p>
          <Button
            v-if="searchQuery || selectedMunicipality !== 'ALL' || selectedTier !== 'ALL'"
            variant="ghost"
            size="sm"
            class="text-xs mt-2"
            @click="resetFilters"
          >
            Clear Filters
          </Button>
        </div>

        <!-- Priority Table -->
        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-16 text-center text-xs font-semibold">Rank</TableHead>
                <TableHead class="text-xs font-semibold">Candidate Information</TableHead>
                <TableHead class="text-xs font-semibold">Municipality & LPII</TableHead>
                <TableHead class="text-xs font-semibold">Course / Attainment</TableHead>
                <TableHead class="w-40 text-xs font-semibold">Priority Score</TableHead>
                <TableHead class="w-28 text-center text-xs font-semibold">Score Details</TableHead>
                <TableHead class="w-24 text-right text-xs font-semibold pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="record in paginatedPriorityList"
                :key="record.applicantId"
                class="transition-colors hover:bg-muted/30"
              >
                <!-- Rank -->
                <TableCell class="py-3 text-center">
                  <Badge
                    variant="outline"
                    :class="['h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-mono mx-auto', getRankBadgeClass(record.rank)]"
                  >
                    <Trophy v-if="record.rank === 1" class="h-3 w-3 text-amber-500" />
                    <span v-else>{{ record.rank }}</span>
                  </Badge>
                </TableCell>

                <!-- Candidate Info -->
                <TableCell class="py-3">
                  <div class="flex items-center gap-2.5">
                    <Avatar class="h-8 w-8 rounded-full border bg-muted shrink-0">
                      <AvatarFallback class="text-xs font-semibold text-primary">
                        {{ getInitials(record.fullName) }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="flex flex-col min-w-0">
                      <span class="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                        {{ record.fullName }}
                        <Badge
                          v-if="record.rank <= 3"
                          variant="secondary"
                          class="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0"
                        >
                          Top {{ record.rank }}
                        </Badge>
                      </span>
                      <div class="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span class="font-mono">{{ record.code }}</span>
                        <span>•</span>
                        <span>{{ record.gender }}</span>
                        <span v-if="record.age">• {{ record.age }} yrs</span>
                      </div>
                    </div>
                  </div>
                </TableCell>

                <!-- Municipality & LPII -->
                <TableCell class="py-3">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-1 text-xs text-foreground font-medium">
                      <MapPin class="h-3 w-3 text-muted-foreground shrink-0" />
                      <span class="truncate">{{ record.municipality }}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        :class="['text-[10px] px-1.5 py-0 flex items-center gap-1', LPII_CONFIG[record.lpiiTag]?.badgeClass]"
                      >
                        <TreePine v-if="record.lpiiTag === 'UPLAND'" class="h-2.5 w-2.5" />
                        <Waves v-else-if="record.lpiiTag === 'WETLAND'" class="h-2.5 w-2.5" />
                        <Mountain v-else class="h-2.5 w-2.5" />
                        <span>{{ LPII_CONFIG[record.lpiiTag]?.label }}</span>
                      </Badge>
                      <span class="text-[10px] text-muted-foreground truncate">{{ record.barangay }}</span>
                    </div>
                  </div>
                </TableCell>

                <!-- Course -->
                <TableCell class="py-3">
                  <div class="flex items-center gap-1.5 text-xs text-foreground max-w-[200px]">
                    <GraduationCap class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span class="truncate" :title="record.course">{{ record.course }}</span>
                  </div>
                </TableCell>

                <!-- Priority Score & Progress -->
                <TableCell class="py-3">
                  <div class="flex flex-col gap-1.5 max-w-[140px]">
                    <div class="flex items-center justify-between text-xs">
                      <span :class="['font-mono font-bold', getScoreColorClass(record.totalPriorityScore)]">
                        {{ record.totalPriorityScore }}
                      </span>
                      <span class="text-[10px] text-muted-foreground font-mono">/ 100 pts</span>
                    </div>
                    <Progress
                      :model-value="record.totalPriorityScore"
                      :max="100"
                      class="h-1.5 bg-muted"
                    />
                  </div>
                </TableCell>

                <!-- Score Details Popover -->
                <TableCell class="py-3 text-center">
                  <Popover>
                    <PopoverTrigger as-child>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Info class="h-3 w-3" />
                        <span>Breakdown</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-72 p-3 text-xs shadow-lg" align="end">
                      <div class="font-semibold text-xs pb-2 mb-2 border-b flex items-center justify-between">
                        <span>Score Breakdown</span>
                        <span class="font-mono text-primary font-bold">{{ record.totalPriorityScore }} / 100</span>
                      </div>

                      <div class="space-y-2 text-[11px]">
                        <div class="flex items-center justify-between">
                          <span class="text-muted-foreground">Student / Fresh Grad:</span>
                          <Badge variant="outline" class="font-mono text-[10px]">
                            {{ record.statusScore }} / 15 pts
                          </Badge>
                        </div>

                        <div class="flex items-center justify-between">
                          <span class="text-muted-foreground">Academic Awards:</span>
                          <Badge variant="outline" class="font-mono text-[10px]">
                            {{ record.academicScore }} / 20 pts
                          </Badge>
                        </div>

                        <div class="flex items-center justify-between">
                          <span class="text-muted-foreground">Certifications / TESDA:</span>
                          <Badge variant="outline" class="font-mono text-[10px]">
                            {{ record.certScore }} / 15 pts
                          </Badge>
                        </div>

                        <div class="flex items-center justify-between">
                          <span class="text-muted-foreground">Poverty Incidence (LPII):</span>
                          <Badge variant="outline" class="font-mono text-[10px]">
                            {{ record.povertyScore }} / 25 pts
                          </Badge>
                        </div>

                        <div class="flex items-center justify-between">
                          <span class="text-muted-foreground">Unemployment Rate (LPII):</span>
                          <Badge variant="outline" class="font-mono text-[10px]">
                            {{ record.unemploymentScore }} / 25 pts
                          </Badge>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>

                <!-- Action -->
                <TableCell class="py-3 text-right pr-4">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7 text-xs gap-1 cursor-pointer"
                    @click="navigateToProfile(record)"
                  >
                    <Eye class="h-3 w-3" />
                    <span>Profile</span>
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Table Pagination Footer ─── -->
        <div v-if="filteredPriorityList.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
          <div>
            Showing <span class="font-medium text-foreground">{{ filteredPriorityList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>
            to <span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredPriorityList.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredPriorityList.length }}</span> candidates
          </div>

          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs px-2.5 cursor-pointer"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              Previous
            </Button>
            <div class="flex items-center gap-1">
              <Button
                v-for="p in totalPages"
                :key="p"
                size="sm"
                :variant="currentPage === p ? 'default' : 'outline'"
                class="h-8 w-8 p-0 text-xs cursor-pointer"
                @click="currentPage = p"
              >
                {{ p }}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs px-2.5 cursor-pointer"
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
