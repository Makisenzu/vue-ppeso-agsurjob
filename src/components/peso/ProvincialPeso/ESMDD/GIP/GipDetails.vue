<script setup lang="ts">
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Mountain,
  RefreshCw,
  Search,
  TreePine,
  UserX,
  Waves,
  X,
} from '@lucide/vue'
import { VisDonut, VisSingleContainer, VisTooltip } from '@unovis/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import pgasLogo from '@/assets/images/agsur.png'
import doleLogo from '@/assets/images/dole.png'
import type { LpiiDataPoint } from '@/types/peso/provincialPeso/gip'
import { useGipDetails } from '@/composables/peso/provincialPeso/useGipDetails'

const {
  pgasLpiiData,
  doleLpiiData,
  overallLpiiData,
  totalOverallLpii,
  totalPgasLpii,
  totalDoleLpii,
  interns,
  filteredInterns,
  paginatedInterns,
  totalPages,
  availableYears,
  selectedIntern,
  isDetailsModalOpen,
  isLoading,
  searchQuery,
  programTab,
  selectedLpiiFilter,
  selectedYearFilter,
  selectedGenderFilter,
  selectedStatusFilter,
  currentPage,
  pageSize,
  LPII_CONFIG,
  donutTooltipTriggers,
  getInitials,
  goBack,
  resetFilters,
  openInternDetails,
  exportCsv,
  fetchDetailsData,
} = useGipDetails()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header & Breadcrumb ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" class="gap-1.5 px-2 cursor-pointer" @click="goBack">
            <ArrowLeft class="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
          GIP — LPII Analytics & Records
        </h1>
        <p class="text-sm text-muted-foreground">
          Ecosystem and geographic distribution monitoring across Agusan del Sur (Lowland, Upland, Wetland) with intern registry.
        </p>
      </div>

      <!-- Quick Program Tabs -->
      <div class="flex items-center gap-2 self-start sm:self-auto rounded-lg border bg-muted/40 p-1">
        <Button
          size="sm"
          :variant="programTab === 'ALL' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer"
          @click="programTab = 'ALL'"
        >
          All Programs
        </Button>
        <Button
          size="sm"
          :variant="programTab === 'PGAS' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer"
          @click="programTab = 'PGAS'"
        >
          PGAS
        </Button>
        <Button
          size="sm"
          :variant="programTab === 'DOLE' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer"
          @click="programTab = 'DOLE'"
        >
          DOLE
        </Button>
      </div>
    </div>

    <!-- ─── 1 ROW OF PIE / DONUT CHARTS: LPII (Lowland, Upland, Wetland) ─── -->
    <div class="space-y-3">
      <!-- 1 Row Grid with 3 Pie Charts -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- ─── Pie Chart 1: Overall LPII Distribution ─── -->
        <Card class="relative overflow-hidden flex flex-col justify-between border shadow-xs">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="text-base font-semibold flex items-center gap-2">
                  Combined LPII Distribution
                </CardTitle>
                <CardDescription class="text-xs">
                  Overall AgSur GIP (PGAS + DOLE)
                </CardDescription>
              </div>
              <Badge variant="outline" class="font-mono text-xs">
                Total: {{ totalOverallLpii.toLocaleString() }}
              </Badge>
            </div>
          </CardHeader>

          <CardContent class="flex flex-col items-center justify-center p-4">
            <div v-if="isLoading" class="flex h-55 w-full items-center justify-center">
              <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="totalOverallLpii > 0" class="relative w-full max-w-65 aspect-square flex items-center justify-center">
              <VisSingleContainer :data="overallLpiiData" :height="220">
                <VisDonut
                  :value="(d: LpiiDataPoint) => d.count"
                  :color="(d: LpiiDataPoint) => d.color"
                  :pad-angle="0.03"
                  :corner-radius="4"
                  :arc-width="38"
                  :central-label="`${totalOverallLpii.toLocaleString()}`"
                  central-sub-label="Total Interns"
                />
                <VisTooltip :triggers="donutTooltipTriggers" />
              </VisSingleContainer>
            </div>
            <div v-else class="flex h-55 w-full flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No intern records yet</p>
            </div>

            <!-- Legend and counts -->
            <div class="w-full mt-3 grid grid-cols-3 gap-2 pt-3 border-t text-center">
              <div
                v-for="item in overallLpiiData"
                :key="item.category"
                class="flex flex-col items-center rounded-lg bg-muted/40 p-2 transition hover:bg-muted/70"
              >
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }" />
                  {{ item.label }}
                </div>
                <span class="text-sm font-bold font-mono mt-0.5">{{ item.count.toLocaleString() }}</span>
                <span class="text-[10px] text-muted-foreground">
                  {{ totalOverallLpii ? ((item.count / totalOverallLpii) * 100).toFixed(1) : 0 }}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Pie Chart 2: PGAS LPII Distribution ─── -->
        <Card class="relative overflow-hidden flex flex-col justify-between border shadow-xs">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <Avatar class="h-7 w-7 rounded-md border bg-background">
                  <img :src="pgasLogo" alt="PGAS" class="object-cover" />
                </Avatar>
                <div>
                  <CardTitle class="text-base font-semibold">PGAS - LPII Breakdown</CardTitle>
                  <CardDescription class="text-xs">Provincial Gov't of Agusan del Sur</CardDescription>
                </div>
              </div>
              <Badge variant="outline" class="font-mono text-xs">
                Total: {{ totalPgasLpii.toLocaleString() }}
              </Badge>
            </div>
          </CardHeader>

          <CardContent class="flex flex-col items-center justify-center p-4">
            <div v-if="isLoading" class="flex h-55 w-full items-center justify-center">
              <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="totalPgasLpii > 0" class="relative w-full max-w-65 aspect-square flex items-center justify-center">
              <VisSingleContainer :data="pgasLpiiData" :height="220">
                <VisDonut
                  :value="(d: LpiiDataPoint) => d.count"
                  :color="(d: LpiiDataPoint) => d.color"
                  :pad-angle="0.03"
                  :corner-radius="4"
                  :arc-width="38"
                  :central-label="`${totalPgasLpii.toLocaleString()}`"
                  central-sub-label="PGAS Interns"
                />
                <VisTooltip :triggers="donutTooltipTriggers" />
              </VisSingleContainer>
            </div>
            <div v-else class="flex h-55 w-full flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No PGAS interns yet</p>
            </div>

            <!-- Legend and counts -->
            <div class="w-full mt-3 grid grid-cols-3 gap-2 pt-3 border-t text-center">
              <div
                v-for="item in pgasLpiiData"
                :key="item.category"
                class="flex flex-col items-center rounded-lg bg-muted/40 p-2 transition hover:bg-muted/70"
              >
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }" />
                  {{ item.label }}
                </div>
                <span class="text-sm font-bold font-mono mt-0.5">{{ item.count.toLocaleString() }}</span>
                <span class="text-[10px] text-muted-foreground">
                  {{ totalPgasLpii ? ((item.count / totalPgasLpii) * 100).toFixed(1) : 0 }}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Pie Chart 3: DOLE LPII Distribution ─── -->
        <Card class="relative overflow-hidden flex flex-col justify-between border shadow-xs">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <Avatar class="h-7 w-7 rounded-md border bg-background">
                  <img :src="doleLogo" alt="DOLE" class="object-cover" />
                </Avatar>
                <div>
                  <CardTitle class="text-base font-semibold">DOLE - LPII Breakdown</CardTitle>
                  <CardDescription class="text-xs">Department of Labor & Employment</CardDescription>
                </div>
              </div>
              <Badge variant="outline" class="font-mono text-xs">
                Total: {{ totalDoleLpii.toLocaleString() }}
              </Badge>
            </div>
          </CardHeader>

          <CardContent class="flex flex-col items-center justify-center p-4">
            <div v-if="isLoading" class="flex h-55 w-full items-center justify-center">
              <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="totalDoleLpii > 0" class="relative w-full max-w-65 aspect-square flex items-center justify-center">
              <VisSingleContainer :data="doleLpiiData" :height="220">
                <VisDonut
                  :value="(d: LpiiDataPoint) => d.count"
                  :color="(d: LpiiDataPoint) => d.color"
                  :pad-angle="0.03"
                  :corner-radius="4"
                  :arc-width="38"
                  :central-label="`${totalDoleLpii.toLocaleString()}`"
                  central-sub-label="DOLE Interns"
                />
                <VisTooltip :triggers="donutTooltipTriggers" />
              </VisSingleContainer>
            </div>
            <div v-else class="flex h-55 w-full flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No DOLE interns yet</p>
            </div>

            <!-- Legend and counts -->
            <div class="w-full mt-3 grid grid-cols-3 gap-2 pt-3 border-t text-center">
              <div
                v-for="item in doleLpiiData"
                :key="item.category"
                class="flex flex-col items-center rounded-lg bg-muted/40 p-2 transition hover:bg-muted/70"
              >
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }" />
                  {{ item.label }}
                </div>
                <span class="text-sm font-bold font-mono mt-0.5">{{ item.count.toLocaleString() }}</span>
                <span class="text-[10px] text-muted-foreground">
                  {{ totalDoleLpii ? ((item.count / totalDoleLpii) * 100).toFixed(1) : 0 }}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- ─── DATA TABLE COMPONENT (Below Pie Chart Row) ─── -->
    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold flex items-center gap-2">
              GIP Intern Master Registry
            </CardTitle>
            <CardDescription class="text-xs">
              Filtering interns for
              <span class="font-semibold text-foreground">
                {{ programTab === 'ALL' ? 'All GIP Programs' : `GIP - ${programTab}` }}
              </span>
              • Showing {{ filteredInterns.length }} of {{ interns.length }} records
            </CardDescription>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" @click="exportCsv">
              <Download class="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="gap-1.5 text-xs cursor-pointer"
              :disabled="isLoading"
              @click="fetchDetailsData"
            >
              <RefreshCw :class="['h-3.5 w-3.5', isLoading && 'animate-spin']" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <!-- ─── Search & Multi-Filter Bar ─── -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <!-- Search input -->
          <div class="sm:col-span-2 relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search by intern name, office, barangay..."
              class="pl-9 text-xs h-9"
            />
            <button
              v-if="searchQuery"
              class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              @click="searchQuery = ''"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- LPII Filter -->
          <div>
            <select
              v-model="selectedLpiiFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All LPII Zones</option>
              <option value="LOWLAND">Lowland Only</option>
              <option value="UPLAND">Upland Only</option>
              <option value="WETLAND">Wetland Only</option>
            </select>
          </div>

          <!-- Year Filter -->
          <div>
            <select
              v-model="selectedYearFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Batch Years</option>
              <option v-for="y in availableYears" :key="y" :value="y.toString()">
                Batch {{ y }}
              </option>
            </select>
          </div>

          <!-- Gender Filter -->
          <div>
            <select
              v-model="selectedGenderFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <select
              v-model="selectedStatusFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Hired">Hired</option>
              <option value="Resigned">Resigned</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- ─── Table ─── -->
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-50 text-xs font-semibold">Intern Information</TableHead>
                <TableHead class="text-xs font-semibold">Program</TableHead>
                <TableHead class="text-xs font-semibold">Municipality & Barangay</TableHead>
                <TableHead class="text-xs font-semibold">LPII Classification</TableHead>
                <TableHead class="text-xs font-semibold">Assigned Office / Station</TableHead>
                <TableHead class="text-xs font-semibold">Period / Batch</TableHead>
                <TableHead class="text-xs font-semibold">Status</TableHead>
                <TableHead class="text-right text-xs font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="isLoading">
                <TableRow>
                  <TableCell colspan="8" class="h-32 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2 py-4">
                      <Loader2 class="h-7 w-7 animate-spin text-muted-foreground" />
                      <p class="text-xs text-muted-foreground">Loading GIP intern records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
              <template v-else-if="paginatedInterns.length > 0">
                <TableRow
                  v-for="intern in paginatedInterns"
                  :key="intern.id"
                  class="transition-colors hover:bg-muted/30"
                >
                  <!-- Intern Info -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2.5">
                      <Avatar class="h-8 w-8 rounded-full border bg-muted">
                        <AvatarFallback class="text-xs font-semibold text-primary">
                          {{ getInitials(intern.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex flex-col">
                        <span class="font-semibold text-xs sm:text-sm text-foreground">
                          {{ intern.fullName }}
                        </span>
                        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{{ intern.gender }}</span>
                          <span>•</span>
                          <span class="font-mono">{{ intern.code }}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <!-- Program -->
                  <TableCell class="py-3">
                    <Badge
                      :variant="intern.program === 'PGAS' ? 'default' : 'secondary'"
                      class="text-[11px] font-semibold px-2 py-0.5 gap-1"
                    >
                      {{ intern.program }}
                    </Badge>
                  </TableCell>

                  <!-- Location -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs">
                      <span class="font-medium text-foreground flex items-center gap-1">
                        <MapPin class="h-3 w-3 text-muted-foreground" />
                        {{ intern.municipality }}
                      </span>
                      <span class="text-[11px] text-muted-foreground pl-4">
                        Brgy. {{ intern.barangay }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- LPII Tag -->
                  <TableCell class="py-3">
                    <Badge
                      variant="outline"
                      :class="['text-xs font-semibold gap-1.5 py-0.5 px-2', LPII_CONFIG[intern.lpiiTag].badgeClass]"
                    >
                      <TreePine v-if="intern.lpiiTag === 'LOWLAND'" class="h-3.5 w-3.5" />
                      <Mountain v-else-if="intern.lpiiTag === 'UPLAND'" class="h-3.5 w-3.5" />
                      <Waves v-else class="h-3.5 w-3.5" />
                      {{ LPII_CONFIG[intern.lpiiTag].label }}
                    </Badge>
                  </TableCell>

                  <!-- Assigned Office -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs max-w-50">
                      <span class="font-medium truncate text-foreground" :title="intern.assignedOffice">
                        {{ intern.assignedOffice }}
                      </span>
                      <span class="text-[11px] text-muted-foreground truncate" :title="intern.course">
                        {{ intern.course }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Period / Batch -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs">
                      <span class="font-mono text-foreground">{{ intern.batchYear }}</span>
                      <span class="text-[11px] text-muted-foreground">{{ intern.period }}</span>
                    </div>
                  </TableCell>

                  <!-- Status -->
                  <TableCell class="py-3">
                    <Badge
                      v-if="intern.status === 'Active'"
                      variant="outline"
                      class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1"
                    >
                      <Clock class="h-3 w-3" />
                      Active
                    </Badge>
                    <Badge
                      v-else-if="intern.status === 'Hired'"
                      variant="outline"
                      class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] gap-1"
                    >
                      <CheckCircle2 class="h-3 w-3" />
                      Hired
                    </Badge>
                    <Badge
                      v-else
                      variant="outline"
                      class="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] gap-1"
                    >
                      <UserX class="h-3 w-3" />
                      {{ intern.status }}
                    </Badge>
                  </TableCell>

                  <!-- Action -->
                  <TableCell class="py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 gap-1.5 text-xs cursor-pointer"
                      @click="openInternDetails(intern)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Empty State -->
              <TableRow v-else>
                <TableCell colspan="8" class="h-32 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2 py-4">
                    <Filter class="h-7 w-7 text-muted-foreground/50" />
                    <p class="text-sm font-semibold">No intern records match the selected criteria</p>
                    <p class="text-xs text-muted-foreground">
                      Try adjusting the search keyword, LPII category, or program filters.
                    </p>
                    <Button size="sm" variant="outline" class="mt-2 text-xs cursor-pointer" @click="resetFilters">
                      Clear Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- ─── Table Pagination ─── -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
          <div>
            Showing <span class="font-medium text-foreground">{{ filteredInterns.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>
            to <span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredInterns.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredInterns.length }}</span> interns
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

    <!-- ─── INTERN DETAILS DIALOG ─── -->
    <Dialog v-model:open="isDetailsModalOpen">
      <DialogContent class="sm:max-w-137.5">
        <DialogHeader>
          <div class="flex items-center gap-2.5">
            <Avatar class="h-10 w-10 border bg-muted">
              <AvatarFallback class="font-semibold text-sm text-primary">
                {{ selectedIntern ? getInitials(selectedIntern.fullName) : '' }}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle class="text-base font-semibold">{{ selectedIntern?.fullName }}</DialogTitle>
              <DialogDescription class="text-xs flex items-center gap-1.5 mt-0.5">
                <span>{{ selectedIntern?.code }}</span>
                <span>•</span>
                <span>GIP {{ selectedIntern?.program }} Intern</span>
                <span>•</span>
                <span class="font-semibold text-foreground">{{ selectedIntern?.status }}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div v-if="selectedIntern" class="grid gap-4 py-2 text-xs">
          <!-- Ecosystem Banner -->
          <div
            :class="[
              'flex items-center justify-between rounded-lg p-3 border',
              LPII_CONFIG[selectedIntern.lpiiTag].bgClass,
              LPII_CONFIG[selectedIntern.lpiiTag].badgeClass,
            ]"
          >
            <div class="flex items-center gap-2">
              <TreePine v-if="selectedIntern.lpiiTag === 'LOWLAND'" class="h-4 w-4" />
              <Mountain v-else-if="selectedIntern.lpiiTag === 'UPLAND'" class="h-4 w-4" />
              <Waves v-else class="h-4 w-4" />
              <div>
                <span class="font-bold uppercase tracking-wider">
                  {{ LPII_CONFIG[selectedIntern.lpiiTag].label }} Ecosystem Tagging
                </span>
                <p class="text-[11px] opacity-90">
                  Barangay {{ selectedIntern.barangay }}, {{ selectedIntern.municipality }}
                </p>
              </div>
            </div>
            <Badge variant="outline" class="bg-background text-foreground font-mono text-[10px]">
              AgSur LPII
            </Badge>
          </div>

          <!-- Key Details Grid -->
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Assigned Office / Station</span>
              <span class="font-medium text-foreground mt-0.5 block">{{ selectedIntern.assignedOffice }}</span>
            </div>
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Designated Supervisor</span>
              <span class="font-medium text-foreground mt-0.5 block">{{ selectedIntern.supervisor }}</span>
            </div>
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Academic Background / Degree</span>
              <span class="font-medium text-foreground mt-0.5 block">{{ selectedIntern.course }}</span>
            </div>
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Daily Allowance / Stipend</span>
              <span class="font-medium text-foreground mt-0.5 block font-mono">{{ selectedIntern.stipend }}</span>
            </div>
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Deployment Period</span>
              <span class="font-medium text-foreground mt-0.5 block">{{ selectedIntern.period }}</span>
            </div>
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Contact Information</span>
              <span class="font-medium text-foreground mt-0.5 block font-mono">{{ selectedIntern.contact }}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="isDetailsModalOpen = false">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>