<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { computed } from 'vue'
import { Loader2, Plus, RefreshCw, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useSpesApplicants } from '@/composables/peso/provincialPeso/useSpesApplicants'
import { useSpesApplicantForm } from '@/composables/peso/provincialPeso/useSpesApplicantForm'
import SpesRequirementAttachments from '@/components/peso/ProvincialPeso/ESMDD/SPES/SpesRequirementAttachments.vue'
import {
  formatSpesDate,
  formatSpesFormName,
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
  formAttachments,
  isLoadingAttachments,
  isDeleteDialogOpen,
  isDetailsDialogOpen,
  statusOptions,
  refreshApplicants,
  openAddApplicant,
  confirmDelete,
} = useSpesApplicants()
const {
  isReviewDialogOpen,
  formAttachments: reviewAttachments,
  isLoadingAttachments: isLoadingReviewAttachments,
  isSubmitting,
  reviewingForm,
  statusOptions: reviewStatusOptions,
  onReviewDialogOpenChange,
  submitReview,
} = useSpesApplicantForm()

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
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">SPES Applicants</h1>
        <p class="text-sm text-muted-foreground">
          Review students who submitted a SPES application form.
        </p>
      </div>
      <Button @click="openAddApplicant">
        <Plus class="size-4" />
        Add Applicant
      </Button>
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
      <div class="overflow-x-auto rounded-md border">
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

  <!-- Review Applicant Dialog -->
  <Dialog :open="isReviewDialogOpen" @update:open="onReviewDialogOpenChange">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <form class="grid gap-4" @submit="submitReview">
        <DialogHeader>
          <DialogTitle>Review SPES Applicant</DialogTitle>
          <DialogDescription>Approve or reject this student's SPES application.</DialogDescription>
        </DialogHeader>

        <div>
          <span class="text-xs text-muted-foreground">Applicant</span>
          <p class="text-sm font-medium">{{ formatSpesFormName(reviewingForm) }}</p>
        </div>

        <div v-if="reviewingForm" class="space-y-2">
          <span class="text-xs text-muted-foreground">Submitted documents — open each file to verify it</span>
          <SpesRequirementAttachments
            :form="reviewingForm"
            :attachments="reviewAttachments"
            :is-loading="isLoadingReviewAttachments"
          />
        </div>

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
            <FormLabel>Remarks <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
            <FormControl>
              <Textarea v-bind="componentField" rows="3" placeholder="Notes from the review" :disabled="isSubmitting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onReviewDialogOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : 'Save Review' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- SPES Form Details -->
  <Dialog v-model:open="isDetailsDialogOpen">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ formatSpesFormName(viewingForm) }}</DialogTitle>
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

        <Separator />

        <section class="space-y-3">
          <h2 class="text-base font-semibold">Documentary Requirements</h2>
          <SpesRequirementAttachments
            :form="viewingForm"
            :attachments="formAttachments"
            :is-loading="isLoadingAttachments"
          />
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

        <template v-if="viewingForm.remarks">
          <Separator />
          <section class="space-y-1">
            <h2 class="text-base font-semibold">Review Remarks</h2>
            <p class="text-sm whitespace-pre-line">{{ viewingForm.remarks }}</p>
          </section>
        </template>
      </div>
    </DialogContent>
  </Dialog>

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
