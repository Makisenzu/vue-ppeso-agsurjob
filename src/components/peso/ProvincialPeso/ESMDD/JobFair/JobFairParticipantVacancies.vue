<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { ArrowLeft, Briefcase, Building2, Loader2, Mail, MapPin, Phone, Plus, RefreshCw, UserRound } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import SearchSelect from '@/components/SearchSelect.vue'
import { useParticipantVacancies } from '@/composables/peso/provincialPeso/useParticipantVacancies'
import { useJobVacancyForm } from '@/composables/peso/provincialPeso/useJobVacancyForm'

const {
  table,
  columns,
  jobFair,
  jobFairId,
  participant,
  participantAddress,
  participantStatusClass,
  vacancies,
  totalOpenings,
  isLoading,
  errorMessage,
  natureOfWorkOptions,
  isDeleting,
  vacancyToDelete,
  isDeleteDialogOpen,
  refreshVacancies,
  openCreateVacancyDialog,
  confirmDelete,
  getRowSwipeActions,
  getRowCard,
} = useParticipantVacancies()

const {
  isVacancyFormOpen,
  isSubmitting,
  isEditMode,
  acceptsPwd,
  hasOtherDisability,
  formValues,
  onVacancyDialogOpenChange,
  toggleDisability,
  submitVacancy,
  disabilityOptions,
  statusOptions,
} = useJobVacancyForm()

const qualificationFields = [
  { name: 'educationalLevel', label: 'Educational Level', placeholder: 'e.g. College Graduate' },
  { name: 'courseShsStrand', label: 'Course / SHS Strand', placeholder: 'e.g. BS Accountancy' },
  { name: 'eligibility', label: 'Eligibility', placeholder: 'e.g. CSC Professional' },
  { name: 'license', label: 'License', placeholder: 'e.g. Professional Driver’s License' },
  { name: 'certification', label: 'Certification', placeholder: 'e.g. TESDA NC II' },
] as const
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <Button variant="ghost" size="sm" class="-ml-2" as-child>
      <AppLink :to="{ name: 'provincial-peso-job-fair-participants', params: { jobFairId } }">
        <ArrowLeft class="size-4" />
        Back to {{ jobFair?.title ?? 'Employers' }}
      </AppLink>
    </Button>

    <!-- Participant Overview -->
    <Card v-if="isLoading && !participant">
      <CardContent class="space-y-3">
        <Skeleton class="h-7 w-2/3" />
        <Skeleton class="h-4 w-1/2" />
        <Skeleton class="h-4 w-1/3" />
      </CardContent>
    </Card>

    <Card v-else-if="participant">
      <CardContent class="space-y-4">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ participant.business_name }}</h1>
            <Badge v-if="participant.status" variant="outline" :class="participantStatusClass">
              {{ participant.status }}
            </Badge>
          </div>
          <p class="text-sm text-muted-foreground">
            {{ [participant.trade_name, participant.industry_line].filter(Boolean).join(' · ') || 'Job fair employer' }}
            <template v-if="jobFair"> — {{ jobFair.title }}</template>
          </p>
        </div>

        <dl class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div class="flex items-start gap-2">
            <Building2 class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt class="text-xs text-muted-foreground">Category</dt>
              <dd class="font-medium">
                {{ participant.employer_category }}
                <span v-if="participant.public_employer_type ?? participant.private_employer_type" class="font-normal text-muted-foreground">
                  · {{ participant.public_employer_type ?? participant.private_employer_type }}
                </span>
              </dd>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <UserRound class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <dt class="text-xs text-muted-foreground">Contact Person</dt>
              <dd class="font-medium">
                {{ participant.contact_person_name || '—' }}
                <span v-if="participant.contact_person_position" class="font-normal text-muted-foreground">
                  · {{ participant.contact_person_position }}
                </span>
              </dd>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <Phone class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div class="min-w-0">
              <dt class="text-xs text-muted-foreground">Contact</dt>
              <dd class="font-medium">{{ participant.mobile_number || participant.telephone_number || '—' }}</dd>
              <dd v-if="participant.email_address" class="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Mail class="size-3 shrink-0" />{{ participant.email_address }}
              </dd>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div class="min-w-0">
              <dt class="text-xs text-muted-foreground">
                {{ participant.is_main_office === false ? 'Branch Office' : 'Main Office' }}
              </dt>
              <dd class="font-medium">{{ participantAddress }}</dd>
            </div>
          </div>
        </dl>
      </CardContent>
    </Card>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <template v-if="participant">
      <!-- Section Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold tracking-tight">Vacancies</h2>
          <p class="text-sm text-muted-foreground">
            {{ vacancies.length }} position(s) · {{ totalOpenings }} total opening(s) for this job fair.
          </p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" :disabled="isLoading" @click="refreshVacancies">
            <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
            <span class="hidden sm:inline">Refresh</span>
          </Button>
          <Button @click="openCreateVacancyDialog">
            <Plus class="size-4" />
            Add Vacancy
          </Button>
        </div>
      </div>

      <!-- Empty State -->
      <Empty v-if="!isLoading && vacancies.length === 0" class="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Briefcase />
          </EmptyMedia>
          <EmptyTitle>No vacancies yet</EmptyTitle>
          <EmptyDescription>This participant has not posted any vacancies for this job fair.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button @click="openCreateVacancyDialog">
            <Plus class="size-4" />
            Add Vacancy
          </Button>
        </EmptyContent>
      </Empty>

      <template v-else>
        <!-- Toolbar -->
        <div class="flex w-full flex-col gap-2 sm:flex-row">
          <Input
            class="w-full sm:max-w-xs"
            placeholder="Search positions..."
            :model-value="(table.getColumn('position_title')?.getFilterValue() as string) ?? ''"
            @update:model-value="table.getColumn('position_title')?.setFilterValue($event)"
          />
          <SearchSelect
            :model-value="(table.getColumn('nature_of_work')?.getFilterValue() as string) ?? 'all'"
            @update:model-value="(val) => table.getColumn('nature_of_work')?.setFilterValue(val === 'all' ? undefined : val)"
            :options="[{ value: 'all', label: 'All Types of Work' }, ...natureOfWorkOptions]"
            placeholder="Nature of work"
            class="w-full sm:w-56"
          />
        </div>

        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="md:hidden"
          :items="table.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getRowCard(row.original)"
          :actions="(row) => getRowSwipeActions(row.original)"
          :loading="isLoading && vacancies.length === 0"
        >
          <template #empty>
            <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No vacancies match the current filters.</p>
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
              <template v-if="isLoading && vacancies.length === 0">
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
                  No vacancies match the current filters.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination -->
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
            {{ table.getFilteredRowModel().rows.length }} vacancy(ies)
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

    <!-- Add / Edit Vacancy -->
    <Dialog :open="isVacancyFormOpen" @update:open="onVacancyDialogOpenChange">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form class="grid gap-5" @submit="submitVacancy">
          <DialogHeader>
            <DialogTitle>{{ isEditMode ? 'Edit Vacancy' : 'Add Vacancy' }}</DialogTitle>
            <DialogDescription>
              {{ isEditMode ? 'Update this job fair vacancy.' : 'Post a vacancy offered by this participant at the job fair.' }}
            </DialogDescription>
          </DialogHeader>

          <!-- Position -->
          <section class="grid gap-4">
            <h3 class="text-sm font-semibold">Position</h3>

            <FormField v-slot="{ componentField }" name="positionTitle">
              <FormItem>
                <FormLabel>Position Title</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="e.g. Production Operator" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div class="grid gap-4 sm:grid-cols-2">
              <FormField v-slot="{ componentField }" name="natureOfWork">
                <FormItem>
                  <FormLabel>Nature of Work</FormLabel>
                  <FormControl>
                    <SearchSelect
                      v-bind="componentField"
                      :disabled="isSubmitting"
                      :options="natureOfWorkOptions"
                      placeholder="Select nature of work"
                      class="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="vacancyCount">
                <FormItem>
                  <FormLabel>Number of Openings</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="number" min="1" step="1" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="salary">
                <FormItem>
                  <FormLabel>Salary</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="e.g. ₱15,000 – ₱18,000 / month" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="placeOfWork">
                <FormItem>
                  <FormLabel>Place of Work</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="e.g. San Francisco, Agusan del Sur" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <FormField v-slot="{ componentField }" name="jobDescription">
              <FormItem>
                <FormLabel>Job Description</FormLabel>
                <FormControl>
                  <Textarea v-bind="componentField" rows="3" placeholder="Duties and responsibilities" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </section>

          <Separator />

          <!-- Qualifications -->
          <section class="grid gap-4">
            <h3 class="text-sm font-semibold">Qualifications</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <FormField v-for="field in qualificationFields" :key="field.name" v-slot="{ componentField }" :name="field.name">
                <FormItem>
                  <FormLabel>{{ field.label }}</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" :placeholder="field.placeholder" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="workExperienceMonths">
                <FormItem>
                  <FormLabel>Work Experience (months)</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="number" min="0" step="1" :disabled="isSubmitting" />
                  </FormControl>
                  <FormDescription>Use 0 if no experience is required.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <FormField v-slot="{ componentField }" name="languages">
              <FormItem>
                <FormLabel>Languages / Dialects Spoken</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="e.g. English, Filipino, Cebuano" :disabled="isSubmitting" />
                </FormControl>
                <FormDescription>Separate multiple entries with commas.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="otherQualifications">
              <FormItem>
                <FormLabel>Other Qualifications</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="e.g. Physically fit, Can work on shifts" :disabled="isSubmitting" />
                </FormControl>
                <FormDescription>Separate multiple entries with commas.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>
          </section>

          <Separator />

          <!-- Inclusivity -->
          <section class="grid gap-4">
            <h3 class="text-sm font-semibold">Inclusivity</h3>

            <FormField v-slot="{ value, handleChange }" name="acceptsReturningOfw">
              <FormItem class="flex flex-row items-center justify-between gap-4 rounded-md border p-3">
                <div class="space-y-0.5">
                  <FormLabel>Open to Returning OFWs</FormLabel>
                  <FormDescription>Overseas Filipino workers who have returned home.</FormDescription>
                </div>
                <FormControl>
                  <Switch :model-value="value" :disabled="isSubmitting" @update:model-value="handleChange" />
                </FormControl>
              </FormItem>
            </FormField>

            <FormField v-slot="{ value, handleChange }" name="acceptsPwd">
              <FormItem class="flex flex-row items-center justify-between gap-4 rounded-md border p-3">
                <div class="space-y-0.5">
                  <FormLabel>Open to Persons with Disability</FormLabel>
                  <FormDescription>Specify which disabilities can be accommodated.</FormDescription>
                </div>
                <FormControl>
                  <Switch :model-value="value" :disabled="isSubmitting" @update:model-value="handleChange" />
                </FormControl>
              </FormItem>
            </FormField>

            <div v-if="acceptsPwd" class="grid gap-3 rounded-md border border-dashed p-3">
              <p class="text-sm font-medium">Disabilities Accommodated</p>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div v-for="option in disabilityOptions" :key="option" class="flex items-center gap-2">
                  <Checkbox
                    :id="`pwd-${option}`"
                    :model-value="formValues.pwdDisabilities?.includes(option) ?? false"
                    :disabled="isSubmitting"
                    @update:model-value="(checked) => toggleDisability(option, checked === true)"
                  />
                  <Label :for="`pwd-${option}`" class="font-normal">{{ option }}</Label>
                </div>
              </div>

              <FormField v-if="hasOtherDisability" v-slot="{ componentField }" name="pwdOtherDisability">
                <FormItem>
                  <FormLabel>Other Disability</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Please specify" :disabled="isSubmitting" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>
          </section>

          <Separator />

          <!-- Posting -->
          <section class="grid gap-4 sm:grid-cols-3">
            <FormField v-slot="{ componentField }" name="postingDate">
              <FormItem>
                <FormLabel>Posting Date</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="validUntil">
              <FormItem>
                <FormLabel>Valid Until</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
                </FormControl>
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
                    class="w-full capitalize"
                    content-class="capitalize"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" :disabled="isSubmitting" @click="onVacancyDialogOpenChange(false)">
              Cancel
            </Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
              {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Vacancy' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete vacancy?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong class="font-medium text-foreground">{{ vacancyToDelete?.position_title }}</strong> will be permanently
            removed from this participant's job fair vacancies. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
            <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
            {{ isDeleting ? 'Deleting...' : 'Delete Vacancy' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
