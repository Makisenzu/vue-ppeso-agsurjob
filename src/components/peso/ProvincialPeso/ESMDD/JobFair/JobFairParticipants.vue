<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Building2, CalendarDays, ExternalLink, Loader2, MapPin, Plus, RefreshCw } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useJobFairParticipants } from '@/composables/peso/provincialPeso/useJobFairParticipants'
import { useJobFairParticipantForm } from '@/composables/peso/provincialPeso/useJobFairParticipantForm'
import JobFairMapPreview from '@/components/peso/ProvincialPeso/ESMDD/JobFair/JobFairMapPreview.vue'

const {
  table,
  columns,
  jobFair,
  participants,
  isLoading,
  errorMessage,
  isDeleting,
  participantToDelete,
  isDeleteDialogOpen,
  jobFairSchedule,
  jobFairStatusClass,
  hasMapLocation,
  totalVacancies,
  categoryOptions,
  refreshParticipants,
  openCreateDialog,
  confirmDelete,
} = useJobFairParticipants()

const {
  isFormDialogOpen,
  isSubmitting,
  isEditMode,
  isPublicEmployer,
  onFormDialogOpenChange,
  submitParticipant,
  publicTypeOptions,
  privateTypeOptions,
  workforceOptions,
  statusOptions,
} = useJobFairParticipantForm()

const textFields = {
  company: [
    { name: 'tradeName', label: 'Trade Name', placeholder: 'Brand or trade name' },
    { name: 'acronym', label: 'Acronym', placeholder: 'e.g. ABC' },
    { name: 'industryLine', label: 'Line of Industry', placeholder: 'e.g. Manufacturing' },
    { name: 'tin', label: 'TIN', placeholder: '000-000-000-000' },
    { name: 'ownerPresidentName', label: 'Owner / President', placeholder: 'Full name' },
  ],
  contact: [
    { name: 'contactPersonName', label: 'Contact Person', placeholder: 'Full name' },
    { name: 'contactPersonPosition', label: 'Position', placeholder: 'e.g. HR Officer' },
    { name: 'emailAddress', label: 'Email Address', placeholder: 'name@company.com', type: 'email' },
    { name: 'mobileNumber', label: 'Mobile Number', placeholder: '09XX XXX XXXX', type: 'tel' },
    { name: 'telephoneNumber', label: 'Telephone Number', placeholder: '(085) 000-0000', type: 'tel' },
    { name: 'faxNumber', label: 'Fax Number', placeholder: 'Optional', type: 'tel' },
  ],
  address: [
    { name: 'street', label: 'Street', placeholder: 'House no., street' },
    { name: 'barangay', label: 'Barangay', placeholder: 'Barangay' },
    { name: 'cityMunicipality', label: 'City / Municipality', placeholder: 'e.g. Prosperidad' },
    { name: 'province', label: 'Province', placeholder: 'e.g. Agusan del Sur' },
  ],
} as const
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <Button variant="ghost" size="sm" class="-ml-2" as-child>
      <RouterLink :to="{ name: 'provincial-peso-job-fair' }">
        <ArrowLeft class="size-4" />
        Back to Job Fairs
      </RouterLink>
    </Button>

    <!-- Job Fair Overview -->
    <Card v-if="isLoading && !jobFair">
      <CardContent class="space-y-3">
        <Skeleton class="h-7 w-2/3" />
        <Skeleton class="h-4 w-1/2" />
        <Skeleton class="h-4 w-1/3" />
      </CardContent>
    </Card>

    <Card v-else-if="jobFair">
      <CardContent class="grid gap-6" :class="{ 'lg:grid-cols-[1fr_minmax(0,22rem)]': hasMapLocation }">
        <div class="min-w-0 space-y-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ jobFair.title }}</h1>
              <Badge variant="outline" :class="jobFairStatusClass">{{ jobFair.status }}</Badge>
            </div>
            <p v-if="jobFair.description" class="text-sm text-muted-foreground">{{ jobFair.description }}</p>
          </div>

          <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div class="flex items-start gap-2">
              <CalendarDays class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt class="text-xs text-muted-foreground">Schedule</dt>
                <dd class="font-medium">{{ jobFairSchedule }}</dd>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0">
                <dt class="text-xs text-muted-foreground">Venue</dt>
                <dd class="font-medium">{{ jobFair.location }}</dd>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <Building2 class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt class="text-xs text-muted-foreground">Participants / Vacancies</dt>
                <dd class="font-medium tabular-nums">{{ participants.length }} employers · {{ totalVacancies }} vacancies</dd>
              </div>
            </div>
            <div v-if="jobFair.registration_link" class="flex items-start gap-2">
              <ExternalLink class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0">
                <dt class="text-xs text-muted-foreground">Registration</dt>
                <dd>
                  <a
                    :href="jobFair.registration_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-medium text-primary hover:underline"
                  >
                    Open registration link
                  </a>
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <JobFairMapPreview
          v-if="hasMapLocation"
          class="h-56 lg:h-full"
          :latitude="jobFair.latitude as number"
          :longitude="jobFair.longitude as number"
          :label="jobFair.location"
        />
      </CardContent>
    </Card>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <template v-if="jobFair">
      <!-- Section Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">Participants</h2>
          <p class="text-sm text-muted-foreground">Employers taking part in this job fair.</p>
        </div>
        <Button @click="openCreateDialog">
          <Plus class="size-4" />
          Add Participant
        </Button>
      </div>

      <!-- Empty State -->
      <Empty v-if="!isLoading && participants.length === 0" class="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>No participants yet</EmptyTitle>
          <EmptyDescription>Add the employers joining this job fair to track their vacancies.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button @click="openCreateDialog">
            <Plus class="size-4" />
            Add Participant
          </Button>
        </EmptyContent>
      </Empty>

      <template v-else>
        <!-- Toolbar -->
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Input
              class="w-full sm:max-w-xs"
              placeholder="Search participants..."
              :model-value="(table.getColumn('business_name')?.getFilterValue() as string) ?? ''"
              @update:model-value="table.getColumn('business_name')?.setFilterValue($event)"
            />
            <Select
              :model-value="(table.getColumn('employer_category')?.getFilterValue() as string) ?? 'all'"
              @update:model-value="(val) => table.getColumn('employer_category')?.setFilterValue(val === 'all' ? undefined : val)"
            >
              <SelectTrigger class="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem v-for="category in categoryOptions" :key="category" :value="category">
                  {{ category }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" :disabled="isLoading" @click="refreshParticipants">
            <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
            <span class="hidden sm:inline">Refresh</span>
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
              <template v-if="isLoading && participants.length === 0">
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
                  No participants match the current filters.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
            {{ table.getFilteredRowModel().rows.length }} participant(s)
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
    </template>

    <!-- Add / Edit Participant -->
    <Dialog :open="isFormDialogOpen" @update:open="onFormDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form class="grid gap-5" @submit="submitParticipant">
          <DialogHeader>
            <DialogTitle>{{ isEditMode ? 'Edit Participant' : 'Add Participant' }}</DialogTitle>
            <DialogDescription>
              {{ isEditMode ? 'Update the employer details for this job fair.' : 'Register an employer participating in this job fair.' }}
            </DialogDescription>
          </DialogHeader>

          <!-- Employer -->
          <section class="grid gap-4">
            <h3 class="text-sm font-semibold">Employer Information</h3>

            <FormField v-slot="{ componentField }" name="businessName">
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="Registered business name" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div class="grid gap-4 sm:grid-cols-2">
              <FormField v-slot="{ componentField }" name="employerCategory">
                <FormItem>
                  <FormLabel>Employer Category</FormLabel>
                  <Select v-bind="componentField" :disabled="isSubmitting">
                    <FormControl>
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem v-for="option in categoryOptions" :key="option" :value="option">{{ option }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-if="isPublicEmployer" v-slot="{ componentField }" name="publicEmployerType">
                <FormItem>
                  <FormLabel>Public Employer Type</FormLabel>
                  <Select v-bind="componentField" :disabled="isSubmitting">
                    <FormControl>
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem v-for="option in publicTypeOptions" :key="option" :value="option">{{ option }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-else v-slot="{ componentField }" name="privateEmployerType">
                <FormItem>
                  <FormLabel>Private Employer Type</FormLabel>
                  <Select v-bind="componentField" :disabled="isSubmitting">
                    <FormControl>
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem v-for="option in privateTypeOptions" :key="option" :value="option">{{ option }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-for="field in textFields.company" :key="field.name" v-slot="{ componentField }" :name="field.name">
                <FormItem>
                  <FormLabel>{{ field.label }}</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" :placeholder="field.placeholder" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="totalWorkforce">
                <FormItem>
                  <FormLabel>Total Workforce</FormLabel>
                  <Select v-bind="componentField" :disabled="isSubmitting">
                    <FormControl>
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem v-for="option in workforceOptions" :key="option" :value="option">{{ option }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>
          </section>

          <Separator />

          <!-- Contact -->
          <section class="grid gap-4">
            <h3 class="text-sm font-semibold">Contact Details</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField v-for="field in textFields.contact" :key="field.name" v-slot="{ componentField }" :name="field.name">
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

          <!-- Address -->
          <section class="grid gap-4">
            <h3 class="text-sm font-semibold">Office Address</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField v-for="field in textFields.address" :key="field.name" v-slot="{ componentField }" :name="field.name">
                <FormItem>
                  <FormLabel>{{ field.label }}</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" :placeholder="field.placeholder" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <FormField v-slot="{ value, handleChange }" name="isMainOffice">
              <FormItem class="flex flex-row items-center justify-between gap-4 rounded-md border p-3">
                <div class="space-y-0.5">
                  <FormLabel>Main Office</FormLabel>
                  <FormDescription>Turn off if this address is a branch office.</FormDescription>
                </div>
                <FormControl>
                  <Switch :model-value="value" :disabled="isSubmitting" @update:model-value="handleChange" />
                </FormControl>
              </FormItem>
            </FormField>
          </section>

          <Separator />

          <FormField v-slot="{ componentField }" name="status">
            <FormItem>
              <FormLabel>Participation Status</FormLabel>
              <Select v-bind="componentField" :disabled="isSubmitting">
                <FormControl>
                  <SelectTrigger class="w-full sm:w-60">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem v-for="option in statusOptions" :key="option" :value="option">{{ option }}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" :disabled="isSubmitting" @click="onFormDialogOpenChange(false)">
              Cancel
            </Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
              {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Participant' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete participant?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong class="font-medium text-foreground">{{ participantToDelete?.business_name }}</strong> will be
            permanently removed from this job fair.
            <template v-if="(participantToDelete?.job_vacancies?.[0]?.count ?? 0) > 0">
              Its {{ participantToDelete?.job_vacancies?.[0]?.count }} vacancy record(s) for this job fair will also be deleted.
            </template>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
            <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
            {{ isDeleting ? 'Deleting...' : 'Delete Participant' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
