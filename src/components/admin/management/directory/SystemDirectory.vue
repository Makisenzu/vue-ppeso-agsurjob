<script setup lang="ts">
import { ref, watch } from 'vue'
import { FlexRender } from '@tanstack/vue-table'
import { createReusableTemplate } from '@vueuse/core'
import {
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  Building2,
  Globe,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
  FileText,
  FileCheck,
  ExternalLink,
  FolderOpen,
} from '@lucide/vue'

import { useSystemDirectory } from '@/composables/admin/useSystemDirectory'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatFileSize,
  getRoleBadgeVariant,
  getRoleBadgeClass,
  getStatusBadgeVariant,
  getStatusBadgeClass,
  getCategoryBadgeVariant,
  getCategoryBadgeClass,
  formatRoleLabel,
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
  isLoading,
  isSubmitting,
  errorMessage,
  selectedRecord,
  isDetailsOpen,
  isEditStatusOpen,
  fetchRecords,
  openRecordDetails,
  openEditStatusModal,
  closeEditStatusModal,
  updateAccountStatus,
  copyId,
} = useSystemDirectory(ReuseTemplate)

// Edit status state
const selectedStatus = ref<string>('active')

watch(selectedRecord, (newVal) => {
  if (newVal) {
    selectedStatus.value = newVal.status || 'pending'
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

    <!-- Record Details & Documents Modal -->
    <Dialog :open="isDetailsOpen" @update:open="isDetailsOpen = $event">
      <DialogContent class="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Building2 v-if="selectedRecord?.category === 'company'" class="h-5 w-5 text-emerald-600" />
            <span>{{ selectedRecord?.category === 'company' ? 'Company & Account Details' : 'Applicant Account Details' }}</span>
          </DialogTitle>
          <DialogDescription>
            Master record and submitted requirements for {{ selectedRecord?.companyDetails?.company_name || selectedRecord?.firstname + ' ' + selectedRecord?.lastname }}
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedRecord" class="space-y-6 py-2">
          <!-- Overview / Summary -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold border-b pb-1">
              Overview & Account Summary
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/40 p-3.5 rounded-lg border">
              <div>
                <span class="text-muted-foreground">Category:</span>
                <span class="ml-2">
                  <Badge
                    :variant="getCategoryBadgeVariant(selectedRecord.category)"
                    :class="['capitalize', getCategoryBadgeClass(selectedRecord.category)]"
                  >
                    {{ selectedRecord.category === 'company' ? 'Company' : 'Applicant' }}
                  </Badge>
                </span>
              </div>
              <div>
                <span class="text-muted-foreground">System Role:</span>
                <span class="ml-2">
                  <Badge
                    :variant="getRoleBadgeVariant(selectedRecord.role)"
                    :class="['capitalize', getRoleBadgeClass(selectedRecord.role)]"
                  >
                    {{ formatRoleLabel(selectedRecord.role) }}
                  </Badge>
                </span>
              </div>
              <div>
                <span class="text-muted-foreground">Full Name:</span>
                <span class="ml-2 font-medium">
                  {{ selectedRecord.firstname || '-' }} {{ selectedRecord.middlename || '' }} {{ selectedRecord.lastname || '-' }}
                </span>
              </div>
              <div>
                <span class="text-muted-foreground">Email Address:</span>
                <span class="ml-2 font-medium font-mono text-xs">{{ selectedRecord.email || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Username:</span>
                <span class="ml-2 font-medium">@{{ selectedRecord.username || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Account Status:</span>
                <span class="ml-2">
                  <Badge
                    :variant="getStatusBadgeVariant(selectedRecord.status)"
                    :class="['capitalize', getStatusBadgeClass(selectedRecord.status)]"
                  >
                    {{ selectedRecord.status || 'N/A' }}
                  </Badge>
                </span>
              </div>
            </div>
          </div>

          <!-- Submitted Files & Documents Section -->
          <div class="space-y-3">
            <div class="flex items-center justify-between border-b pb-1">
              <h3 class="text-sm font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <FileCheck class="h-4 w-4" /> Submitted Files & Required Documents
              </h3>
              <Badge variant="outline" class="text-xs">
                {{ selectedRecord.documentCount }} Submitted File(s)
              </Badge>
            </div>

            <div v-if="selectedRecord.documents && selectedRecord.documents.length > 0" class="space-y-2">
              <div
                v-for="doc in selectedRecord.documents"
                :key="doc.id"
                class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/40 transition-colors gap-2 text-sm"
              >
                <div class="flex items-start gap-3 min-w-0">
                  <div class="p-2 rounded bg-muted text-foreground shrink-0 mt-0.5">
                    <FileText class="h-4 w-4 text-emerald-600" />
                  </div>
                  <div class="min-w-0 space-y-0.5">
                    <p class="font-semibold text-foreground truncate">{{ doc.name }}</p>
                    <p v-if="doc.filename" class="text-xs font-mono text-muted-foreground truncate">
                      File: {{ doc.filename }} <span v-if="doc.size">({{ formatFileSize(doc.size) }})</span>
                    </p>
                    <p v-if="doc.remarks" class="text-xs text-muted-foreground italic">
                      Remarks: {{ doc.remarks }}
                    </p>
                    <p v-if="doc.created_at" class="text-xs text-muted-foreground">
                      Submitted: {{ formatDate(doc.created_at) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Badge
                    :variant="getStatusBadgeVariant(doc.status)"
                    :class="['capitalize text-xs', getStatusBadgeClass(doc.status)]"
                  >
                    {{ doc.status || 'submitted' }}
                  </Badge>

                  <a
                    v-if="doc.publicUrl"
                    :href="doc.publicUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                  >
                    <span>View File</span>
                    <ExternalLink class="h-3 w-3" />
                  </a>
                  <span v-else class="text-xs text-muted-foreground italic">File unavailable</span>
                </div>
              </div>
            </div>

            <div v-else class="flex flex-col items-center justify-center p-6 rounded-lg border border-dashed text-center bg-muted/20">
              <FolderOpen class="h-8 w-8 text-muted-foreground mb-2 stroke-[1.5]" />
              <p class="text-sm font-medium text-foreground">No Required Documents Submitted</p>
              <p class="text-xs text-muted-foreground mt-0.5">
                This account has not uploaded any required document files or media attachments yet.
              </p>
            </div>
          </div>

          <!-- Company Details Section (If Company Account) -->
          <div v-if="selectedRecord.category === 'company'" class="space-y-3">
            <h3 class="text-sm font-semibold border-b pb-1 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Building2 class="h-4 w-4" /> Company Profile Details
            </h3>
            <div v-if="selectedRecord.companyDetails" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Company Name:</span>
                <span class="ml-2 font-semibold text-foreground">{{ selectedRecord.companyDetails.company_name || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Industry:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.companyDetails.industry || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Business Type:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.companyDetails.business_type || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Registration No:</span>
                <span class="ml-2 font-mono text-xs font-medium">{{ selectedRecord.companyDetails.registration_number || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Verification Status:</span>
                <span class="ml-2">
                  <Badge
                    :variant="getStatusBadgeVariant(selectedRecord.companyDetails.verification_status)"
                    :class="['capitalize', getStatusBadgeClass(selectedRecord.companyDetails.verification_status)]"
                  >
                    {{ selectedRecord.companyDetails.verification_status || 'unverified' }}
                  </Badge>
                </span>
              </div>
              <div>
                <span class="text-muted-foreground">Employee Count:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.companyDetails.employee_count ? selectedRecord.companyDetails.employee_count + ' employees' : 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Company Contact:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.companyDetails.company_contact || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Company Email:</span>
                <span class="ml-2 font-medium font-mono text-xs">{{ selectedRecord.companyDetails.company_email || 'N/A' }}</span>
              </div>
              <div class="sm:col-span-2">
                <span class="text-muted-foreground">Website:</span>
                <span class="ml-2">
                  <a
                    v-if="selectedRecord.companyDetails.website"
                    :href="selectedRecord.companyDetails.website"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 hover:underline font-medium text-xs inline-flex items-center gap-1"
                  >
                    <Globe class="h-3.5 w-3.5" /> {{ selectedRecord.companyDetails.website }}
                  </a>
                  <span v-else class="font-medium text-muted-foreground">N/A</span>
                </span>
              </div>
              <div class="sm:col-span-2">
                <span class="text-muted-foreground">Company Address:</span>
                <p class="font-medium mt-0.5">{{ selectedRecord.companyDetails.company_address || 'N/A' }}</p>
              </div>
            </div>
            <div v-else class="text-sm text-muted-foreground italic bg-muted p-3 rounded">
              No linked employer company record found for this profile.
            </div>
          </div>

          <!-- Applicant Details Section (If Applicant Account) -->
          <div v-if="selectedRecord.category === 'applicant'" class="space-y-3">
            <h3 class="text-sm font-semibold border-b pb-1 flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
              Applicant Qualification & Details
            </h3>
            <div v-if="selectedRecord.applicantDetails" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground flex items-center gap-1">
                  <GraduationCap class="h-3.5 w-3.5" /> Education Level:
                </span>
                <span class="ml-2 font-medium capitalize">{{ selectedRecord.applicantDetails.education_level || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Course / Major:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.applicantDetails.course || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground flex items-center gap-1">
                  <Briefcase class="h-3.5 w-3.5" /> Employment Status:
                </span>
                <span class="ml-2 font-medium capitalize">{{ selectedRecord.applicantDetails.employment_status || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Years of Experience:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.applicantDetails.years_experience !== null ? selectedRecord.applicantDetails.years_experience + ' year(s)' : 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground flex items-center gap-1">
                  <DollarSign class="h-3.5 w-3.5" /> Expected Salary:
                </span>
                <span class="ml-2 font-medium">{{ formatCurrency(selectedRecord.applicantDetails.expected_salary) }}</span>
              </div>
              <div>
                <span class="text-muted-foreground flex items-center gap-1">
                  <Briefcase class="h-3.5 w-3.5" /> Preferred Job Title:
                </span>
                <span class="ml-2 font-medium">{{ selectedRecord.applicantDetails.preferred_job || 'N/A' }}</span>
              </div>
              <div class="sm:col-span-2">
                <span class="text-muted-foreground flex items-center gap-1">
                  <MapPin class="h-3.5 w-3.5" /> Preferred Location:
                </span>
                <span class="ml-2 font-medium">{{ selectedRecord.applicantDetails.preferred_location || 'N/A' }}</span>
              </div>
            </div>
            <div v-else class="text-sm text-muted-foreground italic bg-muted p-3 rounded">
              Standard job seeker profile.
            </div>
          </div>

          <!-- Personal Information -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold border-b pb-1">Personal Details</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Birthdate:</span>
                <span class="ml-2 font-medium">{{ formatDate(selectedRecord.birthdate) }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Gender:</span>
                <span class="ml-2 font-medium capitalize">{{ selectedRecord.gender || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Contact Number:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.contact_number || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Special Category:</span>
                <div class="inline-flex gap-2 ml-2">
                  <span v-if="selectedRecord.is_pwd" class="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">PWD</span>
                  <span v-if="selectedRecord.is_4ps" class="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">4Ps</span>
                  <span v-if="!selectedRecord.is_pwd && !selectedRecord.is_4ps" class="text-muted-foreground">None</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Location Information -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold border-b pb-1">Location / Address</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Region:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.region || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Province:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.province || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">City/Municipality:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.geographic || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Barangay:</span>
                <span class="ml-2 font-medium">{{ selectedRecord.barangay || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <!-- System Metadata -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold border-b pb-1">System Audit Information</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Profile ID:</span>
                <p class="font-mono text-xs break-all bg-muted p-1 rounded mt-1">{{ selectedRecord.id }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Last Login:</span>
                <p class="font-medium mt-1">{{ formatDateTime(selectedRecord.last_login) }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Registered At:</span>
                <p class="font-medium mt-1">{{ formatDateTime(selectedRecord.created_at) }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Updated At:</span>
                <p class="font-medium mt-1">{{ formatDateTime(selectedRecord.updated_at) }}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="isDetailsOpen = false">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
  </div>
</template>