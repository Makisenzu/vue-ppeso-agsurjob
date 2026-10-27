<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  AlertTriangle,
  CheckIcon,
  ChevronDown,
  ChevronLeft,
  ChevronsUpDownIcon,
  Dices,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from '@lucide/vue'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useSpesApplicants } from '@/composables/peso/provincialPeso/useSpesApplicants'
import { useSpesApplicantForm } from '@/composables/peso/provincialPeso/useSpesApplicantForm'
import { useSpesDraw } from '@/composables/peso/provincialPeso/useSpesDraw'
import { useSpesAppointmentForm } from '@/composables/peso/provincialPeso/useSpesAppointmentForm'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import SpesRequirementAttachments from '@/components/peso/ProvincialPeso/ESMDD/SPES/SpesRequirementAttachments.vue'
import {
  formatSpesDate,
  formatSpesFormName,
  getSpesApplicantStatusBadgeClass,
  getSpesBeneficiaryType,
} from '@/helpers/peso/provincialPeso/spesHelper'

const {
  table,
  columns,
  spesForms,
  isLoading,
  errorMessage,
  isDeleting,
  spesFormToDelete,
  viewingForm,
  isDeleteDialogOpen,
  isDetailsDialogOpen,
  statusOptions,
  municipalityOptions,
  refreshApplicants,
  openAddApplicant,
  openDrawDialog,
  confirmDelete,
  getRowSwipeActions,
  getRowCard,
} = useSpesApplicants()
const {
  isReviewDialogOpen,
  formAttachments,
  isLoadingAttachments,
  isSubmitting,
  reviewingForm,
  isRemarksRequired,
  isOrientationRequired,
  statusOptions: reviewStatusOptions,
  onReviewDialogOpenChange,
  openEditDetails,
  submitReview,
} = useSpesApplicantForm()
const { selectedYear } = storeToRefs(useSpesStore())
const {
  isDrawOpen,
  isLoadingDrawPool,
  municipalityOptions: drawMunicipalityOptions,
  selectedMunicipality,
  selectedGroup,
  isUnspecifiedMunicipality,
  slots,
  maxSlots,
  slotsLeft,
  winners,
  lastDrawn,
  remaining,
  drawnIds,
  rotation,
  isSpinning,
  landedId,
  wheelSegments,
  canDraw,
  canConfirm,
  setSlots,
  spin,
  drawRemaining,
  resetDraw,
  confirmWinners,
  refreshPool: refreshDrawPool,
  onOpenChange: onDrawOpenChange,
} = useSpesDraw()
// Mounted wherever the randomizer is, so drawn applicants go straight to their appointment after approval
const {
  isAppointmentFormOpen,
  isEditMode,
  applicantOptions,
  beneficiaryOptions,
  fixedAppointeeName,
  drawAppointProgress,
  appointmentSchema,
  appointmentInitialValues,
  appointmentFormKey,
  isLoadingProvinces,
  isLoadingMunicipalities,
  isLoadingBarangays,
  locationError,
  retryLoadLocation,
  homeLocationNote,
  isLoadingHomeLocation,
  onAppointeeChange,
  onProvinceChange,
  onMunicipalityChange,
  onBarangayChange,
  provinceSearch,
  municipalitySearch,
  barangaySearch,
  filteredProvinces,
  filteredMunicipalities,
  filteredBarangays,
  durationChoices,
  getEndDate,
  countSpesCalendarDays,
  onAppointmentOpenChange,
  submitAppointment,
} = useSpesAppointmentForm()

const educationLevels = computed(() => {
  const form = viewingForm.value
  if (!form) return []
  return [
    { label: 'Elementary', school: form.elementary_school_name, course: form.elementary_degree_course, year: form.elementary_year_level, attendance: form.elementary_date_of_attendance },
    { label: 'Secondary', school: form.secondary_school_name, course: form.secondary_degree_course, year: form.secondary_year_level, attendance: form.secondary_date_of_attendance },
    { label: 'Tertiary', school: form.tertiary_school_name, course: form.tertiary_degree_course, year: form.tertiary_year_level, attendance: form.tertiary_date_of_attendance },
    { label: 'Tech-Voc', school: form.techvoc_school_name, course: form.techvoc_degree_course, year: form.techvoc_year_level, attendance: form.techvoc_date_of_attendance },
  ].filter((level) => level.school?.trim())
})

const previousAvailments = computed(() => {
  const form = viewingForm.value
  if (!form) return []
  return [
    { establishment: form.availment_1_establishment, year: form.availment_1_year, spesId: form.availment_1_spes_id },
    { establishment: form.availment_2_establishment, year: form.availment_2_year, spesId: form.availment_2_spes_id },
    { establishment: form.availment_3_establishment, year: form.availment_3_year, spesId: form.availment_3_spes_id },
    { establishment: form.availment_4_establishment, year: form.availment_4_year, spesId: form.availment_4_spes_id },
  ].filter((availment) => availment.establishment?.trim())
})
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Button variant="ghost" size="sm" class="-ml-2 mb-1 text-muted-foreground" as-child>
          <AppLink :to="{ name: 'provincial-peso-spes' }">
            <ChevronLeft class="size-4 shrink-0" />
            SPES Dashboard
          </AppLink>
        </Button>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">SPES Applicants</h1>
        <p class="text-sm text-muted-foreground">
          Review students who submitted a SPES application form, then draw beneficiaries per municipality from those
          with complete documents.
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" @click="openDrawDialog">Draw Applicants</Button>
        <Button @click="openAddApplicant">
          <Plus class="size-4" />
          Add Applicant
        </Button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Input
          class="w-full sm:max-w-xs"
          placeholder="Search applicants..."
          :model-value="(table.getColumn('name')?.getFilterValue() as string) ?? ''"
          @update:model-value="table.getColumn('name')?.setFilterValue($event)"
        />
        <Select
          :model-value="(table.getColumn('status')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)"
        >
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem v-for="status in statusOptions" :key="status" :value="status">
              {{ status }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select
          :model-value="(table.getColumn('municipality')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('municipality')?.setFilterValue(val === 'all' ? undefined : val)"
        >
          <SelectTrigger class="w-full sm:w-48">
            <SelectValue placeholder="Municipality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Municipalities</SelectItem>
            <SelectItem v-for="municipality in municipalityOptions" :key="municipality" :value="municipality">
              {{ municipality }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" :disabled="isLoading" @click="refreshApplicants">
        <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Empty State -->
    <Empty v-if="!isLoading && !errorMessage && spesForms.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>No SPES applicants yet</EmptyTitle>
        <EmptyDescription>Encode a student's SPES application form, or wait for students to submit theirs.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button @click="openAddApplicant">
          <Plus class="size-4" />
          Add Applicant
        </Button>
      </EmptyContent>
    </Empty>

    <!-- Data Table -->
    <template v-else>
      <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
      <SwipeCardList
        class="md:hidden"
        :items="table.getRowModel().rows"
        :item-key="(row) => row.id"
        :card="(row) => getRowCard(row.original)"
        :actions="(row) => getRowSwipeActions(row.original)"
        :loading="isLoading && spesForms.length === 0"
      >
        <template #empty>
          <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No applicants match the current filters.</p>
        </template>
      </SwipeCardList>

      <!-- Desktop: table -->
      <div class="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead v-for="header in headerGroup.headers" :key="header.id">
                <FlexRender
                  v-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="isLoading && spesForms.length === 0">
              <TableRow v-for="i in 5" :key="i">
                <TableCell v-for="col in columns.length" :key="col">
                  <Skeleton class="h-4 w-full" />
                </TableCell>
              </TableRow>
            </template>

            <template v-else-if="table.getRowModel().rows.length">
              <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </TableCell>
              </TableRow>
            </template>

            <TableRow v-else>
              <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
                No applicants match the current filters.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          {{ table.getFilteredRowModel().rows.length }} applicant(s)
        </p>
        <div class="flex justify-center gap-2 sm:justify-end">
          <Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
            Previous
          </Button>
          <Button variant="outline" size="sm" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
            Next
          </Button>
        </div>
      </div>
    </template>
  </div>

  <!-- Edit Applicant side sheet (long form → Sheet, DESIGN.md §5.1): review decision + documents,
       links to the full form editor -->
  <Sheet :open="isReviewDialogOpen" @update:open="onReviewDialogOpenChange">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-xl">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>{{ formatSpesFormName(reviewingForm) }}</SheetTitle>
        <SheetDescription>
          SPES application submitted {{ formatSpesDate(reviewingForm?.applied_at ?? reviewingForm?.created_at) }}.
        </SheetDescription>
      </SheetHeader>

      <form class="contents" @submit="submitReview">
        <div class="grid flex-1 grid-cols-1 content-start gap-6 overflow-y-auto px-6 py-4">
        <template v-if="reviewingForm">
          <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <span class="text-xs text-muted-foreground">Current Status</span>
              <div class="mt-0.5">
                <Badge variant="outline" :class="getSpesApplicantStatusBadgeClass(reviewingForm.status)">
                  {{ reviewingForm.status || 'Pending' }}
                </Badge>
              </div>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Beneficiary Type</span>
              <p class="text-sm font-medium">{{ getSpesBeneficiaryType(reviewingForm) }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Student Category</span>
              <p class="text-sm font-medium">{{ reviewingForm.student_category || '—' }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Contact Number</span>
              <p class="text-sm font-medium">{{ reviewingForm.contact_number || '—' }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Municipality</span>
              <p class="text-sm font-medium">{{ reviewingForm.municipality || '—' }}</p>
            </div>
          </div>

          <Separator />

          <section class="space-y-3">
            <h2 class="text-base font-semibold">Documentary Requirements</h2>
            <SpesRequirementAttachments
              :form="reviewingForm"
              :attachments="formAttachments"
              :is-loading="isLoadingAttachments"
            />
          </section>

          <Separator />
        </template>

        <section class="space-y-4">
          <h2 class="text-base font-semibold">Review Decision</h2>

          <FormField v-slot="{ componentField }" name="status">
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select v-bind="componentField" :disabled="isSubmitting">
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem v-for="status in reviewStatusOptions" :key="status" :value="status">
                    {{ status }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="remarks">
            <FormItem>
              <FormLabel>
                Remarks
                <span v-if="isRemarksRequired" class="text-destructive">*</span>
                <span v-else class="font-normal text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  rows="3"
                  :placeholder="isRemarksRequired ? 'Why the application is rejected; the applicant will see this' : 'Notes from the review'"
                  :disabled="isSubmitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Required for Approved: when the applicant comes to the office; sent in their notification -->
          <fieldset v-if="isOrientationRequired" class="grid gap-4 rounded-lg border p-4">
            <legend class="px-1 text-sm font-medium">Orientation schedule</legend>
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField v-slot="{ componentField }" name="orientationDate">
                <FormItem>
                  <FormLabel>Date <span class="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="orientationTime">
                <FormItem>
                  <FormLabel>Time <span class="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="time" :disabled="isSubmitting" />
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
                    placeholder="e.g. Bring a valid ID and a ballpen. Proceed to the PESO office, 2nd floor."
                    :disabled="isSubmitting"
                  />
                </FormControl>
                <FormDescription>Shown to the applicant.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>
          </fieldset>
        </section>
        </div>

        <!-- Sticky footer -->
        <div class="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="openEditDetails">
            Edit Details
          </Button>
          <div class="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" :disabled="isSubmitting" @click="onReviewDialogOpenChange(false)">
              Cancel
            </Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
              {{ isSubmitting ? 'Saving...' : 'Save Review' }}
            </Button>
          </div>
        </div>
      </form>
    </SheetContent>
  </Sheet>

  <!-- SPES Form Details -->
  <Dialog v-model:open="isDetailsDialogOpen">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <div class="flex flex-wrap items-center gap-2 pr-8">
          <DialogTitle>{{ formatSpesFormName(viewingForm) }}</DialogTitle>
          <Badge v-if="viewingForm" variant="outline" :class="getSpesApplicantStatusBadgeClass(viewingForm.status)">
            {{ viewingForm.status || 'Pending' }}
          </Badge>
        </div>
        <DialogDescription>
          SPES application form submitted {{ formatSpesDate(viewingForm?.created_at) }}.
        </DialogDescription>
      </DialogHeader>

      <p v-if="!viewingForm" class="text-sm text-muted-foreground">The linked SPES form could not be loaded.</p>

      <div v-else class="space-y-6">
        <section class="space-y-3">
          <h2 class="text-base font-semibold">Personal Information</h2>
          <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <span class="text-xs text-muted-foreground">Date of Birth</span>
              <p class="text-sm font-medium">
                {{ formatSpesDate(viewingForm.date_of_birth) }}<template v-if="viewingForm.age !== null"> ({{ viewingForm.age }} yrs)</template>
              </p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Place of Birth</span>
              <p class="text-sm font-medium">{{ viewingForm.place_of_birth || '—' }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Sex / Civil Status</span>
              <p class="text-sm font-medium">
                {{ [viewingForm.sex, viewingForm.civil_status].filter(Boolean).join(' · ') || '—' }}
              </p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Beneficiary Type</span>
              <p class="text-sm font-medium">{{ getSpesBeneficiaryType(viewingForm) }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Student Category</span>
              <p class="text-sm font-medium">{{ viewingForm.student_category || '—' }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Contact Number</span>
              <p class="text-sm font-medium">{{ viewingForm.contact_number || '—' }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Email</span>
              <p class="text-sm font-medium break-all">{{ viewingForm.email_address || '—' }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Municipality</span>
              <p class="text-sm font-medium">{{ viewingForm.municipality || '—' }}</p>
            </div>
            <div class="sm:col-span-2">
              <span class="text-xs text-muted-foreground">Present Address</span>
              <p class="text-sm font-medium">{{ viewingForm.present_address || '—' }}</p>
            </div>
            <div class="sm:col-span-2">
              <span class="text-xs text-muted-foreground">Parents' Status</span>
              <p class="text-sm font-medium">{{ viewingForm.parents_status.join(', ') || '—' }}</p>
            </div>
          </div>
        </section>

        <Separator />

        <section class="space-y-3">
          <h2 class="text-base font-semibold">Parents / Guardian</h2>
          <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <span class="text-xs text-muted-foreground">Father</span>
              <p class="text-sm font-medium">
                {{ [viewingForm.father_name, viewingForm.father_occupation].filter(Boolean).join(' · ') || '—' }}
              </p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Mother (maiden name)</span>
              <p class="text-sm font-medium">
                {{ [viewingForm.mother_maiden_name, viewingForm.mother_occupation].filter(Boolean).join(' · ') || '—' }}
              </p>
            </div>
          </div>
        </section>

        <Separator />

        <section class="space-y-3">
          <h2 class="text-base font-semibold">Educational Background</h2>
          <p v-if="!educationLevels.length" class="text-sm text-muted-foreground">No schools listed.</p>
          <div v-else class="divide-y">
            <div v-for="level in educationLevels" :key="level.label" class="grid gap-1 py-2 sm:grid-cols-[110px_1fr]">
              <span class="text-xs text-muted-foreground">{{ level.label }}</span>
              <div>
                <p class="text-sm font-medium">{{ level.school }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ [level.course, level.year, level.attendance].filter(Boolean).join(' · ') || '—' }}
                </p>
              </div>
            </div>
          </div>
        </section>


        <template v-if="viewingForm.special_skills.length || previousAvailments.length || viewingForm.other_dole_interventions">
          <Separator />

          <section class="space-y-3">
            <h2 class="text-base font-semibold">Skills &amp; SPES History</h2>
            <div v-if="viewingForm.special_skills.length">
              <span class="text-xs text-muted-foreground">Special Skills</span>
              <p class="text-sm font-medium">{{ viewingForm.special_skills.join(', ') }}</p>
            </div>
            <div v-if="previousAvailments.length">
              <span class="text-xs text-muted-foreground">Previous SPES Availments</span>
              <ul class="space-y-1">
                <li v-for="(availment, index) in previousAvailments" :key="index" class="text-sm">
                  {{ [availment.establishment, availment.year, availment.spesId].filter(Boolean).join(' · ') }}
                </li>
              </ul>
            </div>
            <div v-if="viewingForm.other_dole_interventions">
              <span class="text-xs text-muted-foreground">Other DOLE Interventions</span>
              <p class="text-sm font-medium">{{ viewingForm.other_dole_interventions }}</p>
            </div>
          </section>
        </template>
      </div>
    </DialogContent>
  </Dialog>

  <!-- SPES Randomizer Draw: drawn applicants are approved, then the appointment form opens for each -->
  <Dialog :open="isDrawOpen" @update:open="onDrawOpenChange">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>SPES Randomizer Draw</DialogTitle>
        <DialogDescription>
          Draws Pending applicants with their required documents, per municipality; winners are approved.
        </DialogDescription>
      </DialogHeader>

      <!-- Loading -->
      <div
        v-if="isLoadingDrawPool && !drawMunicipalityOptions.length"
        class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <Skeleton class="aspect-square w-full rounded-xl" />
        <div class="space-y-3">
          <Skeleton class="h-6 w-40" />
          <Skeleton class="h-1.5 w-full" />
          <Skeleton v-for="i in 4" :key="i" class="h-14 w-full" />
        </div>
      </div>

      <!-- Nobody to draw -->
      <Empty v-else-if="!drawMunicipalityOptions.length" class="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Dices />
          </EmptyMedia>
          <EmptyTitle>No applicants to draw</EmptyTitle>
          <EmptyDescription>
            Applicants enter once they are Pending with every required document attached.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <div v-else class="space-y-6">
        <!-- Draw settings -->
        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
          <div class="space-y-2">
            <Label for="spes-draw-municipality">Municipality</Label>
            <Select v-model="selectedMunicipality" :disabled="isSpinning || isSubmitting">
              <SelectTrigger id="spes-draw-municipality" class="w-full">
                <SelectValue placeholder="Select a municipality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in drawMunicipalityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="spes-draw-slots">Slots to fill</Label>
            <Input
              id="spes-draw-slots"
              type="number"
              min="1"
              class="tabular-nums"
              :max="maxSlots"
              :model-value="slots"
              :disabled="isSpinning || isSubmitting || winners.length > 0"
              @update:model-value="setSlots"
            />
          </div>
          <Button
            variant="outline"
            :disabled="isLoadingDrawPool || isSpinning || isSubmitting"
            @click="refreshDrawPool"
          >
            <RefreshCw class="size-4 shrink-0" :class="{ 'animate-spin': isLoadingDrawPool }" />
            <span class="sm:sr-only">Refresh</span>
          </Button>
        </div>

        <Alert v-if="isUnspecifiedMunicipality" class="border-warning/40 bg-warning/10 *:[svg]:text-warning">
          <AlertTriangle />
          <AlertTitle>These applicants have no municipality</AlertTitle>
          <AlertDescription>
            Set the municipality on their SPES forms so they are drawn with the right municipality.
          </AlertDescription>
        </Alert>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <!-- Wheel stage -->
          <section
            aria-label="Randomizer wheel"
            class="flex flex-col items-center gap-5 rounded-xl border bg-muted/30 p-4 sm:p-6"
          >
            <svg
              viewBox="-106 -114 212 220"
              class="w-full max-w-sm drop-shadow-sm"
              role="img"
              :aria-label="`Wheel with ${remaining.length} applicant(s)`"
            >
              <!-- Rim -->
              <circle r="103" class="fill-card stroke-border" stroke-width="1" />
              <circle v-if="!wheelSegments.length" r="96" class="fill-muted" />

              <g :transform="`rotate(${rotation})`">
                <template v-for="segment in wheelSegments" :key="segment.id">
                  <g
                    class="transition-opacity duration-300"
                    :class="{ 'opacity-25': landedId !== null && segment.id !== landedId }"
                  >
                    <path
                      v-if="segment.path"
                      :d="segment.path"
                      :class="segment.colorClass"
                      class="stroke-card"
                      stroke-width="1"
                    />
                    <circle v-else r="96" :class="segment.colorClass" />
                    <text
                      :transform="segment.labelTransform"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      class="fill-primary-foreground text-[7px] font-semibold"
                    >
                      {{ segment.label }}
                    </text>
                  </g>
                  <circle v-if="segment.peg" :cx="segment.peg.x" :cy="segment.peg.y" r="1.6" class="fill-card" />
                </template>
              </g>

              <!-- Hub: applicants still on the wheel -->
              <circle r="18" class="fill-card stroke-border" stroke-width="1" />
              <text
                y="-2.5"
                text-anchor="middle"
                dominant-baseline="middle"
                class="fill-foreground text-[11px] font-bold tabular-nums"
              >
                {{ remaining.length }}
              </text>
              <text
                y="8"
                text-anchor="middle"
                dominant-baseline="middle"
                class="fill-muted-foreground text-[4.5px] font-semibold uppercase"
              >
                left
              </text>

              <!-- Pointer -->
              <path
                d="M -8 -112 L 8 -112 L 0 -92 Z"
                class="fill-foreground stroke-card"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>

            <!-- Draw result -->
            <div class="flex min-h-16 flex-col items-center justify-center gap-0.5 text-center" aria-live="polite">
              <template v-if="lastDrawn">
                <span class="text-xs font-medium text-muted-foreground">
                  Drawn #{{ winners.length + (landedId ? 1 : 0) }}
                </span>
                <p
                  :key="lastDrawn.form.id"
                  class="text-xl font-semibold tracking-tight animate-in fade-in zoom-in-95 duration-300"
                >
                  {{ lastDrawn.name }}
                </p>
                <span class="text-xs text-muted-foreground">
                  {{ lastDrawn.form.student_category || 'Category not set' }}
                </span>
              </template>
              <p v-else-if="isSpinning" class="text-sm text-muted-foreground">Drawing…</p>
              <p v-else-if="!remaining.length" class="text-sm text-muted-foreground">
                Everyone in {{ selectedMunicipality }} has been drawn.
              </p>
              <p v-else class="text-sm text-muted-foreground">{{ remaining.length }} applicant(s) on the wheel</p>
            </div>

            <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button size="lg" :disabled="!canDraw" @click="spin">
                <Loader2 v-if="isSpinning" class="size-4 shrink-0 animate-spin" />
                {{ isSpinning ? 'Spinning...' : 'Spin the Wheel' }}
              </Button>
              <Button size="lg" variant="outline" :disabled="!canDraw" @click="drawRemaining">
                Draw {{ slotsLeft }} at Once
              </Button>
            </div>
          </section>

          <!-- Results -->
          <section class="flex min-w-0 flex-col gap-4">
            <div class="space-y-2">
              <div class="flex items-baseline justify-between gap-2">
                <h3 class="text-base font-semibold">Drawn Applicants</h3>
                <span class="text-sm tabular-nums text-muted-foreground">
                  <span class="font-semibold text-foreground">{{ winners.length }}</span> of {{ slots }} slots
                </span>
              </div>
              <Progress
                :model-value="Math.round((winners.length / Math.max(slots, 1)) * 100)"
                class="h-1.5"
                aria-label="Slots filled"
              />
            </div>

            <ol class="max-h-80 divide-y overflow-y-auto rounded-lg border">
              <li
                v-for="(winner, index) in winners"
                :key="winner.form.id"
                class="flex items-center gap-3 p-3 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300"
                :class="{ 'bg-primary/5': winner.form.id === lastDrawn?.form.id }"
              >
                <span
                  class="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary"
                >
                  {{ index + 1 }}
                </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ winner.name }}</p>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ winner.form.student_category || 'Category not set' }}
                    <template v-if="winner.form.contact_number"> · {{ winner.form.contact_number }}</template>
                  </p>
                </div>
              </li>
              <li
                v-for="n in Math.min(slotsLeft, 3)"
                :key="`open-${n}`"
                class="flex items-center gap-3 p-3 text-muted-foreground"
              >
                <span
                  class="grid size-7 shrink-0 place-items-center rounded-full border border-dashed text-xs tabular-nums"
                >
                  {{ winners.length + n }}
                </span>
                <span class="text-sm">Open slot</span>
              </li>
            </ol>
            <p v-if="slotsLeft > 3" class="-mt-2 text-xs text-muted-foreground">
              + {{ slotsLeft - 3 }} more open slot(s)
            </p>

            <Collapsible v-if="selectedGroup">
              <CollapsibleTrigger as-child>
                <Button variant="ghost" size="sm" class="group -ml-2 text-muted-foreground">
                  {{ selectedGroup.candidates.length }} eligible applicant(s) in {{ selectedGroup.municipality }}
                  <ChevronDown class="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul class="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border text-sm">
                  <li
                    v-for="candidate in selectedGroup.candidates"
                    :key="candidate.form.id"
                    class="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <span class="truncate" :class="{ 'text-muted-foreground': drawnIds.has(candidate.form.id) }">
                      {{ candidate.name }}
                    </span>
                    <span v-if="drawnIds.has(candidate.form.id)" class="shrink-0 text-xs text-muted-foreground">
                      Drawn
                    </span>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>
      </div>

      <DialogFooter v-if="drawMunicipalityOptions.length" class="gap-2 sm:justify-between">
        <Button variant="ghost" :disabled="isSpinning || isSubmitting || !winners.length" @click="resetDraw">
          Reset Draw
        </Button>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" :disabled="isSpinning || isSubmitting" @click="onDrawOpenChange(false)">
            Close
          </Button>
          <Button :disabled="!canConfirm" @click="confirmWinners">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Approving...' : `Approve & Appoint ${winners.length} Drawn Applicant(s)` }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Appoint / Edit Appointment side sheet (long form → Sheet, DESIGN.md §5.1) -->
  <Sheet :open="isAppointmentFormOpen" @update:open="onAppointmentOpenChange">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>{{ isEditMode ? 'Edit SPES Appointment' : 'Appoint for SPES' }}</SheetTitle>
        <SheetDescription>
          {{
            isEditMode
              ? 'Update the establishment and period.'
              : drawAppointProgress
                ? `Drawn applicant ${drawAppointProgress.current} of ${drawAppointProgress.total}; closing leaves the rest Approved.`
                : `An approved applicant or a returning beneficiary for SPES ${selectedYear}.`
          }}
        </SheetDescription>
      </SheetHeader>

      <Form
        v-if="isAppointmentFormOpen"
        ref="appointmentForm"
        :key="appointmentFormKey"
        v-slot="{ values, setFieldValue }"
        :validation-schema="appointmentSchema"
        :initial-values="appointmentInitialValues"
        class="contents"
        @submit="submitAppointment"
      >
        <!-- Scrolling body; grid-cols-1 keeps long rows truncating instead of widening the sheet -->
        <div class="grid flex-1 grid-cols-1 content-start gap-4 overflow-y-auto px-6 py-4">
        <div v-if="fixedAppointeeName">
          <span class="text-xs text-muted-foreground">Beneficiary</span>
          <p class="text-sm font-medium">{{ fixedAppointeeName }}</p>
        </div>

        <FormField v-else v-slot="{ componentField }" name="appointee">
          <FormItem>
            <FormLabel>Appointee</FormLabel>
            <Select
              v-bind="componentField"
              :disabled="isSubmitting || (applicantOptions.length === 0 && beneficiaryOptions.length === 0)"
              @update:model-value="onAppointeeChange"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue
                    :placeholder="
                      applicantOptions.length || beneficiaryOptions.length
                        ? 'Select an applicant or former beneficiary'
                        : 'No one available to appoint'
                    "
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup v-if="applicantOptions.length">
                  <SelectLabel>Approved applicants</SelectLabel>
                  <SelectItem v-for="option in applicantOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                    <span class="text-xs text-muted-foreground">· {{ option.hint }}</span>
                  </SelectItem>
                </SelectGroup>
                <SelectGroup v-if="beneficiaryOptions.length">
                  <SelectLabel>Former beneficiaries</SelectLabel>
                  <SelectItem v-for="option in beneficiaryOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                    <span class="text-xs text-muted-foreground">· {{ option.hint }}</span>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormDescription>Anyone already appointed for this SPES year is not listed.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Year is fixed by the dashboard filter when appointing; editable only when editing -->
        <div v-show="isEditMode">
          <FormField v-slot="{ componentField }" name="spesYear">
            <FormItem>
              <FormLabel>SPES Year</FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="number" min="2000" max="2100" :disabled="isSubmitting || !isEditMode" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <Separator />
        <h3 class="text-sm font-semibold">Assignment</h3>

        <p
          v-if="!isEditMode && (isLoadingHomeLocation || homeLocationNote)"
          class="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Loader2 v-if="isLoadingHomeLocation" class="size-3.5 shrink-0 animate-spin" />
          {{ isLoadingHomeLocation ? "Looking up the applicant's home address..." : homeLocationNote }}
        </p>

        <Alert v-if="locationError" variant="destructive">
          <AlertTriangle class="size-4" />
          <AlertTitle>PSGC unavailable</AlertTitle>
          <AlertDescription class="flex flex-wrap items-center gap-2">
            {{ locationError }}
            <Button type="button" variant="outline" size="sm" class="cursor-pointer" @click="retryLoadLocation">
              <RefreshCw class="size-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>

        <!-- Location pickers search as you type (Combobox, same as GIP's office picker) -->
        <FormField v-slot="{ value }" name="assignedProvince">
          <FormItem class="min-w-0">
            <FormLabel>Province</FormLabel>
            <Combobox
              v-model:search-term="provinceSearch"
              :model-value="value"
              :ignore-filter="true"
              @update:model-value="(name) => onProvinceChange(String(name ?? ''), setFieldValue)"
            >
              <ComboboxAnchor as-child>
                <ComboboxTrigger as-child>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      class="w-full min-w-0 justify-between overflow-hidden font-normal"
                      :disabled="isSubmitting || isLoadingProvinces"
                    >
                      <span v-if="value" class="truncate">{{ value }}</span>
                      <span v-else class="truncate text-xs text-muted-foreground">
                        {{ isLoadingProvinces ? 'Loading provinces...' : 'Select province' }}
                      </span>
                      <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </ComboboxTrigger>
              </ComboboxAnchor>
              <ComboboxList>
                <ComboboxInput
                  placeholder="Search provinces..."
                  @input="provinceSearch = ($event.target as HTMLInputElement).value"
                />
                <ComboboxViewport>
                  <ComboboxEmpty>No province found.</ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem v-for="province in filteredProvinces" :key="province.code" :value="province.name">
                      <span class="min-w-0 flex-1 truncate">{{ province.name }}</span>
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

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField v-slot="{ value }" name="assignedMunicipality">
            <FormItem class="min-w-0">
              <FormLabel>Municipality / City</FormLabel>
              <Combobox
                v-model:search-term="municipalitySearch"
                :model-value="value"
                :ignore-filter="true"
                @update:model-value="(name) => onMunicipalityChange(String(name ?? ''), setFieldValue)"
              >
                <ComboboxAnchor as-child>
                  <ComboboxTrigger as-child>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        class="w-full min-w-0 justify-between overflow-hidden font-normal"
                        :disabled="isSubmitting || !values.assignedProvince || isLoadingMunicipalities"
                      >
                        <span v-if="value" class="truncate">{{ value }}</span>
                        <span v-else class="truncate text-xs text-muted-foreground">
                          {{
                            !values.assignedProvince
                              ? 'Select province first'
                              : isLoadingMunicipalities
                                ? 'Loading...'
                                : 'Select municipality'
                          }}
                        </span>
                        <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </ComboboxTrigger>
                </ComboboxAnchor>
                <ComboboxList>
                  <ComboboxInput
                    placeholder="Search municipalities..."
                    @input="municipalitySearch = ($event.target as HTMLInputElement).value"
                  />
                  <ComboboxViewport>
                    <ComboboxEmpty>No municipality found.</ComboboxEmpty>
                    <ComboboxGroup>
                      <ComboboxItem
                        v-for="municipality in filteredMunicipalities"
                        :key="municipality.code"
                        :value="municipality.name"
                      >
                        <span class="min-w-0 flex-1 truncate">{{ municipality.name }}</span>
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

          <FormField v-slot="{ value }" name="assignedBarangay">
            <FormItem class="min-w-0">
              <FormLabel>Barangay</FormLabel>
              <Combobox
                v-model:search-term="barangaySearch"
                :model-value="value"
                :ignore-filter="true"
                @update:model-value="(name) => onBarangayChange(String(name ?? ''), setFieldValue)"
              >
                <ComboboxAnchor as-child>
                  <ComboboxTrigger as-child>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        class="w-full min-w-0 justify-between overflow-hidden font-normal"
                        :disabled="isSubmitting || !values.assignedMunicipality || isLoadingBarangays"
                      >
                        <span v-if="value" class="truncate">{{ value }}</span>
                        <span v-else class="truncate text-xs text-muted-foreground">
                          {{
                            !values.assignedMunicipality
                              ? 'Select municipality first'
                              : isLoadingBarangays
                                ? 'Loading...'
                                : 'Select barangay'
                          }}
                        </span>
                        <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </ComboboxTrigger>
                </ComboboxAnchor>
                <ComboboxList>
                  <ComboboxInput
                    placeholder="Search barangays..."
                    @input="barangaySearch = ($event.target as HTMLInputElement).value"
                  />
                  <ComboboxViewport>
                    <ComboboxEmpty>No barangay found.</ComboboxEmpty>
                    <ComboboxGroup>
                      <ComboboxItem v-for="barangay in filteredBarangays" :key="barangay.code" :value="barangay.name">
                        <span class="min-w-0 flex-1 truncate">{{ barangay.name }}</span>
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
        </div>

        <Separator />
        <h3 class="text-sm font-semibold">Period</h3>

        <FormField v-slot="{ value, handleChange }" name="daysDuration">
          <FormItem>
            <FormLabel>Appointment Duration</FormLabel>
            <FormControl>
              <div role="radiogroup" class="grid grid-cols-2 gap-3">
                <button
                  v-for="opt in durationChoices"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="Number(value) === opt.value"
                  :disabled="isSubmitting"
                  :class="[
                    'flex cursor-pointer flex-col items-start rounded-lg border p-3 text-left transition-colors',
                    Number(value) === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
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

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField v-slot="{ componentField }" name="startDate">
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="space-y-2">
            <Label for="spes-appointment-end-date">End Date</Label>
            <Input
              id="spes-appointment-end-date"
              type="date"
              readonly
              tabindex="-1"
              class="bg-muted/50"
              :model-value="getEndDate(values.startDate, values.daysDuration) ?? ''"
            />
          </div>
        </div>
        <p class="-mt-2 text-xs text-muted-foreground">
          <template v-if="getEndDate(values.startDate, values.daysDuration)">
            {{ values.daysDuration }} working days, Monday to Friday, covering
            {{ countSpesCalendarDays(values.startDate, getEndDate(values.startDate, values.daysDuration)) }} calendar
            day(s). A weekend start date begins on the next Monday.
          </template>
          <template v-else>Pick a start date and the end date is counted in working days (Monday to Friday).</template>
        </p>

        <Separator />

        <FormField v-slot="{ componentField }" name="notes">
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea v-bind="componentField" rows="2" placeholder="Optional" :disabled="isSubmitting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        </div>

        <!-- Sticky footer -->
        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onAppointmentOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Appoint' }}
          </Button>
        </div>
      </Form>
    </SheetContent>
  </Sheet>

  <!-- Delete Confirmation -->
  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete SPES applicant?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ formatSpesFormName(spesFormToDelete) }}</strong>'s SPES
          application form will be deleted, along with their beneficiary record if they were enrolled. This action
          cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Deleting...' : 'Delete Applicant' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
