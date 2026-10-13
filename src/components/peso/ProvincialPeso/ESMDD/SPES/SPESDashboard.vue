<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { RouterLink } from 'vue-router'
import { GraduationCap, Loader2, Plus, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useSpesBeneficiaries } from '@/composables/peso/provincialPeso/useSpesBeneficiaries'
import { useSpesBeneficiaryForm } from '@/composables/peso/provincialPeso/useSpesBeneficiaryForm'
import { formatSpesFormName } from '@/helpers/peso/provincialPeso/spesHelper'

const {
  table,
  columns,
  spesBeneficiaries,
  summary,
  isLoading,
  errorMessage,
  isDeleting,
  spesToDelete,
  isDeleteDialogOpen,
  statusOptions,
  refreshBeneficiaries,
  openAddSpesDialog,
  confirmDelete,
} = useSpesBeneficiaries()
const {
  isSpesFormOpen,
  isSubmitting,
  isEditMode,
  editingSpes,
  applicantOptions,
  statusOptions: formStatusOptions,
  beneficiaryOptions,
  onApplicantSelected,
  onSpesFormOpenChange,
  submitSpes,
} = useSpesBeneficiaryForm()
</script>

<template>
  <div class="w-full min-w-0 space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Special Program for Employment of Students</h1>
        <p class="text-sm text-muted-foreground">
          Enroll approved SPES applicants as beneficiaries and track their employment.
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" as-child>
          <RouterLink :to="{ name: 'provincial-peso-spes-applicants' }">View Applicants</RouterLink>
        </Button>
        <Button @click="openAddSpesDialog">
          <Plus class="size-4" />
          Add Beneficiary
        </Button>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Applicants</CardDescription>
          <CardTitle class="text-2xl tabular-nums">{{ summary.applicants }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Pending Review</CardDescription>
          <CardTitle class="text-2xl tabular-nums">{{ summary.pendingApplicants }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Active Beneficiaries</CardDescription>
          <CardTitle class="text-2xl tabular-nums">{{ summary.active }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Completed</CardDescription>
          <CardTitle class="text-2xl tabular-nums">{{ summary.completed }}</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">SPES Beneficiaries</CardTitle>
        <CardDescription>Students enrolled in SPES and the length of their employment.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Toolbar -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Input
              class="w-full sm:max-w-xs"
              placeholder="Search beneficiaries..."
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

          <Button variant="outline" :disabled="isLoading" @click="refreshBeneficiaries">
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
        <Empty v-if="!isLoading && !errorMessage && spesBeneficiaries.length === 0" class="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>No SPES beneficiaries yet</EmptyTitle>
            <EmptyDescription>Approve SPES applicants, then enroll them here as beneficiaries.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button @click="openAddSpesDialog">
              <Plus class="size-4" />
              Add Beneficiary
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
                <template v-if="isLoading && spesBeneficiaries.length === 0">
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
                    No beneficiaries match the current filters.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Pagination -->
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              {{ table.getFilteredRowModel().rows.length }} beneficiary(ies)
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
      </CardContent>
    </Card>
  </div>

  <!-- Add / Edit Beneficiary Dialog -->
  <Dialog :open="isSpesFormOpen" @update:open="onSpesFormOpenChange">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <form class="grid gap-4" @submit="submitSpes">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit SPES Beneficiary' : 'Add SPES Beneficiary' }}</DialogTitle>
          <DialogDescription>
            {{
              isEditMode
                ? 'Update the employment details of this beneficiary.'
                : 'Enroll an approved SPES applicant as a beneficiary.'
            }}
          </DialogDescription>
        </DialogHeader>

        <div v-if="isEditMode">
          <span class="text-xs text-muted-foreground">Applicant</span>
          <p class="text-sm font-medium">{{ formatSpesFormName(editingSpes?.spes_form) }}</p>
        </div>

        <FormField v-else v-slot="{ componentField }" name="applicationId">
          <FormItem>
            <FormLabel>Applicant</FormLabel>
            <Select
              v-bind="componentField"
              :disabled="isSubmitting || applicantOptions.length === 0"
              @update:model-value="(val) => onApplicantSelected(String(val))"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue
                    :placeholder="applicantOptions.length ? 'Select an approved applicant' : 'No approved applicants available'"
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem v-for="option in applicantOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>Only approved applicants who are not yet enrolled are listed.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField v-slot="{ componentField }" name="beneficiary">
            <FormItem>
              <FormLabel>Beneficiary Type</FormLabel>
              <Select v-bind="componentField" :disabled="isSubmitting">
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem v-for="type in beneficiaryOptions" :key="type" :value="type">
                    {{ type }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="daysDuration">
            <FormItem>
              <FormLabel>Duration (days)</FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="number" min="1" placeholder="e.g. 20" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
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
                <SelectItem v-for="status in formStatusOptions" :key="status" :value="status">
                  {{ status }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onSpesFormOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Beneficiary' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Delete Confirmation -->
  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove SPES beneficiary?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ formatSpesFormName(spesToDelete?.spes_form) }}</strong>
          will be removed from the SPES beneficiaries. Their applicant record and SPES form are kept. This action
          cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Removing...' : 'Remove Beneficiary' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
