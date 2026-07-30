<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FlexRender } from '@tanstack/vue-table'
import { createReusableTemplate } from '@vueuse/core'
import {
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  Loader2,
} from '@lucide/vue'


import { useSystemDirectory } from '@/composables/admin/useSystemDirectory'
import {
  getStatusBadgeVariant,
  getStatusBadgeClass,
} from '@/helpers/admin/systemDirectoryHelper'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { DirectoryProfileRow } from '@/types/admin/systemDirectory'

// Reusable action dropdown template
const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{
  record: DirectoryProfileRow
  onExpand: () => void
}>()

const {
  table,
  columns,
  records,
  isLoading,
  isSubmitting,
  errorMessage,
  selectedRecord,
  isEditStatusOpen,
  isEditDocStatusOpen,
  selectedDocument,
  fetchRecords,
  openRecordDetails,
  openEditStatusModal,
  closeEditStatusModal,
  updateAccountStatus,
  closeEditDocumentStatusModal,
  updateDocumentStatus,
  copyId,
} = useSystemDirectory(ReuseTemplate)

// Edit status state
const selectedStatus = ref<string>('active')

watch(selectedRecord, (newVal) => {
  if (newVal) {
    selectedStatus.value = newVal.status || 'pending'
  }
})

const getColumnFilterValue = (columnId: string) => {
  const value = table.getColumn(columnId)?.getFilterValue()
  return typeof value === 'string' ? value : 'all'
}

const setColumnFilter = (columnId: string, value: unknown) => {
  const normalizedValue = value === 'all' || value == null ? undefined : typeof value === 'string' ? value : String(value)
  table.getColumn(columnId)?.setFilterValue(normalizedValue)
}

const setHierarchyFilter = (columnId: string, value: unknown, childColumnIds: string[]) => {
  setColumnFilter(columnId, value)
  childColumnIds.forEach((childColumnId) => setColumnFilter(childColumnId, 'all'))
}

const createLocationOptions = (
  valueGetter: (record: DirectoryProfileRow) => string | null | undefined,
  parentFilters: Array<{ columnId: string; getter: (record: DirectoryProfileRow) => string | null | undefined }> = []
) =>
  computed(() => {
    const filteredRecords = records.value.filter((record) => {
      return parentFilters.every(({ columnId, getter }) => {
        const selectedValue = getColumnFilterValue(columnId)
        return selectedValue === 'all' || getter(record) === selectedValue
      })
    })

    return Array.from(
      new Set(
        filteredRecords
          .map((record) => valueGetter(record)?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((first, second) => first.localeCompare(second))
  })

const regionOptions = createLocationOptions((record) => record.region)
const provinceOptions = createLocationOptions(
  (record) => record.province,
  [{ columnId: 'region', getter: (record) => record.region }]
)
const cityOptions = createLocationOptions(
  (record) => record.geographic,
  [
    { columnId: 'region', getter: (record) => record.region },
    { columnId: 'province', getter: (record) => record.province },
  ]
)
const barangayOptions = createLocationOptions(
  (record) => record.barangay,
  [
    { columnId: 'region', getter: (record) => record.region },
    { columnId: 'province', getter: (record) => record.province },
    { columnId: 'geographic', getter: (record) => record.geographic },
  ]
)

// Edit document status state
const selectedDocStatus = ref<string>('submitted')

watch(selectedDocument, (newVal) => {
  if (newVal) {
    selectedDocStatus.value = newVal.status || 'submitted'
  }
})

const handleUpdateStatus = async () => {
  if (!selectedRecord.value) return
  try {
    await updateAccountStatus(selectedRecord.value.id, selectedStatus.value)
  } catch {
    // Error handled in store
  }
}

const handleUpdateDocumentStatus = async () => {
  if (!selectedRecord.value || !selectedDocument.value) return
  const isApplicantDoc = selectedRecord.value.category === 'applicant'
  try {
    await updateDocumentStatus(selectedRecord.value.id, selectedDocument.value.id, selectedDocStatus.value, isApplicantDoc)
  } catch {
    // Error handled in store
  }
}
</script>

<template>
  <DefineTemplate v-slot="{ record }">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" class="h-8 w-8 p-0">
          <span class="sr-only">Open menu</span>
          <MoreHorizontal class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem @select="(e: Event) => { e.preventDefault(); openEditStatusModal(record) }">
          Edit Status
        </DropdownMenuItem>
        <DropdownMenuItem @select="copyId(record.id)">
          Copy Profile ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="(e: Event) => { e.preventDefault(); openRecordDetails(record) }">
          View Details & Files
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </DefineTemplate>

  <div class="w-full min-w-0 space-y-4">
    <!-- Header -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">System Directory</h1>
        <p class="text-sm text-muted-foreground">
          Master registry to inspect applicants and verified companies, view details, and check submitted files.
        </p>
      </div>
    </div>

    <!-- Filters & Toolbar -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-4">
      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1 max-w-4xl">
        <Input
          class="w-full sm:max-w-xs"
          placeholder="Filter name or entity..."
          :model-value="(table.getColumn('firstname')?.getFilterValue() as string) ?? ''"
          @update:model-value="table.getColumn('firstname')?.setFilterValue($event)"
        />

        <Select
          :model-value="(table.getColumn('region')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => setHierarchyFilter('region', val ?? 'all', ['province', 'geographic', 'barangay'])"
        >
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            <SelectItem v-for="region in regionOptions" :key="region" :value="region">
              {{ region }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          :model-value="(table.getColumn('province')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => setHierarchyFilter('province', val ?? 'all', ['geographic', 'barangay'])"
        >
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Provinces</SelectItem>
            <SelectItem v-for="province in provinceOptions" :key="province" :value="province">
              {{ province }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          :model-value="(table.getColumn('geographic')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => setHierarchyFilter('geographic', val ?? 'all', ['barangay'])"
        >
          <SelectTrigger class="w-full sm:w-48">
            <SelectValue placeholder="City / Municipality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities / Municipalities</SelectItem>
            <SelectItem v-for="city in cityOptions" :key="city" :value="city">
              {{ city }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          :model-value="(table.getColumn('barangay')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => setColumnFilter('barangay', val ?? 'all')"
        >
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Barangay" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Barangays</SelectItem>
            <SelectItem v-for="barangay in barangayOptions" :key="barangay" :value="barangay">
              {{ barangay }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Submitted Files Filter -->
        <Select
          :model-value="(table.getColumn('hasDocuments')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('hasDocuments')?.setFilterValue(val === 'all' ? undefined : val === 'true')"
        >
          <SelectTrigger class="w-full sm:w-44">
            <SelectValue placeholder="Submitted Files" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Submissions</SelectItem>
            <SelectItem value="true">With Submitted Files</SelectItem>
            <SelectItem value="false">No Files Submitted</SelectItem>
          </SelectContent>
        </Select>

        <!-- Status Filter -->
        <Select
          :model-value="(table.getColumn('status')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)"
        >
          <SelectTrigger class="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              <span class="hidden sm:inline">Columns</span> <ChevronDown class="sm:ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              v-for="column in table.getAllColumns().filter((col) => col.getCanHide())"
              :key="column.id"
              class="capitalize"
              :model-value="column.getIsVisible()"
              @update:model-value="(value) => column.toggleVisibility(!!value)"
            >
              {{ column.id }}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" @click="fetchRecords" :disabled="isLoading">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline ml-2">Refresh</span>
        </Button>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="errorMessage" class="p-4 text-center text-destructive rounded border border-destructive/20 bg-destructive/10">
      {{ errorMessage }}
    </div>

    <!-- Data Table -->
    <div class="rounded-md border overflow-x-auto">
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
          <template v-if="isLoading">
            <TableRow>
              <TableCell :colspan="columns.length" class="h-24 text-center">
                <div class="flex items-center justify-center gap-2">
                  <RefreshCw class="h-4 w-4 animate-spin" />
                  <span>Loading directory records...</span>
                </div>
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="table.getRowModel().rows?.length">
            <template v-for="row in table.getRowModel().rows" :key="row.id">
              <TableRow :data-state="row.getIsSelected() && 'selected'">
                <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </TableCell>
              </TableRow>
              <TableRow v-if="row.getIsExpanded()">
                <TableCell :colspan="row.getAllCells().length">
                  <pre class="text-xs p-2 bg-muted rounded overflow-x-auto">{{ JSON.stringify(row.original, null, 2) }}</pre>
                </TableCell>
              </TableRow>
            </template>
          </template>

          <TableRow v-else>
            <TableCell :colspan="columns.length" class="h-24 text-center">
              No directory records found matching the filters.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination & Selection Footer -->
    <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:space-x-2 py-4">
      <div class="flex-1 text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        {{ table.getFilteredSelectedRowModel().rows.length }} of
        {{ table.getFilteredRowModel().rows.length }} row(s) selected.
      </div>
      <div class="flex justify-center sm:justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="!table.getCanPreviousPage()"
          @click="table.previousPage()"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          :disabled="!table.getCanNextPage()"
          @click="table.nextPage()"
        >
          Next
        </Button>
      </div>
    </div>

    <!-- Edit Status Modal -->
    <Dialog :open="isEditStatusOpen" @update:open="isEditStatusOpen = $event">
      <DialogContent class="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            Edit Account Status
          </DialogTitle>
          <DialogDescription>
            Update status for {{ selectedRecord?.companyDetails?.company_name || selectedRecord?.firstname + ' ' + selectedRecord?.lastname }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleUpdateStatus" class="space-y-4 py-2">
          <div v-if="selectedRecord" class="space-y-4">
            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">Entity / User Name</Label>
              <p class="font-medium text-base mt-0.5">
                {{ selectedRecord.companyDetails?.company_name ? selectedRecord.companyDetails.company_name + ' (' + selectedRecord.firstname + ' ' + selectedRecord.lastname + ')' : selectedRecord.firstname + ' ' + selectedRecord.lastname }}
              </p>
            </div>

            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">Current Status</Label>
              <div class="mt-1">
                <Badge
                  :variant="getStatusBadgeVariant(selectedRecord.status)"
                  :class="['capitalize', getStatusBadgeClass(selectedRecord.status)]"
                >
                  {{ selectedRecord.status || 'N/A' }}
                </Badge>
              </div>
            </div>

            <div class="space-y-2 pt-2">
              <Label for="edit-status-select">New Account Status <span class="text-destructive">*</span></Label>
              <Select v-model="selectedStatus">
                <SelectTrigger id="edit-status-select" class="w-full">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter class="pt-4">
            <Button type="button" variant="outline" @click="closeEditStatusModal" :disabled="isSubmitting">
              Cancel
            </Button>
            <Button
              type="submit"
              class="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              :disabled="isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Edit Document Status Modal -->
    <Dialog :open="isEditDocStatusOpen" @update:open="isEditDocStatusOpen = $event">
      <DialogContent class="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            Edit Document Status
          </DialogTitle>
          <DialogDescription>
            Update status for {{ selectedDocument?.name || selectedDocument?.filename }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleUpdateDocumentStatus" class="space-y-4 py-2">
          <div v-if="selectedDocument && selectedRecord" class="space-y-4">
            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">Document Name</Label>
              <p class="font-medium text-base mt-0.5">{{ selectedDocument.name || selectedDocument.filename || 'N/A' }}</p>
            </div>

            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">File Name</Label>
              <p class="font-medium text-sm font-mono mt-0.5">{{ selectedDocument.filename || 'N/A' }}</p>
            </div>

            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">Current Status</Label>
              <div class="mt-1">
                <Badge
                  :variant="getStatusBadgeVariant(selectedDocument.status)"
                  :class="['capitalize', getStatusBadgeClass(selectedDocument.status)]"
                >
                  {{ selectedDocument.status || 'submitted' }}
                </Badge>
              </div>
            </div>

            <div class="space-y-2 pt-2">
              <Label for="edit-doc-status-select">New Document Status <span class="text-destructive">*</span></Label>
              <Select v-model="selectedDocStatus">
                <SelectTrigger id="edit-doc-status-select" class="w-full">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter class="pt-4">
            <Button type="button" variant="outline" @click="closeEditDocumentStatusModal" :disabled="isSubmitting">
              Cancel
            </Button>
            <Button
              type="submit"
              class="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              :disabled="isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>