<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckIcon,
  ChevronDown,
  ChevronsUpDownIcon,
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
import { VisDonut, VisSingleContainer, VisTooltip } from '@unovis/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ChartContainer } from '@/components/ui/chart'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxViewport,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxGroup,
  ComboboxItemIndicator,
} from '@/components/ui/combobox'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import pgasLogo from '@/assets/images/agsur.png'
import doleLogo from '@/assets/images/dole.png'
import type { LpiiDataPoint } from '@/types/peso/provincialPeso/gip'
import type { DirectoryRow } from '@/types/common/directory'
import { useGipDetails } from '@/composables/peso/provincialPeso/useGipDetails'
import { useGipRenewAppointment } from '@/composables/peso/provincialPeso/useGipRenewAppointment'
import { getGipStatusBadgeClass } from '@/helpers/peso/provincialPeso/gipHelper'

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
  isEditingIntern,
  isUpdatingIntern,
  editForm,
  startEdit,
  cancelEdit,
  saveEdit,
  setEditProgram,
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
  LPII_CONFIG,
  donutTooltipTriggers,
  getInitials,
  goBack,
  navigateToAddIntern,
  resetFilters,
  openInternDetails,
  openInternEdit,
  closeInternDetails,
  openRenewalDialog,
  exportCsv,
  refreshDetailsData,
  expiringAppointmentsCount,
  expiredAppointmentsCount,
  pendingDecisionCount,

  // Office directory (edit mode)
  officeSearchQuery,
  filteredOffices,
  selectedOffice,
  isLoadingOffices,

  // Date range (edit mode)
  deploymentStartDate,
  deploymentEndDate,
  formattedPeriod,

  // Delete modal state & actions
  internToDelete,
  isSingleDeleteDialogOpen,
  isBulkDeleteDialogOpen,
  isDeleting,
  promptDeleteIntern,
  handleSingleDelete,
  handleBulkDelete,

  // Documents
  internDocumentsSubmitted,
} = useGipDetails()

const {
  isRenewalDialogOpen,
  intern: renewalIntern,
  isSubmitting: isSubmittingRenewal,
  actionMode: renewalActionMode,
  currentTermNumber,
  nextTermNumber,
  programOptions: renewalProgramOptions,
  concludeOptions,
  durationPresets,
  officeSearchQuery: renewalOfficeSearchQuery,
  filteredOffices: renewalFilteredOffices,
  isLoadingOffices: isLoadingRenewalOffices,
  findOffice,
  renewSchema,
  renewInitialValues,
  concludeSchema,
  concludeInitialValues,
  stipendForProgram,
  addDurationMonths,
  formatDeploymentDate,
  onOpenChange: onRenewalOpenChange,
  submitRenewal,
  submitConclusion,
} = useGipRenewAppointment()

const programTabs = [
  { value: 'ALL', label: 'All Programs' },
  { value: 'PGAS', label: 'PGAS' },
  { value: 'DOLE', label: 'DOLE' },
] as const

const programOptions = [
  { value: 'PGAS', label: 'PGAS', logo: pgasLogo, description: 'Provincial · ₱479.35/day' },
  { value: 'DOLE', label: 'DOLE', logo: doleLogo, description: 'National · ₱475/day' },
] as const

const lpiiCharts = computed(() => [
  {
    key: 'overall',
    title: 'Combined LPII Distribution',
    description: 'Overall Agsur GIP (PGAS + DOLE)',
    logo: null,
    data: overallLpiiData.value,
    total: totalOverallLpii.value,
    subLabel: 'Total Interns',
    emptyLabel: 'No intern records yet',
  },
  {
    key: 'pgas',
    title: 'PGAS',
    description: "Provincial Gov't of Agusan del Sur",
    logo: pgasLogo,
    data: pgasLpiiData.value,
    total: totalPgasLpii.value,
    subLabel: 'PGAS Interns',
    emptyLabel: 'No PGAS interns yet',
  },
  {
    key: 'dole',
    title: 'DOLE',
    description: 'Department of Labor & Employment',
    logo: doleLogo,
    data: doleLpiiData.value,
    total: totalDoleLpii.value,
    subLabel: 'DOLE Interns',
    emptyLabel: 'No DOLE interns yet',
  },
])

const internDetailFields = computed(() => {
  const intern = selectedIntern.value
  if (!intern) return []
  return [
    { label: 'Assigned Office / Station', value: intern.assignedOffice },
    { label: 'Designated Supervisor', value: intern.supervisor },
    { label: 'Academic Background / Degree', value: intern.course },
    { label: 'Daily Allowance / Stipend', value: intern.stipend, mono: true },
    { label: 'Deployment Period', value: intern.period },
    { label: 'Contact Information', value: intern.contact, mono: true },
  ]
})

const percentOf = (count: number, total: number) => (total ? ((count / total) * 100).toFixed(1) : '0')

const formatCalendarDate = (date: { year: number; month: number; day: number }) =>
  new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const donutClass = 'mx-auto aspect-square h-55 max-w-65 [--vis-donut-central-label-text-color:var(--foreground)] [--vis-donut-central-sub-label-text-color:var(--muted-foreground)]'
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
          Geographic distribution monitoring across Agusan del Sur with intern registry.
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

    <!-- ─── LPII Distribution ─── -->
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
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
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

          <Select v-model="selectedAppointmentFilter">
            <SelectTrigger class="w-full" aria-label="Filter by appointment term">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Appointments</SelectItem>
              <SelectItem value="EXPIRING">Expiring Soon (≤ 30d)</SelectItem>
              <SelectItem value="EXPIRED">Expired Terms</SelectItem>
              <SelectItem value="ACTIVE">Active Appointments</SelectItem>
              <SelectItem value="COMPLETED">Completed / Concluded</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="selectedLpiiFilter">
            <SelectTrigger class="w-full" aria-label="Filter by LPII zone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All LPII Zones</SelectItem>
              <SelectItem value="LOWLAND">Lowland</SelectItem>
              <SelectItem value="UPLAND">Upland</SelectItem>
              <SelectItem value="WETLAND">Wetland</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="selectedYearFilter">
            <SelectTrigger class="w-full" aria-label="Filter by batch year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Batch Years</SelectItem>
              <SelectItem v-for="y in availableYears" :key="y" :value="y.toString()">
                Batch {{ y }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="selectedGenderFilter">
            <SelectTrigger class="w-full" aria-label="Filter by gender">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>

          <Select v-model="selectedStatusFilter">
            <SelectTrigger class="w-full" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Hired">Hired</SelectItem>
              <SelectItem value="Resigned">Resigned</SelectItem>
            </SelectContent>
          </Select>
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
          <Button variant="destructive" size="sm" class="cursor-pointer" @click="isBulkDeleteDialogOpen = true">
            Delete Selected ({{ selectedInternIds.length }})
          </Button>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
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
                <TableHead>LPII</TableHead>
                <TableHead>Assigned Office</TableHead>
                <TableHead>Period / Term</TableHead>
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
                    <Badge variant="outline" :class="LPII_CONFIG[intern.lpiiTag].badgeClass">
                      {{ LPII_CONFIG[intern.lpiiTag].label }}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div class="flex max-w-50 flex-col">
                      <span class="truncate text-sm" :title="intern.assignedOffice">{{ intern.assignedOffice }}</span>
                      <span class="truncate text-xs text-muted-foreground" :title="intern.course">{{ intern.course }}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div class="flex flex-col gap-1">
                      <span class="text-sm">
                        {{ intern.batchYear }}
                        <span class="text-muted-foreground">· Term {{ intern.currentAppointment?.termNumber || 1 }}</span>
                      </span>
                      <span class="text-xs text-muted-foreground">{{ intern.period }}</span>
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
                        @click="openRenewalDialog(intern)"
                      >
                        Renew
                      </Button>
                      <Button variant="ghost" size="sm" class="cursor-pointer" @click="openInternDetails(intern)">
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 cursor-pointer text-muted-foreground"
                        title="Edit deployment details"
                        :aria-label="'Edit ' + intern.fullName"
                        @click="openInternEdit(intern)"
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
                <TableCell colspan="9" class="p-0 whitespace-normal">
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

    <!-- ─── INTERN DETAILS / EDIT DIALOG ─── -->
    <Dialog v-model:open="isDetailsModalOpen">
      <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{{ selectedIntern?.fullName }}</DialogTitle>
          <DialogDescription>
            <span class="font-mono">{{ selectedIntern?.code }}</span>
            · GIP {{ selectedIntern?.program }} Intern
            <template v-if="isEditingIntern"> · Editing deployment</template>
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedIntern" class="grid gap-6">
          <!-- Summary -->
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" :class="getGipStatusBadgeClass(selectedIntern.status)">
              {{ selectedIntern.status }}
            </Badge>
            <Badge variant="outline" :class="LPII_CONFIG[selectedIntern.lpiiTag].badgeClass">
              {{ LPII_CONFIG[selectedIntern.lpiiTag].label }}
            </Badge>
            <span class="text-muted-foreground">
              Brgy. {{ selectedIntern.barangay }}, {{ selectedIntern.municipality }}
            </span>
          </div>

          <!-- ─── Read-only ─── -->
          <template v-if="!isEditingIntern">
            <section class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold">Deployment Information</h3>
                <Button variant="ghost" size="sm" class="cursor-pointer" @click="startEdit">
                  Edit
                </Button>
              </div>
              <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div v-for="field in internDetailFields" :key="field.label">
                  <span class="text-xs text-muted-foreground">{{ field.label }}</span>
                  <p :class="['text-sm font-medium', field.mono && 'font-mono']">{{ field.value || '—' }}</p>
                </div>
              </div>
            </section>

            <Separator />

            <section class="space-y-3">
              <h3 class="text-sm font-semibold">Documents Submitted</h3>
              <div v-if="internDocumentsSubmitted.length > 0" class="flex flex-wrap gap-1.5">
                <Badge v-for="doc in internDocumentsSubmitted" :key="doc" variant="secondary">
                  {{ doc }}
                </Badge>
              </div>
              <p v-else class="text-sm text-muted-foreground">No documents uploaded yet.</p>
            </section>
          </template>

          <!-- ─── Edit Mode ─── -->
          <div v-else class="grid gap-4">
            <!-- Funding Program -->
            <div class="grid gap-2">
              <Label>Funding Program</Label>
              <div role="radiogroup" class="grid grid-cols-2 gap-3">
                <button
                  v-for="opt in programOptions"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="editForm.program === opt.value"
                  :class="[
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    editForm.program === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
                  ]"
                  @click="setEditProgram(opt.value)"
                >
                  <Avatar class="size-8 shrink-0 rounded-md border bg-background">
                    <img :src="opt.logo" :alt="opt.label" class="object-cover" />
                  </Avatar>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2 text-sm font-semibold">
                      {{ opt.label }}
                      <CheckCircle2 v-if="editForm.program === opt.value" class="size-4 shrink-0 text-primary" />
                    </div>
                    <p class="text-xs text-muted-foreground">{{ opt.description }}</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Assigned Office -->
            <div class="grid gap-2">
              <Label>Assigned Office / Station</Label>
              <Combobox
                v-model="selectedOffice"
                v-model:search-term="officeSearchQuery"
                :ignore-filter="true"
                by="id"
              >
                <ComboboxAnchor as-child>
                  <ComboboxTrigger as-child>
                    <Button
                      type="button"
                      variant="outline"
                      class="w-full justify-between overflow-hidden font-normal"
                      :disabled="isLoadingOffices"
                    >
                      <span class="min-w-0 flex-1 truncate text-left">
                        <template v-if="isLoadingOffices">Loading offices...</template>
                        <template v-else-if="selectedOffice">{{ selectedOffice.office_name }}</template>
                        <span v-else :class="!editForm.assignedOffice && 'text-muted-foreground'">
                          {{ editForm.assignedOffice || 'Select office...' }}
                        </span>
                      </span>
                      <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                    </Button>
                  </ComboboxTrigger>
                </ComboboxAnchor>

                <ComboboxList>
                  <ComboboxInput
                    placeholder="Search offices..."
                    @input="officeSearchQuery = ($event.target as HTMLInputElement).value"
                  />
                  <ComboboxViewport>
                    <ComboboxEmpty>No office found.</ComboboxEmpty>
                    <ComboboxGroup>
                      <ComboboxItem v-for="office in filteredOffices" :key="office.id" :value="office">
                        <span class="min-w-0 flex-1 truncate">{{ office.office_name }}</span>
                        <Badge variant="secondary" class="shrink-0">{{ office.office_code }}</Badge>
                        <ComboboxItemIndicator>
                          <CheckIcon class="size-4 shrink-0" />
                        </ComboboxItemIndicator>
                      </ComboboxItem>
                    </ComboboxGroup>
                  </ComboboxViewport>
                </ComboboxList>
              </Combobox>
            </div>

            <!-- Supervisor & Stipend -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="editSupervisor">Designated Supervisor</Label>
                <Input
                  id="editSupervisor"
                  v-model="editForm.supervisor"
                  placeholder="e.g. Maria Santos"
                  :class="selectedOffice?.office_head ? 'bg-muted/40' : ''"
                  :readonly="!!selectedOffice?.office_head"
                />
                <p v-if="selectedOffice?.office_head" class="text-xs text-muted-foreground">
                  Auto-filled from office directory
                </p>
              </div>

              <div class="grid gap-2">
                <Label for="editStipend">Stipend Rate</Label>
                <Input id="editStipend" v-model="editForm.stipend" placeholder="e.g. ₱479.35 / day" class="font-mono" />
              </div>
            </div>

            <!-- Deployment Period -->
            <div class="grid grid-cols-2 gap-4">
              <div class="grid gap-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger as-child>
                    <Button
                      type="button"
                      variant="outline"
                      :class="cn('w-full justify-start font-normal', !deploymentStartDate && 'text-muted-foreground')"
                    >
                      <CalendarDays class="size-4 shrink-0" />
                      {{ deploymentStartDate ? formatCalendarDate(deploymentStartDate) : 'Pick start date' }}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="deploymentStartDate" initial-focus />
                  </PopoverContent>
                </Popover>
              </div>

              <div class="grid gap-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger as-child>
                    <Button
                      type="button"
                      variant="outline"
                      :class="cn('w-full justify-start font-normal', !deploymentEndDate && 'text-muted-foreground')"
                    >
                      <CalendarDays class="size-4 shrink-0" />
                      {{ deploymentEndDate ? formatCalendarDate(deploymentEndDate) : 'Pick end date' }}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="deploymentEndDate" initial-focus />
                  </PopoverContent>
                </Popover>
              </div>

              <p v-if="formattedPeriod" class="col-span-2 text-sm text-muted-foreground">
                Period: <span class="font-medium text-foreground">{{ formattedPeriod }}</span>
              </p>
            </div>

            <!-- Status -->
            <div class="grid gap-2">
              <Label for="editStatus">Deployment Status</Label>
              <Select v-model="editForm.status">
                <SelectTrigger id="editStatus" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active (Ongoing Deployment)</SelectItem>
                  <SelectItem value="Hired">Hired (Absorbed / Employed)</SelectItem>
                  <SelectItem value="Resigned">Resigned (Completed / Resigned)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <template v-if="!isEditingIntern">
            <Button variant="outline" class="cursor-pointer" @click="closeInternDetails">Close</Button>
            <Button
              v-if="selectedIntern?.status === 'Active'"
              class="cursor-pointer"
              @click="openRenewalDialog(selectedIntern); closeInternDetails()"
            >
              Renew / Conclude Term
            </Button>
          </template>
          <template v-else>
            <Button variant="outline" class="cursor-pointer" :disabled="isUpdatingIntern" @click="cancelEdit">
              Cancel
            </Button>
            <Button class="cursor-pointer" :disabled="isUpdatingIntern" @click="saveEdit">
              <Loader2 v-if="isUpdatingIntern" class="size-4 shrink-0 animate-spin" />
              {{ isUpdatingIntern ? 'Saving...' : 'Save Changes' }}
            </Button>
          </template>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── APPOINTMENT RENEWAL / CONCLUSION DIALOG ─── -->
    <Dialog :open="isRenewalDialogOpen" @update:open="onRenewalOpenChange">
      <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Renew or conclude appointment</DialogTitle>
          <DialogDescription>
            {{ renewalIntern?.fullName }} · <span class="font-mono">{{ renewalIntern?.code }}</span> · {{ renewalIntern?.municipality }}
          </DialogDescription>
        </DialogHeader>

        <div v-if="renewalIntern" class="grid min-w-0 gap-6">
          <!-- ─── Current Appointment ─── -->
          <section class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-base font-semibold">Current Appointment · Term {{ currentTermNumber }}</h3>
              <Badge v-if="renewalIntern.currentAppointment?.isExpired" variant="destructive">Expired</Badge>
              <Badge
                v-else-if="renewalIntern.currentAppointment?.isExpiringSoon"
                variant="outline"
                class="border-warning/30 bg-warning/10 text-warning"
              >
                Ends in {{ renewalIntern.daysRemaining }} days
              </Badge>
              <Badge v-else variant="outline" :class="getGipStatusBadgeClass('Active')">Active</Badge>
            </div>
            <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div class="min-w-0">
                <span class="text-xs text-muted-foreground">Host Office</span>
                <p class="text-sm font-medium">
                  {{ renewalIntern.assignedOffice || '—' }}
                  <span v-if="findOffice(renewalIntern.assignedOffice)" class="font-mono text-xs text-muted-foreground">
                    ({{ findOffice(renewalIntern.assignedOffice)?.office_code }})
                  </span>
                </p>
              </div>
              <div class="min-w-0">
                <span class="text-xs text-muted-foreground">Supervisor</span>
                <p class="text-sm font-medium">{{ renewalIntern.supervisor || '—' }}</p>
              </div>
              <div class="min-w-0">
                <span class="text-xs text-muted-foreground">Program & Rate</span>
                <p class="text-sm font-medium">{{ renewalIntern.program }} · {{ renewalIntern.stipend }}</p>
              </div>
              <div class="min-w-0">
                <span class="text-xs text-muted-foreground">Period Coverage</span>
                <p class="text-sm font-medium">{{ renewalIntern.period }}</p>
              </div>
              <div v-if="renewalIntern.currentAppointment?.appointmentCode" class="min-w-0">
                <span class="text-xs text-muted-foreground">Appointment Code</span>
                <p class="font-mono text-sm font-medium">{{ renewalIntern.currentAppointment.appointmentCode }}</p>
              </div>
            </div>

            <!-- Appointment History -->
            <Collapsible v-if="renewalIntern.appointmentHistory && renewalIntern.appointmentHistory.length > 0">
              <CollapsibleTrigger as-child>
                <Button variant="link" size="sm" class="group h-auto cursor-pointer p-0 text-muted-foreground">
                  View appointment history ({{ renewalIntern.appointmentHistory.length }} term{{ renewalIntern.appointmentHistory.length > 1 ? 's' : '' }})
                  <ChevronDown class="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul class="mt-3 divide-y rounded-lg border">
                  <li
                    v-for="apt in renewalIntern.appointmentHistory"
                    :key="apt.id"
                    class="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium">Term {{ apt.termNumber }} · {{ apt.assignedOffice }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ apt.startDate }} to {{ apt.endDate }} · {{ apt.dailyStipend }}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      class="shrink-0"
                      :class="apt.status === 'Renewed' ? 'border-info/30 bg-info/10 text-info' : getGipStatusBadgeClass(apt.status)"
                    >
                      {{ apt.status }}
                    </Badge>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <Separator />

          <!-- ─── Decision ─── -->
          <section class="grid min-w-0 gap-4">
            <div class="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                role="tab"
                :aria-selected="renewalActionMode === 'renew'"
                :disabled="isSubmittingRenewal"
                :class="['cursor-pointer', renewalActionMode === 'renew' && 'bg-background shadow-xs hover:bg-background']"
                @click="renewalActionMode = 'renew'"
              >
                Renew (Term {{ nextTermNumber }})
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                role="tab"
                :aria-selected="renewalActionMode === 'conclude'"
                :disabled="isSubmittingRenewal"
                :class="['cursor-pointer', renewalActionMode === 'conclude' && 'bg-background shadow-xs hover:bg-background']"
                @click="renewalActionMode = 'conclude'"
              >
                Conclude Internship
              </Button>
            </div>

            <!-- Renew -->
            <template v-if="renewalActionMode === 'renew'">
              <div v-if="!renewInitialValues" class="grid gap-4">
                <Skeleton class="h-16 w-full" />
                <Skeleton class="h-9 w-full" />
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Skeleton class="h-9 w-full" />
                  <Skeleton class="h-9 w-full" />
                </div>
              </div>

              <Form
                v-else
                :key="renewalIntern.id"
                v-slot="{ values, setFieldValue }"
                :validation-schema="renewSchema"
                :initial-values="renewInitialValues"
                class="grid min-w-0 gap-4"
                @submit="submitRenewal"
              >
                <!-- Funding program -->
                <FormField v-slot="{ value, handleChange }" name="program">
                  <FormItem>
                    <FormLabel>Funding Program</FormLabel>
                    <FormControl>
                      <div role="radiogroup" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                          v-for="opt in renewalProgramOptions"
                          :key="opt.value"
                          type="button"
                          role="radio"
                          :aria-checked="value === opt.value"
                          :disabled="isSubmittingRenewal"
                          :class="[
                            'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                            value === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
                          ]"
                          @click="() => {
                            handleChange(opt.value)
                            const stipend = stipendForProgram(opt.value, values.stipend)
                            if (stipend) setFieldValue('stipend', stipend)
                          }"
                        >
                          <img :src="opt.logo" :alt="opt.value" class="size-8 shrink-0 rounded-md border bg-background object-cover" />
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-semibold">{{ opt.label }}</p>
                            <p class="text-xs text-muted-foreground">{{ opt.description }}</p>
                          </div>
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <!-- Term period -->
                <div class="grid min-w-0 gap-3">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-sm font-medium">Renewed Term Period</span>
                    <div class="flex items-center gap-1">
                      <Button
                        v-for="months in durationPresets"
                        :key="months"
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-7 cursor-pointer"
                        :disabled="!values.startDate || isSubmittingRenewal"
                        @click="setFieldValue('endDate', addDurationMonths(values.startDate, months))"
                      >
                        {{ months }} months
                      </Button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField v-slot="{ value, handleChange }" name="startDate">
                      <FormItem class="min-w-0">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger as-child>
                            <FormControl>
                              <Button type="button" variant="outline" class="w-full justify-start font-normal" :disabled="isSubmittingRenewal">
                                <span v-if="value">{{ formatDeploymentDate(value) }}</span>
                                <span v-else class="text-muted-foreground">Pick start date</span>
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent class="w-auto p-0" align="start">
                            <Calendar :model-value="value" initial-focus @update:model-value="handleChange" />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ value, handleChange }" name="endDate">
                      <FormItem class="min-w-0">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger as-child>
                            <FormControl>
                              <Button type="button" variant="outline" class="w-full justify-start font-normal" :disabled="isSubmittingRenewal">
                                <span v-if="value">{{ formatDeploymentDate(value) }}</span>
                                <span v-else class="text-muted-foreground">Pick end date</span>
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent class="w-auto p-0" align="start">
                            <Calendar :model-value="value" initial-focus @update:model-value="handleChange" />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <!-- Assigned office (full row so long names never spill into the supervisor field) -->
                  <FormField v-slot="{ value, handleChange }" name="office">
                    <FormItem class="min-w-0 sm:col-span-2">
                      <FormLabel>Assigned Office / Station</FormLabel>
                      <Combobox
                        v-model:search-term="renewalOfficeSearchQuery"
                        class="min-w-0"
                        :model-value="value"
                        :ignore-filter="true"
                        by="id"
                        @update:model-value="(office) => {
                          handleChange(office)
                          setFieldValue('supervisor', (office as DirectoryRow | null)?.office_head ?? '')
                        }"
                      >
                        <ComboboxAnchor as-child>
                          <ComboboxTrigger as-child>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                class="w-full min-w-0 justify-between overflow-hidden font-normal"
                                :disabled="isLoadingRenewalOffices || isSubmittingRenewal"
                              >
                                <span v-if="isLoadingRenewalOffices" class="truncate text-muted-foreground">Loading offices...</span>
                                <span v-else-if="value" class="flex min-w-0 flex-1 items-center gap-2 text-left">
                                  <span class="truncate">{{ (value as DirectoryRow).office_name }}</span>
                                  <span class="shrink-0 font-mono text-xs text-muted-foreground">
                                    {{ (value as DirectoryRow).office_code }}
                                  </span>
                                </span>
                                <span v-else class="truncate text-muted-foreground">Select office...</span>
                                <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </ComboboxTrigger>
                        </ComboboxAnchor>

                        <ComboboxList>
                          <ComboboxInput
                            placeholder="Search office, abbreviation, or head..."
                            @input="renewalOfficeSearchQuery = ($event.target as HTMLInputElement).value"
                          />
                          <ComboboxViewport>
                            <ComboboxEmpty>No office found.</ComboboxEmpty>
                            <ComboboxGroup>
                              <ComboboxItem v-for="office in renewalFilteredOffices" :key="office.id" :value="office">
                                <div class="flex min-w-0 flex-1 flex-col">
                                  <span class="truncate">{{ office.office_name }}</span>
                                  <span class="truncate text-xs text-muted-foreground">
                                    {{ office.office_head || 'No head designated' }}
                                  </span>
                                </div>
                                <span class="shrink-0 font-mono text-xs text-muted-foreground">{{ office.office_code }}</span>
                                <ComboboxItemIndicator>
                                  <CheckIcon class="size-4 shrink-0" />
                                </ComboboxItemIndicator>
                              </ComboboxItem>
                            </ComboboxGroup>
                          </ComboboxViewport>
                        </ComboboxList>
                      </Combobox>
                      <FormMessage />
                    </FormItem>
                  </FormField>

                  <!-- Supervisor -->
                  <FormField v-slot="{ componentField }" name="supervisor">
                    <FormItem class="min-w-0">
                      <FormLabel>Designated Supervisor</FormLabel>
                      <FormControl>
                        <Input
                          v-bind="componentField"
                          placeholder="e.g. Maria Santos, Division Head"
                          :readonly="!!values.office?.office_head"
                          :class="values.office?.office_head ? 'bg-muted/40' : ''"
                          :disabled="isSubmittingRenewal"
                        />
                      </FormControl>
                      <FormDescription v-if="values.office?.office_head">Auto-filled from office directory</FormDescription>
                      <FormMessage />
                    </FormItem>
                  </FormField>

                  <!-- Stipend -->
                  <FormField v-slot="{ componentField }" name="stipend">
                    <FormItem class="min-w-0">
                      <FormLabel>Daily Stipend</FormLabel>
                      <FormControl>
                        <Input v-bind="componentField" placeholder="e.g. ₱479.35 / day" class="font-mono" :disabled="isSubmittingRenewal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>

                <!-- Notes -->
                <FormField v-slot="{ componentField }" name="notes">
                  <FormItem>
                    <FormLabel>Renewal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        v-bind="componentField"
                        rows="3"
                        :placeholder="`e.g. Satisfactory performance in Term ${currentTermNumber}`"
                        :disabled="isSubmittingRenewal"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <DialogFooter>
                  <Button type="button" variant="outline" class="cursor-pointer" :disabled="isSubmittingRenewal" @click="onRenewalOpenChange(false)">
                    Cancel
                  </Button>
                  <Button type="submit" class="cursor-pointer" :disabled="isSubmittingRenewal">
                    <Loader2 v-if="isSubmittingRenewal" class="size-4 shrink-0 animate-spin" />
                    {{ isSubmittingRenewal ? 'Renewing...' : `Renew for Term ${nextTermNumber}` }}
                  </Button>
                </DialogFooter>
              </Form>
            </template>

            <!-- Conclude -->
            <Form
              v-else
              :key="`conclude-${renewalIntern.id}`"
              :validation-schema="concludeSchema"
              :initial-values="concludeInitialValues"
              class="grid gap-4"
              @submit="submitConclusion"
            >
              <FormField v-slot="{ value, handleChange }" name="action">
                <FormItem>
                  <FormLabel>Concluding Status</FormLabel>
                  <FormControl>
                    <div role="radiogroup" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        v-for="opt in concludeOptions"
                        :key="opt.value"
                        type="button"
                        role="radio"
                        :aria-checked="value === opt.value"
                        :disabled="isSubmittingRenewal"
                        :class="[
                          'flex cursor-pointer flex-col items-start rounded-lg border p-3 text-left transition-colors',
                          value === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
                        ]"
                        @click="handleChange(opt.value)"
                      >
                        <span class="text-sm font-semibold">{{ opt.label }}</span>
                        <span class="text-xs text-muted-foreground">{{ opt.description }}</span>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="notes">
                <FormItem>
                  <FormLabel>Exit / Concluding Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      v-bind="componentField"
                      rows="3"
                      placeholder="e.g. Completed standard 6-month GIP program. Certificate issued."
                      :disabled="isSubmittingRenewal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <DialogFooter>
                <Button type="button" variant="outline" class="cursor-pointer" :disabled="isSubmittingRenewal" @click="onRenewalOpenChange(false)">
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" class="cursor-pointer" :disabled="isSubmittingRenewal">
                  <Loader2 v-if="isSubmittingRenewal" class="size-4 shrink-0 animate-spin" />
                  {{ isSubmittingRenewal ? 'Concluding...' : 'Conclude Internship' }}
                </Button>
              </DialogFooter>
            </Form>
          </section>
        </div>
      </DialogContent>
    </Dialog>

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
  </div>
</template>
