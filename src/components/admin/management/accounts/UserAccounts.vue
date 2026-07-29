<script setup lang="ts">
import { ref } from 'vue'
import {
  FlexRender,
} from '@tanstack/vue-table'
import { createReusableTemplate } from '@vueuse/core'
import { ChevronDown, MoreHorizontal, Eye, RefreshCw, User, Plus, Loader2 } from '@lucide/vue'

import { useUserAccounts } from '@/composables/admin/useUserAccounts'
import {
  formatDate,
  formatDateTime,
  getRoleBadgeVariant,
  getRoleBadgeClass,
  getStatusBadgeVariant,
  getStatusBadgeClass,
  formatRoleLabel,
} from '@/helpers/admin/userAccountsHelper'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { onMounted, watch } from 'vue'
import { usePsgc } from '@/composables/common/usePsgc'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Reusable action dropdown template
const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{
  profile: any
  onExpand: () => void
}>()

const {
  table,
  columns,
  isLoading,
  isSubmitting,
  errorMessage,
  selectedProfile,
  isDetailsOpen,
  isAddAccountOpen,
  isEditStatusOpen,
  fetchProfiles,
  openProfileDetails,
  openAddAccountSheet,
  closeAddAccountSheet,
  openEditStatusModal,
  closeEditStatusModal,
  updateAccountStatus,
  createAccount,
  copyId,
} = useUserAccounts(ReuseTemplate)

// Form state for creating a new user account
const formData = ref({
  email: '',
  password: '',
  firstname: '',
  lastname: '',
  middlename: '',
  username: '',
  role: 'applicant',
  contact_number: '',
  gender: '',
  birthdate: '',
  region: '',
  province: '',
  geographic: '',
  barangay: '',
  is_pwd: false,
  is_4ps: false,
})

// Edit status state
const selectedStatus = ref<string>('active')

watch(selectedProfile, (newVal) => {
  if (newVal) {
    selectedStatus.value = newVal.status || 'pending'
  }
})

const handleUpdateStatus = async () => {
  if (!selectedProfile.value) return
  try {
    await updateAccountStatus(selectedProfile.value.id, selectedStatus.value)
  } catch {
    // Error handled in store
  }
}

// PSGC cascading location service
const {
  regions: psgcRegions,
  provinces: psgcProvinces,
  cities: psgcCities,
  barangays: psgcBarangays,
  selectedRegion,
  selectedProvince,
  selectedCity,
  selectedBarangay,
  reset: resetPsgc,
  initialize: initPsgc,
} = usePsgc()

onMounted(() => {
  initPsgc()
})

// Sync PSGC selections with form state
watch(selectedRegion, (val) => {
  formData.value.region = val?.name ?? ''
})
watch(selectedProvince, (val) => {
  formData.value.province = val?.name ?? ''
})
watch(selectedCity, (val) => {
  formData.value.geographic = val?.name ?? ''
})
watch(selectedBarangay, (val) => {
  formData.value.barangay = val?.name ?? ''
})

const onRegionChange = (code: string) => {
  const region = psgcRegions.value.find((r: any) => r.code === code)
  if (region) selectedRegion.value = region
}

const onProvinceChange = (code: string) => {
  const province = psgcProvinces.value.find((p: any) => p.code === code)
  if (province) selectedProvince.value = province
}

const onCityChange = (code: string) => {
  const city = psgcCities.value.find((c: any) => c.code === code)
  if (city) selectedCity.value = city
}

const onBarangayChange = (code: string) => {
  const barangay = psgcBarangays.value.find((b: any) => b.code === code)
  if (barangay) selectedBarangay.value = barangay
}

const resetForm = () => {
  formData.value = {
    email: '',
    password: '',
    firstname: '',
    lastname: '',
    middlename: '',
    username: '',
    role: 'applicant',
    contact_number: '',
    gender: '',
    birthdate: '',
    region: '',
    province: '',
    geographic: '',
    barangay: '',
    is_pwd: false,
    is_4ps: false,
  }
  resetPsgc()
}

const handleOpenAddSheet = () => {
  resetForm()
  openAddAccountSheet()
}

const handleCreateAccount = async () => {
  if (!formData.value.email || !formData.value.password || !formData.value.firstname || !formData.value.lastname || !formData.value.username || !formData.value.role) {
    return
  }
  try {
    await createAccount(formData.value)
    resetForm()
  } catch {
    // Error is already set in store/composable
  }
}
</script>

<template>
  <DefineTemplate v-slot="{ profile }">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" class="h-8 w-8 p-0">
          <span class="sr-only">Open menu</span>
          <MoreHorizontal class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem @select="(e: Event) => { e.preventDefault(); openEditStatusModal(profile) }">
          Edit Status
        </DropdownMenuItem>
        <DropdownMenuItem @select="copyId(profile.id)">
          Copy Profile ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @select="(e: Event) => { e.preventDefault(); openProfileDetails(profile) }">
          <Eye class="mr-2 h-4 w-4" />
          View full details
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </DefineTemplate>

  <div class="w-full min-w-0 space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Account Management</h1>
        <p class="text-sm text-muted-foreground">
          View all user account details.
        </p>
      </div>
    </div>

    <!-- Filter & Column Visibility controls -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-4">
      <div class="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto flex-1 max-w-2xl">
        <Input
          class="w-full sm:max-w-xs"
          placeholder="Filter names..."
          :model-value="(table.getColumn('firstname')?.getFilterValue() as string) ?? ''"
          @update:model-value="table.getColumn('firstname')?.setFilterValue($event)"
        />

        <!-- Role Filter -->
        <Select
          :model-value="(table.getColumn('role')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('role')?.setFilterValue(val === 'all' ? undefined : val)"
        >
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="applicant">Applicant</SelectItem>
            <SelectItem value="company_owner">Company Owner</SelectItem>
            <SelectItem value="company_member">Company Member</SelectItem>
            <SelectItem value="provincial_peso">Provincial PESO</SelectItem>
            <SelectItem value="municipal_peso">Municipal PESO</SelectItem>
            <SelectItem value="dole">DOLE</SelectItem>
          </SelectContent>
        </Select>

        <!-- Status Filter -->
        <Select
          :model-value="(table.getColumn('status')?.getFilterValue() as string) ?? 'all'"
          @update:model-value="(val) => table.getColumn('status')?.setFilterValue(val === 'all' ? undefined : val)"
        >
          <SelectTrigger class="w-full sm:w-40">
            <SelectValue placeholder="Filter by Status" />
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
        <Button variant="outline" @click="fetchProfiles" :disabled="isLoading">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline ml-2">Refresh</span>
        </Button>
        <Button
          class="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          @click="handleOpenAddSheet"
        >
          <Plus class="h-4 w-4" />
          <span class="hidden sm:inline ml-2">Add new account</span>
        </Button>
      </div>
    </div>

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
                  <span>Loading profiles data...</span>
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
              No results.
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

    <!-- Details Modal -->
    <Dialog :open="isDetailsOpen" @update:open="isDetailsOpen = $event">
      <DialogContent class="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <User class="h-5 w-5 text-primary" />
            Profile Account Details
          </DialogTitle>
          <DialogDescription>
            Detailed view of account record in core.profiles
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedProfile" class="space-y-6 py-2">
          <!-- Overview Section -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/40 border">
            <div>
              <label class="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
              <p class="font-medium text-base">
                {{ selectedProfile.firstname || '-' }} {{ selectedProfile.middlename || '' }} {{ selectedProfile.lastname || '-' }}
              </p>
            </div>
            <div>
              <label class="text-xs font-semibold text-muted-foreground uppercase">Email Address</label>
              <p class="font-medium text-base font-mono">{{ selectedProfile.email || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-semibold text-muted-foreground uppercase">Username</label>
              <p class="font-medium text-base">@{{ selectedProfile.username || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-semibold text-muted-foreground uppercase">System Role</label>
              <div class="mt-1">
                <Badge
                  :variant="getRoleBadgeVariant(selectedProfile.role)"
                  :class="['capitalize', getRoleBadgeClass(selectedProfile.role)]"
                >
                  {{ formatRoleLabel(selectedProfile.role) }}
                </Badge>
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-muted-foreground uppercase">Account Status</label>
              <div class="mt-1">
                <Badge
                  :variant="getStatusBadgeVariant(selectedProfile.status)"
                  :class="['capitalize', getStatusBadgeClass(selectedProfile.status)]"
                >
                  {{ selectedProfile.status || 'N/A' }}
                </Badge>
              </div>
            </div>
          </div>

          <!-- Personal Information -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold border-b pb-1">Personal Details</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Birthdate:</span>
                <span class="ml-2 font-medium">{{ formatDate(selectedProfile.birthdate) }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Gender:</span>
                <span class="ml-2 font-medium capitalize">{{ selectedProfile.gender || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Contact Number:</span>
                <span class="ml-2 font-medium">{{ selectedProfile.contact_number || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Special Status:</span>
                <div class="inline-flex gap-2 ml-2">
                  <span v-if="selectedProfile.is_pwd" class="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">PWD</span>
                  <span v-if="selectedProfile.is_4ps" class="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">4Ps</span>
                  <span v-if="!selectedProfile.is_pwd && !selectedProfile.is_4ps" class="text-muted-foreground">None</span>
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
                <span class="ml-2 font-medium">{{ selectedProfile.region || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Province:</span>
                <span class="ml-2 font-medium">{{ selectedProfile.province || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">City/Municipality (Geographic):</span>
                <span class="ml-2 font-medium">{{ selectedProfile.geographic || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">Barangay:</span>
                <span class="ml-2 font-medium">{{ selectedProfile.barangay || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <!-- System Metadata -->
          <div class="space-y-3">
            <h3 class="text-sm font-semibold border-b pb-1">System Audit Information</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-muted-foreground">Profile ID:</span>
                <p class="font-mono text-xs break-all bg-muted p-1 rounded mt-1">{{ selectedProfile.id }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Last Login:</span>
                <p class="font-medium mt-1">{{ formatDateTime(selectedProfile.last_login) }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Created At:</span>
                <p class="font-medium mt-1">{{ formatDateTime(selectedProfile.created_at) }}</p>
              </div>
              <div>
                <span class="text-muted-foreground">Updated At:</span>
                <p class="font-medium mt-1">{{ formatDateTime(selectedProfile.updated_at) }}</p>
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
            Update the system account status for this user.
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="handleUpdateStatus" class="space-y-4 py-2">
          <div v-if="selectedProfile" class="space-y-4">
            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">Full Name</Label>
              <p class="font-medium text-base mt-0.5">
                {{ selectedProfile.firstname || '-' }} {{ selectedProfile.middlename || '' }} {{ selectedProfile.lastname || '-' }}
              </p>
            </div>

            <div>
              <Label class="text-xs font-semibold text-muted-foreground uppercase">Current Status</Label>
              <div class="mt-1">
                <Badge
                  :variant="getStatusBadgeVariant(selectedProfile.status)"
                  :class="['capitalize', getStatusBadgeClass(selectedProfile.status)]"
                >
                  {{ selectedProfile.status || 'N/A' }}
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

    <!-- Add New Account Side Sheet -->
    <Sheet :open="isAddAccountOpen" @update:open="isAddAccountOpen = $event">
      <SheetContent class="sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader class="px-6 pt-6 pb-2 shrink-0">
          <SheetTitle class="flex items-center gap-2">
            Add New Account
          </SheetTitle>
          <SheetDescription>
            Fill out the information below to create a new profile account record.
          </SheetDescription>
        </SheetHeader>

        <form @submit.prevent="handleCreateAccount" class="contents">
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <!-- Account Credentials -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="add-email">Email Address <span class="text-destructive">*</span></Label>
                <Input id="add-email" type="email" v-model="formData.email" placeholder="user@example.com" required />
              </div>
              <div class="space-y-2">
                <Label for="add-password">Password <span class="text-destructive">*</span></Label>
                <Input id="add-password" type="password" v-model="formData.password" placeholder="••••••••" required />
              </div>
            </div>

            <!-- Names Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="add-firstname">First Name <span class="text-destructive">*</span></Label>
                <Input id="add-firstname" v-model="formData.firstname" placeholder="First name" required />
              </div>
              <div class="space-y-2">
                <Label for="add-lastname">Last Name <span class="text-destructive">*</span></Label>
                <Input id="add-lastname" v-model="formData.lastname" placeholder="Last name" required />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="add-middlename">Middle Name</Label>
                <Input id="add-middlename" v-model="formData.middlename" placeholder="Middle name" />
              </div>
              <div class="space-y-2">
                <Label for="add-username">Username <span class="text-destructive">*</span></Label>
                <Input id="add-username" v-model="formData.username" placeholder="Username" required />
              </div>
            </div>

            <!-- Role & Contact -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="add-role">System Role <span class="text-destructive">*</span></Label>
                <Select v-model="formData.role">
                  <SelectTrigger id="add-role" class="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applicant">Applicant</SelectItem>
                    <SelectItem value="company_owner">Company Owner</SelectItem>
                    <SelectItem value="company_member">Company Member</SelectItem>
                    <SelectItem value="municipal_peso">Municipal PESO</SelectItem>
                    <SelectItem value="provincial_peso">Provincial PESO</SelectItem>
                    <SelectItem value="dole">DOLE</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="add-contact">Contact Number</Label>
                <Input id="add-contact" v-model="formData.contact_number" placeholder="09xxxxxxxxx" />
              </div>
            </div>

            <!-- Gender & Birthdate -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="add-gender">Gender</Label>
                <Select v-model="formData.gender">
                  <SelectTrigger id="add-gender" class="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="woman">Woman</SelectItem>
                    <SelectItem value="man">Man</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    <SelectItem value="different_identity">Different identity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label for="add-birthdate">Birthdate</Label>
                <Input id="add-birthdate" type="date" v-model="formData.birthdate" />
              </div>
            </div>

            <!-- Location Section -->
            <div class="space-y-3 pt-1">
              <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location / Address</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="add-region">Region</Label>
                  <Select :model-value="selectedRegion?.code ? String(selectedRegion.code) : undefined" @update:model-value="(val) => onRegionChange(String(val))">
                    <SelectTrigger id="add-region" class="w-full">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="r in psgcRegions" :key="r.code" :value="String(r.code)">
                        {{ r.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <Label for="add-province">Province</Label>
                  <Select :model-value="selectedProvince?.code ? String(selectedProvince.code) : undefined" @update:model-value="(val) => onProvinceChange(String(val))" :disabled="!selectedRegion">
                    <SelectTrigger id="add-province" class="w-full">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="p in psgcProvinces" :key="p.code" :value="String(p.code)">
                        {{ p.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <Label for="add-geographic">City / Municipality</Label>
                  <Select :model-value="selectedCity?.code ? String(selectedCity.code) : undefined" @update:model-value="(val) => onCityChange(String(val))" :disabled="!selectedProvince">
                    <SelectTrigger id="add-geographic" class="w-full">
                      <SelectValue placeholder="Select city/municipality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="c in psgcCities" :key="c.code" :value="String(c.code)">
                        {{ c.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-2">
                  <Label for="add-barangay">Barangay</Label>
                  <Select :model-value="selectedBarangay?.code ? String(selectedBarangay.code) : undefined" @update:model-value="(val) => onBarangayChange(String(val))" :disabled="!selectedCity">
                    <SelectTrigger id="add-barangay" class="w-full">
                      <SelectValue placeholder="Select barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="b in psgcBarangays" :key="b.code" :value="String(b.code)">
                        {{ b.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <!-- Special Category -->
            <div class="space-y-3 pt-1">
              <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Category</p>
              <div class="flex flex-wrap items-center gap-4 sm:gap-6">
                <div class="flex items-center space-x-2">
                  <Checkbox id="add-is_pwd" :checked="formData.is_pwd" @update:checked="formData.is_pwd = !!$event" />
                  <Label for="add-is_pwd" class="text-sm font-normal cursor-pointer">Person with Disability (PWD)</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <Checkbox id="add-is_4ps" :checked="formData.is_4ps" @update:checked="formData.is_4ps = !!$event" />
                  <Label for="add-is_4ps" class="text-sm font-normal cursor-pointer">4Ps Beneficiary</Label>
                </div>
              </div>
            </div>
          </div>

          <!-- Sticky Footer -->
          <div class="flex justify-end gap-3 border-t border-border px-6 py-4 bg-transparent shrink-0">
            <Button type="button" variant="outline" @click="closeAddAccountSheet" :disabled="isSubmitting">
              Cancel
            </Button>
            <Button
              type="submit"
              class="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
              :disabled="isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              {{ isSubmitting ? 'Creating...' : 'Create Account' }}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  </div>
</template>