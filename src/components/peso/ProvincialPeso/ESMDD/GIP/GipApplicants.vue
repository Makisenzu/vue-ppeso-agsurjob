<script setup lang="ts">
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckIcon,
  ChevronsUpDownIcon,
  Download,
  Eye,
  Filter,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Mountain,
  Pencil,
  RefreshCw,
  ScanText,
  Search,
  Trash2,
  TreePine,
  UploadCloud,
  Users,
  UserX,
  Waves,
  X,
} from '@lucide/vue'
import { VisDonut, VisSingleContainer, VisTooltip } from '@unovis/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { ApplicantStatusDataPoint, LpiiDataPoint } from '@/types/peso/provincialPeso/gip'
import { useGipApplicants } from '@/composables/peso/provincialPeso/useGipApplicants'
import { useGipBatchUpload } from '@/composables/peso/provincialPeso/useGipBatchUpload'
import GipBatchUploadDialog from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipBatchUploadDialog.vue'
import GipEditCandidateDialog from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipEditCandidateDialog.vue'
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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
  hasParsedData,
  isSubmitting,
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
} = useGipBatchUpload()

const {
  applicantToEdit,
  isEditApplicantDialogOpen,
  isSavingApplicantReview,
  isEditingHiredApplicant,
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
          GIP — Applicant Registry
        </h1>
        <p class="text-sm text-muted-foreground">
          Tracks GIP applicant allocation, slot availability, and partner agency distribution across Agusan del Sur.
        </p>
      </div>

      <!-- Quick Status Filter Tabs -->
      <div class="flex items-center gap-2 self-start sm:self-auto rounded-lg border bg-muted/40 p-1">
        <Button
          size="sm"
          :variant="statusTab === 'ALL' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer"
          @click="statusTab = 'ALL'"
        >
          All
        </Button>
        <Button
          size="sm"
          :variant="statusTab === 'Pending' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer"
          @click="statusTab = 'Pending'"
        >
          Pending
        </Button>
        <Button
          size="sm"
          :variant="statusTab === 'Approved' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer"
          @click="statusTab = 'Approved'"
        >
          Approved
        </Button>
        <Button
          size="sm"
          :variant="statusTab === 'Hired' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer"
          @click="statusTab = 'Hired'"
        >
          Hired
        </Button>
        <Button
          size="sm"
          :variant="statusTab === 'Rejected' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer"
          @click="statusTab = 'Rejected'"
        >
          Rejected
        </Button>
      </div>
    </div>

    <!-- ─── 1 ROW OF PIE / DONUT CHARTS: APPLICANT STATUS & LPII BREAKDOWN ─── -->
    <div class="space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- ─── Pie Chart 1: Combined Applicant Status Breakdown ─── -->
        <Card class="relative overflow-hidden flex flex-col justify-between border shadow-xs">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div>
                  <CardTitle class="text-base font-semibold">Combined Applicant Status</CardTitle>
                  <CardDescription class="text-xs">Hired, Pending, Approved & Rejected</CardDescription>
                </div>
              </div>
              <Badge variant="outline" class="font-mono text-xs">
                Total: {{ totalApplicantStatus.toLocaleString() }}
              </Badge>
            </div>
          </CardHeader>

          <CardContent class="flex flex-col items-center justify-center p-4">
            <div v-if="isLoading" class="flex h-55 w-full items-center justify-center">
              <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="totalApplicantStatus > 0" class="relative w-full max-w-65 aspect-square flex items-center justify-center">
              <VisSingleContainer :data="applicantStatusData" :height="220">
                <VisDonut
                  :value="(d: ApplicantStatusDataPoint) => d.count"
                  :color="(d: ApplicantStatusDataPoint) => d.color"
                  :pad-angle="0.03"
                  :corner-radius="4"
                  :arc-width="38"
                  :central-label="`${totalApplicantStatus.toLocaleString()}`"
                  central-sub-label="Total Applicants"
                />
                <VisTooltip :triggers="statusDonutTooltipTriggers" />
              </VisSingleContainer>
            </div>
            <div v-else class="flex h-55 w-full flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No applicant records yet</p>
            </div>

            <!-- Legend and counts (Hired, Pending, Approved, Rejected) -->
            <div class="w-full mt-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-1.5 pt-3 border-t text-center">
              <div
                v-for="item in applicantStatusData"
                :key="item.status"
                class="flex flex-col items-center rounded-lg p-2 transition cursor-pointer select-none"
                :class="[
                  statusTab.toLowerCase() === item.status.toLowerCase()
                    ? 'bg-muted ring-1 ring-primary/40 font-semibold'
                    : 'bg-muted/40 hover:bg-muted/70',
                ]"
                :title="`Filter applicants by ${item.label}`"
                @click="toggleStatusTab(item.status)"
              >
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <span class="h-2 w-2 rounded-full shrink-0" :style="{ backgroundColor: item.color }" />
                  <span class="truncate">{{ item.label }}</span>
                </div>
                <span class="text-sm font-bold font-mono mt-0.5">{{ item.count.toLocaleString() }}</span>
                <span class="text-[10px] text-muted-foreground">
                  {{ totalApplicantStatus ? ((item.count / totalApplicantStatus) * 100).toFixed(1) : 0 }}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Pie Chart 2: Male Applicants LPII Breakdown ─── -->
        <Card class="relative overflow-hidden flex flex-col justify-between border shadow-xs">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div>
                  <CardTitle class="text-base font-semibold">Male Applicants</CardTitle>
                  <CardDescription class="text-xs">LPII Breakdown by Zone</CardDescription>
                </div>
              </div>
              <Badge variant="outline" class="font-mono text-xs">
                Total: {{ totalMaleApplicantLpii.toLocaleString() }}
              </Badge>
            </div>
          </CardHeader>

          <CardContent class="flex flex-col items-center justify-center p-4">
            <div v-if="isLoading" class="flex h-55 w-full items-center justify-center">
              <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="totalMaleApplicantLpii > 0" class="relative w-full max-w-65 aspect-square flex items-center justify-center">
              <VisSingleContainer :data="applicantMaleLpiiData" :height="220">
                <VisDonut
                  :value="(d: LpiiDataPoint) => d.count"
                  :color="(d: LpiiDataPoint) => d.color"
                  :pad-angle="0.03"
                  :corner-radius="4"
                  :arc-width="38"
                  :central-label="`${totalMaleApplicantLpii.toLocaleString()}`"
                  central-sub-label="Male Applicants"
                />
                <VisTooltip :triggers="donutTooltipTriggers" />
              </VisSingleContainer>
            </div>
            <div v-else class="flex h-55 w-full flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No male applicant records yet</p>
            </div>

            <!-- Legend and counts -->
            <div class="w-full mt-3 grid grid-cols-3 gap-2 pt-3 border-t text-center">
              <div
                v-for="item in applicantMaleLpiiData"
                :key="item.category"
                class="flex flex-col items-center rounded-lg bg-muted/40 p-2 transition hover:bg-muted/70"
              >
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }" />
                  {{ item.label }}
                </div>
                <span class="text-sm font-bold font-mono mt-0.5">{{ item.count.toLocaleString() }}</span>
                <span class="text-[10px] text-muted-foreground">
                  {{ totalMaleApplicantLpii ? ((item.count / totalMaleApplicantLpii) * 100).toFixed(1) : 0 }}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Pie Chart 3: Female Applicants LPII Breakdown ─── -->
        <Card class="relative overflow-hidden flex flex-col justify-between border shadow-xs">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div>
                  <CardTitle class="text-base font-semibold">Female Applicants</CardTitle>
                  <CardDescription class="text-xs">LPII Breakdown by Zone</CardDescription>
                </div>
              </div>
              <Badge variant="outline" class="font-mono text-xs">
                Total: {{ totalFemaleApplicantLpii.toLocaleString() }}
              </Badge>
            </div>
          </CardHeader>

          <CardContent class="flex flex-col items-center justify-center p-4">
            <div v-if="isLoading" class="flex h-55 w-full items-center justify-center">
              <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="totalFemaleApplicantLpii > 0" class="relative w-full max-w-65 aspect-square flex items-center justify-center">
              <VisSingleContainer :data="applicantFemaleLpiiData" :height="220">
                <VisDonut
                  :value="(d: LpiiDataPoint) => d.count"
                  :color="(d: LpiiDataPoint) => d.color"
                  :pad-angle="0.03"
                  :corner-radius="4"
                  :arc-width="38"
                  :central-label="`${totalFemaleApplicantLpii.toLocaleString()}`"
                  central-sub-label="Female Applicants"
                />
                <VisTooltip :triggers="donutTooltipTriggers" />
              </VisSingleContainer>
            </div>
            <div v-else class="flex h-55 w-full flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No female applicant records yet</p>
            </div>

            <!-- Legend and counts -->
            <div class="w-full mt-3 grid grid-cols-3 gap-2 pt-3 border-t text-center">
              <div
                v-for="item in applicantFemaleLpiiData"
                :key="item.category"
                class="flex flex-col items-center rounded-lg bg-muted/40 p-2 transition hover:bg-muted/70"
              >
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }" />
                  {{ item.label }}
                </div>
                <span class="text-sm font-bold font-mono mt-0.5">{{ item.count.toLocaleString() }}</span>
                <span class="text-[10px] text-muted-foreground">
                  {{ totalFemaleApplicantLpii ? ((item.count / totalFemaleApplicantLpii) * 100).toFixed(1) : 0 }}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- ─── DATA TABLE COMPONENT ─── -->
    <Card class="border shadow-xs">
      <CardHeader class="pb-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle class="text-lg font-semibold flex items-center gap-2">
              GIP Applicant Master Registry
            </CardTitle>
            <CardDescription class="text-xs">
              Filtering applicants for
              <span class="font-semibold text-foreground">
                {{ statusTab === 'ALL' ? 'All Applicants' : `Status: ${statusTab}` }}
              </span>
              • Showing {{ filteredApplicants.length }} of {{ applicants.length }} records
            </CardDescription>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <!-- Deploy Selected Button in Header Toolbar -->
            <Button
              v-if="selectedApplicantIds.length > 0"
              size="sm"
              class="gap-1.5 text-xs cursor-pointer shadow-xs animate-in fade-in"
              @click="isBulkDeployDialogOpen = true"
            >
              <span>Deploy Selected ({{ selectedApplicantIds.length }})</span>
            </Button>

            <!-- Delete Selected Button in Header Toolbar -->
            <Button
              v-if="selectedApplicantIds.length > 0"
              variant="destructive"
              size="sm"
              class="gap-1.5 text-xs cursor-pointer shadow-xs animate-in fade-in"
              @click="isBulkDeleteDialogOpen = true"
            >
              <Trash2 class="h-3.5 w-3.5" />
              <span>Delete Selected ({{ selectedApplicantIds.length }})</span>
            </Button>

            <!-- Priority Applicants Button -->
            <Button
              variant="outline"
              size="sm"
              class="gap-1.5 text-xs font-medium cursor-pointer border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/20"
              @click="navigateToPriority"
            >
              <span>Priority Applicants</span>
            </Button>

            <Button
              size="sm"
              class="gap-1.5 text-xs cursor-pointer"
              @click="handleUploadBatchClick"
            >
              <UploadCloud class="h-3.5 w-3.5" />
              <span>Upload Batch</span>
            </Button>
            <input
              :ref="setFileInputRef"
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              class="hidden"
              @change="onFileInputChange"
            />
            <Button variant="outline" size="sm" class="gap-1.5 text-xs cursor-pointer" @click="exportCsv">
              <Download class="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="gap-1.5 text-xs cursor-pointer"
              :disabled="isLoading"
              @click="refreshApplicantsData"
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
              placeholder="Search by applicant name, course, municipality..."
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

          <!-- Month Filter -->
          <div>
            <select
              v-model="selectedMonthFilter"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option v-for="m in availableMonths" :key="m.value" :value="m.value">
                {{ m.label }}
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
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- ─── Bulk Action Bar ─── -->
        <div
          v-if="selectedApplicantIds.length > 0"
          class="flex items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border-t border-b border-primary/20 text-xs text-foreground transition-all animate-in fade-in"
        >
          <div class="flex items-center gap-2">
            <span class="font-semibold text-primary">{{ selectedApplicantIds.length }}</span>
            <span class="text-muted-foreground">applicant{{ selectedApplicantIds.length > 1 ? 's' : '' }} selected</span>
            <span class="text-muted-foreground">•</span>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              @click="clearSelection"
            >
              Clear selection
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              class="h-7 text-xs gap-1.5 cursor-pointer shadow-xs"
              @click="isBulkDeployDialogOpen = true"
            >
              <span>Deploy Selected ({{ selectedApplicantIds.length }})</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              class="h-7 text-xs gap-1.5 cursor-pointer shadow-xs"
              @click="isBulkDeleteDialogOpen = true"
            >
              <Trash2 class="h-3.5 w-3.5" />
              <span>Delete Selected ({{ selectedApplicantIds.length }})</span>
            </Button>
          </div>
        </div>

        <!-- ─── Table ─── -->
        <div class="relative overflow-x-auto border-t">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="w-12 px-4 text-center">
                  <Checkbox
                    :model-value="isAllSelected ? true : isIndeterminate ? 'indeterminate' : false"
                    aria-label="Select all applicants on page"
                    @update:model-value="toggleSelectAll"
                  >
                    <template #default="{ modelValue }">
                      <Minus v-if="modelValue === 'indeterminate'" class="h-3 w-3 stroke-3" />
                      <Check v-else class="h-3.5 w-3.5" />
                    </template>
                  </Checkbox>
                </TableHead>
                <TableHead class="w-50 text-xs font-semibold">Applicant Information</TableHead>
                <TableHead class="text-xs font-semibold">Municipality & Barangay</TableHead>
                <TableHead class="text-xs font-semibold">LPII Classification</TableHead>
                <TableHead class="text-xs font-semibold">Academic Course</TableHead>
                <TableHead class="text-xs font-semibold">Date Applied</TableHead>
                <TableHead class="text-xs font-semibold">Documents Submitted</TableHead>
                <TableHead class="text-xs font-semibold">Status</TableHead>
                <TableHead class="text-right text-xs font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="isLoading">
                <TableRow>
                  <TableCell colspan="9" class="h-32 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2 py-4">
                      <Loader2 class="h-7 w-7 animate-spin text-muted-foreground" />
                      <p class="text-xs text-muted-foreground">Loading GIP applicant records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
              <template v-else-if="paginatedApplicants.length > 0">
                <TableRow
                  v-for="applicant in paginatedApplicants"
                  :key="applicant.id"
                  :class="[
                    'transition-colors hover:bg-muted/30',
                    selectedApplicantIds.includes(applicant.id) ? 'bg-primary/5 dark:bg-primary/10' : '',
                  ]"
                >
                  <!-- Multi-select Checkbox -->
                  <TableCell class="py-3 px-4 text-center" @click.stop>
                    <Checkbox
                      :model-value="selectedApplicantIds.includes(applicant.id)"
                      :aria-label="'Select ' + applicant.fullName"
                      @update:model-value="(val) => toggleSelectApplicant(applicant.id, val)"
                    />
                  </TableCell>
                  <!-- Applicant Info -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2.5">
                      <Avatar class="h-8 w-8 rounded-full border bg-muted">
                        <AvatarFallback class="text-xs font-semibold text-primary">
                          {{ getInitials(applicant.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex flex-col">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="font-semibold text-xs sm:text-sm text-foreground">
                            {{ applicant.fullName }}
                          </span>

                        </div>
                        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{{ applicant.gender }}</span>
                          <span>•</span>
                          <span class="font-mono">{{ applicant.code }}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <!-- Location -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs">
                      <span class="font-medium text-foreground flex items-center gap-1">
                        <MapPin class="h-3 w-3 text-muted-foreground" />
                        {{ applicant.municipality }}
                      </span>
                      <span class="text-[11px] text-muted-foreground pl-4">
                        Brgy. {{ applicant.barangay }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- LPII Tag -->
                  <TableCell class="py-3">
                    <Badge
                      variant="outline"
                      :class="['text-xs font-semibold gap-1.5 py-0.5 px-2', LPII_CONFIG[applicant.lpiiTag].badgeClass]"
                    >
                      <TreePine v-if="applicant.lpiiTag === 'LOWLAND'" class="h-3.5 w-3.5" />
                      <Mountain v-else-if="applicant.lpiiTag === 'UPLAND'" class="h-3.5 w-3.5" />
                      <Waves v-else class="h-3.5 w-3.5" />
                      {{ LPII_CONFIG[applicant.lpiiTag].label }}
                    </Badge>
                  </TableCell>

                  <!-- Course -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs max-w-45">
                      <span class="font-medium truncate text-foreground" :title="applicant.course">
                        {{ applicant.course }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Date Applied -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs">
                      <span class="font-medium text-foreground">
                        {{ formatDateDisplay(applicant.assessmentDate || applicant.rawApplicant?.assessment_date || applicant.createdAt) }}
                      </span>
                      <span class="text-[11px] text-muted-foreground font-mono">
                        Batch {{ applicant.batchYear }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Documents Submitted -->
                  <TableCell class="py-3">
                    <div class="flex flex-wrap items-center gap-1 max-w-50">
                      <template v-if="getApplicantDocuments(applicant).length > 0">
                        <Badge
                          v-for="doc in getApplicantDocuments(applicant).slice(0, 2)"
                          :key="doc"
                          variant="secondary"
                          class="text-[10px] px-1.5 py-0 font-normal truncate max-w-25"
                          :title="doc"
                        >
                          {{ doc }}
                        </Badge>
                        <Badge
                          v-if="getApplicantDocuments(applicant).length > 2"
                          variant="outline"
                          class="text-[10px] px-1.5 py-0 font-mono"
                        >
                          +{{ getApplicantDocuments(applicant).length - 2 }}
                        </Badge>
                      </template>
                      <span v-else class="text-[11px] text-muted-foreground">None submitted</span>
                    </div>
                  </TableCell>

                  <!-- Status -->
                  <TableCell class="py-3">
                    <Badge
                      v-if="applicant.status === 'Approved'"
                      variant="outline"
                      class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] gap-1"
                    >
                      Approved
                    </Badge>
                    <Badge
                      v-else-if="applicant.status === 'Hired'"
                      variant="outline"
                      class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] gap-1"
                    >
                      Hired
                    </Badge>
                    <Badge
                      v-else-if="applicant.status === 'Pending'"
                      variant="outline"
                      class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] gap-1"
                    >
                      Pending
                    </Badge>
                    <Badge
                      v-else
                      variant="outline"
                      class="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[11px] gap-1"
                    >
                      <UserX class="h-3 w-3" />
                      {{ applicant.status }}
                    </Badge>
                  </TableCell>

                  <!-- Action -->
                  <TableCell class="py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 gap-1.5 text-xs cursor-pointer"
                        @click="openApplicantDetails(applicant)"
                      >
                        <Eye class="h-3.5 w-3.5" />
                        <span>Details</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                        title="Edit status & documents"
                        :aria-label="'Edit ' + applicant.fullName"
                        @click="openEditApplicantDialog(applicant)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Remove from GIP Registry"
                        @click="promptRemoveApplicant(applicant)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- ─── Empty State ─── -->
              <!-- Case A: No applicants exist — full-width inline drag-and-drop zone -->
              <TableRow v-else-if="applicants.length === 0 && !hasParsedData && !ocrProgress.isProcessing && !isParsing">
                <TableCell colspan="8" class="p-3 sm:p-5 text-center">
                  <div
                    :class="[
                      'w-full min-h-80 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer group',
                      isDragging
                        ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[0.998]'
                        : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30 bg-muted/10',
                    ]"
                    @dragover="onDragOver"
                    @dragleave="onDragLeave"
                    @drop="onDrop"
                    @click="triggerFileInput"
                  >
                    <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary/15 transition-all mb-4 shadow-xs">
                      <ScanText class="h-8 w-8" />
                    </div>

                    <h3 class="text-base sm:text-lg font-bold tracking-tight text-foreground">
                      No GIP Applicants Registered Yet
                    </h3>
                    <p class="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed mt-1.5">
                      Drag and drop an <span class="font-semibold text-foreground">Excel spreadsheet</span> (.xlsx, .csv) or
                      <span class="font-semibold text-foreground">scanned NSRP Form 1 PDF</span> here to bulk-import applicants.
                    </p>

                    <div class="flex flex-wrap items-center justify-center gap-3 mt-6" @click.stop>
                      <Button size="sm" class="gap-1.5 text-xs font-medium cursor-pointer shadow-xs" @click="triggerFileInput">
                        <UploadCloud class="h-4 w-4" />
                        <span>Browse Files</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        class="gap-1.5 text-xs font-medium cursor-pointer shadow-xs bg-background hover:bg-muted"
                        @click="downloadTemplate"
                      >
                        <Download class="h-4 w-4" />
                        <span>Download Template</span>
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Case A-2: OCR / Parsing in-progress state -->
              <TableRow v-else-if="applicants.length === 0 && (ocrProgress.isProcessing || isParsing) && !hasParsedData">
                <TableCell colspan="8" class="p-3 sm:p-5 text-center">
                  <div class="w-full min-h-80 flex flex-col items-center justify-center rounded-xl border border-border/80 bg-muted/20 p-8 sm:p-12 text-center space-y-4">
                    <div class="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                      <Loader2 class="h-8 w-8 animate-spin" />
                      <ScanText class="absolute h-4 w-4" />
                    </div>
                    <div class="space-y-1.5 max-w-md">
                      <h3 class="font-bold text-base text-foreground">
                        {{ ocrProgress.statusMessage || 'Processing file...' }}
                      </h3>
                      <p class="text-xs text-muted-foreground leading-relaxed">
                        Reading document structure, running OCR text recognition, and extracting applicant fields.
                      </p>
                    </div>
                    <div class="w-full max-w-md space-y-2 pt-2">
                      <Progress :model-value="ocrProgress.progressPercent" class="h-2.5 rounded-full" />
                      <div class="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>Page {{ ocrProgress.currentPage }} of {{ ocrProgress.totalPages }}</span>
                        <span class="font-mono">{{ ocrProgress.progressPercent }}%</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Case A-3: Parsed data review table (inline, no modal) -->
              <template v-else-if="applicants.length === 0 && hasParsedData">
                <!-- Summary banner row -->
                <TableRow>
                  <TableCell colspan="8" class="py-3 px-4 bg-muted/10 border-b">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div class="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" class="font-medium text-xs">
                          File: {{ uploadedFile?.name }}
                        </Badge>
                        <Badge variant="outline" class="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                          {{ validApplicantsCount }} Ready
                        </Badge>
                        <Badge
                          v-if="invalidApplicantsCount > 0"
                          variant="outline"
                          class="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        >
                          <AlertCircle class="h-3 w-3 mr-1" />
                          {{ invalidApplicantsCount }} Needs Review
                        </Badge>
                      </div>
                      <div class="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          size="sm"
                          class="h-7 text-xs cursor-pointer gap-1.5"
                          :disabled="validApplicantsCount === 0 || isSubmitting"
                          @click="confirmImport"
                        >
                          <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
                          <span>Import {{ validApplicantsCount }} Applicants</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                          @click="resetBatchState"
                        >
                          <X class="h-3.5 w-3.5 mr-1" />
                          Discard
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>

                <!-- Parsed applicant rows -->
                <TableRow
                  v-for="(candidate, idx) in parsedApplicants"
                  :key="candidate.id || idx"
                  class="hover:bg-muted/30"
                >
                  <TableCell class="py-2">
                    <div class="flex flex-col">
                      <span class="font-semibold text-xs text-foreground">
                        {{ candidate.surname }}, {{ candidate.firstName }} {{ candidate.middleName }}
                      </span>
                      <span class="text-[10px] text-muted-foreground">
                        {{ candidate.sex }} • {{ candidate.dateOfBirth || 'DOB N/A' }}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell class="py-2">
                    <div class="flex flex-col text-[11px]">
                      <span class="font-medium text-foreground">{{ candidate.municipality }}</span>
                      <span class="text-muted-foreground">Brgy. {{ candidate.barangay }}</span>
                    </div>
                  </TableCell>
                  <TableCell class="py-2">
                    <Badge
                      variant="outline"
                      :class="['text-[10px] py-0.5 px-2 font-semibold gap-1', LPII_CONFIG[candidate.lpiiTag].badgeClass]"
                    >
                      <TreePine v-if="candidate.lpiiTag === 'LOWLAND'" class="h-3 w-3" />
                      <Mountain v-else-if="candidate.lpiiTag === 'UPLAND'" class="h-3 w-3" />
                      <Waves v-else class="h-3 w-3" />
                      {{ LPII_CONFIG[candidate.lpiiTag].label }}
                    </Badge>
                  </TableCell>
                  <TableCell class="py-2">
                    <span class="text-[11px] font-medium truncate max-w-40 block" :title="candidate.course">
                      {{ candidate.course }}
                    </span>
                  </TableCell>
                  <TableCell class="py-2">
                    <span class="text-[10px] font-mono text-muted-foreground">
                      {{ candidate.pageRange || 'Row Data' }}
                    </span>
                  </TableCell>
                  <TableCell class="py-2">
                    <Badge
                      v-if="candidate.isValid !== false"
                      variant="outline"
                      class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                    >
                      Valid
                    </Badge>
                    <Badge
                      v-else
                      variant="outline"
                      class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]"
                      :title="candidate.validationErrors?.join(', ')"
                    >
                      Needs Check
                    </Badge>
                  </TableCell>
                  <TableCell class="py-2 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                        title="Edit Scanned Information"
                        @click="openEditCandidateModal(candidate, idx)"
                      >
                        <Pencil class="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Delete Candidate"
                        @click="removeCandidate(idx)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Case B: Search or dropdown filters returned 0 matches -->
              <TableRow v-else>
                <TableCell colspan="9" class="h-36 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2 py-4">
                    <Filter class="h-7 w-7 text-muted-foreground/50" />
                    <p class="text-sm font-semibold text-foreground">No applicant records match the selected criteria</p>
                    <p class="text-xs text-muted-foreground">
                      Try adjusting the search keyword, LPII category, or status filters.
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
            Showing <span class="font-medium text-foreground">{{ filteredApplicants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1 }}</span>
            to <span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredApplicants.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredApplicants.length }}</span> applicants
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
                v-for="p in totalApplicantPages"
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
  <GipBatchUploadDialog />

  <!-- ─── EDIT APPLICANT STATUS & DOCUMENTS DIALOG ─── -->
  <Dialog :open="isEditApplicantDialogOpen" @update:open="onEditDialogOpenChange">
    <DialogContent class="sm:max-w-lg">
      <form class="grid gap-5" @submit="saveApplicantReview">
        <DialogHeader>
          <DialogTitle>Edit GIP Applicant</DialogTitle>
          <DialogDescription v-if="applicantToEdit" class="truncate">
            {{ applicantToEdit.fullName }} · {{ applicantToEdit.code }}
          </DialogDescription>
        </DialogHeader>

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

        <FormField name="documentsSubmitted">
          <FormItem>
            <FormLabel>Documents Submitted</FormLabel>
            <FormDescription>
              Same checklist as the applicant entry form. NSRP is always included, and changes also update the applicant's registry record.
            </FormDescription>
            <FormControl>
              <div role="group" class="grid gap-2 sm:grid-cols-2">
                <Label
                  v-for="doc in editDocumentOptions"
                  :key="doc"
                  :class="[
                    'flex items-center gap-2.5 rounded-lg border p-3 font-normal transition-colors',
                    editDocuments.includes(doc) ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/50',
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
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
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
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- ─── EDIT SCANNED CANDIDATE DIALOG (INLINE TABLE SUPPORT) ─── -->
  <GipEditCandidateDialog
    v-model:open="isEditModalOpen"
    :candidate="editingCandidate"
    :index="editingCandidateIndex"
    @save="saveEditedCandidate"
  />

  <!-- ─── REMOVE APPLICANT CONFIRMATION DIALOG ─── -->
  <Dialog v-model:open="isRemoveDialogOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
            <Trash2 class="h-5 w-5" />
          </div>
          <div>
            <DialogTitle class="text-base font-semibold">Remove GIP Applicant</DialogTitle>
            <DialogDescription class="text-xs text-muted-foreground mt-0.5">
              Remove applicant record from GIP registry.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div v-if="applicantToRemove" class="py-2 space-y-3 text-xs">
        <div class="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">Full Name:</span>
            <span class="font-semibold text-foreground">{{ applicantToRemove.fullName }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">Status:</span>
            <Badge variant="outline" class="text-[10px]">{{ applicantToRemove.status }}</Badge>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-muted-foreground">LPII Category:</span>
            <span class="font-medium text-foreground">{{ applicantToRemove.lpiiTag }}</span>
          </div>
        </div>

        <p class="text-muted-foreground leading-relaxed">
          Are you sure you want to remove <strong class="text-foreground">{{ applicantToRemove.fullName }}</strong> from the GIP applicant registry?
          Note: Applicants who have active intern deployments in GIP cannot be removed.
        </p>
      </div>

      <DialogFooter class="flex flex-row items-center justify-end gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          class="text-xs cursor-pointer"
          :disabled="isRemoving"
          @click="cancelRemoveApplicant"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          class="text-xs gap-1.5 cursor-pointer"
          :disabled="isRemoving"
          @click="confirmRemoveApplicant"
        >
          <Loader2 v-if="isRemoving" class="h-3.5 w-3.5 animate-spin" />
          <span>{{ isRemoving ? 'Removing...' : 'Confirm Remove' }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- ─── Bulk Remove Applicants Dialog ─── -->
  <Dialog :open="isBulkDeleteDialogOpen" @update:open="isBulkDeleteDialogOpen = $event">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="text-destructive flex items-center gap-2">
          <Trash2 class="h-5 w-5" />
          <span>Remove Selected GIP Applicants</span>
        </DialogTitle>
        <DialogDescription class="text-xs leading-relaxed">
          Are you sure you want to remove <strong class="text-foreground">{{ selectedApplicantIds.length }}</strong> selected applicant record{{ selectedApplicantIds.length > 1 ? 's' : '' }} from the GIP registry?
          Note: Applicants who have active deployments in GIP will not be removed.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="flex flex-row items-center justify-end gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          class="text-xs cursor-pointer"
          :disabled="isBulkDeleting"
          @click="isBulkDeleteDialogOpen = false"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          class="text-xs gap-1.5 cursor-pointer"
          :disabled="isBulkDeleting"
          @click="handleBulkDelete"
        >
          <Loader2 v-if="isBulkDeleting" class="h-3.5 w-3.5 animate-spin" />
          <Trash2 v-else class="h-3.5 w-3.5" />
          <span>{{ isBulkDeleting ? 'Removing...' : `Remove ${selectedApplicantIds.length} Applicants` }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- ─── BULK GIP DEPLOYMENT DIALOG ─── -->
  <Dialog :open="isBulkDeployDialogOpen" @update:open="onBulkDeployOpenChange">
    <DialogContent class="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
      <Form
        v-slot="{ values, setFieldValue }"
        :validation-schema="bulkDeploySchema"
        :initial-values="bulkDeployInitialValues"
        class="grid gap-5"
        @submit="submitBulkDeploy"
      >
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            Bulk GIP Deployment
          </DialogTitle>
          <DialogDescription>
            Deploy {{ deployableApplicants.length }} selected applicant{{ deployableApplicants.length === 1 ? '' : 's' }}
            with the same program, station, stipend, and period.
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
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
        </DialogFooter>
      </Form>
    </DialogContent>
  </Dialog>
</template>
