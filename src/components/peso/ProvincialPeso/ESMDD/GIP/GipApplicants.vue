<script setup lang="ts">
import { ref } from 'vue'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  Filter,
  Loader2,
  MapPin,
  Mountain,
  Pencil,
  RefreshCw,
  ScanText,
  Search,
  Trash2,
  TreePine,
  UploadCloud,
  User,
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
import type { LpiiDataPoint } from '@/types/peso/provincialPeso/gip'
import { useGipApplicants } from '@/composables/peso/provincialPeso/useGipApplicants'
import { useGipBatchUpload } from '@/composables/peso/provincialPeso/useGipBatchUpload'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { LPII_CONFIG } from '@/helpers/peso/provincialPeso/gipHelper'
import GipBatchUploadDialog from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipBatchUploadDialog.vue'
import GipEditCandidateDialog from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipEditCandidateDialog.vue'

const gipStore = useGipStore()

const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const {
  applicants,
  applicantOverallLpiiData,
  applicantMaleLpiiData,
  applicantFemaleLpiiData,
  totalOverallApplicantLpii,
  totalMaleApplicantLpii,
  totalFemaleApplicantLpii,
  filteredApplicants,
  paginatedApplicants,
  totalApplicantPages,
  availableYears,
  selectedApplicant,
  isDetailsModalOpen,
  isLoading,
  searchQuery,
  statusTab,
  selectedLpiiFilter,
  selectedYearFilter,
  selectedGenderFilter,
  selectedStatusFilter,
  currentPage,
  pageSize,
  donutTooltipTriggers,
  getInitials,
  goBack,
  resetFilters,
  openApplicantDetails,
  closeApplicantDetails,
  exportCsv,
  fetchApplicantsData,
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

const handleUploadBatchClick = () => {
  if (applicants.value.length > 0) {
    gipStore.openBatchUploadModal()
  } else {
    triggerFileInput()
  }
}
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
      </div>
    </div>

    <!-- ─── 1 ROW OF PIE / DONUT CHARTS: APPLICANT LPII (Lowland, Upland, Wetland) ─── -->
    <div class="space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- ─── Pie Chart 1: Combined Applicant LPII Distribution ─── -->
        <Card class="relative overflow-hidden flex flex-col justify-between border shadow-xs">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="flex h-7 w-7 items-center justify-center rounded-md border bg-primary/10 text-primary">
                  <Users class="h-4 w-4" />
                </div>
                <div>
                  <CardTitle class="text-base font-semibold">Combined Applicant LPII</CardTitle>
                  <CardDescription class="text-xs">All Registered GIP Applicants</CardDescription>
                </div>
              </div>
              <Badge variant="outline" class="font-mono text-xs">
                Total: {{ totalOverallApplicantLpii.toLocaleString() }}
              </Badge>
            </div>
          </CardHeader>

          <CardContent class="flex flex-col items-center justify-center p-4">
            <div v-if="isLoading" class="flex h-55 w-full items-center justify-center">
              <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="totalOverallApplicantLpii > 0" class="relative w-full max-w-65 aspect-square flex items-center justify-center">
              <VisSingleContainer :data="applicantOverallLpiiData" :height="220">
                <VisDonut
                  :value="(d: LpiiDataPoint) => d.count"
                  :color="(d: LpiiDataPoint) => d.color"
                  :pad-angle="0.03"
                  :corner-radius="4"
                  :arc-width="38"
                  :central-label="`${totalOverallApplicantLpii.toLocaleString()}`"
                  central-sub-label="Total Applicants"
                />
                <VisTooltip :triggers="donutTooltipTriggers" />
              </VisSingleContainer>
            </div>
            <div v-else class="flex h-55 w-full flex-col items-center justify-center text-xs text-muted-foreground">
              <p>No applicant records yet</p>
            </div>

            <!-- Legend and counts -->
            <div class="w-full mt-3 grid grid-cols-3 gap-2 pt-3 border-t text-center">
              <div
                v-for="item in applicantOverallLpiiData"
                :key="item.category"
                class="flex flex-col items-center rounded-lg bg-muted/40 p-2 transition hover:bg-muted/70"
              >
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }" />
                  {{ item.label }}
                </div>
                <span class="text-sm font-bold font-mono mt-0.5">{{ item.count.toLocaleString() }}</span>
                <span class="text-[10px] text-muted-foreground">
                  {{ totalOverallApplicantLpii ? ((item.count / totalOverallApplicantLpii) * 100).toFixed(1) : 0 }}%
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
                <div class="flex h-7 w-7 items-center justify-center rounded-md border bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <User class="h-4 w-4" />
                </div>
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
                <div class="flex h-7 w-7 items-center justify-center rounded-md border bg-pink-500/10 text-pink-600 dark:text-pink-400">
                  <User class="h-4 w-4" />
                </div>
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
            <Button
              size="sm"
              class="gap-1.5 text-xs cursor-pointer"
              @click="handleUploadBatchClick"
            >
              <UploadCloud class="h-3.5 w-3.5" />
              <span>Upload Batch</span>
            </Button>
            <input
              ref="fileInputRef"
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
              @click="fetchApplicantsData"
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
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
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
                <TableHead class="w-50 text-xs font-semibold">Applicant Information</TableHead>
                <TableHead class="text-xs font-semibold">Municipality & Barangay</TableHead>
                <TableHead class="text-xs font-semibold">LPII Classification</TableHead>
                <TableHead class="text-xs font-semibold">Academic Course</TableHead>
                <TableHead class="text-xs font-semibold">Batch Year</TableHead>
                <TableHead class="text-xs font-semibold">Documents Submitted</TableHead>
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
                      <p class="text-xs text-muted-foreground">Loading GIP applicant records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
              <template v-else-if="paginatedApplicants.length > 0">
                <TableRow
                  v-for="applicant in paginatedApplicants"
                  :key="applicant.id"
                  class="transition-colors hover:bg-muted/30"
                >
                  <!-- Applicant Info -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-2.5">
                      <Avatar class="h-8 w-8 rounded-full border bg-muted">
                        <AvatarFallback class="text-xs font-semibold text-primary">
                          {{ getInitials(applicant.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex flex-col">
                        <span class="font-semibold text-xs sm:text-sm text-foreground">
                          {{ applicant.fullName }}
                        </span>
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

                  <!-- Batch Year -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs">
                      <span class="font-mono text-foreground">{{ applicant.batchYear }}</span>
                      <span class="text-[11px] text-muted-foreground">
                        {{ applicant.createdAt ? applicant.createdAt.slice(0, 10) : 'N/A' }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Documents Submitted -->
                  <TableCell class="py-3">
                    <div class="flex flex-wrap items-center gap-1 max-w-50">
                      <template v-if="applicant.documentsSubmitted && applicant.documentsSubmitted.length > 0">
                        <Badge
                          v-for="doc in applicant.documentsSubmitted.slice(0, 2)"
                          :key="doc"
                          variant="secondary"
                          class="text-[10px] px-1.5 py-0 font-normal truncate max-w-25"
                          :title="doc"
                        >
                          {{ doc }}
                        </Badge>
                        <Badge
                          v-if="applicant.documentsSubmitted.length > 2"
                          variant="outline"
                          class="text-[10px] px-1.5 py-0 font-mono"
                        >
                          +{{ applicant.documentsSubmitted.length - 2 }}
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
                      <CheckCircle2 class="h-3 w-3" />
                      Approved
                    </Badge>
                    <Badge
                      v-else-if="applicant.status === 'Hired'"
                      variant="outline"
                      class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] gap-1"
                    >
                      <CheckCircle2 class="h-3 w-3" />
                      Hired
                    </Badge>
                    <Badge
                      v-else-if="applicant.status === 'Pending'"
                      variant="outline"
                      class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px] gap-1"
                    >
                      <Clock class="h-3 w-3" />
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
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-8 gap-1.5 text-xs cursor-pointer"
                      @click="openApplicantDetails(applicant)"
                    >
                      <Eye class="h-3.5 w-3.5" />
                      <span>Details</span>
                    </Button>
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
                          <CheckCircle2 class="h-3 w-3 mr-1" />
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
                          <CheckCircle2 v-else class="h-3.5 w-3.5" />
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
                <TableCell colspan="8" class="h-36 text-center text-muted-foreground">
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

    <!-- ─── APPLICANT DETAILS DIALOG ─── -->
    <Dialog v-model:open="isDetailsModalOpen">
      <DialogContent class="sm:max-w-137.5">
        <DialogHeader>
          <div class="flex items-center gap-2.5">
            <Avatar class="h-10 w-10 border bg-muted">
              <AvatarFallback class="font-semibold text-sm text-primary">
                {{ selectedApplicant ? getInitials(selectedApplicant.fullName) : '' }}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle class="text-base font-semibold">{{ selectedApplicant?.fullName }}</DialogTitle>
              <DialogDescription class="text-xs flex items-center gap-1.5 mt-0.5">
                <span>{{ selectedApplicant?.code }}</span>
                <span>•</span>
                <span>GIP Applicant</span>
                <span>•</span>
                <span class="font-semibold text-foreground">{{ selectedApplicant?.status }}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div v-if="selectedApplicant" class="grid gap-4 py-2 text-xs">
          <!-- Ecosystem Banner -->
          <div
            :class="[
              'flex items-center justify-between rounded-lg p-3 border',
              LPII_CONFIG[selectedApplicant.lpiiTag].bgClass,
              LPII_CONFIG[selectedApplicant.lpiiTag].badgeClass,
            ]"
          >
            <div class="flex items-center gap-2">
              <TreePine v-if="selectedApplicant.lpiiTag === 'LOWLAND'" class="h-4 w-4" />
              <Mountain v-else-if="selectedApplicant.lpiiTag === 'UPLAND'" class="h-4 w-4" />
              <Waves v-else class="h-4 w-4" />
              <div>
                <span class="font-bold uppercase tracking-wider">
                  {{ LPII_CONFIG[selectedApplicant.lpiiTag].label }} Ecosystem Tagging
                </span>
                <p class="text-[11px] opacity-90">
                  Barangay {{ selectedApplicant.barangay }}, {{ selectedApplicant.municipality }}
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
              <span class="text-muted-foreground block text-[11px]">Permanent Address</span>
              <span class="font-medium text-foreground mt-0.5 block">
                Brgy. {{ selectedApplicant.barangay }}, {{ selectedApplicant.municipality }}
              </span>
            </div>
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Academic Background / Degree</span>
              <span class="font-medium text-foreground mt-0.5 block">{{ selectedApplicant.course }}</span>
            </div>
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Contact Information</span>
              <span class="font-medium text-foreground mt-0.5 block font-mono">{{ selectedApplicant.contact }}</span>
            </div>
            <div class="rounded-lg border p-2.5 bg-muted/20">
              <span class="text-muted-foreground block text-[11px]">Batch Year / Date Applied</span>
              <span class="font-medium text-foreground mt-0.5 block font-mono">
                Batch {{ selectedApplicant.batchYear }} ({{ selectedApplicant.createdAt ? selectedApplicant.createdAt.slice(0, 10) : 'N/A' }})
              </span>
            </div>
          </div>

          <!-- Documents Submitted Section -->
          <div class="rounded-lg border p-3 bg-muted/10 space-y-2">
            <span class="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileCheck class="h-3.5 w-3.5 text-primary" />
              Documents Submitted
            </span>
            <div v-if="selectedApplicant.documentsSubmitted && selectedApplicant.documentsSubmitted.length > 0" class="flex flex-wrap gap-1.5">
              <Badge
                v-for="doc in selectedApplicant.documentsSubmitted"
                :key="doc"
                variant="secondary"
                class="text-xs font-normal"
              >
                {{ doc }}
              </Badge>
            </div>
            <p v-else class="text-[11px] text-muted-foreground italic">
              No documentary attachments uploaded yet.
            </p>
          </div>

          <!-- Remarks / Assessment Notes Section -->
          <div v-if="selectedApplicant.remarks && selectedApplicant.remarks.length > 0" class="rounded-lg border p-3 bg-muted/10 space-y-1.5">
            <span class="text-xs font-semibold text-foreground">Evaluation Remarks</span>
            <ul class="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
              <li v-for="(rem, idx) in selectedApplicant.remarks" :key="idx">
                {{ rem }}
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="closeApplicantDetails">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>



    <!-- ─── ADD SINGLE APPLICANT DIALOG ─── -->
    <GipAddApplicantDialog />

    <!-- ─── BATCH IMPORT APPLICANTS DIALOG ─── -->
    <GipBatchUploadDialog />

    <!-- ─── EDIT SCANNED CANDIDATE DIALOG (INLINE TABLE SUPPORT) ─── -->
    <GipEditCandidateDialog
      v-model:open="isEditModalOpen"
      :candidate="editingCandidate"
      :index="editingCandidateIndex"
      @save="saveEditedCandidate"
    />
  </div>
</template>
