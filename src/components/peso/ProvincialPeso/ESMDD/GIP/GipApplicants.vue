<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckIcon,
  ChevronsUpDownIcon,
  Loader2,
  Lock,
  Minus,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  Users,
  X,
  Eye,
} from '@lucide/vue'
import { VisDonut, VisSingleContainer, VisTooltip } from '@unovis/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ChartContainer } from '@/components/ui/chart'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import SwipeCardList from '@/components/SwipeCardList.vue'
import type { ApplicantStatusDataPoint, LpiiDataPoint } from '@/types/peso/provincialPeso/gip'
import { useGipApplicants } from '@/composables/peso/provincialPeso/useGipApplicants'
import { useGipBatchUpload } from '@/composables/peso/provincialPeso/useGipBatchUpload'
import { useGipEditCandidate } from '@/composables/peso/provincialPeso/useGipEditCandidate'
import { getGipStatusBadgeClass, getGipStatusDotClass } from '@/helpers/peso/provincialPeso/gipHelper'
import GipApplicantNsrpDetails from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipApplicantNsrpDetails.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
  ComboboxViewport,
} from '@/components/ui/combobox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { DirectoryRow } from '@/types/common/directory'
import { useGipEditApplicant } from '@/composables/peso/provincialPeso/useGipEditApplicant'
import { useGipBulkDeploy } from '@/composables/peso/provincialPeso/useGipBulkDeploy'

const {
  applicants,
  applicantStatusData,
  applicantMaleLpiiData,
  applicantFemaleLpiiData,
  totalApplicantStatus,
  totalMaleApplicantLpii,
  totalFemaleApplicantLpii,
  filteredApplicants,
  paginatedApplicants,
  totalApplicantPages,
  availableMonths,
  selectedApplicantForDetails,
  isLoading,
  searchQuery,
  statusTab,
  toggleStatusTab,
  selectedLpiiFilter,
  selectedMonthFilter,
  selectedGenderFilter,
  selectedStatusFilter,
  currentPage,
  pageSize,
  selectedApplicantIds,
  isAllSelected,
  isIndeterminate,
  toggleSelectAll,
  toggleSelectApplicant,
  clearSelection,
  donutTooltipTriggers,
  statusDonutTooltipTriggers,
  getInitials,
  formatDateDisplay,
  getApplicantDocuments,
  goBack,
  resetFilters,
  openApplicantDetails,
  closeApplicantDetails,
  openEditApplicantDialog,
  exportCsv,
  refreshApplicantsData,
  navigateToPriority,

  // File Input & Batch Trigger
  setFileInputRef,
  triggerFileInput,
  handleUploadBatchClick,

  // Remove Dialog
  applicantToRemove,
  isRemoveDialogOpen,
  isRemoving,
  promptRemoveApplicant,
  cancelRemoveApplicant,
  showApplicantCards,
  getApplicantSwipeActions,
  getApplicantCard,
  confirmRemoveApplicant,

  // Bulk Delete Dialog
  isBulkDeleteDialogOpen,
  isBulkDeleting,
  handleBulkDelete,

  // Bulk Deploy Dialog
  isBulkDeployDialogOpen,
  selectedApplicants,

  // LPII Config
  LPII_CONFIG,
} = useGipApplicants()

const {
  isDragging,
  isParsing,
  uploadedFile,
  parsedApplicants,
  editingCandidate,
  editingCandidateIndex,
  isEditModalOpen,
  ocrProgress,
  validApplicantsCount,
  invalidApplicantsCount,
  duplicatesCount,
  skippedCount,
  hasParsedData,
  isSubmitting,
  isOpen: isBatchUploadOpen,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  removeCandidate,
  openEditCandidateModal,
  saveEditedCandidate,
  confirmImport,
  resetBatchState,
  downloadTemplate,

  // Duplicate Review Dialog
  duplicateCandidate,
  isDuplicateModalOpen,
  openDuplicateModal,
  setAllDuplicatesAction,
  selectedDuplicateAction,
  selectedDuplicateProgram,
  duplicateActionOptions,
  duplicateProgramOptions,
  confirmDuplicateResolution,
} = useGipBatchUpload()

const {
  form: candidateForm,
  skillsInput: candidateSkillsInput,
  validationErrors: candidateValidationErrors,
  isValid: isCandidateValid,
  municipalities: candidateMunicipalities,
  documentOptions: candidateDocumentOptions,
  lpiiOptions: candidateLpiiOptions,
  setLpiiCategory: setCandidateLpii,
  toggleDocument: toggleCandidateDocument,
  handleSave: saveCandidateEdits,
  handleClose: closeCandidateEdit,
} = useGipEditCandidate({
  isOpen: isEditModalOpen,
  candidate: editingCandidate,
  index: editingCandidateIndex,
  onSave: saveEditedCandidate,
})

const {
  applicantToEdit,
  isEditApplicantDialogOpen,
  isSavingApplicantReview,
  isEditingHiredApplicant,
  isRemarksRequired,
  isOrientationRequired,
  uploadedFileFor,
  isLoadingUploadedDocuments,
  editStatusOptions,
  editDocuments,
  editDocumentOptions,
  lockedDocument,
  isExtraDocument,
  toggleEditDocument,
  onEditDialogOpenChange,
  closeEditApplicantDialog,
  saveApplicantReview,
} = useGipEditApplicant()

const {
  isBulkDeploying,
  deployableApplicants,
  skippedApplicants,
  bulkDeploySchema,
  bulkDeployInitialValues,
  programOptions,
  deploymentStatusOptions,
  officeSearchQuery,
  filteredOffices,
  isLoadingOffices,
  stipendForProgram,
  formatDeploymentDate,
  formatDeploymentPeriod,
  onBulkDeployOpenChange,
  submitBulkDeploy,
} = useGipBulkDeploy(selectedApplicants, isBulkDeployDialogOpen, clearSelection)

const statusTabs = ['ALL', 'Pending', 'Approved', 'Hired', 'Rejected'] as const

const lpiiCharts = computed(() => [
  { key: 'male', title: 'Male Applicants', data: applicantMaleLpiiData.value, total: totalMaleApplicantLpii.value },
  { key: 'female', title: 'Female Applicants', data: applicantFemaleLpiiData.value, total: totalFemaleApplicantLpii.value },
])

const percentOf = (count: number, total: number) => (total ? ((count / total) * 100).toFixed(1) : '0')

const donutClass = 'mx-auto aspect-square h-55 max-w-65 [--vis-donut-central-label-text-color:var(--foreground)] [--vis-donut-central-sub-label-text-color:var(--muted-foreground)]'
</script>

<template>
  <!-- ─── APPLICANT NSRP DETAILS VIEW ─── -->
  <GipApplicantNsrpDetails
    v-if="selectedApplicantForDetails"
    :applicant="selectedApplicantForDetails"
    @back="closeApplicantDetails"
  />

  <!-- ─── REGISTRY MASTER VIEW (CHARTS & TABLE) ─── -->
  <div v-else class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
          <ArrowLeft class="size-4 shrink-0" />
          Back to Dashboard
        </Button>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">GIP — Applicant Registry</h1>
        <p class="text-sm text-muted-foreground">
          Tracks GIP applicant allocation, slot availability, and partner agency distribution across Agusan del Sur.
        </p>
      </div>

      <!-- Quick Status Filter -->
      <div class="flex flex-wrap items-center gap-1 self-start rounded-lg bg-muted p-1 sm:self-auto">
        <Button
          v-for="tab in statusTabs"
          :key="tab"
          size="sm"
          variant="ghost"
          :class="['h-7 cursor-pointer px-3', statusTab === tab && 'bg-background shadow-xs hover:bg-background']"
          @click="statusTab = tab"
        >
          {{ tab === 'ALL' ? 'All' : tab }}
        </Button>
      </div>
    </div>

    <!-- ─── Applicant Status & LPII Breakdown ─── -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <!-- Combined Applicant Status -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Applicant Status</CardTitle>
          <CardDescription>
            {{ totalApplicantStatus.toLocaleString() }} total · select a status to filter
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Skeleton v-if="isLoading" class="mx-auto aspect-square h-55 rounded-full" />
          <ChartContainer v-else-if="totalApplicantStatus > 0" :config="{}" :class="donutClass">
            <VisSingleContainer :data="applicantStatusData" :height="220">
              <VisDonut
                :value="(d: ApplicantStatusDataPoint) => d.count"
                :color="(d: ApplicantStatusDataPoint) => d.color"
                :pad-angle="0.03"
                :corner-radius="4"
                :arc-width="38"
                :central-label="totalApplicantStatus.toLocaleString()"
                central-sub-label="Total Applicants"
              />
              <VisTooltip :triggers="statusDonutTooltipTriggers" />
            </VisSingleContainer>
          </ChartContainer>
          <p v-else class="flex h-55 items-center justify-center text-sm text-muted-foreground">
            No applicant records yet
          </p>

          <div class="grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
            <button
              v-for="item in applicantStatusData"
              :key="item.status"
              type="button"
              :aria-pressed="statusTab === item.status"
              :class="[
                'flex cursor-pointer flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors',
                statusTab === item.status ? 'bg-muted ring-1 ring-ring' : 'hover:bg-muted/60',
              ]"
              @click="toggleStatusTab(item.status)"
            >
              <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span :class="['size-2 shrink-0 rounded-full', getGipStatusDotClass(item.status)]" />
                {{ item.label }}
              </span>
              <span class="text-sm font-semibold tabular-nums">{{ item.count.toLocaleString() }}</span>
              <span class="text-xs text-muted-foreground tabular-nums">{{ percentOf(item.count, totalApplicantStatus) }}%</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- Male / Female LPII Breakdown -->
      <Card v-for="chart in lpiiCharts" :key="chart.key">
        <CardHeader>
          <CardTitle class="text-base">{{ chart.title }}</CardTitle>
          <CardDescription>{{ chart.total.toLocaleString() }} total · LPII breakdown by zone</CardDescription>
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
                :central-sub-label="chart.title"
              />
              <VisTooltip :triggers="donutTooltipTriggers" />
            </VisSingleContainer>
          </ChartContainer>
          <p v-else class="flex h-55 items-center justify-center text-sm text-muted-foreground">
            No {{ chart.key }} applicant records yet
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

    <!-- ─── Master Registry Table ─── -->
    <Card class="gap-0 py-0">
      <CardHeader class="gap-4 border-b py-4 [.border-b]:pb-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-1">
            <CardTitle class="text-base">Applicant Master Registry</CardTitle>
            <CardDescription>
              {{ statusTab === 'ALL' ? 'All applicants' : `Status: ${statusTab}` }}
              · Showing {{ filteredApplicants.length }} of {{ applicants.length }} records
            </CardDescription>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" class="cursor-pointer" @click="navigateToPriority">
              Priority Applicants
            </Button>
            <Button variant="outline" size="sm" class="cursor-pointer" @click="exportCsv">
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer"
              :disabled="isLoading"
              @click="refreshApplicantsData"
            >
              <RefreshCw :class="['size-4 shrink-0', isLoading && 'animate-spin']" />
              {{ isLoading ? 'Refreshing...' : 'Refresh' }}
            </Button>
            <Button size="sm" class="cursor-pointer" @click="handleUploadBatchClick">
              <UploadCloud class="size-4 shrink-0" />
              Upload Batch
            </Button>
            <input
              :ref="setFileInputRef"
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              class="hidden"
              @change="onFileInputChange"
            />
          </div>
        </div>

        <!-- Search & Filters -->
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div class="relative sm:col-span-2">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search name, course, municipality..."
              class="pr-9 pl-8"
              aria-label="Search applicants"
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

          <Select v-model="selectedMonthFilter">
            <SelectTrigger class="w-full" aria-label="Filter by month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="m in availableMonths" :key="m.value" :value="m.value">
                {{ m.label }}
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
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Hired">Hired</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- Bulk Action Bar -->
        <div
          v-if="selectedApplicantIds.length > 0"
          class="flex flex-col gap-2 border-b bg-muted/50 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="font-medium">
              {{ selectedApplicantIds.length }} applicant{{ selectedApplicantIds.length > 1 ? 's' : '' }} selected
            </span>
            <Button variant="link" size="sm" class="h-auto cursor-pointer p-0 text-muted-foreground" @click="clearSelection">
              Clear selection
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="destructive" size="sm" class="cursor-pointer" @click="isBulkDeleteDialogOpen = true">
              Delete Selected
            </Button>
            <Button size="sm" class="cursor-pointer" @click="isBulkDeployDialogOpen = true">
              Deploy Selected ({{ selectedApplicantIds.length }})
            </Button>
          </div>
        </div>

        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          v-if="showApplicantCards"
          class="p-3 md:hidden"
          :items="paginatedApplicants"
          :item-key="(applicant) => applicant.id"
          :card="getApplicantCard"
          :actions="getApplicantSwipeActions"
          :loading="isLoading"
          :height="76"
          hint="Swipe left on an applicant for actions."
          :is-selected="(applicant) => selectedApplicantIds.includes(applicant.id)"
          :all-selected="isAllSelected ? true : isIndeterminate ? 'indeterminate' : false"
          @toggle="(applicant, value) => toggleSelectApplicant(applicant.id, value)"
          @toggle-all="toggleSelectAll"
        >
          <template #default="{ item: applicant, card }">
            <Avatar class="size-9 shrink-0 border">
              <AvatarFallback class="text-xs font-semibold">{{ getInitials(applicant.fullName) }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ card.title }}</p>
              <p class="truncate text-xs text-muted-foreground">{{ card.subtitle }}</p>
            </div>
          </template>
          <template #empty>
            <Empty class="py-10">
              <EmptyHeader>
                <EmptyTitle>No matching applicants</EmptyTitle>
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

        <!-- Desktop: table (also on mobile while the registry is empty, for the import flow) -->
        <div class="overflow-x-auto" :class="{ 'hidden md:block': showApplicantCards }">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/40 hover:bg-muted/40">
                <TableHead class="w-12 px-4 text-center">
                  <Checkbox
                    :model-value="isAllSelected ? true : isIndeterminate ? 'indeterminate' : false"
                    aria-label="Select all applicants on page"
                    @update:model-value="toggleSelectAll"
                  >
                    <template #default="{ modelValue }">
                      <Minus v-if="modelValue === 'indeterminate'" class="size-3 stroke-3" />
                      <Check v-else class="size-3.5" />
                    </template>
                  </Checkbox>
                </TableHead>
                <TableHead class="min-w-50">Applicant</TableHead>
                <TableHead>Municipality & Barangay</TableHead>
                <TableHead>LPII</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Date Applied</TableHead>
                <TableHead>Documents</TableHead>
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
                  <TableCell><Skeleton class="ml-auto h-8 w-24" /></TableCell>
                </TableRow>
              </template>

              <template v-else-if="paginatedApplicants.length > 0">
                <TableRow
                  v-for="applicant in paginatedApplicants"
                  :key="applicant.id"
                  :data-state="selectedApplicantIds.includes(applicant.id) ? 'selected' : undefined"
                >
                  <TableCell class="px-4 text-center" @click.stop>
                    <Checkbox
                      :model-value="selectedApplicantIds.includes(applicant.id)"
                      :aria-label="'Select ' + applicant.fullName"
                      @update:model-value="(val) => toggleSelectApplicant(applicant.id, val)"
                    />
                  </TableCell>

                  <TableCell>
                    <div class="flex items-center gap-2.5">
                      <Avatar class="size-8 border">
                        <AvatarFallback class="text-xs font-semibold">
                          {{ getInitials(applicant.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex min-w-0 flex-col">
                        <span class="truncate text-sm font-medium">{{ applicant.fullName }}</span>
                        <span class="text-xs text-muted-foreground">
                          {{ applicant.gender }} · <span class="font-mono">{{ applicant.code }}</span>
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div class="flex flex-col">
                      <span class="text-sm">{{ applicant.municipality }}</span>
                      <span class="text-xs text-muted-foreground">Brgy. {{ applicant.barangay }}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" :class="LPII_CONFIG[applicant.lpiiTag].badgeClass">
                      {{ LPII_CONFIG[applicant.lpiiTag].label }}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <span class="block max-w-45 truncate text-sm" :title="applicant.course">
                      {{ applicant.course }}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div class="flex flex-col">
                      <span class="text-sm">
                        {{ formatDateDisplay(applicant.assessmentDate || applicant.rawApplicant?.assessment_date || applicant.createdAt) }}
                      </span>
                      <span class="text-xs text-muted-foreground">Batch {{ applicant.batchYear }}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      v-if="getApplicantDocuments(applicant).length > 0"
                      class="text-sm"
                      :title="getApplicantDocuments(applicant).join(', ')"
                    >
                      {{ getApplicantDocuments(applicant).length }} submitted
                    </span>
                    <span v-else class="text-sm text-muted-foreground">None</span>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" :class="getGipStatusBadgeClass(applicant.status)">
                      {{ applicant.status }}
                    </Badge>
                  </TableCell>

                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" class="cursor-pointer" @click="openApplicantDetails(applicant)">
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 cursor-pointer text-muted-foreground"
                        title="Edit status & documents"
                        :aria-label="'Edit ' + applicant.fullName"
                        @click="openEditApplicantDialog(applicant)"
                      >
                        <Pencil class="size-4 shrink-0" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                        title="Remove from GIP registry"
                        :aria-label="'Remove ' + applicant.fullName"
                        @click="promptRemoveApplicant(applicant)"
                      >
                        <Trash2 class="size-4 shrink-0" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- No applicants yet: inline drop zone -->
              <TableRow
                v-else-if="applicants.length === 0 && !hasParsedData && !ocrProgress.isProcessing && !isParsing"
                class="hover:bg-transparent"
              >
                <TableCell colspan="9" class="p-4 sm:p-6">
                  <div
                    role="button"
                    tabindex="0"
                    :class="[
                      'flex min-h-72 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center whitespace-normal transition-colors',
                      isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
                    ]"
                    @dragover="onDragOver"
                    @dragleave="onDragLeave"
                    @drop="onDrop"
                    @click="triggerFileInput"
                    @keydown.enter="triggerFileInput"
                  >
                    <div class="flex size-12 items-center justify-center rounded-lg bg-muted">
                      <UploadCloud class="size-6 text-muted-foreground" />
                    </div>
                    <div class="max-w-md space-y-1">
                      <h3 class="text-base font-semibold">No GIP applicants registered yet</h3>
                      <p class="text-sm text-muted-foreground">
                        Drop an Excel spreadsheet (.xlsx, .csv) or a scanned NSRP Form 1 PDF here to bulk-import applicants.
                      </p>
                    </div>
                    <div class="flex flex-wrap items-center justify-center gap-2" @click.stop>
                      <Button size="sm" class="cursor-pointer" @click="triggerFileInput">Browse Files</Button>
                      <Button variant="outline" size="sm" class="cursor-pointer" @click="downloadTemplate">
                        Download Template
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>

              <!-- OCR / parsing in progress -->
              <TableRow
                v-else-if="applicants.length === 0 && (ocrProgress.isProcessing || isParsing) && !hasParsedData"
                class="hover:bg-transparent"
              >
                <TableCell colspan="9" class="p-4 sm:p-6">
                  <div class="flex min-h-72 w-full flex-col items-center justify-center gap-4 rounded-lg border p-8 text-center whitespace-normal">
                    <Loader2 class="size-8 animate-spin text-muted-foreground" />
                    <div class="max-w-md space-y-1">
                      <h3 class="text-base font-semibold">{{ ocrProgress.statusMessage || 'Processing file...' }}</h3>
                      <p class="text-sm text-muted-foreground">
                        Reading document structure, running OCR, and extracting applicant fields.
                      </p>
                    </div>
                    <div class="w-full max-w-md space-y-2">
                      <Progress :model-value="ocrProgress.progressPercent" />
                      <div class="flex justify-between text-xs text-muted-foreground">
                        <span>Page {{ ocrProgress.currentPage }} of {{ ocrProgress.totalPages }}</span>
                        <span class="tabular-nums">{{ ocrProgress.progressPercent }}%</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Parsed data review (inline) -->
              <template v-else-if="applicants.length === 0 && hasParsedData">
                <TableRow class="bg-muted/40 hover:bg-muted/40">
                  <TableCell colspan="9" class="px-4 py-3">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p class="text-sm">
                        <span class="font-medium">{{ uploadedFile?.name }}</span>
                        <span class="text-muted-foreground">
                          · {{ validApplicantsCount }} ready
                          <template v-if="invalidApplicantsCount > 0">· {{ invalidApplicantsCount }} need review</template>
                        </span>
                      </p>
                      <div class="flex items-center gap-2">
                        <Button variant="outline" size="sm" class="cursor-pointer" @click="resetBatchState">
                          Discard
                        </Button>
                        <Button
                          size="sm"
                          class="cursor-pointer"
                          :disabled="validApplicantsCount === 0 || isSubmitting"
                          @click="confirmImport"
                        >
                          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
                          {{ isSubmitting ? 'Importing...' : `Import ${validApplicantsCount} Applicants` }}
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>

                <TableRow v-for="(candidate, idx) in parsedApplicants" :key="candidate.id || idx">
                  <TableCell />
                  <TableCell>
                    <div class="flex flex-col">
                      <span class="text-sm font-medium">
                        {{ candidate.surname }}, {{ candidate.firstName }} {{ candidate.middleName }}
                      </span>
                      <span class="text-xs text-muted-foreground">
                        {{ candidate.sex }} · {{ candidate.dateOfBirth || 'DOB N/A' }}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-col">
                      <span class="text-sm">{{ candidate.municipality }}</span>
                      <span class="text-xs text-muted-foreground">Brgy. {{ candidate.barangay }}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" :class="LPII_CONFIG[candidate.lpiiTag].badgeClass">
                      {{ LPII_CONFIG[candidate.lpiiTag].label }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span class="block max-w-40 truncate text-sm" :title="candidate.course">{{ candidate.course }}</span>
                  </TableCell>
                  <TableCell>
                    <span class="font-mono text-xs text-muted-foreground">{{ candidate.pageRange || 'Row data' }}</span>
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <Badge
                      v-if="candidate.isValid !== false"
                      variant="outline"
                      class="border-success/30 bg-success/10 text-success"
                    >
                      Valid
                    </Badge>
                    <Badge
                      v-else
                      variant="outline"
                      class="border-warning/30 bg-warning/10 text-warning"
                      :title="candidate.validationErrors?.join(', ')"
                    >
                      Needs Check
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 cursor-pointer text-muted-foreground"
                        title="Edit scanned information"
                        aria-label="Edit scanned information"
                        @click="openEditCandidateModal(candidate, idx)"
                      >
                        <Pencil class="size-4 shrink-0" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                        title="Remove candidate"
                        aria-label="Remove candidate"
                        @click="removeCandidate(idx)"
                      >
                        <Trash2 class="size-4 shrink-0" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Filters returned no matches -->
              <TableRow v-else class="hover:bg-transparent">
                <TableCell colspan="9" class="p-0 whitespace-normal">
                  <Empty class="py-10">
                    <EmptyHeader>
                      <EmptyTitle>No matching applicants</EmptyTitle>
                      <EmptyDescription>
                        Try adjusting the search keyword, LPII zone, or status filters.
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
            <span class="font-medium text-foreground">{{ filteredApplicants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>–<span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredApplicants.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredApplicants.length }}</span> applicants
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
              v-for="p in totalApplicantPages"
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
              :disabled="currentPage >= totalApplicantPages"
              @click="currentPage++"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- ─── BATCH IMPORT APPLICANTS DIALOG ─── -->
  <Dialog v-model:open="isBatchUploadOpen">
    <DialogContent class="flex max-h-[92vh] flex-col gap-0 p-0 sm:max-w-220">
      <DialogHeader class="border-b p-6 pr-14">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1.5">
            <DialogTitle>Batch Import GIP Applicants</DialogTitle>
            <DialogDescription>
              Upload an Excel spreadsheet (.xlsx, .csv) or scanned DOLE NSRP Form 1 PDFs (2 pages per applicant).
            </DialogDescription>
          </div>
          <Button variant="outline" size="sm" class="shrink-0 cursor-pointer" @click="downloadTemplate">
            Download Template
          </Button>
        </div>
      </DialogHeader>

      <div class="flex-1 space-y-4 overflow-y-auto p-6">
        <!-- Drop zone -->
        <div
          v-if="!hasParsedData && !ocrProgress.isProcessing"
          role="button"
          tabindex="0"
          :class="[
            'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
          ]"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="triggerFileInput"
          @keydown.enter="triggerFileInput"
        >
          <div class="flex size-12 items-center justify-center rounded-lg bg-muted">
            <UploadCloud class="size-6 text-muted-foreground" />
          </div>
          <div class="max-w-md space-y-1">
            <p class="text-sm font-semibold">Drop your Excel or NSRP PDF file here</p>
            <p class="text-sm text-muted-foreground">
              Supports .xlsx, .xls, .csv data files, or .pdf scanned NSRP Form 1 documents for automatic OCR.
            </p>
          </div>
          <Button size="sm" class="pointer-events-none" tabindex="-1">Browse Files</Button>
        </div>

        <!-- OCR / parsing progress -->
        <div
          v-else-if="ocrProgress.isProcessing || isParsing"
          class="flex flex-col items-center justify-center gap-4 rounded-lg border p-8 text-center"
        >
          <Loader2 class="size-8 animate-spin text-muted-foreground" />
          <div class="max-w-md space-y-1">
            <h3 class="text-sm font-semibold">
              {{ ocrProgress.statusMessage || 'Processing file and checking for duplicate records...' }}
            </h3>
            <p class="text-sm text-muted-foreground">
              Reading document structure, running OCR, and checking the provincial registry for matches.
            </p>
          </div>
          <div class="w-full max-w-sm space-y-2">
            <Progress :model-value="ocrProgress.progressPercent" />
            <div class="flex justify-between text-xs text-muted-foreground">
              <span>Page {{ ocrProgress.currentPage }} of {{ ocrProgress.totalPages }}</span>
              <span class="tabular-nums">{{ ocrProgress.progressPercent }}%</span>
            </div>
          </div>
        </div>

        <!-- Review -->
        <template v-else>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm">
              <span class="font-medium">{{ uploadedFile?.name }}</span>
              <span class="text-muted-foreground">
                · {{ validApplicantsCount }} ready
                <template v-if="duplicatesCount > 0">· {{ duplicatesCount }} already registered</template>
                <template v-if="skippedCount > 0">· {{ skippedCount }} skipped</template>
                <template v-if="invalidApplicantsCount > 0">· {{ invalidApplicantsCount }} need review</template>
              </span>
            </p>
            <Button variant="ghost" size="sm" class="self-start cursor-pointer sm:self-auto" @click="resetBatchState">
              Upload Different File
            </Button>
          </div>

          <Alert v-if="duplicatesCount > 0" class="border-warning/40 bg-warning/10 *:[svg]:text-warning">
            <AlertTriangle />
            <AlertTitle>{{ duplicatesCount }} applicant{{ duplicatesCount > 1 ? 's' : '' }} already exist in the database</AlertTitle>
            <AlertDescription>
              <p>By default they will be linked to GIP instead of creating duplicate records.</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" class="cursor-pointer" @click="setAllDuplicatesAction('link_program', 'GIP')">
                  Link All to GIP
                </Button>
                <Button variant="outline" size="sm" class="cursor-pointer" @click="setAllDuplicatesAction('skip')">
                  Skip All Duplicates
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <div class="overflow-hidden rounded-lg border">
            <div class="max-h-75 overflow-auto">
              <Table>
                <TableHeader class="sticky top-0 z-10 bg-muted">
                  <TableRow class="hover:bg-muted">
                    <TableHead>Applicant</TableHead>
                    <TableHead>Municipality & Barangay</TableHead>
                    <TableHead>LPII</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead class="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="(candidate, idx) in parsedApplicants"
                    :key="candidate.id || idx"
                    :class="candidate.resolutionAction === 'skip' ? 'opacity-50' : ''"
                  >
                    <TableCell>
                      <div class="flex flex-col">
                        <span class="text-sm font-medium">
                          {{ candidate.surname }}, {{ candidate.firstName }} {{ candidate.middleName }}
                        </span>
                        <span class="text-xs text-muted-foreground">
                          {{ candidate.sex }} · {{ candidate.dateOfBirth || 'DOB N/A' }}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div class="flex flex-col">
                        <span class="text-sm">{{ candidate.municipality }}</span>
                        <span class="text-xs text-muted-foreground">Brgy. {{ candidate.barangay }}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" :class="LPII_CONFIG[candidate.lpiiTag].badgeClass">
                        {{ LPII_CONFIG[candidate.lpiiTag].label }}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span class="block max-w-40 truncate text-sm" :title="candidate.course">{{ candidate.course }}</span>
                    </TableCell>

                    <TableCell>
                      <span class="font-mono text-xs text-muted-foreground">{{ candidate.pageRange || 'Row data' }}</span>
                    </TableCell>

                    <TableCell>
                      <div class="flex flex-col items-start gap-1">
                        <Button
                          v-if="candidate.existingMatch"
                          variant="link"
                          size="sm"
                          class="h-auto cursor-pointer p-0 text-xs"
                          @click="openDuplicateModal(candidate, idx)"
                        >
                          {{
                            candidate.resolutionAction === 'link_program'
                              ? `Link to ${candidate.selectedProgram || 'GIP'}`
                              : candidate.resolutionAction === 'create_new'
                                ? 'Create new record'
                                : 'Skipped'
                          }}
                        </Button>
                        <Badge
                          v-if="candidate.isValid !== false"
                          variant="outline"
                          class="border-success/30 bg-success/10 text-success"
                        >
                          Valid
                        </Badge>
                        <Badge
                          v-else
                          variant="outline"
                          class="border-warning/30 bg-warning/10 text-warning"
                          :title="candidate.validationErrors?.join(', ')"
                        >
                          Needs Check
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell class="text-right">
                      <div class="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          class="size-8 cursor-pointer text-muted-foreground"
                          title="Edit scanned information"
                          aria-label="Edit scanned information"
                          @click="openEditCandidateModal(candidate, idx)"
                        >
                          <Pencil class="size-4 shrink-0" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="size-8 cursor-pointer text-muted-foreground hover:text-destructive"
                          title="Remove candidate"
                          aria-label="Remove candidate"
                          @click="removeCandidate(idx)"
                        >
                          <Trash2 class="size-4 shrink-0" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </template>
      </div>

      <DialogFooter class="border-t p-4">
        <Button variant="outline" class="cursor-pointer" @click="isBatchUploadOpen = false">Cancel</Button>
        <Button
          v-if="hasParsedData"
          class="cursor-pointer"
          :disabled="validApplicantsCount === 0 || isSubmitting"
          @click="confirmImport"
        >
          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
          {{ isSubmitting ? 'Importing...' : `Import ${validApplicantsCount} Applicants` }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- ─── DUPLICATE APPLICANT REVIEW DIALOG ─── -->
  <Dialog v-model:open="isDuplicateModalOpen">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Existing applicant record found</DialogTitle>
        <DialogDescription>
          <strong class="font-medium text-foreground">{{ duplicateCandidate ? `${duplicateCandidate.firstName} ${duplicateCandidate.surname}` : '' }}</strong>
          matches an existing profile in the provincial database.
        </DialogDescription>
      </DialogHeader>

      <div v-if="duplicateCandidate?.existingMatch" class="grid gap-6">
        <!-- Existing profile -->
        <section class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold">
              {{ duplicateCandidate.existingMatch.existingApplicant.surname }}, {{ duplicateCandidate.existingMatch.existingApplicant.first_name }} {{ duplicateCandidate.existingMatch.existingApplicant.middle_name || '' }}
            </h3>
            <Badge variant="outline">
              {{ duplicateCandidate.existingMatch.confidence === 'exact' ? 'Exact match' : duplicateCandidate.existingMatch.confidence === 'high' ? 'High match' : 'Possible match' }}
            </Badge>
          </div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <span class="text-xs text-muted-foreground">Date of Birth</span>
              <p class="text-sm font-medium">{{ duplicateCandidate.existingMatch.existingApplicant.date_of_birth || 'N/A' }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Sex</span>
              <p class="text-sm font-medium">{{ duplicateCandidate.existingMatch.existingApplicant.sex || 'N/A' }}</p>
            </div>
            <div class="col-span-2">
              <span class="text-xs text-muted-foreground">Existing Programs</span>
              <div class="mt-1 flex flex-wrap gap-1">
                <template v-if="duplicateCandidate.existingMatch.existingPrograms?.length">
                  <Badge v-for="p in duplicateCandidate.existingMatch.existingPrograms" :key="p" variant="secondary">
                    {{ p }}
                  </Badge>
                </template>
                <span v-else class="text-sm text-muted-foreground">None</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Resolution -->
        <section class="grid gap-2">
          <Label>Action for this candidate</Label>
          <div role="radiogroup" class="grid gap-2">
            <button
              v-for="opt in duplicateActionOptions"
              :key="opt.value"
              type="button"
              role="radio"
              :aria-checked="selectedDuplicateAction === opt.value"
              :class="[
                'flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
                selectedDuplicateAction === opt.value
                  ? opt.value === 'skip'
                    ? 'border-destructive bg-destructive/5 ring-2 ring-destructive/20'
                    : 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'hover:bg-muted/50',
              ]"
              @click="selectedDuplicateAction = opt.value"
            >
              <span class="flex items-center gap-2 text-sm font-semibold">
                {{ opt.label }}
                <Badge v-if="opt.value === 'link_program'" variant="secondary">Recommended</Badge>
              </span>
              <span class="text-xs text-muted-foreground">{{ opt.description }}</span>
            </button>
          </div>

          <div v-if="selectedDuplicateAction === 'link_program'" class="grid gap-2 pt-2">
            <Label for="duplicateTargetProgram">Target Program</Label>
            <Select v-model="selectedDuplicateProgram">
              <SelectTrigger id="duplicateTargetProgram" class="w-full sm:w-56">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="prog in duplicateProgramOptions" :key="prog" :value="prog">
                  {{ prog }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>
      </div>

      <DialogFooter>
        <Button variant="outline" class="cursor-pointer" @click="isDuplicateModalOpen = false">Cancel</Button>
        <Button class="cursor-pointer" @click="confirmDuplicateResolution">Apply Resolution</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- ─── EDIT APPLICANT STATUS & DOCUMENTS SIDE SHEET (same layout as Add New Account, AuthorizedAccounts.vue) ─── -->
  <Sheet :open="isEditApplicantDialogOpen" @update:open="onEditDialogOpenChange">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>Edit GIP Applicant</SheetTitle>
        <SheetDescription v-if="applicantToEdit" class="truncate">
          {{ applicantToEdit.fullName }} · {{ applicantToEdit.code }}
        </SheetDescription>
      </SheetHeader>

      <form class="contents" @submit="saveApplicantReview">
        <div class="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto px-6 py-4">
        <Alert v-if="isEditingHiredApplicant">
          <Lock class="size-4 shrink-0" />
          <AlertTitle>Status locked</AlertTitle>
          <AlertDescription>
            This applicant is Hired. Their status is managed through the GIP deployment; only documents can be edited here.
          </AlertDescription>
        </Alert>

        <FormField v-else v-slot="{ componentField }" name="status">
          <FormItem>
            <FormLabel>Application Status</FormLabel>
            <Select v-bind="componentField" :disabled="isSavingApplicantReview">
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem v-for="opt in editStatusOptions" :key="opt" :value="opt">
                  {{ opt }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Required for Rejected; sent to the applicant in their notification -->
        <FormField v-if="isRemarksRequired && !isEditingHiredApplicant" v-slot="{ componentField }" name="remarks">
          <FormItem>
            <FormLabel>Remarks <span class="text-destructive">*</span></FormLabel>
            <FormControl>
              <Textarea
                v-bind="componentField"
                rows="3"
                placeholder="Why the application is rejected; the applicant will see this"
                :disabled="isSavingApplicantReview"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Required for Approved: when the applicant comes to the office; sent in their notification -->
        <fieldset v-if="isOrientationRequired && !isEditingHiredApplicant" class="grid gap-4 rounded-lg border p-4">
          <legend class="px-1 text-sm font-medium">Orientation schedule</legend>
          <div class="grid gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="orientationDate">
              <FormItem>
                <FormLabel>Date <span class="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSavingApplicantReview" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField v-slot="{ componentField }" name="orientationTime">
              <FormItem>
                <FormLabel>Time <span class="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="time" :disabled="isSavingApplicantReview" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
          <FormField v-slot="{ componentField }" name="orientationNote">
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  rows="3"
                  placeholder="e.g. Bring your documents and a ballpen. Proceed to the PESO office, Patin-ay."
                  :disabled="isSavingApplicantReview"
                />
              </FormControl>
              <FormDescription>Shown to the applicant.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
        </fieldset>

        <FormField name="documentsSubmitted">
          <FormItem>
            <FormLabel>Documents Submitted</FormLabel>
            <FormDescription>Also updates the applicant's registry record.</FormDescription>
            <FormControl>
              <div role="group" class="grid gap-2">
                <!-- Checkbox row; the view button sits outside the label so it doesn't toggle the document -->
                <div
                  v-for="doc in editDocumentOptions"
                  :key="doc"
                  :class="[
                    'flex items-center gap-1 rounded-lg border pr-2 transition-colors',
                    editDocuments.includes(doc) ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/50',
                  ]"
                >
                  <Label
                    :class="[
                      'flex min-w-0 flex-1 items-center gap-2.5 p-3 font-normal',
                      doc === lockedDocument ? 'cursor-default' : 'cursor-pointer',
                    ]"
                  >
                    <Checkbox
                      :model-value="editDocuments.includes(doc)"
                      :disabled="doc === lockedDocument || isSavingApplicantReview"
                      @update:model-value="toggleEditDocument(doc)"
                    />
                    <span class="min-w-0 flex-1 truncate" :title="doc">{{ doc }}</span>
                    <Badge v-if="doc === lockedDocument" variant="secondary">Required</Badge>
                    <Badge
                      v-else-if="isExtraDocument(doc)"
                      variant="outline"
                      title="Not part of the standard checklist — uncheck to remove"
                    >
                      Other
                    </Badge>
                  </Label>
                  <Loader2 v-if="isLoadingUploadedDocuments" class="mx-2 size-4 shrink-0 animate-spin text-muted-foreground" />
                  <Button
                    v-else-if="uploadedFileFor(doc)"
                    as-child
                    variant="ghost"
                    size="icon-sm"
                    class="shrink-0"
                  >
                    <a
                      :href="uploadedFileFor(doc)!.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      :aria-label="`View ${doc}`"
                      :title="uploadedFileFor(doc)!.name"
                    >
                      <Eye class="size-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        </div>

        <!-- Sticky footer -->
        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            :disabled="isSavingApplicantReview"
            @click="closeEditApplicantDialog"
          >
            Cancel
          </Button>
          <Button type="submit" :disabled="isSavingApplicantReview || !applicantToEdit">
            <Loader2 v-if="isSavingApplicantReview" class="size-4 shrink-0 animate-spin" />
            {{ isSavingApplicantReview ? 'Saving...' : 'Save Changes' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>

  <!-- ─── EDIT SCANNED CANDIDATE DIALOG ─── -->
  <Dialog v-model:open="isEditModalOpen">
    <DialogContent class="flex max-h-[92vh] flex-col gap-0 p-0 sm:max-w-180">
      <DialogHeader class="border-b p-6 pr-14">
        <DialogTitle>Edit Scanned Applicant</DialogTitle>
        <DialogDescription>
          Review and correct the extracted OCR fields before adding them to the GIP registry.
          <template v-if="editingCandidate?.pageRange"> Source: <span class="font-mono">{{ editingCandidate.pageRange }}</span>.</template>
        </DialogDescription>
        <div class="pt-1">
          <Badge v-if="isCandidateValid" variant="outline" class="border-success/30 bg-success/10 text-success">
            Ready to import
          </Badge>
          <Badge v-else variant="outline" class="border-warning/30 bg-warning/10 text-warning">
            {{ candidateValidationErrors.length }} field{{ candidateValidationErrors.length > 1 ? 's' : '' }} need correction
          </Badge>
        </div>
      </DialogHeader>

      <div class="flex-1 space-y-6 overflow-y-auto p-6">
        <Alert v-if="candidateValidationErrors.length > 0" class="border-warning/40 bg-warning/10 *:[svg]:text-warning">
          <AlertCircle />
          <AlertTitle>Required fields are missing or incomplete</AlertTitle>
          <AlertDescription>
            <ul class="list-inside list-disc">
              <li v-for="(err, i) in candidateValidationErrors" :key="i">{{ err }}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <!-- LPII Zone -->
        <section class="grid gap-2">
          <Label>LPII Ecosystem Zone</Label>
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="LPII zone">
              <Button
                v-for="zone in candidateLpiiOptions"
                :key="zone"
                type="button"
                variant="ghost"
                size="sm"
                role="radio"
                :aria-checked="candidateForm.lpiiTag === zone"
                :class="['h-7 cursor-pointer px-3', candidateForm.lpiiTag === zone && 'bg-background shadow-xs hover:bg-background']"
                @click="setCandidateLpii(zone)"
              >
                {{ LPII_CONFIG[zone].label }}
              </Button>
            </div>
            <span class="text-sm text-muted-foreground">
              Brgy. {{ candidateForm.barangay || 'Poblacion' }}, {{ candidateForm.municipality }}
            </span>
          </div>
        </section>

        <Separator />

        <!-- I. Personal Information -->
        <section class="space-y-4">
          <h3 class="text-sm font-semibold">Personal Information</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div class="grid gap-2">
              <Label for="ec-surname">Surname <span class="text-destructive">*</span></Label>
              <Input id="ec-surname" v-model="candidateForm.surname" placeholder="e.g. Dela Cruz" required />
            </div>
            <div class="grid gap-2">
              <Label for="ec-first">First Name <span class="text-destructive">*</span></Label>
              <Input id="ec-first" v-model="candidateForm.firstName" placeholder="e.g. Juan" required />
            </div>
            <div class="grid gap-2">
              <Label for="ec-middle">Middle Name</Label>
              <Input id="ec-middle" v-model="candidateForm.middleName" placeholder="Middle" />
            </div>
            <div class="grid gap-2">
              <Label for="ec-suffix">Suffix</Label>
              <Input id="ec-suffix" v-model="candidateForm.suffix" placeholder="Jr / III" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div class="grid gap-2">
              <Label for="ec-sex">Sex</Label>
              <Select v-model="candidateForm.sex">
                <SelectTrigger id="ec-sex" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-2">
              <Label for="ec-dob">Date of Birth</Label>
              <Input id="ec-dob" v-model="candidateForm.dateOfBirth" type="date" />
            </div>
            <div class="grid gap-2">
              <Label for="ec-civil">Civil Status</Label>
              <Select v-model="candidateForm.civilStatus">
                <SelectTrigger id="ec-civil" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                  <SelectItem value="Separated">Separated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-2">
              <Label for="ec-tin">TIN (optional)</Label>
              <Input id="ec-tin" v-model="candidateForm.tin" placeholder="000-000-000" class="font-mono" />
            </div>
          </div>
        </section>

        <Separator />

        <!-- II. Residence & Contact -->
        <section class="space-y-4">
          <h3 class="text-sm font-semibold">Residence & Contact Information</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="grid gap-2">
              <Label for="ec-muni">Municipality / City <span class="text-destructive">*</span></Label>
              <Select v-model="candidateForm.municipality">
                <SelectTrigger id="ec-muni" class="w-full">
                  <SelectValue placeholder="Select municipality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="m in candidateMunicipalities" :key="m" :value="m">{{ m }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-2">
              <Label for="ec-brgy">Barangay <span class="text-destructive">*</span></Label>
              <Input id="ec-brgy" v-model="candidateForm.barangay" placeholder="e.g. Poblacion" required />
            </div>
            <div class="grid gap-2">
              <Label for="ec-street">House No. / Street / Purok</Label>
              <Input id="ec-street" v-model="candidateForm.houseStreet" placeholder="e.g. Purok 3B" />
            </div>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="ec-contact">Contact Number</Label>
              <Input id="ec-contact" v-model="candidateForm.contactNumber" placeholder="09123456789" class="font-mono" />
            </div>
            <div class="grid gap-2">
              <Label for="ec-email">Email Address</Label>
              <Input id="ec-email" v-model="candidateForm.email" type="email" placeholder="applicant@example.com" />
            </div>
          </div>
        </section>

        <Separator />

        <!-- III. Academic Background -->
        <section class="space-y-4">
          <h3 class="text-sm font-semibold">Academic Background & Competencies</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="grid gap-2">
              <Label for="ec-course">Degree / Course <span class="text-destructive">*</span></Label>
              <Input id="ec-course" v-model="candidateForm.course" placeholder="e.g. BS Information Technology" required />
            </div>
            <div class="grid gap-2">
              <Label for="ec-level">Educational Level</Label>
              <Select v-model="candidateForm.educationalLevel">
                <SelectTrigger id="ec-level" class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="College Graduate">College Graduate</SelectItem>
                  <SelectItem value="College Level">College Level</SelectItem>
                  <SelectItem value="Tech-Voc Graduate">Tech-Voc / TVET Graduate</SelectItem>
                  <SelectItem value="Senior High Graduate">Senior High School Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="grid gap-2">
                <Label for="ec-year">Year Graduated</Label>
                <Input id="ec-year" v-model="candidateForm.yearGraduated" placeholder="Year" class="font-mono" />
              </div>
              <div class="grid gap-2">
                <Label for="ec-batch">Batch</Label>
                <Input id="ec-batch" v-model.number="candidateForm.batchYear" type="number" placeholder="Batch" class="font-mono" />
              </div>
            </div>
          </div>

          <div class="grid gap-2">
            <Label for="ec-skills">Skills & Competencies</Label>
            <Input
              id="ec-skills"
              v-model="candidateSkillsInput"
              placeholder="e.g. Computer Literacy, Data Entry, Agricultural Research"
            />
            <p class="text-xs text-muted-foreground">Separate multiple skills with commas.</p>
          </div>

          <div class="flex flex-wrap items-center gap-6">
            <Label class="cursor-pointer font-normal">
              <Checkbox v-model="candidateForm.is4ps" />
              4Ps Beneficiary
            </Label>
            <Label class="cursor-pointer font-normal">
              <Checkbox v-model="candidateForm.hasDisability" />
              Person with Disability (PWD)
            </Label>
          </div>

          <div class="grid gap-2">
            <Label>Documents Submitted</Label>
            <div role="group" class="grid gap-2 sm:grid-cols-2">
              <Label
                v-for="doc in candidateDocumentOptions"
                :key="doc"
                :class="[
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 font-normal transition-colors',
                  (candidateForm.documentsSubmitted || []).includes(doc) ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/50',
                ]"
              >
                <Checkbox
                  :model-value="(candidateForm.documentsSubmitted || []).includes(doc)"
                  @update:model-value="toggleCandidateDocument(doc)"
                />
                <span class="min-w-0 flex-1 truncate" :title="doc">{{ doc }}</span>
              </Label>
            </div>
          </div>
        </section>
      </div>

      <DialogFooter class="border-t p-4">
        <Button type="button" variant="outline" class="cursor-pointer" @click="closeCandidateEdit">Cancel</Button>
        <Button type="button" class="cursor-pointer" @click="saveCandidateEdits">Save Changes</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- ─── REMOVE APPLICANT CONFIRMATION ─── -->
  <AlertDialog v-model:open="isRemoveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove GIP applicant?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ applicantToRemove?.fullName }}</strong>
          ({{ applicantToRemove?.status }}, {{ applicantToRemove?.lpiiTag }}) will be removed from the GIP applicant registry.
          Applicants with active intern deployments cannot be removed.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isRemoving" @click="cancelRemoveApplicant">
          Cancel
        </AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isRemoving" @click="confirmRemoveApplicant">
          <Loader2 v-if="isRemoving" class="size-4 shrink-0 animate-spin" />
          {{ isRemoving ? 'Removing...' : 'Remove Applicant' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- ─── BULK REMOVE APPLICANTS CONFIRMATION ─── -->
  <AlertDialog v-model:open="isBulkDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Remove {{ selectedApplicantIds.length }} selected applicant{{ selectedApplicantIds.length > 1 ? 's' : '' }}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          The selected records will be removed from the GIP registry. Applicants with active deployments will be skipped.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isBulkDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isBulkDeleting" @click="handleBulkDelete">
          <Loader2 v-if="isBulkDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isBulkDeleting ? 'Removing...' : `Remove ${selectedApplicantIds.length} Applicant${selectedApplicantIds.length > 1 ? 's' : ''}` }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- ─── BULK GIP DEPLOYMENT SIDE SHEET (long form → Sheet, DESIGN.md §5.1) ─── -->
  <Sheet :open="isBulkDeployDialogOpen" @update:open="onBulkDeployOpenChange">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-2xl">
      <Form
        v-slot="{ values, setFieldValue }"
        :validation-schema="bulkDeploySchema"
        :initial-values="bulkDeployInitialValues"
        class="contents"
        @submit="submitBulkDeploy"
      >
        <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
          <SheetTitle>Bulk GIP Deployment</SheetTitle>
          <SheetDescription>
            Deploy {{ deployableApplicants.length }} selected applicant{{ deployableApplicants.length === 1 ? '' : 's' }}
            with the same program, station, stipend, and period.
          </SheetDescription>
        </SheetHeader>

        <div class="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto px-6 py-4">

        <!-- Applicants to deploy -->
        <div class="grid gap-2">
          <Label>Applicants to Deploy ({{ deployableApplicants.length }})</Label>
          <div v-if="deployableApplicants.length > 0" class="max-h-36 overflow-y-auto rounded-lg border divide-y">
            <div v-for="app in deployableApplicants" :key="app.id" class="flex items-center gap-2.5 px-3 py-2 text-sm">
              <span class="min-w-0 flex-1 truncate font-medium text-foreground">{{ app.fullName }}</span>
              <span class="hidden sm:inline truncate text-xs text-muted-foreground">{{ app.municipality }}</span>
              <Badge variant="secondary" class="shrink-0">{{ app.status }}</Badge>
            </div>
          </div>
          <Empty v-else class="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users class="text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No eligible applicants</EmptyTitle>
              <EmptyDescription>
                Every selected applicant is already Hired or Rejected.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>

        <Alert v-if="skippedApplicants.length > 0">
          <AlertCircle class="size-4 shrink-0" />
          <AlertTitle>{{ skippedApplicants.length }} applicant{{ skippedApplicants.length > 1 ? 's' : '' }} will be skipped</AlertTitle>
          <AlertDescription>
            Already Hired or Rejected: {{ skippedApplicants.map((a) => a.fullName).join(', ') }}
          </AlertDescription>
        </Alert>

        <!-- Program affiliation -->
        <FormField v-slot="{ value, handleChange }" name="program">
          <FormItem>
            <FormLabel>GIP Program Affiliation</FormLabel>
            <FormControl>
              <div role="radiogroup" class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="opt in programOptions"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="value === opt.value"
                  :disabled="isBulkDeploying"
                  :class="[
                    'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer',
                    value === opt.value ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/50',
                  ]"
                  @click="() => {
                    handleChange(opt.value)
                    const stipend = stipendForProgram(opt.value, values.stipend)
                    if (stipend) setFieldValue('stipend', stipend)
                  }"
                >
                  <Avatar class="size-9 shrink-0 rounded-md border bg-background">
                    <img :src="opt.logo" :alt="opt.value" class="object-cover" />
                  </Avatar>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                      <span class="truncate">{{ opt.label }}</span>
                      <CheckCircle2 v-if="value === opt.value" class="size-4 shrink-0 text-primary" />
                    </div>
                    <p class="text-xs text-muted-foreground">{{ opt.description }}</p>
                  </div>
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Assigned office -->
          <FormField v-slot="{ value, handleChange }" name="office">
            <FormItem class="sm:col-span-2">
              <FormLabel>Assigned Station / Office</FormLabel>
              <Combobox
                v-model:search-term="officeSearchQuery"
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
                        class="w-full justify-between overflow-hidden font-normal"
                        :disabled="isLoadingOffices || isBulkDeploying"
                      >
                        <span class="min-w-0 flex-1 truncate text-left">
                          <template v-if="isLoadingOffices">Loading offices...</template>
                          <template v-else-if="value">{{ (value as DirectoryRow).office_name }}</template>
                          <span v-else class="text-muted-foreground">Select office...</span>
                        </span>
                        <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
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
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Supervisor -->
          <FormField v-slot="{ componentField }" name="supervisor">
            <FormItem>
              <FormLabel>Designated Supervisor / Station Head</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  placeholder="e.g. Maria Santos, Division Head"
                  :readonly="!!values.office?.office_head"
                  :class="values.office?.office_head ? 'bg-muted/40' : ''"
                  :disabled="isBulkDeploying"
                />
              </FormControl>
              <FormDescription v-if="values.office?.office_head">Auto-filled from office directory</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Stipend -->
          <FormField v-slot="{ componentField }" name="stipend">
            <FormItem>
              <FormLabel>Daily Allowance / Stipend Rate</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. ₱479.35 / day" class="font-mono" :disabled="isBulkDeploying" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Start date -->
          <FormField v-slot="{ value, handleChange }" name="startDate">
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <Popover>
                <PopoverTrigger as-child>
                  <FormControl>
                    <Button type="button" variant="outline" class="w-full justify-start font-normal" :disabled="isBulkDeploying">
                      <CalendarDays class="size-4 shrink-0" />
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

          <!-- End date -->
          <FormField v-slot="{ value, handleChange }" name="endDate">
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <Popover>
                <PopoverTrigger as-child>
                  <FormControl>
                    <Button type="button" variant="outline" class="w-full justify-start font-normal" :disabled="isBulkDeploying">
                      <CalendarDays class="size-4 shrink-0" />
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

          <p
            v-if="formatDeploymentPeriod(values.startDate, values.endDate)"
            class="sm:col-span-2 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground"
          >
            <CalendarDays class="size-4 shrink-0 text-muted-foreground" />
            {{ formatDeploymentPeriod(values.startDate, values.endDate) }}
          </p>

          <!-- Deployment status -->
          <FormField v-slot="{ componentField }" name="status">
            <FormItem>
              <FormLabel>Deployment Status</FormLabel>
              <Select v-bind="componentField" :disabled="isBulkDeploying">
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem v-for="opt in deploymentStatusOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Notes -->
          <FormField v-slot="{ componentField }" name="notes">
            <FormItem>
              <FormLabel>Special Assignment Notes</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. Assigned to records digitizing project" :disabled="isBulkDeploying" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>
        </div>

        <!-- Sticky footer -->
        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            :disabled="isBulkDeploying"
            @click="onBulkDeployOpenChange(false)"
          >
            Cancel
          </Button>
          <Button type="submit" :disabled="isBulkDeploying || deployableApplicants.length === 0">
            <Loader2 v-if="isBulkDeploying" class="size-4 shrink-0 animate-spin" />
            {{ isBulkDeploying ? 'Deploying...' : `Deploy ${deployableApplicants.length} Intern${deployableApplicants.length === 1 ? '' : 's'}` }}
          </Button>
        </div>
      </Form>
    </SheetContent>
  </Sheet>
</template>
