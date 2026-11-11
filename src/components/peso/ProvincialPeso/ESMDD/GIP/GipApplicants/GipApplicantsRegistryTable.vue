<script setup lang="ts">
// GipApplicants.vue — registry table: filters, bulk actions, rows (mobile cards / desktop table) and pagination
import SearchSelect from '@/components/SearchSelect.vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, Loader2, Minus, Pencil, RefreshCw, Search, Trash2, UploadCloud, X } from '@lucide/vue'
import { getGipStatusBadgeClass } from '@/helpers/peso/provincialPeso/gipHelper'
import { useGipApplicantsPageContext } from '@/composables/peso/provincialPeso/gipApplicantsPageContext'

const {
  applicants,
  filteredApplicants,
  paginatedApplicants,
  totalApplicantPages,
  availableMonths,
  isLoading,
  searchQuery,
  statusTab,
  selectedLpiiFilter,
  selectedMonthFilter,
  selectedGenderFilter,
  currentPage,
  pageSize,
  selectedApplicantIds,
  isAllSelected,
  isIndeterminate,
  toggleSelectAll,
  toggleSelectApplicant,
  clearSelection,
  getInitials,
  getApplicantAvatar,
  formatDateDisplay,
  getApplicantDocuments,
  resetFilters,
  openApplicantDetails,
  openEditApplicantDialog,
  exportCsv,
  refreshApplicantsData,
  navigateToPriority,
  setFileInputRef,
  triggerFileInput,
  handleUploadBatchClick,
  promptRemoveApplicant,
  showApplicantCards,
  getApplicantSwipeActions,
  getApplicantCard,
  isBulkDeleteDialogOpen,
  isBulkDeployDialogOpen,
  LPII_CONFIG,
  isDragging,
  isParsing,
  uploadedFile,
  parsedApplicants,
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
  confirmImport,
  resetBatchState,
  downloadTemplate,
} = useGipApplicantsPageContext()
</script>

<template>
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
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

        <SearchSelect
          v-model="selectedLpiiFilter"
          :options="[{ value: 'ALL', label: 'All LPII Zones' }, { value: 'LOWLAND', label: 'Lowland' }, { value: 'UPLAND', label: 'Upland' }, { value: 'WETLAND', label: 'Wetland' }]"
          class="w-full"
          aria-label="Filter by LPII zone"
        />

        <SearchSelect
          v-model="selectedMonthFilter"
          :options="availableMonths"
          class="w-full"
          aria-label="Filter by month"
        />

        <SearchSelect
          v-model="selectedGenderFilter"
          :options="[{ value: 'ALL', label: 'All Genders' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]"
          class="w-full"
          aria-label="Filter by gender"
        />
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
            <AvatarImage
              v-if="getApplicantAvatar(applicant)"
              :src="getApplicantAvatar(applicant)!"
              :alt="applicant.fullName"
              class="object-cover"
            />
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
                      <AvatarImage
                        v-if="getApplicantAvatar(applicant)"
                        :src="getApplicantAvatar(applicant)!"
                        :alt="applicant.fullName"
                        class="object-cover"
                      />
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
</template>
