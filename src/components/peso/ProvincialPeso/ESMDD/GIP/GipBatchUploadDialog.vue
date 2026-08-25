<script setup lang="ts">
import { ref } from 'vue'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileType,
  Loader2,
  Mountain,
  ScanText,
  Trash2,
  TreePine,
  UploadCloud,
  Waves,
  X,
} from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

const fileInputRef = ref<HTMLInputElement | null>(null)

const {
  isDragging,
  isParsing,
  uploadedFile,
  parsedApplicants,
  ocrProgress,
  validApplicantsCount,
  invalidApplicantsCount,
  hasParsedData,
  isSubmitting,
  isOpen,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  removeCandidate,
  confirmImport,
  resetBatchState,
  downloadTemplate,
} = useGipBatchUpload()

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
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
              {{ ocrProgress.statusMessage || 'Processing file...' }}
            </h3>
            <p class="text-xs text-muted-foreground">
              Reading document structure, running image OCR text recognition, and extracting NSRP applicant fields.
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
            <div class="flex items-center gap-2">
              <Badge variant="secondary" class="font-medium text-xs">
                File: {{ uploadedFile?.name }}
              </Badge>
              <Badge variant="outline" class="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 class="h-3 w-3 mr-1" />
                {{ validApplicantsCount }} Ready for Import
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
                    <TableHead class="text-xs font-semibold">Source Page</TableHead>
                    <TableHead class="text-xs font-semibold">Status</TableHead>
                    <TableHead class="text-right text-xs font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="(candidate, idx) in parsedApplicants"
                    :key="candidate.id || idx"
                    class="hover:bg-muted/30"
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

                    <!-- Status -->
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

                    <!-- Remove -->
                    <TableCell class="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        @click="removeCandidate(idx)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
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
              class="text-xs cursor-pointer gap-1.5"
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
</template>
