<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { CheckIcon, ChevronsUpDownIcon, Loader2, Plus, RefreshCw, Trash2, UserCheck, X } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { useJobFairHots } from '@/composables/peso/provincialPeso/useJobFairHots'
import { useHotsForm } from '@/composables/peso/provincialPeso/useHotsForm'
import { formatHireName, formatRegistryName, getRegistryPhone } from '@/helpers/peso/provincialPeso/jobFairHelper'
import type { JobFairRegistryApplicant } from '@/types/peso/provincialPeso/jobFair'

const {
  table,
  columns,
  hires,
  isLoading,
  errorMessage,
  isDeleting,
  hiresToDelete,
  isDeleteDialogOpen,
  selectedHires,
  clearSelection,
  requestBulkDelete,
  employerOptions,
  totalSlots,
  hasVacancies,
  refreshHots,
  openCreateDialog,
  confirmDelete,
} = useJobFairHots()

const {
  isFormDialogOpen,
  isSubmitting,
  isEditMode,
  isRegistrySource,
  participantOptions,
  vacancyChoices,
  selectedApplicant,
  registrySearchTerm,
  registryResults,
  isSearchingRegistry,
  registryPhone,
  needsManualPhone,
  registrySearchMinLength,
  selectApplicant,
  setApplicantSource,
  onFormDialogOpenChange,
  submitHire,
} = useHotsForm()

const walkInFields = [
  { name: 'firstName', label: 'First Name', placeholder: 'Juan' },
  { name: 'middleName', label: 'Middle Name', placeholder: 'Optional' },
  { name: 'lastName', label: 'Last Name', placeholder: 'Dela Cruz' },
  { name: 'contactPhone', label: 'Contact Number', placeholder: '09XX XXX XXXX', type: 'tel' },
  { name: 'email', label: 'Email Address', placeholder: 'Optional', type: 'email' },
] as const
</script>

<template>
  <section class="space-y-4">
    <!-- Section Header -->
    <div>
      <h2 class="text-lg font-semibold tracking-tight">Hired on the Spot</h2>
      <p class="text-sm text-muted-foreground">
        Applicants hired during this job fair
        <span class="tabular-nums">· {{ hires.length }} hired<template v-if="totalSlots"> of {{ totalSlots }} openings</template></span>
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
    <Empty v-if="!isLoading && !errorMessage && hires.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserCheck />
        </EmptyMedia>
        <EmptyTitle>No hires recorded yet</EmptyTitle>
        <EmptyDescription>
          <template v-if="hasVacancies">Record applicants hired on the spot by participating employers.</template>
          <template v-else>Add participants and their vacancies first — every hire fills a vacancy.</template>
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button :disabled="!hasVacancies" @click="openCreateDialog">
          <Plus class="size-4" />
          Record Hire
        </Button>
      </EmptyContent>
    </Empty>

    <template v-else>
      <!-- Toolbar -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Input
            class="w-full sm:max-w-xs"
            placeholder="Search hired applicants..."
            :model-value="(table.getColumn('applicant')?.getFilterValue() as string) ?? ''"
            @update:model-value="table.getColumn('applicant')?.setFilterValue($event)"
          />
          <Select
            :model-value="(table.getColumn('employer')?.getFilterValue() as string) ?? 'all'"
            @update:model-value="(val) => table.getColumn('employer')?.setFilterValue(val === 'all' ? undefined : val)"
          >
            <SelectTrigger class="w-full sm:w-48">
              <SelectValue placeholder="Employer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employers</SelectItem>
              <SelectItem v-for="employer in employerOptions" :key="employer" :value="employer">
                {{ employer }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex gap-2">
          <Button variant="outline" :disabled="isLoading" @click="refreshHots">
            <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
            <span class="hidden sm:inline">Refresh</span>
          </Button>
          <Button :disabled="!hasVacancies" @click="openCreateDialog">
            <Plus class="size-4" />
            Record Hire
          </Button>
        </div>
      </div>

      <!-- Bulk actions for the selected rows -->
      <div
        v-if="selectedHires.length > 0"
        class="flex flex-col gap-2 rounded-md border bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-2 text-sm">
          <span class="font-medium">{{ selectedHires.length }} selected</span>
          <Button variant="ghost" size="sm" :disabled="isDeleting" @click="clearSelection">
            <X class="size-4" />
            Clear
          </Button>
        </div>
        <Button variant="destructive" :disabled="isDeleting" @click="requestBulkDelete">
          <Trash2 class="size-4" />
          Delete
        </Button>
      </div>

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
            <template v-if="isLoading && hires.length === 0">
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
                No hires match the current filters.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          {{ table.getFilteredRowModel().rows.length }} hire(s)
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

    <!-- Record / Edit Hire -->
    <Dialog :open="isFormDialogOpen" @update:open="onFormDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form class="grid gap-5" @submit="submitHire">
          <DialogHeader>
            <DialogTitle>{{ isEditMode ? 'Edit Hire' : 'Record Hire' }}</DialogTitle>
            <DialogDescription>
              Pick the employer and vacancy, then the applicant they hired on the spot.
            </DialogDescription>
          </DialogHeader>

          <!-- Employer + Vacancy -->
          <section class="grid gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="participantId">
              <FormItem>
                <FormLabel>Employer</FormLabel>
                <Select v-bind="componentField" :disabled="isSubmitting">
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Select employer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem v-for="option in participantOptions" :key="option.id" :value="option.id">
                      {{ option.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="jobVacancyId">
              <FormItem>
                <FormLabel>Vacancy</FormLabel>
                <Select v-bind="componentField" :disabled="isSubmitting || vacancyChoices.length === 0">
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue :placeholder="vacancyChoices.length ? 'Select vacancy' : 'Select an employer first'" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem
                      v-for="choice in vacancyChoices"
                      :key="choice.id"
                      :value="choice.id"
                      :disabled="choice.isFull"
                    >
                      {{ choice.title }}
                      <span class="text-xs text-muted-foreground">· {{ choice.isFull ? 'Full' : choice.slotsLabel }}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>
          </section>

          <Separator />

          <!-- Applicant -->
          <section class="grid gap-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-semibold">Hired Applicant</h3>
              <div class="inline-flex rounded-md border p-0.5" role="group" aria-label="Applicant source">
                <Button
                  type="button"
                  size="sm"
                  :variant="isRegistrySource ? 'secondary' : 'ghost'"
                  :aria-pressed="isRegistrySource"
                  :disabled="isSubmitting"
                  @click="setApplicantSource('registry')"
                >
                  From Registry
                </Button>
                <Button
                  type="button"
                  size="sm"
                  :variant="isRegistrySource ? 'ghost' : 'secondary'"
                  :aria-pressed="!isRegistrySource"
                  :disabled="isSubmitting"
                  @click="setApplicantSource('walk-in')"
                >
                  Walk-in
                </Button>
              </div>
            </div>

            <template v-if="isRegistrySource">
              <FormField name="applicantId">
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
                          <ComboboxItem v-for="applicant in registryResults" :key="applicant.id" :value="applicant">
                            <span class="min-w-0 flex-1 truncate">{{ formatRegistryName(applicant) }}</span>
                            <span class="shrink-0 text-xs text-muted-foreground">{{ getRegistryPhone(applicant) }}</span>
                            <ComboboxItemIndicator>
                              <CheckIcon class="size-4 shrink-0" />
                            </ComboboxItemIndicator>
                          </ComboboxItem>
                        </ComboboxGroup>
                      </ComboboxViewport>
                    </ComboboxList>
                  </Combobox>
                  <FormDescription>Name and contact details are filled in from the registry and kept in sync.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>

              <!-- Read-only registry details -->
              <dl v-if="selectedApplicant" class="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <dt class="text-xs text-muted-foreground">Name</dt>
                  <dd class="font-medium">{{ formatRegistryName(selectedApplicant) }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">Contact Number</dt>
                  <dd class="font-medium">{{ registryPhone || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">Email</dt>
                  <dd class="font-medium break-all">{{ selectedApplicant.email || '—' }}</dd>
                </div>
              </dl>

              <FormField v-if="needsManualPhone" v-slot="{ componentField }" name="contactPhone">
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="tel" placeholder="09XX XXX XXXX" :disabled="isSubmitting" />
                  </FormControl>
                  <FormDescription>This applicant has no contact number in the registry.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </template>

            <div v-else class="grid gap-4 sm:grid-cols-2">
              <FormField v-for="field in walkInFields" :key="field.name" v-slot="{ componentField }" :name="field.name">
                <FormItem>
                  <FormLabel>{{ field.label }}</FormLabel>
                  <FormControl>
                    <Input
                      v-bind="componentField"
                      :type="'type' in field ? field.type : 'text'"
                      :placeholder="field.placeholder"
                      :disabled="isSubmitting"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>
          </section>

          <Separator />

          <!-- Hire Details -->
          <section class="grid gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="hiredDate">
              <FormItem>
                <FormLabel>Hired Date</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="remarks">
              <FormItem class="sm:col-span-2">
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Textarea v-bind="componentField" rows="2" placeholder="Optional notes" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" :disabled="isSubmitting" @click="onFormDialogOpenChange(false)">
              Cancel
            </Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
              {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Record Hire' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {{ hiresToDelete.length === 1 ? 'hire record' : `${hiresToDelete.length} hire records` }}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="hiresToDelete.length === 1 && hiresToDelete[0]">
              The record of
              <strong class="font-medium text-foreground">{{ formatHireName(hiresToDelete[0]) }}</strong>
              being hired as {{ hiresToDelete[0].job_vacancies?.position_title ?? 'this vacancy' }} will be permanently
              removed, freeing up the slot. This action cannot be undone.
            </template>
            <template v-else>
              These hire records will be permanently removed, freeing up their vacancy slots. This action cannot be
              undone.
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
            <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
            {{ isDeleting ? 'Deleting...' : hiresToDelete.length === 1 ? 'Delete Hire' : 'Delete Hires' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
