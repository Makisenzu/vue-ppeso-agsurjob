<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileType,
  Link2,
  Loader2,
  Mountain,
  Pencil,
  ScanText,
  Trash2,
  TreePine,
  UploadCloud,
  Waves,
  X,
  UserPlus,
  UserX,
} from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { useGipBatchUpload } from '@/composables/peso/provincialPeso/useGipBatchUpload'
import { LPII_CONFIG } from '@/helpers/peso/provincialPeso/gipHelper'
import type { DuplicateResolutionAction } from '@/types/peso/provincialPeso/applicantEntry'
import GipEditCandidateDialog from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipEditCandidateDialog.vue'

const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const {
  isDragging,
  isParsing,
  uploadedFile,
  parsedApplicants,
  editingCandidate,
  editingCandidateIndex,
  isEditModalOpen,
  duplicateCandidate,
  isDuplicateModalOpen,
  ocrProgress,
  validApplicantsCount,
  invalidApplicantsCount,
  duplicatesCount,
  skippedCount,
  hasParsedData,
  isSubmitting,
  isOpen,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  removeCandidate,
  openEditCandidateModal,
  saveEditedCandidate,
  openDuplicateModal,
  resolveDuplicate,
  setAllDuplicatesAction,
  confirmImport,
  resetBatchState,
  downloadTemplate,
} = useGipBatchUpload()

const selectedDuplicateAction = ref<DuplicateResolutionAction>('link_program')
const selectedDuplicateProgram = ref<string>('GIP')
const batchProgramOptions = ['GIP', 'TUPAD', 'SPES', 'Special Recruitment', 'PESO Job Fair']

watch(
  () => duplicateCandidate.value,
  (candidate) => {
    if (candidate) {
      selectedDuplicateAction.value = candidate.resolutionAction || 'link_program'
      selectedDuplicateProgram.value = candidate.selectedProgram || 'GIP'
    }
  }
)

const confirmCandidateDuplicateResolution = () => {
  if (!duplicateCandidate.value?.existingMatch) return
  resolveDuplicate({
    action: selectedDuplicateAction.value,
    targetProgram: selectedDuplicateProgram.value,
    existingApplicantId: duplicateCandidate.value.existingMatch.existingApplicant.id,
  })
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-220 max-h-[92vh] flex flex-col p-0">
      <!-- ─── Dialog Header ─── -->
      <DialogHeader class="p-5 pb-3 border-b">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg border bg-primary/10 text-primary">
              <ScanText class="h-5 w-5" />
            </div>
            <div>
              <DialogTitle class="text-base font-semibold">
                Batch Import GIP Applicants
              </DialogTitle>
              <DialogDescription class="text-xs">
                Upload raw Excel spreadsheets (.xlsx, .csv) or scanned multi-page DOLE NSRP Form 1 PDFs (2 pages per applicant).
              </DialogDescription>
            </div>
          </div>

          <!-- Template button -->
          <Button
            variant="outline"
            size="sm"
            class="h-8 gap-1.5 text-xs self-start sm:self-auto cursor-pointer"
            @click="downloadTemplate"
          >
            <Download class="h-3.5 w-3.5" />
            <span>Excel Template</span>
          </Button>
        </div>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        <!-- ─── DRAG & DROP ZONE (Shown when no data yet or parsing) ─── -->
        <div
          v-if="!hasParsedData && !ocrProgress.isProcessing"
          :class="[
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 bg-muted/10',
          ]"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            class="hidden"
            @change="onFileInputChange"
          />

          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <UploadCloud class="h-7 w-7" />
          </div>

          <p class="font-semibold text-sm text-foreground">
            Drag and drop your Excel or NSRP PDF file here
          </p>
          <p class="text-xs text-muted-foreground mt-1 max-w-md">
            Supports <strong class="text-foreground">.xlsx, .xls, .csv</strong> raw data files or
            <strong class="text-foreground">.pdf</strong> scanned 2-page NSRP Form 1 documents for automatic OCR recognition.
          </p>

          <div class="mt-4 flex items-center gap-3">
            <Badge variant="outline" class="gap-1.5 py-1 px-2.5 text-xs font-normal">
              <FileSpreadsheet class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Excel / CSV Sheets
            </Badge>
            <Badge variant="outline" class="gap-1.5 py-1 px-2.5 text-xs font-normal">
              <FileType class="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              NSRP Form 1 PDFs (OCR)
            </Badge>
          </div>

          <Button size="sm" class="mt-4 text-xs pointer-events-none">
            Browse Computer Files
          </Button>
        </div>

        <!-- ─── OCR SCANNING & PROGRESS STATE ─── -->
        <div
          v-else-if="ocrProgress.isProcessing || isParsing"
          class="flex flex-col items-center justify-center rounded-xl border p-8 bg-muted/20 text-center space-y-4"
        >
          <div class="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 class="h-8 w-8 animate-spin" />
            <ScanText class="absolute h-4 w-4" />
          </div>

          <div class="space-y-1.5 max-w-md">
            <h3 class="font-semibold text-sm text-foreground">
              {{ ocrProgress.statusMessage || 'Processing file and checking duplicate records...' }}
            </h3>
            <p class="text-xs text-muted-foreground">
              Reading document structure, running image OCR text recognition, and checking provincial master registry for matches.
            </p>
          </div>

          <div class="w-full max-w-sm space-y-1">
            <Progress :model-value="ocrProgress.progressPercent" class="h-2" />
            <div class="flex justify-between text-[11px] text-muted-foreground">
              <span>Page {{ ocrProgress.currentPage }} of {{ ocrProgress.totalPages }}</span>
              <span>{{ ocrProgress.progressPercent }}%</span>
            </div>
          </div>
        </div>

        <!-- ─── REVIEW & VALIDATION PREVIEW TABLE (When Data Parsed) ─── -->
        <div v-else class="space-y-3">
          <!-- Summary Banner -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 bg-muted/20">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" class="font-medium text-xs">
                File: {{ uploadedFile?.name }}
              </Badge>
              <Badge variant="outline" class="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 class="h-3 w-3 mr-1" />
                {{ validApplicantsCount }} Ready for Import
              </Badge>
              <Badge
                v-if="duplicatesCount > 0"
                variant="outline"
                class="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              >
                <AlertTriangle class="h-3 w-3 mr-1" />
                {{ duplicatesCount }} Already Registered
              </Badge>
              <Badge
                v-if="skippedCount > 0"
                variant="outline"
                class="text-xs bg-muted text-muted-foreground border-border"
              >
                {{ skippedCount }} Skipped
              </Badge>
              <Badge
                v-if="invalidApplicantsCount > 0"
                variant="outline"
                class="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
              >
                <AlertCircle class="h-3 w-3 mr-1" />
                {{ invalidApplicantsCount }} Needs Review
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              class="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer self-end sm:self-auto"
              @click="resetBatchState"
            >
              <X class="h-3.5 w-3.5 mr-1" />
              Upload Different File
            </Button>
          </div>

          <!-- Duplicate Bulk Actions Notice Banner (When Duplicates Found) -->
          <div
            v-if="duplicatesCount > 0"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs"
          >
            <div class="flex items-center gap-2">
              <AlertTriangle class="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span class="text-foreground font-medium">
                {{ duplicatesCount }} applicant(s) exist in the database. By default, they will be linked to GIP to avoid creating duplicate records.
              </span>
            </div>
            <div class="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                @click="setAllDuplicatesAction('link_program', 'GIP')"
              >
                <Link2 class="h-3 w-3" />
                Link All to GIP
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-[11px] gap-1 text-muted-foreground hover:text-destructive cursor-pointer"
                @click="setAllDuplicatesAction('skip')"
              >
                <X class="h-3 w-3" />
                Skip All Duplicates
              </Button>
            </div>
          </div>

          <!-- Preview Table -->
          <div class="rounded-lg border overflow-hidden">
            <div class="max-h-75 overflow-y-auto">
              <Table>
                <TableHeader class="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead class="text-xs font-semibold">Applicant Name & Sex</TableHead>
                    <TableHead class="text-xs font-semibold">Municipality & Barangay</TableHead>
                    <TableHead class="text-xs font-semibold">LPII Zone</TableHead>
                    <TableHead class="text-xs font-semibold">Degree / Course</TableHead>
                    <TableHead class="text-xs font-semibold">Source</TableHead>
                    <TableHead class="text-xs font-semibold">Status & Duplicate</TableHead>
                    <TableHead class="text-right text-xs font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="(candidate, idx) in parsedApplicants"
                    :key="candidate.id || idx"
                    :class="[
                      'hover:bg-muted/30 transition-colors',
                      candidate.resolutionAction === 'skip' ? 'opacity-50 bg-muted/20' : '',
                    ]"
                  >
                    <!-- Name & Gender -->
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

                    <!-- Location -->
                    <TableCell class="py-2">
                      <div class="flex flex-col text-[11px]">
                        <span class="font-medium text-foreground">{{ candidate.municipality }}</span>
                        <span class="text-muted-foreground">Brgy. {{ candidate.barangay }}</span>
                      </div>
                    </TableCell>

                    <!-- LPII -->
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

                    <!-- Course -->
                    <TableCell class="py-2">
                      <span class="text-[11px] font-medium truncate max-w-40 block" :title="candidate.course">
                        {{ candidate.course }}
                      </span>
                    </TableCell>

                    <!-- Source -->
                    <TableCell class="py-2">
                      <span class="text-[10px] font-mono text-muted-foreground">
                        {{ candidate.pageRange || 'Row Data' }}
                      </span>
                    </TableCell>

                    <!-- Status & Duplicate Resolution -->
                    <TableCell class="py-2">
                      <div class="flex flex-col gap-1 items-start">
                        <!-- Duplicate Match Badge -->
                        <template v-if="candidate.existingMatch">
                          <Badge
                            variant="outline"
                            :class="[
                              'text-[10px] cursor-pointer gap-1 transition-all py-0.5',
                              candidate.resolutionAction === 'link_program'
                                ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                                : candidate.resolutionAction === 'create_new'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
                            ]"
                            :title="'Click to modify duplicate resolution: ' + candidate.resolutionAction"
                            @click="openDuplicateModal(candidate, idx)"
                          >
                            <Link2 v-if="candidate.resolutionAction === 'link_program'" class="h-2.5 w-2.5" />
                            <AlertTriangle v-else-if="candidate.resolutionAction === 'create_new'" class="h-2.5 w-2.5" />
                            <X v-else class="h-2.5 w-2.5" />
                            <span v-if="candidate.resolutionAction === 'link_program'">
                              Link: {{ candidate.selectedProgram || 'GIP' }}
                            </span>
                            <span v-else-if="candidate.resolutionAction === 'create_new'">
                              Create New
                            </span>
                            <span v-else>
                              Skip
                            </span>
                          </Badge>
                        </template>

                        <!-- Normal Validity Badge -->
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
                      </div>
                    </TableCell>

                    <!-- Actions: Edit, Duplicate Review, Remove -->
                    <TableCell class="py-2 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <Button
                          v-if="candidate.existingMatch"
                          variant="ghost"
                          size="sm"
                          class="h-7 w-7 p-0 text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10 cursor-pointer"
                          title="Review Duplicate Match"
                          @click="openDuplicateModal(candidate, idx)"
                        >
                          <Link2 class="h-3.5 w-3.5" />
                        </Button>
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
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Dialog Footer ─── -->
      <DialogFooter class="p-4 border-t bg-muted/10">
        <div class="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer"
            @click="isOpen = false"
          >
            Cancel
          </Button>

          <div class="flex items-center gap-2">
            <Button
              v-if="hasParsedData"
              type="button"
              size="sm"
              class="text-xs cursor-pointer gap-1.5 font-semibold"
              :disabled="validApplicantsCount === 0 || isSubmitting"
              @click="confirmImport"
            >
              <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
              <CheckCircle2 v-else class="h-3.5 w-3.5" />
              <span>Import {{ validApplicantsCount }} Applicants to Registry</span>
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- ─── Edit Scanned Candidate Dialog ─── -->
  <GipEditCandidateDialog
    v-model:open="isEditModalOpen"
    :candidate="editingCandidate"
    :index="editingCandidateIndex"
    @save="saveEditedCandidate"
  />

  <!-- ─── Duplicate Applicant Review Dialog (Inlined shadcn Dialog) ─── -->
  <Dialog v-model:open="isDuplicateModalOpen">
    <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle class="h-5 w-5 shrink-0" />
          <DialogTitle class="text-base font-semibold">Existing Applicant Record Found</DialogTitle>
        </div>
        <DialogDescription class="text-xs">
          Candidate <strong class="text-foreground">{{ duplicateCandidate ? `${duplicateCandidate.firstName} ${duplicateCandidate.surname}` : '' }}</strong> matches an existing profile in the provincial database.
        </DialogDescription>
      </DialogHeader>

      <div v-if="duplicateCandidate?.existingMatch" class="space-y-3 py-2 text-xs">
        <!-- Existing Profile Info Card -->
        <div class="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-foreground">
              {{ duplicateCandidate.existingMatch.existingApplicant.surname }}, {{ duplicateCandidate.existingMatch.existingApplicant.first_name }} {{ duplicateCandidate.existingMatch.existingApplicant.middle_name || '' }}
            </span>
            <Badge variant="outline" class="text-[10px]">
              {{ duplicateCandidate.existingMatch.confidence === 'exact' ? 'Exact Match' : duplicateCandidate.existingMatch.confidence === 'high' ? 'High Match' : 'Possible Match' }}
            </Badge>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div>
              <span>DOB:</span> <strong class="text-foreground">{{ duplicateCandidate.existingMatch.existingApplicant.date_of_birth || 'N/A' }}</strong>
            </div>
            <div>
              <span>Sex:</span> <strong class="text-foreground">{{ duplicateCandidate.existingMatch.existingApplicant.sex || 'N/A' }}</strong>
            </div>
            <div class="col-span-2">
              <span>Existing Programs:</span>
              <div class="flex flex-wrap gap-1 mt-1">
                <template v-if="duplicateCandidate.existingMatch.existingPrograms?.length">
                  <Badge v-for="p in duplicateCandidate.existingMatch.existingPrograms" :key="p" variant="secondary" class="text-[10px] py-0">
                    {{ p }}
                  </Badge>
                </template>
                <span v-else class="italic text-[10px]">None</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Resolution Action Selection -->
        <div class="space-y-2 pt-1">
          <label class="font-semibold text-xs text-foreground block">Select Action for this Candidate:</label>

          <!-- Option 1: Link to program -->
          <label
            :class="[
              'flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-colors space-y-2',
              selectedDuplicateAction === 'link_program' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30',
            ]"
          >
            <div class="flex items-start gap-2">
              <input
                type="radio"
                name="batch-duplicate-action"
                value="link_program"
                v-model="selectedDuplicateAction"
                class="mt-0.5 text-primary"
              />
              <div>
                <span class="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Link2 class="h-3.5 w-3.5 text-primary" />
                  Link to Program
                  <Badge variant="outline" class="text-[9px] py-0 px-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Recommended
                  </Badge>
                </span>
                <p class="text-[11px] text-muted-foreground">
                  Connects this candidate's application to their existing profile and registers them in the program queue without creating duplicate master records.
                </p>
              </div>
            </div>

            <!-- Program Selector -->
            <div v-if="selectedDuplicateAction === 'link_program'" class="pl-6 pt-1 flex items-center gap-2" @click.stop>
              <span class="text-[11px] font-medium text-foreground whitespace-nowrap">Target Program:</span>
              <Select v-model="selectedDuplicateProgram">
                <SelectTrigger class="h-8 text-xs w-48">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="prog in batchProgramOptions" :key="prog" :value="prog">
                    {{ prog }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </label>

          <!-- Option 2: Create New Record -->
          <label
            :class="[
              'flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
              selectedDuplicateAction === 'create_new' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30',
            ]"
          >
            <input
              type="radio"
              name="batch-duplicate-action"
              value="create_new"
              v-model="selectedDuplicateAction"
              class="mt-0.5 text-primary"
            />
            <div>
              <span class="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <UserPlus class="h-3.5 w-3.5 text-muted-foreground" />
                Create New Master Profile
              </span>
              <p class="text-[11px] text-muted-foreground">
                Forces creation of a separate new applicant record (only use if verified to be a different person).
              </p>
            </div>
          </label>

          <!-- Option 3: Skip / Exclude -->
          <label
            :class="[
              'flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors',
              selectedDuplicateAction === 'skip' ? 'border-destructive bg-destructive/5' : 'border-border hover:bg-muted/30',
            ]"
          >
            <input
              type="radio"
              name="batch-duplicate-action"
              value="skip"
              v-model="selectedDuplicateAction"
              class="mt-0.5 text-destructive"
            />
            <div>
              <span class="font-semibold text-xs text-destructive flex items-center gap-1.5">
                <UserX class="h-3.5 w-3.5 text-destructive" />
                Skip / Do Not Import
              </span>
              <p class="text-[11px] text-muted-foreground">
                Excludes this applicant from the batch import entirely.
              </p>
            </div>
          </label>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="outline" size="sm" class="text-xs cursor-pointer" @click="isDuplicateModalOpen = false">
          Cancel
        </Button>
        <Button size="sm" class="text-xs font-semibold cursor-pointer" @click="confirmCandidateDuplicateResolution">
          Apply Resolution
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
