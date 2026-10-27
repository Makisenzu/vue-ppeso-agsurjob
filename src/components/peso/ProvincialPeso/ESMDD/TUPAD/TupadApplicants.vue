<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { ChevronLeft, ExternalLink, FileText, Loader2, RefreshCw, Trash2, Users, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useTupadApplicants } from '@/composables/peso/provincialPeso/useTupadApplicants'
import {
  formatTupadApplicantName,
  formatTupadDate,
  getTupadMunicipality,
  getTupadStatusBadgeClass,
} from '@/helpers/peso/provincialPeso/tupadHelper'

const {
  table,
  columns,
  tupadApplicants,
  isLoading,
  errorMessage,
  statusOptions,
  documentOptions,
  lockedDocument,
  municipalityOptions,
  refresh,
  reviewingApplicant,
  reviewDocuments,
  isLoadingReviewDocuments,
  isReviewDialogOpen,
  isReviewRemarksRequired,
  isOrientationRequired,
  isSubmitting,
  onReviewDialogOpenChange,
  toggleDocument,
  submitReview,
  selectedApplicants,
  bulkStatus,
  bulkRemarks,
  bulkRemarksError,
  isBulkRemarksRequired,
  clearSelection,
  applyBulkStatus,
  requestBulkDelete,
  applicantsToDelete,
  isDeleting,
  isDeleteDialogOpen,
  confirmDelete,
  getRowSwipeActions,
  getRowCard,
} = useTupadApplicants()
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Button variant="ghost" size="sm" class="-ml-2 mb-1 text-muted-foreground" as-child>
          <AppLink :to="{ name: 'provincial-peso-tupad' }">
            <ChevronLeft class="size-4 shrink-0" />
            TUPAD Dashboard
          </AppLink>
        </Button>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">TUPAD Applicants</h1>
        <p class="text-sm text-muted-foreground">
          Applicants who applied online or were referred in Entry of Applicants. Review them, then add them to a batch.
        </p>
      </div>
      <Button variant="outline" as-child>
        <AppLink :to="{ name: 'provincial-peso-entry' }">Entry of Applicants</AppLink>
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

      <Button variant="outline" :disabled="isLoading" @click="refresh">
        <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </div>

    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Bulk actions for the selected applicants -->
    <div
      v-if="selectedApplicants.length > 0"
      class="flex flex-col gap-2 rounded-md border bg-muted/50 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-2 text-sm">
        <span class="font-medium">{{ selectedApplicants.length }} selected</span>
        <Button variant="ghost" size="sm" :disabled="isSubmitting || isDeleting" @click="clearSelection">
          <X class="size-4" />
          Clear
        </Button>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select v-model="bulkStatus" :disabled="isSubmitting || isDeleting">
          <SelectTrigger class="w-full sm:w-44" aria-label="New status">
            <SelectValue placeholder="Set status to..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="status in statusOptions" :key="status" :value="status">
              {{ status }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" :disabled="!bulkStatus || isSubmitting || isDeleting" @click="applyBulkStatus">
          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
          Update Status
        </Button>
        <Button variant="destructive" :disabled="isSubmitting || isDeleting" @click="requestBulkDelete">
          <Trash2 class="size-4" />
          Delete
        </Button>
      </div>
      <!-- Required for Rejected; one reason for every selected applicant, sent in their notifications -->
      <div v-if="isBulkRemarksRequired" class="w-full space-y-1 sm:basis-full">
        <Textarea
          v-model="bulkRemarks"
          rows="2"
          placeholder="Remarks (required): why these applications are rejected"
          aria-label="Remarks for rejected applicants"
          :aria-invalid="!!bulkRemarksError"
          :disabled="isSubmitting || isDeleting"
        />
        <p v-if="bulkRemarksError" class="text-sm text-destructive">{{ bulkRemarksError }}</p>
      </div>
    </div>

    <Empty v-if="!isLoading && !errorMessage && tupadApplicants.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>No TUPAD applicants yet</EmptyTitle>
        <EmptyDescription>
          Tick TUPAD under Referred Programs of an applicant in Entry of Applicants to add them here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" as-child>
          <AppLink :to="{ name: 'provincial-peso-entry' }">Go to Entry of Applicants</AppLink>
        </Button>
      </EmptyContent>
    </Empty>

    <template v-else>
      <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
      <SwipeCardList
        class="md:hidden"
        :items="table.getRowModel().rows"
        :item-key="(row) => row.id"
        :card="(row) => getRowCard(row.original)"
        :actions="(row) => getRowSwipeActions(row.original)"
        :loading="isLoading && tupadApplicants.length === 0"
        :is-selected="(row) => row.getIsSelected()"
        :all-selected="table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')"
        @toggle="(row, value) => row.toggleSelected(value)"
        @toggle-all="(value) => table.toggleAllPageRowsSelected(value)"
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
            <template v-if="isLoading && tupadApplicants.length === 0">
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

  <!-- Review TUPAD applicant: a sheet, the form is long (DESIGN.md §5.1) -->
  <Sheet :open="isReviewDialogOpen" @update:open="onReviewDialogOpenChange">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-xl">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>{{ formatTupadApplicantName(reviewingApplicant) }}</SheetTitle>
        <SheetDescription>
          {{ reviewingApplicant?.applied_online ? 'Applied online' : 'Referred to TUPAD' }}
          {{ formatTupadDate(reviewingApplicant?.created_at) }}.
        </SheetDescription>
      </SheetHeader>

      <form class="contents" @submit="submitReview">
        <div class="grid flex-1 grid-cols-1 content-start gap-6 overflow-y-auto px-6 py-4">
          <div v-if="reviewingApplicant" class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <span class="text-xs text-muted-foreground">Current Status</span>
              <div class="mt-0.5">
                <Badge variant="outline" :class="getTupadStatusBadgeClass(reviewingApplicant.status)">
                  {{ reviewingApplicant.status }}
                </Badge>
              </div>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Municipality</span>
              <p class="text-sm font-medium">{{ getTupadMunicipality(reviewingApplicant.applicant) }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Sex</span>
              <p class="text-sm font-medium">{{ reviewingApplicant.applicant?.sex || '—' }}</p>
            </div>
            <div>
              <span class="text-xs text-muted-foreground">Date of Birth</span>
              <p class="text-sm font-medium">{{ formatTupadDate(reviewingApplicant.applicant?.date_of_birth) }}</p>
            </div>
          </div>

          <Separator />

          <section class="space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField v-slot="{ componentField }" name="monthly_income">
                <FormItem>
                  <FormLabel>Monthly Income (₱)</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="number" min="0" step="0.01" placeholder="0.00" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

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
                      <SelectItem v-for="status in statusOptions" :key="status" :value="status">
                        {{ status }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <!-- Required for Rejected; sent to the applicant in their notification -->
            <FormField v-if="isReviewRemarksRequired" v-slot="{ componentField }" name="remarks">
              <FormItem>
                <FormLabel>Remarks <span class="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea
                    v-bind="componentField"
                    rows="3"
                    placeholder="Why the application is rejected; the applicant will see this"
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

            <FormField v-slot="{ componentField }" name="dependent_name">
              <FormItem>
                <FormLabel>Dependent Name <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea v-bind="componentField" rows="2" placeholder="Name of dependent(s)" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ value, handleChange }" name="doc_submitted">
              <FormItem>
                <FormLabel>Required Documents</FormLabel>
                <div class="space-y-2">
                  <div v-for="doc in documentOptions" :key="doc" class="space-y-1.5 rounded-md border p-2">
                    <label
                      class="flex items-center gap-2 text-sm"
                      :class="doc === lockedDocument ? 'cursor-not-allowed' : 'cursor-pointer'"
                    >
                      <Checkbox
                        :model-value="doc === lockedDocument || (value ?? []).includes(doc)"
                        :disabled="isSubmitting || doc === lockedDocument"
                        @update:model-value="(checked) => handleChange(toggleDocument(value, doc, checked))"
                      />
                      <span class="font-medium">{{ doc }}</span>
                    </label>
                    <!-- File the applicant attached to this document -->
                    <Skeleton v-if="isLoadingReviewDocuments" class="ml-6 h-5 w-48" />
                    <AppLink
                      v-else-if="reviewDocuments[doc]?.url"
                      :href="reviewDocuments[doc]!.url!"
                      target="_blank"
                      class="ml-6 flex min-w-0 items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <FileText class="size-3.5 shrink-0" />
                      <span class="truncate">{{ reviewDocuments[doc]!.file_name }}</span>
                      <ExternalLink class="size-3 shrink-0" />
                    </AppLink>
                    <p v-else-if="reviewDocuments[doc]" class="ml-6 truncate text-xs text-muted-foreground">
                      {{ reviewDocuments[doc]!.file_name }} (file unavailable)
                    </p>
                    <p v-else class="ml-6 text-xs text-muted-foreground">No file uploaded by the applicant</p>
                  </div>
                </div>
                <p class="text-xs text-muted-foreground">
                  The monthly income and all {{ documentOptions.length }} documents are needed before this applicant can
                  be added to a batch.
                </p>
                <FormMessage />
              </FormItem>
            </FormField>
          </section>
        </div>

        <!-- Sticky footer -->
        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onReviewDialogOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Saving...' : 'Save Review' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>

  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Delete {{ applicantsToDelete.length === 1 ? 'TUPAD applicant' : `${applicantsToDelete.length} TUPAD applicants` }}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          <template v-if="applicantsToDelete.length === 1">
            <strong class="font-medium text-foreground">{{ formatTupadApplicantName(applicantsToDelete[0]) }}</strong>'s
          </template>
          <template v-else>Their</template>
          TUPAD application and uploaded documents will be deleted, and TUPAD will be unticked in their referred
          programs. Their Entry of Applicants record is kept. Applicants already in a TUPAD batch are skipped. This
          action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Deleting...' : 'Delete' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
