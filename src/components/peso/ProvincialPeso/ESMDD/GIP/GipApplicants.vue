<script setup lang="ts">
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Pencil,
  Trash2,
  UploadCloud,
  AlertCircle,
  Eye,
  Lock,
  CalendarDays,
  CheckCircle2,
  CheckIcon,
  ChevronsUpDownIcon,
  Users,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import GipApplicantNsrpDetails from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipApplicantNsrpDetails.vue'
import { Label } from '@/components/ui/label'
import SearchSelect from '@/components/SearchSelect.vue'
import { useGipApplicantsPage } from '@/composables/peso/provincialPeso/useGipApplicantsPage'
import { provideGipApplicantsPage } from '@/composables/peso/provincialPeso/gipApplicantsPageContext'
import GipApplicantsRegistryTable from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipApplicants/GipApplicantsRegistryTable.vue'
import GipAppointmentRecordDialog from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipAppointmentRecordDialog.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Form } from '@/components/ui/form'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, ComboboxAnchor, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxItemIndicator, ComboboxList, ComboboxTrigger, ComboboxViewport } from '@/components/ui/combobox'
import { Avatar } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DirectoryRow } from '@/types/common/directory'

const page = useGipApplicantsPage()
// The section components (GipApplicants/*.vue) read and edit the same state
provideGipApplicantsPage(page)

const {
  selectedApplicantForDetails,
  statusTab,
  selectedApplicantIds,
  goBack,
  closeApplicantDetails,
  applicantToRemove,
  isRemoveDialogOpen,
  isRemoving,
  cancelRemoveApplicant,
  confirmRemoveApplicant,
  isBulkDeleteDialogOpen,
  isBulkDeleting,
  handleBulkDelete,
  LPII_CONFIG,
  duplicateCandidate,
  isDuplicateModalOpen,
  selectedDuplicateAction,
  selectedDuplicateProgram,
  duplicateActionOptions,
  duplicateProgramOptions,
  confirmDuplicateResolution,
  statusTabs,
  triggerFileInput,
  isDragging,
  isParsing,
  uploadedFile,
  parsedApplicants,
  ocrProgress,
  validApplicantsCount,
  invalidApplicantsCount,
  duplicatesCount,
  skippedCount,
  hasParsedData,
  isSubmitting,
  isBatchUploadOpen,
  onDragOver,
  onDragLeave,
  onDrop,
  removeCandidate,
  openEditCandidateModal,
  confirmImport,
  resetBatchState,
  downloadTemplate,
  openDuplicateModal,
  setAllDuplicatesAction,
  editingCandidate,
  isEditModalOpen,
  candidateForm,
  candidateBirthdateMin,
  candidateBirthdateMax,
  candidateSkillsInput,
  candidateValidationErrors,
  isCandidateValid,
  candidateMunicipalities,
  candidateDocumentOptions,
  candidateLpiiOptions,
  setCandidateLpii,
  toggleCandidateDocument,
  saveCandidateEdits,
  closeCandidateEdit,
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
  orientationDateMin,
  isBulkDeployDialogOpen,
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
} = page
</script>

<template>
  <!-- ─── APPLICANT NSRP DETAILS VIEW ─── -->
  <GipApplicantNsrpDetails
    v-if="selectedApplicantForDetails"
    :applicant="selectedApplicantForDetails"
    @back="closeApplicantDetails"
  />

  <!-- ─── REGISTRY MASTER VIEW ─── -->
  <div v-else class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
          <ArrowLeft class="size-4 shrink-0" />
          Back to Dashboard
        </Button>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">GIP Applicant Registry</h1>
        <p class="text-sm text-muted-foreground">GIP applicants across Agusan del Sur.</p>
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

    <!-- ─── Master Registry Table ─── -->
    <GipApplicantsRegistryTable />
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
            <SearchSelect
              v-model="selectedDuplicateProgram"
              :options="duplicateProgramOptions"
              placeholder="Select program"
              id="duplicateTargetProgram"
              class="w-full sm:w-56"
            />
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
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                :disabled="isSavingApplicantReview"
                :options="editStatusOptions"
                placeholder="Select a status"
                class="w-full"
              />
            </FormControl>
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
                  <Input v-bind="componentField" type="date" :min="orientationDateMin" :disabled="isSavingApplicantReview" />
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
                    <AppLink
                      :href="uploadedFileFor(doc)!.url"
                      target="_blank"
                      :aria-label="`View ${doc}`"
                      :title="uploadedFileFor(doc)!.name"
                    >
                      <Eye class="size-4" />
                    </AppLink>
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
              <SearchSelect
                v-model="candidateForm.sex"
                :options="[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]"
                id="ec-sex"
                class="w-full"
              />
            </div>
            <div class="grid gap-2">
              <Label for="ec-dob">Date of Birth</Label>
              <Input id="ec-dob" v-model="candidateForm.dateOfBirth" type="date" :min="candidateBirthdateMin" :max="candidateBirthdateMax" />
            </div>
            <div class="grid gap-2">
              <Label for="ec-civil">Civil Status</Label>
              <SearchSelect
                v-model="candidateForm.civilStatus"
                :options="[{ value: 'Single', label: 'Single' }, { value: 'Married', label: 'Married' }, { value: 'Widowed', label: 'Widowed' }, { value: 'Separated', label: 'Separated' }]"
                id="ec-civil"
                class="w-full"
              />
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
              <SearchSelect
                v-model="candidateForm.municipality"
                :options="candidateMunicipalities"
                placeholder="Select municipality"
                id="ec-muni"
                class="w-full"
              />
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
              <SearchSelect
                v-model="candidateForm.educationalLevel"
                :options="[{ value: 'College Graduate', label: 'College Graduate' }, { value: 'College Level', label: 'College Level' }, { value: 'Tech-Voc Graduate', label: 'Tech-Voc / TVET Graduate' }, { value: 'Senior High Graduate', label: 'Senior High School Graduate' }]"
                id="ec-level"
                class="w-full"
              />
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
              <FormControl>
                <SearchSelect
                  v-bind="componentField"
                  :disabled="isBulkDeploying"
                  :options="deploymentStatusOptions"
                  placeholder="Select a status"
                  class="w-full"
                />
              </FormControl>
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

  <!-- Opens after a bulk deploy with every deployed name -->
  <GipAppointmentRecordDialog />
</template>
