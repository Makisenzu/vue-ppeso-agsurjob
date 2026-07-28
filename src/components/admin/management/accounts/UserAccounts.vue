<script setup lang="ts">
import {
  FlexRender,
} from '@tanstack/vue-table'
import { createReusableTemplate } from '@vueuse/core'
import { ChevronDown, MoreHorizontal, Eye, RefreshCw, User, Plus } from '@lucide/vue'

import { useUserAccounts } from '@/composables/admin/useUserAccounts'
import {
  formatDate,
  formatDateTime,
  getRoleBadgeVariant,
  getStatusBadgeVariant,
  getStatusBadgeClass,
  formatRoleLabel,
} from '@/helpers/admin/userAccountsHelper'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

// Reusable action dropdown template
const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{
  profile: any
  onExpand: () => void
}>()

const {
  table,
  columns,
  isLoading,
  errorMessage,
  selectedProfile,
  isDetailsOpen,
  fetchProfiles,
  openProfileDetails,
  copyId,
} = useUserAccounts(ReuseTemplate)
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
        <DropdownMenuItem>
          Edit Profile
        </DropdownMenuItem>
        <DropdownMenuItem @click="copyId(profile.id)">
          Copy Profile ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem @click="openProfileDetails(profile)">
          <Eye class="mr-2 h-4 w-4" />
          View full details
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </DefineTemplate>

  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Account Management</h1>
        <p class="text-sm text-muted-foreground">
          View all user account details.
        </p>
      </div>
    </div>

    <!-- Filter & Column Visibility controls -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-4">
      <Input
        class="max-w-sm"
        placeholder="Filter names..."
        :model-value="(table.getColumn('firstname')?.getFilterValue() as string) ?? ''"
        @update:model-value="table.getColumn('firstname')?.setFilterValue($event)"
      />
      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              Columns <ChevronDown class="ml-2 h-4 w-4" />
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
          <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </Button>
        <Button class="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700">
          <Plus class="mr-2 h-4 w-4" />
          Add new account
        </Button>
      </div>
    </div>

    <div v-if="errorMessage" class="p-4 text-center text-destructive rounded border border-destructive/20 bg-destructive/10">
      {{ errorMessage }}
    </div>

    <!-- Data Table -->
    <div class="rounded-md border">
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
    <div class="flex items-center justify-end space-x-2 py-4">
      <div class="flex-1 text-sm text-muted-foreground">
        {{ table.getFilteredSelectedRowModel().rows.length }} of
        {{ table.getFilteredRowModel().rows.length }} row(s) selected.
      </div>
      <div class="space-x-2">
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
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <label class="text-xs font-semibold text-muted-foreground uppercase">Username</label>
              <p class="font-medium text-base">@{{ selectedProfile.username || 'N/A' }}</p>
            </div>
            <div>
              <label class="text-xs font-semibold text-muted-foreground uppercase">System Role</label>
              <div class="mt-1">
                <Badge :variant="getRoleBadgeVariant(selectedProfile.role)">
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
  </div>
</template>