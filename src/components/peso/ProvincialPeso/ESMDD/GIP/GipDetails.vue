<script setup lang="ts">
// LPII charts (hidden): import { computed } from 'vue'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from '@lucide/vue'
import { Checkbox } from '@/components/ui/checkbox'
// LPII charts hidden for now (kept to reuse elsewhere): uncomment with the LPII Distribution block in the template
// import { VisDonut, VisSingleContainer, VisTooltip } from '@unovis/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
// import { ChartContainer } from '@/components/ui/chart'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import SwipeCardList from '@/components/SwipeCardList.vue'
import SearchSelect from '@/components/SearchSelect.vue'
// LPII charts (hidden): import pgasLogo from '@/assets/images/agsur.png'
// LPII charts (hidden): import doleLogo from '@/assets/images/dole.png'
// import type { LpiiDataPoint } from '@/types/peso/provincialPeso/gip'
import { useGipDetails } from '@/composables/peso/provincialPeso/useGipDetails'
import { getGipStatusBadgeClass } from '@/helpers/peso/provincialPeso/gipHelper'
import { useTemplateRef } from 'vue'
import GipAppointmentRecordDialog from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipAppointmentRecordDialog.vue'

const {
  // LPII charts (hidden): pgasLpiiData, doleLpiiData, overallLpiiData, totalOverallLpii, totalPgasLpii, totalDoleLpii
  interns,
  filteredInterns,
  paginatedInterns,
  totalPages,
  yearFilterOptions,
  termFilterOptions,
  periodFilterOptions,
  formatInternPeriod,
  selectedTermFilter,
  selectedPeriodFilter,
  isLoading,
  searchQuery,
  programTab,
  selectedLpiiFilter,
  selectedYearFilter,
  selectedGenderFilter,
  selectedStatusFilter,
  selectedAppointmentFilter,
  currentPage,
  pageSize,
  selectedInternIds,
  isAllSelected,
  isIndeterminate,
  toggleSelectAll,
  toggleSelectIntern,
  clearSelection,
  // LPII_CONFIG, (LPII charts, hidden)
  // donutTooltipTriggers, (LPII charts, hidden)
  getInitials,
  goBack,
  navigateToAddIntern,
  resetFilters,
  openInternPage,
  openRenewalPage,
  getInternSwipeActions,
  getInternCard,
  exportCsv,
  refreshDetailsData,
  expiringAppointmentsCount,
  expiredAppointmentsCount,
  pendingDecisionCount,

  // Delete modal state & actions
  internToDelete,
  isSingleDeleteDialogOpen,
  isBulkDeleteDialogOpen,
  isDeleting,
  promptDeleteIntern,
  handleSingleDelete,
  handleBulkDelete,
} = useGipDetails()

const recordDialog = useTemplateRef<InstanceType<typeof GipAppointmentRecordDialog>>('recordDialog')

const programTabs = [
  { value: 'ALL', label: 'All Programs' },
  { value: 'PGAS', label: 'PGAS' },
  { value: 'DOLE', label: 'DOLE' },
] as const

// LPII charts hidden for now (kept to reuse elsewhere): uncomment with the LPII Distribution block in the template
// const lpiiCharts = computed(() => [
//   {
//     key: 'overall',
//     title: 'Combined LPII Distribution',
//     description: 'Overall Agsur GIP (PGAS + DOLE)',
//     logo: null,
//     data: overallLpiiData.value,
//     total: totalOverallLpii.value,
//     subLabel: 'Total Interns',
//     emptyLabel: 'No intern records yet',
//   },
//   {
//     key: 'pgas',
//     title: 'PGAS',
//     description: "Provincial Gov't of Agusan del Sur",
//     logo: pgasLogo,
//     data: pgasLpiiData.value,
//     total: totalPgasLpii.value,
//     subLabel: 'PGAS Interns',
//     emptyLabel: 'No PGAS interns yet',
//   },
//   {
//     key: 'dole',
//     title: 'DOLE',
//     description: 'Department of Labor & Employment',
//     logo: doleLogo,
//     data: doleLpiiData.value,
//     total: totalDoleLpii.value,
//     subLabel: 'DOLE Interns',
//     emptyLabel: 'No DOLE interns yet',
//   },
// ])

// LPII charts (hidden)
// const percentOf = (count: number, total: number) => (total ? ((count / total) * 100).toFixed(1) : '0')

// LPII charts (hidden)
// const donutClass = 'mx-auto aspect-square h-55 max-w-65 [--vis-donut-central-label-text-color:var(--foreground)] [--vis-donut-central-sub-label-text-color:var(--muted-foreground)]'
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
          <ArrowLeft class="size-4 shrink-0" />
          Back to Dashboard
        </Button>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">GIP Records</h1>
        <p class="text-sm text-muted-foreground">
          PGAS and DOLE interns, their deployments and appointments.
        </p>
      </div>

      <!-- Program Filter -->
      <div class="flex items-center gap-1 self-start rounded-lg bg-muted p-1 sm:self-auto">
        <Button
          v-for="tab in programTabs"
          :key="tab.value"
          size="sm"
          variant="ghost"
          :class="['h-7 cursor-pointer px-3', programTab === tab.value && 'bg-background shadow-xs hover:bg-background']"
          @click="programTab = tab.value"
        >
          {{ tab.label }}
        </Button>
      </div>
    </div>

    <!-- ─── LPII Distribution: hidden for now, kept to reuse elsewhere (uncomment with the script lines marked "LPII charts") ───
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card v-for="chart in lpiiCharts" :key="chart.key">
        <CardHeader class="flex flex-row items-center gap-3">
          <Avatar v-if="chart.logo" class="size-9 shrink-0 rounded-md border bg-background">
            <img :src="chart.logo" :alt="`${chart.title} logo`" class="object-cover" />
          </Avatar>
          <div class="space-y-1">
            <CardTitle class="text-base">{{ chart.title }}</CardTitle>
            <CardDescription>{{ chart.description }} · {{ chart.total.toLocaleString() }} total</CardDescription>
          </div>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Skeleton v-if="isLoading" class="mx-auto aspect-square h-55 rounded-full" />
          <ChartContainer v-else-if="chart.total > 0" :config="{}" :class="donutClass">
            <VisSingleContainer :data="chart.data" :height="220">
              <VisDonut
                :value="(d: LpiiDataPoint) => d.count"
                :color="(d: LpiiDataPoint) => d.color"
                :pad-angle="0.03"
                :corner-radius="4"
                :arc-width="38"
                :central-label="chart.total.toLocaleString()"
                :central-sub-label="chart.subLabel"
              />
              <VisTooltip :triggers="donutTooltipTriggers" />
            </VisSingleContainer>
          </ChartContainer>
          <p v-else class="flex h-55 items-center justify-center text-sm text-muted-foreground">
            {{ chart.emptyLabel }}
          </p>

          <div class="grid grid-cols-3 gap-2 border-t pt-4">
            <div v-for="item in chart.data" :key="item.category" class="flex flex-col px-2 py-1.5">
              <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span :class="['size-2 shrink-0 rounded-full', LPII_CONFIG[item.category].dotClass]" />
                {{ item.label }}
              </span>
              <span class="text-sm font-semibold tabular-nums">{{ item.count.toLocaleString() }}</span>
              <span class="text-xs text-muted-foreground tabular-nums">{{ percentOf(item.count, chart.total) }}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    -->

    <!-- ─── Appointment Renewal Attention ─── -->
    <Alert v-if="pendingDecisionCount > 0" class="border-warning/40 bg-warning/10 *:[svg]:text-warning">
      <AlertTriangle />
      <AlertTitle>
        {{ pendingDecisionCount }} intern appointment{{ pendingDecisionCount > 1 ? 's' : '' }} pending Provincial PESO decision
      </AlertTitle>
      <AlertDescription>
        <p>
          <template v-if="expiredAppointmentsCount > 0">
            {{ expiredAppointmentsCount }} term{{ expiredAppointmentsCount > 1 ? 's' : '' }} expired
          </template>
          <template v-if="expiredAppointmentsCount > 0 && expiringAppointmentsCount > 0"> and </template>
          <template v-if="expiringAppointmentsCount > 0">
            {{ expiringAppointmentsCount }} expiring within 30 days
          </template>
          — renew or conclude each appointment.
        </p>
        <Button
          size="sm"
          variant="outline"
          class="mt-2 cursor-pointer"
          @click="selectedAppointmentFilter = selectedAppointmentFilter === 'ALL' ? 'EXPIRING' : 'ALL'"
        >
          {{ selectedAppointmentFilter === 'ALL' ? 'View Pending Interns' : 'Show All Interns' }}
        </Button>
      </AlertDescription>
    </Alert>

    <!-- ─── Intern Master Registry ─── -->
    <Card class="gap-0 py-0">
      <CardHeader class="gap-4 border-b py-4 [.border-b]:pb-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-1">
            <CardTitle class="text-base">Intern Master Registry</CardTitle>
            <CardDescription>
              {{ programTab === 'ALL' ? 'All GIP programs' : `GIP - ${programTab}` }}
              · Showing {{ filteredInterns.length }} of {{ interns.length }} records
            </CardDescription>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" class="cursor-pointer" @click="exportCsv">
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="refreshDetailsData"
            >
              <RefreshCw :class="['size-4 shrink-0', isLoading && 'animate-spin']" />
              {{ isLoading ? 'Refreshing...' : 'Refresh' }}
            </Button>
            <Button size="sm" class="cursor-pointer" @click="navigateToAddIntern">
              <Plus class="size-4 shrink-0" />
              Add GIP Intern
            </Button>
          </div>
        </div>

        <!-- Search & Filters -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div class="relative sm:col-span-2">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search name, office, barangay..."
              class="pr-9 pl-8"
              aria-label="Search interns"
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
            v-model="selectedAppointmentFilter"
            :options="[{ value: 'ALL', label: 'All Appointments' }, { value: 'EXPIRING', label: 'Expiring Soon (≤ 30d)' }, { value: 'EXPIRED', label: 'Expired Terms' }, { value: 'ACTIVE', label: 'Active Appointments' }, { value: 'COMPLETED', label: 'Completed / Concluded' }]"
            class="w-full"
            aria-label="Filter by appointment term"
          />

          <!-- Interns with one appointment matching both: e.g. their 2nd appointment, in that period -->
          <SearchSelect
            v-model="selectedTermFilter"
            :options="termFilterOptions"
            class="w-full"
            aria-label="Filter by appointment number"
          />

          <SearchSelect
            v-model="selectedPeriodFilter"
            :options="periodFilterOptions"
            class="w-full"
            aria-label="Filter by appointment period"
          />

          <SearchSelect
            v-model="selectedLpiiFilter"
            :options="[{ value: 'ALL', label: 'All LPII Zones' }, { value: 'LOWLAND', label: 'Lowland' }, { value: 'UPLAND', label: 'Upland' }, { value: 'WETLAND', label: 'Wetland' }]"
            class="w-full"
            aria-label="Filter by LPII zone"
          />

          <SearchSelect
            v-model="selectedYearFilter"
            :options="yearFilterOptions"
            class="w-full"
            aria-label="Filter by batch year"
          />

          <SearchSelect
            v-model="selectedGenderFilter"
            :options="[{ value: 'ALL', label: 'All Genders' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]"
            class="w-full"
            aria-label="Filter by gender"
          />

          <SearchSelect
            v-model="selectedStatusFilter"
            :options="[{ value: 'ALL', label: 'All Statuses' }, { value: 'Active', label: 'Active' }, { value: 'Hired', label: 'Hired' }, { value: 'Completed', label: 'Completed' }, { value: 'Resigned', label: 'Resigned' }]"
            class="w-full"
            aria-label="Filter by status"
          />
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- Bulk Action Bar -->
        <div
          v-if="selectedInternIds.length > 0"
          class="flex flex-col gap-2 border-b bg-muted/50 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="font-medium">
              {{ selectedInternIds.length }} intern{{ selectedInternIds.length > 1 ? 's' : '' }} selected
            </span>
            <Button variant="link" size="sm" class="h-auto cursor-pointer p-0 text-muted-foreground" @click="clearSelection">
              Clear selection
            </Button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" class="cursor-pointer" @click="recordDialog?.open(selectedInternIds)">
              <FileText class="size-4 shrink-0" />
              Appointment Record ({{ selectedInternIds.length }})
            </Button>
            <Button variant="destructive" size="sm" class="cursor-pointer" @click="isBulkDeleteDialogOpen = true">
              Delete Selected ({{ selectedInternIds.length }})
            </Button>
          </div>
        </div>

        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="p-3 md:hidden"
          :items="paginatedInterns"
          :item-key="(intern) => intern.id"
          :card="getInternCard"
          :actions="getInternSwipeActions"
          :loading="isLoading"
          :height="76"
          :action-width="68"
          hint="Swipe left on an intern for actions."
          :is-selected="(intern) => selectedInternIds.includes(intern.id)"
          :all-selected="isAllSelected ? true : isIndeterminate ? 'indeterminate' : false"
          @toggle="(intern, value) => toggleSelectIntern(intern.id, value)"
          @toggle-all="toggleSelectAll"
        >
          <template #default="{ item: intern }">
            <Avatar class="size-9 shrink-0 border">
              <AvatarFallback class="text-xs font-semibold">{{ getInitials(intern.fullName) }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ intern.fullName }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ intern.program }} · {{ intern.municipality }} · {{ intern.status }}
                <span v-if="intern.status === 'Active' && intern.currentAppointment?.isExpired" class="text-destructive">· Term expired</span>
                <span v-else-if="intern.status === 'Active' && intern.currentAppointment?.isExpiringSoon" class="text-warning">· Ends in {{ intern.daysRemaining }}d</span>
              </p>
            </div>
          </template>
          <template #empty>
            <Empty class="py-10">
              <EmptyHeader>
                <EmptyTitle>No matching interns</EmptyTitle>
                <EmptyDescription>Try adjusting the search or filters.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" variant="outline" class="cursor-pointer" @click="resetFilters">
                  Clear Filters
                </Button>
              </EmptyContent>
            </Empty>
          </template>
        </SwipeCardList>

        <!-- Desktop: table -->
        <div class="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/40 hover:bg-muted/40">
                <TableHead class="w-12 px-4 text-center">
                  <Checkbox
                    :model-value="isAllSelected ? true : isIndeterminate ? 'indeterminate' : false"
                    aria-label="Select all interns on page"
                    @update:model-value="toggleSelectAll"
                  >
                    <template #default="{ modelValue }">
                      <Minus v-if="modelValue === 'indeterminate'" class="size-3 stroke-3" />
                      <Check v-else class="size-3.5" />
                    </template>
                  </Checkbox>
                </TableHead>
                <TableHead class="min-w-50">Intern</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Municipality & Barangay</TableHead>
                <TableHead>Assigned Office</TableHead>
                <TableHead>Appointment Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading -->
              <template v-if="isLoading">
                <TableRow v-for="n in 5" :key="`skeleton-${n}`">
                  <TableCell class="px-4"><Skeleton class="mx-auto size-4" /></TableCell>
                  <TableCell>
                    <div class="flex items-center gap-2.5">
                      <Skeleton class="size-8 rounded-full" />
                      <div class="space-y-1.5">
                        <Skeleton class="h-4 w-32" />
                        <Skeleton class="h-3 w-20" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell v-for="c in 6" :key="c"><Skeleton class="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton class="ml-auto h-8 w-28" /></TableCell>
                </TableRow>
              </template>

              <template v-else-if="paginatedInterns.length > 0">
                <TableRow
                  v-for="intern in paginatedInterns"
                  :key="intern.id"
                  :data-state="selectedInternIds.includes(intern.id) ? 'selected' : undefined"
                >
                  <TableCell class="px-4 text-center" @click.stop>
                    <Checkbox
                      :model-value="selectedInternIds.includes(intern.id)"
                      :aria-label="'Select ' + intern.fullName"
                      @update:model-value="(val) => toggleSelectIntern(intern.id, val)"
                    />
                  </TableCell>

                  <TableCell>
                    <div class="flex items-center gap-2.5">
                      <Avatar class="size-8 border">
                        <AvatarFallback class="text-xs font-semibold">
                          {{ getInitials(intern.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex min-w-0 flex-col">
                        <span class="truncate text-sm font-medium">{{ intern.fullName }}</span>
                        <span class="text-xs text-muted-foreground">
                          {{ intern.gender }} · <span class="font-mono">{{ intern.code }}</span>
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell class="text-sm font-medium">{{ intern.program }}</TableCell>

                  <TableCell>
                    <div class="flex flex-col">
                      <span class="text-sm">{{ intern.municipality }}</span>
                      <span class="text-xs text-muted-foreground">Brgy. {{ intern.barangay }}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div class="flex max-w-50 flex-col">
                      <span class="truncate text-sm" :title="intern.assignedOffice">{{ intern.assignedOffice }}</span>
                      <span class="truncate text-xs text-muted-foreground" :title="intern.course">{{ intern.course }}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <!-- The appointment's start and end; batch year and term number are left out (the period says both) -->
                    <div class="flex flex-col gap-1">
                      <span class="text-sm">{{ formatInternPeriod(intern) }}</span>
                      <template v-if="intern.currentAppointment && intern.status === 'Active'">
                        <Badge v-if="intern.currentAppointment.isExpired" variant="destructive">
                          Term expired
                        </Badge>
                        <Badge
                          v-else-if="intern.currentAppointment.isExpiringSoon"
                          variant="outline"
                          class="border-warning/30 bg-warning/10 text-warning"
                        >
                          Ends in {{ intern.daysRemaining }}d
                        </Badge>
                      </template>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" :class="getGipStatusBadgeClass(intern.status)">
                      {{ intern.status }}
                    </Badge>
                  </TableCell>

                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        v-if="intern.status === 'Active'"
                        variant="outline"
                        size="sm"
                        class="cursor-pointer"
                        title="Renew or conclude appointment"
                        @click="openRenewalPage(intern)"
                      >
                        Renew
                      </Button>
                      <Button variant="ghost" size="sm" class="cursor-pointer" @click="openInternPage(intern)">
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 cursor-pointer text-muted-foreground"
                        title="Edit deployment details"
                        :aria-label="'Edit ' + intern.fullName"
                        @click="openInternPage(intern, true)"
                      >
                        <Pencil class="size-4 shrink-0" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                        title="Delete intern deployment"
                        :aria-label="'Delete ' + intern.fullName"
                        @click="promptDeleteIntern(intern)"
                      >
                        <Trash2 class="size-4 shrink-0" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Empty State -->
              <TableRow v-else class="hover:bg-transparent">
                <TableCell colspan="8" class="p-0 whitespace-normal">
                  <Empty class="py-10">
                    <EmptyHeader>
                      <EmptyTitle>No matching interns</EmptyTitle>
                      <EmptyDescription>
                        Try adjusting the search keyword, LPII zone, or program filters.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button size="sm" variant="outline" class="cursor-pointer" @click="resetFilters">
                        Clear Filters
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row">
          <p>
            Showing
            <span class="font-medium text-foreground">{{ filteredInterns.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>–<span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredInterns.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredInterns.length }}</span> interns
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

    <!-- ─── Single Delete Confirmation ─── -->
    <AlertDialog v-model:open="isSingleDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete GIP intern record?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong class="font-medium text-foreground">{{ internToDelete?.fullName }}</strong>'s deployment record and
            associated appointment records will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="handleSingleDelete">
            <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
            {{ isDeleting ? 'Deleting...' : 'Delete Record' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- ─── Bulk Delete Confirmation ─── -->
    <AlertDialog v-model:open="isBulkDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {{ selectedInternIds.length }} selected intern{{ selectedInternIds.length > 1 ? 's' : '' }}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The selected deployment records and their appointment records will be permanently deleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="handleBulkDelete">
            <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
            {{ isDeleting ? 'Deleting...' : `Delete ${selectedInternIds.length} Intern${selectedInternIds.length > 1 ? 's' : ''}` }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <GipAppointmentRecordDialog ref="recordDialog" />
  </div>
</template>
