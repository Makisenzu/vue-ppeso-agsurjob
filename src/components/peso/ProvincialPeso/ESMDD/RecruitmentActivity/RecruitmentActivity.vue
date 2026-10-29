<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { ClipboardList, Loader2, Plus, RefreshCw, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useRecruitmentActivities } from '@/composables/peso/provincialPeso/useRecruitmentActivities'
import { useRecruitmentActivityForm } from '@/composables/peso/provincialPeso/useRecruitmentActivityForm'
import NsrpForm2Fields from '@/components/NsrpForm2Fields.vue'
import SearchSelect from '@/components/SearchSelect.vue'

const {
  table,
  columns,
  activities,
  isLoading,
  errorMessage,
  isDeleting,
  activityToDelete,
  isDeleteDialogOpen,
  typeOptions,
  statusOptions,
  refreshActivities,
  openAddDialog,
  confirmDelete,
  getRowSwipeActions,
  getRowCard,
} = useRecruitmentActivities()

const {
  isFormDialogOpen,
  isSubmitting,
  isEditMode,
  isSra,
  isNewAgency,
  isForm2Visible,
  editingActivity,
  onFormDialogOpenChange,
  submitActivity,
  setAgencyMode,
  establishmentQuery,
  establishmentResults,
  isSearchingEstablishments,
  isLoadingEstablishment,
  selectedEstablishment,
  selectEstablishment,
  clearSelectedEstablishment,
  agencyError,
  establishmentSearchMinLength,
  typeSelectOptions,
} = useRecruitmentActivityForm()
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Recruitment Activities</h1>
      <p class="text-sm text-muted-foreground">
        Local (LRA) and Special (SRA, overseas) Recruitment Activities, their requirements and job orders.
      </p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Input
          class="w-full sm:max-w-xs"
          placeholder="Search agencies..."
          :model-value="(table.getColumn('agency_name')?.getFilterValue() as string) ?? ''"
          @update:model-value="table.getColumn('agency_name')?.setFilterValue($event)"
        />
        <SearchSelect
          :model-value="(table.getColumn('type')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('type')?.setFilterValue(val === 'all' ? undefined : val)"
          :options="[{ value: 'all', label: 'All Types' }, ...typeOptions]"
          placeholder="Type"
          class="w-full sm:w-32"
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
        <Button variant="outline" :disabled="isLoading" @click="refreshActivities">
          <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refresh</span>
        </Button>
        <Button @click="openAddDialog">
          <Plus class="size-4" />
          New Activity
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
    <Empty v-if="!isLoading && !errorMessage && activities.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardList />
        </EmptyMedia>
        <EmptyTitle>No recruitment activities yet</EmptyTitle>
        <EmptyDescription>Create an LRA or SRA to start tracking its requirements and job orders.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button @click="openAddDialog">
          <Plus class="size-4" />
          New Activity
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
        :loading="isLoading && activities.length === 0"
      >
        <template #empty>
          <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No recruitment activities match the current filters.</p>
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
            <template v-if="isLoading && activities.length === 0">
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
                No recruitment activities match the current filters.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          {{ table.getFilteredRowModel().rows.length }} activit{{ table.getFilteredRowModel().rows.length === 1 ? 'y' : 'ies' }}
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

  <!-- New / Edit Activity Dialog -->
  <Dialog :open="isFormDialogOpen" @update:open="onFormDialogOpenChange">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <form class="grid gap-5" @submit="submitActivity">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit Recruitment Activity' : 'New Recruitment Activity' }}</DialogTitle>
          <DialogDescription>
            {{
              isEditMode
                ? 'Update the schedule, venue and representatives. Type and agency are fixed once created.'
                : 'The requirement checklist for the chosen type is created automatically.'
            }}
          </DialogDescription>
        </DialogHeader>

        <!-- Type -->
        <FormField v-slot="{ componentField }" name="type">
          <FormItem>
            <FormLabel>Type</FormLabel>
            <FormControl>
              <SearchSelect
                v-bind="componentField"
                :options="typeSelectOptions"
                :disabled="isSubmitting || isEditMode"
                placeholder="Select a type"
                class="w-full"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Agency: NSRP Form 2 -->
        <section class="grid gap-3">
          <div>
            <h3 class="text-sm font-semibold">Agency — NSRP Form 2</h3>
            <p v-if="!isEditMode" class="text-xs text-muted-foreground">
              The establishment registration must be complete to create the activity.
            </p>
          </div>

          <p v-if="isEditMode" class="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
            {{ editingActivity?.agency_name }}
          </p>

          <template v-else>
            <div class="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
              <button
                type="button"
                class="rounded px-3 py-1.5 font-medium transition-colors"
                :class="!isNewAgency ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                :disabled="isSubmitting"
                @click="setAgencyMode('existing')"
              >
                Existing agency
              </button>
              <button
                type="button"
                class="rounded px-3 py-1.5 font-medium transition-colors"
                :class="isNewAgency ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                :disabled="isSubmitting"
                @click="setAgencyMode('new')"
              >
                Register new agency
              </button>
            </div>

            <!-- Existing establishment -->
            <template v-if="!isNewAgency">
              <div
                v-if="selectedEstablishment"
                class="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
              >
                <div class="min-w-0 text-sm">
                  <div class="truncate font-medium">{{ selectedEstablishment.business_name }}</div>
                  <div class="truncate text-xs text-muted-foreground">
                    Complete any missing fields below; saving updates this agency's NSRP Form 2.
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" :disabled="isSubmitting" @click="clearSelectedEstablishment">
                  Change
                </Button>
              </div>

              <template v-else>
                <Label for="agency-search" class="sr-only">Find the agency</Label>
                <div class="relative">
                  <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="agency-search"
                    v-model="establishmentQuery"
                    class="pl-8"
                    placeholder="Business name, trade name, acronym or TIN"
                    autocomplete="off"
                    :disabled="isSubmitting || isLoadingEstablishment"
                  />
                  <Loader2
                    v-if="isSearchingEstablishments || isLoadingEstablishment"
                    class="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                  />
                </div>

                <ul
                  v-if="establishmentResults.length"
                  class="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border"
                >
                  <li v-for="result in establishmentResults" :key="result.id">
                    <button
                      type="button"
                      class="flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                      :disabled="isLoadingEstablishment"
                      @click="selectEstablishment(result)"
                    >
                      <span class="font-medium">{{ result.business_name }}</span>
                      <span class="text-xs text-muted-foreground">
                        {{ [result.tin && `TIN ${result.tin}`, result.city_municipality, result.province].filter(Boolean).join(' · ') || '—' }}
                      </span>
                    </button>
                  </li>
                </ul>
                <p
                  v-else-if="establishmentQuery.trim().length >= establishmentSearchMinLength && !isSearchingEstablishments"
                  class="text-xs text-muted-foreground"
                >
                  No agency found. Switch to "Register new agency" to add it.
                </p>
              </template>

              <p v-if="agencyError" class="text-sm text-destructive">{{ agencyError }}</p>
            </template>

            <!-- Full NSRP Form 2: picked agency (to complete) or new agency -->
            <NsrpForm2Fields v-if="isForm2Visible" :disabled="isSubmitting" />
          </template>
        </section>

        <!-- Activity -->
        <section class="grid gap-4">
          <h3 class="text-sm font-semibold">Activity Details</h3>

          <FormField v-slot="{ componentField }" name="representatives">
            <FormItem>
              <FormLabel>Representatives</FormLabel>
              <FormControl>
                <Textarea v-bind="componentField" rows="2" placeholder="One name per line" :disabled="isSubmitting" />
              </FormControl>
              <FormDescription>The agency representatives conducting the activity.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="grid gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="startDate">
              <FormItem>
                <FormLabel>Start of Conduct</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="endDate">
              <FormItem>
                <FormLabel>End of Conduct</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="venue">
              <FormItem>
                <FormLabel>Venue <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="e.g. PESO Office, Government Center" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="venueCityMunicipality">
              <FormItem>
                <FormLabel>City / Municipality <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="e.g. Prosperidad" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <FormField v-slot="{ componentField }" name="remarks">
            <FormItem>
              <FormLabel>Remarks <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Textarea v-bind="componentField" rows="2" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <p v-if="isSra && !isEditMode" class="text-xs text-muted-foreground">
            The CONO number and the ₱1,000.00 recruitment fee (Ord. 6 s. 1994) are recorded on the activity's page.
          </p>
        </section>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onFormDialogOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Activity' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Delete Confirmation -->
  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete recruitment activity?</AlertDialogTitle>
        <AlertDialogDescription>
          The {{ activityToDelete?.type }} of
          <strong class="font-medium text-foreground">{{ activityToDelete?.agency_name }}</strong> and all its records
          will be permanently deleted. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Deleting...' : 'Delete Activity' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
