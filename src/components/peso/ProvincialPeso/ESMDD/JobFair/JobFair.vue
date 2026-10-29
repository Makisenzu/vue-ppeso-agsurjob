<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { ref } from 'vue'
import { CalendarDays, FileText, Loader2, Paperclip, Plus, RefreshCw, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useJobFairs } from '@/composables/peso/provincialPeso/useJobFairs'
import { useJobFairForm } from '@/composables/peso/provincialPeso/useJobFairForm'
import JobFairLocationPicker from '@/components/peso/ProvincialPeso/ESMDD/JobFair/JobFairLocationPicker.vue'
import JobFairAttachmentManager from '@/components/peso/ProvincialPeso/ESMDD/JobFair/JobFairAttachmentManager.vue'
import SearchSelect from '@/components/SearchSelect.vue'

const {
  table,
  columns,
  jobFairs,
  isLoading,
  errorMessage,
  isDeleting,
  jobFairToDelete,
  isDeleteDialogOpen,
  refreshJobFairs,
  openAddDialog,
  confirmDelete,
  getRowSwipeActions,
  getRowCard,
} = useJobFairs()

// Kept out of the template: the Vue (Official) editor extension (3.3.13) loses slot props like
// componentField on a tag whose attributes contain "//"
const URL_PLACEHOLDER = 'https://'

const {
  isFormDialogOpen,
  isSubmitting,
  isEditMode,
  editingJobFairId,
  statusOptions,
  formStatusOptions,
  isRemarksRequired,
  formValues,
  onFormDialogOpenChange,
  setMapLocation,
  submitJobFair,
  attachments,
  attachmentError,
  canAddMoreAttachments,
  attachmentAccept,
  attachmentMaxSizeMB,
  attachmentMaxFiles,
  addAttachments,
  removeAttachment,
} = useJobFairForm()

const isDraggingFiles = ref(false)

function onAttachmentInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  addAttachments(input.files)
  // Clear the input so picking the same file again still fires `change`
  input.value = ''
}

function onAttachmentDrop(event: DragEvent) {
  isDraggingFiles.value = false
  if (isSubmitting.value || !canAddMoreAttachments.value) return
  addAttachments(event.dataTransfer?.files ?? null)
}
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Job Fairs</h1>
      <p class="text-sm text-muted-foreground">
        Manage and track all job fair events.
      </p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Input
          class="w-full sm:max-w-xs"
          placeholder="Search job fairs..."
          :model-value="(table.getColumn('title')?.getFilterValue() as string) ?? ''"
          @update:model-value="table.getColumn('title')?.setFilterValue($event)"
        />
        <SearchSelect
          :model-value="(table.getColumn('status')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)"
          :options="[{ value: 'all', label: 'All Statuses' }, ...statusOptions]"
          placeholder="Status"
          class="w-full sm:w-40"
        />
      </div>

      <div class="flex gap-2">
        <Button variant="outline" :disabled="isLoading" @click="refreshJobFairs">
          <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refresh</span>
        </Button>
        <Button @click="openAddDialog">
          <Plus class="size-4" />
          Add Job Fair
        </Button>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Empty State -->
    <Empty v-if="!isLoading && !errorMessage && jobFairs.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarDays />
        </EmptyMedia>
        <EmptyTitle>No job fairs yet</EmptyTitle>
        <EmptyDescription>Create your first job fair event to start tracking it here.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button @click="openAddDialog">
          <Plus class="size-4" />
          Add Job Fair
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
        :loading="isLoading && jobFairs.length === 0"
      >
        <template #empty>
          <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No job fairs match the current filters.</p>
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
            <template v-if="isLoading && jobFairs.length === 0">
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
                No job fairs match the current filters.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          {{ table.getFilteredRowModel().rows.length }} job fair(s)
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

  <!-- Add / Edit Job Fair: a sheet, the form is long (DESIGN.md §5.1) -->
  <Sheet :open="isFormDialogOpen" @update:open="onFormDialogOpenChange">
    <SheetContent class="flex h-full flex-col p-0 sm:max-w-xl">
      <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
        <SheetTitle>{{ isEditMode ? 'Edit Job Fair' : 'Add Job Fair' }}</SheetTitle>
        <SheetDescription>
          {{ isEditMode ? 'Update the details of this job fair event.' : 'Create a new job fair event.' }}
        </SheetDescription>
      </SheetHeader>

      <form class="contents" @submit="submitJobFair">
        <!-- Scrolling body; grid-cols-1 keeps long rows from widening the sheet -->
        <div class="grid flex-1 grid-cols-1 content-start gap-4 overflow-y-auto px-6 py-4">
          <FormField v-slot="{ componentField }" name="title">
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. Provincial Mega Job Fair 2026" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="location">
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input v-bind="componentField" placeholder="e.g. Provincial Capitol, Prosperidad" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <JobFairLocationPicker
            :latitude="formValues.latitude"
            :longitude="formValues.longitude"
            :location-query="formValues.location"
            :disabled="isSubmitting"
            @update:location="setMapLocation"
          />

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

            <FormField v-slot="{ componentField }" name="endDate">
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <FormField v-slot="{ componentField }" name="status">
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <SearchSelect
                  v-bind="componentField"
                  :disabled="isSubmitting"
                  :options="formStatusOptions"
                  placeholder="Select a status"
                  class="w-full"
                />
              </FormControl>
              <FormDescription>Set automatically from the dates. Choose Cancelled to call off the job fair.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Required for Cancelled; sent to registered applicants in their notification -->
          <FormField v-if="isRemarksRequired" v-slot="{ componentField }" name="remarks">
            <FormItem>
              <FormLabel>Remarks <span class="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea v-bind="componentField" rows="3" placeholder="Why the job fair is cancelled" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="registrationLink">
            <FormItem>
              <FormLabel>Registration Link <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="url" :placeholder="URL_PLACEHOLDER" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="description">
            <FormItem>
              <FormLabel>Description <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Textarea v-bind="componentField" rows="3" placeholder="Brief details about the event" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Attachments (create only) -->
          <div v-if="!isEditMode" class="grid gap-2">
            <p class="text-sm font-medium">
              Attachments <span class="font-normal text-muted-foreground">(optional)</span>
            </p>

            <label
              class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center transition-colors hover:bg-muted/50 has-disabled:cursor-not-allowed has-disabled:opacity-50"
              :class="{ 'border-primary bg-primary/5': isDraggingFiles }"
              @dragover.prevent="isDraggingFiles = true"
              @dragleave.prevent="isDraggingFiles = false"
              @drop.prevent="onAttachmentDrop"
            >
              <Paperclip class="size-5 text-muted-foreground" />
              <span class="text-sm font-medium">Click to upload or drag files here</span>
              <span class="text-xs text-muted-foreground">
                Images or PDF · up to {{ attachmentMaxSizeMB }}MB each · max {{ attachmentMaxFiles }} files
              </span>
              <input
                type="file"
                class="sr-only"
                multiple
                :accept="attachmentAccept"
                :disabled="isSubmitting || !canAddMoreAttachments"
                @change="onAttachmentInputChange"
              >
            </label>

            <p v-if="attachmentError" class="text-sm text-destructive">{{ attachmentError }}</p>

            <div v-if="attachments.length" class="grid gap-2 sm:grid-cols-2">
              <Attachment
                v-for="attachment in attachments"
                :key="attachment.id"
                :state="isSubmitting ? 'uploading' : 'idle'"
                class="w-full min-w-0"
              >
                <AttachmentMedia :variant="attachment.isImage ? 'image' : 'icon'">
                  <img v-if="attachment.previewUrl" :src="attachment.previewUrl" :alt="attachment.file.name">
                  <FileText v-else />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle class="block truncate">{{ attachment.file.name }}</AttachmentTitle>
                  <AttachmentDescription>{{ attachment.sizeLabel }}</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    type="button"
                    :aria-label="`Remove ${attachment.file.name}`"
                    :disabled="isSubmitting"
                    @click="removeAttachment(attachment.id)"
                  >
                    <X />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            </div>
          </div>

          <!-- Attachments (edit: changes save immediately) -->
          <JobFairAttachmentManager v-else-if="editingJobFairId" :job-fair-id="editingJobFairId" :disabled="isSubmitting" />
        </div>

        <!-- Sticky footer -->
        <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onFormDialogOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Job Fair' }}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>

  <!-- Delete Confirmation -->
  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete job fair?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ jobFairToDelete?.title }}</strong> and the employers, vacancies and
          attendees recorded under it will be permanently deleted. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Deleting...' : 'Delete Job Fair' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
