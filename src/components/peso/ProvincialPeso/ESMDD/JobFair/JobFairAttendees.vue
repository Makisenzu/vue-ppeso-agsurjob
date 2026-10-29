<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { CheckIcon, ChevronsUpDownIcon, Loader2, Plus, RefreshCw, Trash2, Users, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import SearchSelect from '@/components/SearchSelect.vue'
import { useJobFairAttendees } from '@/composables/peso/provincialPeso/useJobFairAttendees'
import { useJobFairAttendeeForm } from '@/composables/peso/provincialPeso/useJobFairAttendeeForm'
import { formatRegistryName, getRegistryPhone } from '@/helpers/peso/provincialPeso/jobFairHelper'
import type { JobFairRegistryApplicant } from '@/types/peso/provincialPeso/jobFair'

const {
  table,
  columns,
  attendees,
  attendedCount,
  isLoading,
  errorMessage,
  isDeleting,
  attendeesToDelete,
  isDeleteDialogOpen,
  selectedAttendees,
  clearSelection,
  requestBulkDelete,
  statusOptions,
  refreshAttendees,
  openCreateDialog,
  confirmDelete,
  getRowSwipeActions,
  getRowCard,
} = useJobFairAttendees()

const {
  isFormDialogOpen,
  isSubmitting,
  isEditMode,
  selectedApplicant,
  registrySearchTerm,
  registryResults,
  isSearchingRegistry,
  listedApplicantIds,
  registrySearchMinLength,
  selectApplicant,
  onFormDialogOpenChange,
  submitAttendee,
} = useJobFairAttendeeForm()
</script>

<template>
  <section class="space-y-4">
    <!-- Section Header -->
    <div>
      <h2 class="text-lg font-semibold tracking-tight">Attendees</h2>
      <p class="text-sm text-muted-foreground">
        Registry applicants who took part in this job fair
        <span class="tabular-nums">· {{ attendees.length }} listed · {{ attendedCount }} attended</span>
      </p>
    </div>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Empty State -->
    <Empty v-if="!isLoading && !errorMessage && attendees.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>No attendees yet</EmptyTitle>
        <EmptyDescription>
          Add applicants from the registry who registered for or attended this job fair. Registry applicants hired on the
          spot are added automatically.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button @click="openCreateDialog">
          <Plus class="size-4" />
          Add Attendee
        </Button>
      </EmptyContent>
    </Empty>

    <template v-else>
      <!-- Toolbar -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            class="w-full sm:max-w-xs"
            placeholder="Search attendees..."
            :model-value="(table.getColumn('applicant')?.getFilterValue() as string) ?? ''"
            @update:model-value="table.getColumn('applicant')?.setFilterValue($event)"
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
          <Button variant="outline" :disabled="isLoading" @click="refreshAttendees">
            <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
            <span class="hidden sm:inline">Refresh</span>
          </Button>
          <Button @click="openCreateDialog">
            <Plus class="size-4" />
            Add Attendee
          </Button>
        </div>
      </div>

      <!-- Bulk actions for the selected rows -->
      <div
        v-if="selectedAttendees.length > 0"
        class="flex flex-col gap-2 rounded-md border bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-2 text-sm">
          <span class="font-medium">{{ selectedAttendees.length }} selected</span>
          <Button variant="ghost" size="sm" :disabled="isDeleting" @click="clearSelection">
            <X class="size-4" />
            Clear
          </Button>
        </div>
        <Button variant="destructive" :disabled="isDeleting" @click="requestBulkDelete">
          <Trash2 class="size-4" />
          Remove
        </Button>
      </div>

      <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
      <SwipeCardList
        class="md:hidden"
        :items="table.getRowModel().rows"
        :item-key="(row) => row.id"
        :card="(row) => getRowCard(row.original)"
        :actions="(row) => getRowSwipeActions(row.original)"
        :loading="isLoading && attendees.length === 0"
        :is-selected="(row) => row.getIsSelected()"
        :all-selected="table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')"
        @toggle="(row, value) => row.toggleSelected(value)"
        @toggle-all="(value) => table.toggleAllPageRowsSelected(value)"
      >
        <template #empty>
          <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No attendees match the current filters.</p>
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
            <template v-if="isLoading && attendees.length === 0">
              <TableRow v-for="i in 3" :key="i">
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
                No attendees match the current filters.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          {{ table.getFilteredRowModel().rows.length }} attendee(s)
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

    <!-- Add / Edit Attendee -->
    <Dialog :open="isFormDialogOpen" @update:open="onFormDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form class="grid gap-5" @submit="submitAttendee">
          <DialogHeader>
            <DialogTitle>{{ isEditMode ? 'Edit Attendee' : 'Add Attendee' }}</DialogTitle>
            <DialogDescription>
              {{ isEditMode ? 'Update this applicant’s attendance.' : 'Pick an applicant from the registry who took part in this job fair.' }}
            </DialogDescription>
          </DialogHeader>

          <!-- Applicant: fixed when editing -->
          <div v-if="isEditMode" class="rounded-md border bg-muted/40 p-3 text-sm">
            <div class="text-xs text-muted-foreground">Applicant</div>
            <div class="font-medium">{{ selectedApplicant ? formatRegistryName(selectedApplicant) : 'Unknown applicant' }}</div>
          </div>

          <FormField v-else name="applicantId">
            <FormItem>
              <FormLabel>Applicant</FormLabel>
              <Combobox
                :model-value="selectedApplicant"
                v-model:search-term="registrySearchTerm"
                :ignore-filter="true"
                by="id"
                @update:model-value="(val) => selectApplicant((val as JobFairRegistryApplicant | null) ?? null)"
              >
                <ComboboxAnchor as-child>
                  <ComboboxTrigger as-child>
                    <Button
                      type="button"
                      variant="outline"
                      class="w-full justify-between overflow-hidden font-normal"
                      :disabled="isSubmitting"
                    >
                      <span class="min-w-0 flex-1 truncate text-left">
                        <template v-if="selectedApplicant">{{ formatRegistryName(selectedApplicant) }}</template>
                        <span v-else class="text-muted-foreground">Search the applicant registry...</span>
                      </span>
                      <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                    </Button>
                  </ComboboxTrigger>
                </ComboboxAnchor>

                <ComboboxList>
                  <ComboboxInput
                    placeholder="Type a first name or surname..."
                    @input="registrySearchTerm = ($event.target as HTMLInputElement).value"
                  />
                  <ComboboxViewport>
                    <div v-if="isSearchingRegistry" class="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 class="size-4 animate-spin" />
                      Searching...
                    </div>
                    <ComboboxEmpty v-else>
                      {{
                        registrySearchTerm.trim().length < registrySearchMinLength
                          ? `Type at least ${registrySearchMinLength} letters.`
                          : 'No applicant found.'
                      }}
                    </ComboboxEmpty>
                    <ComboboxGroup>
                      <ComboboxItem
                        v-for="applicant in registryResults"
                        :key="applicant.id"
                        :value="applicant"
                        :disabled="listedApplicantIds.has(applicant.id)"
                      >
                        <span class="min-w-0 flex-1 truncate">{{ formatRegistryName(applicant) }}</span>
                        <span class="shrink-0 text-xs text-muted-foreground">
                          {{ listedApplicantIds.has(applicant.id) ? 'Already listed' : getRegistryPhone(applicant) }}
                        </span>
                        <ComboboxItemIndicator>
                          <CheckIcon class="size-4 shrink-0" />
                        </ComboboxItemIndicator>
                      </ComboboxItem>
                    </ComboboxGroup>
                  </ComboboxViewport>
                </ComboboxList>
              </Combobox>
              <FormDescription>Only applicants in the registry can be listed. Each applicant counts once per job fair.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="status">
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <SearchSelect
                  v-bind="componentField"
                  :disabled="isSubmitting"
                  :options="statusOptions"
                  placeholder="Select status"
                  class="w-full sm:w-48"
                />
              </FormControl>
              <FormDescription>Registered = signed up; Attended = showed up at the job fair.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="remarks">
            <FormItem>
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea v-bind="componentField" rows="2" placeholder="Optional notes" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" :disabled="isSubmitting" @click="onFormDialogOpenChange(false)">
              Cancel
            </Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
              {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Attendee' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Remove Confirmation -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {{ attendeesToDelete.length === 1 ? 'attendee' : `${attendeesToDelete.length} attendees` }}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="attendeesToDelete.length === 1">
              <strong class="font-medium text-foreground">
                {{ attendeesToDelete[0]?.applicant ? formatRegistryName(attendeesToDelete[0].applicant) : 'This applicant' }}
              </strong>
              will no longer be counted for this job fair. Their registry record is not affected.
            </template>
            <template v-else>
              These applicants will no longer be counted for this job fair. Their registry records are not affected.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
            <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
            {{ isDeleting ? 'Removing...' : attendeesToDelete.length === 1 ? 'Remove Attendee' : 'Remove Attendees' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
