<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { RouterLink } from 'vue-router'
import { AlertTriangle, GraduationCap, Loader2, Plus, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useSpesBeneficiaries } from '@/composables/peso/provincialPeso/useSpesBeneficiaries'
import { useSpesAppointmentForm } from '@/composables/peso/provincialPeso/useSpesAppointmentForm'
import SpesCompletionReportList from '@/components/SpesCompletionReportList.vue'
import SpesRandomizerDialog from '@/components/peso/ProvincialPeso/ESMDD/SPES/SpesRandomizerDialog.vue'
import {
  formatSpesDate,
  formatSpesFormName,
  getSpesStatusBadgeClass,
} from '@/helpers/peso/provincialPeso/spesHelper'
import { formatSpesAssignment } from '@/helpers/common/spesFormHelper'

const {
  table,
  columns,
  yearAppointments,
  selectedYear,
  availableYears,
  summary,
  isLoading,
  errorMessage,
  isDeleting,
  appointmentToDelete,
  isDeleteDialogOpen,
  historyBeneficiary,
  historyAppointments,
  isHistoryDialogOpen,
  canReappointHistoryBeneficiary,
  statusOptions,
  reportsAppointment,
  openReports,
  busyReportType,
  isLoadingReports: isLoadingBeneficiaryReports,
  isReportsDialogOpen,
  onReportPicked,
  onReportRemoved,
  refreshBeneficiaries,
  onYearChange,
  showNeedsDecision,
  reappointFromHistory,
  openAppointDialog,
  openDrawDialog,
  confirmDelete,
} = useSpesBeneficiaries()
const {
  isAppointmentFormOpen,
  isSubmitting,
  isEditMode,
  concludingAppointment,
  applicantOptions,
  beneficiaryOptions,
  fixedAppointeeName,
  appointmentSchema,
  appointmentInitialValues,
  appointmentFormKey,
  concludeSchema,
  concludeInitialValues,
  concludeFormKey,
  concludeOptions,
  canMarkCompleted,
  concludeReportCount,
  totalReports,
  isLoadingReports,
  openConcludeReports,
  provinces,
  municipalities,
  barangays,
  isLoadingProvinces,
  isLoadingMunicipalities,
  isLoadingBarangays,
  locationError,
  retryLoadLocation,
  homeLocationNote,
  isLoadingHomeLocation,
  onAppointeeChange,
  onProvinceChange,
  onMunicipalityChange,
  durationChoices,
  fillEndDate,
  countSpesCalendarDays,
  onAppointmentOpenChange,
  onConcludeOpenChange,
  submitAppointment,
  submitConclusion,
} = useSpesAppointmentForm()
</script>

<template>
  <div class="w-full min-w-0 space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-2xl space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Special Program for Employment of Students</h1>
        <p class="text-sm text-muted-foreground">
          Draw applicants per municipality, appoint them for 10 or 20 days, then collect their DTR and accomplishment
          report to complete SPES.
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select :model-value="String(selectedYear)" @update:model-value="onYearChange">
          <SelectTrigger class="w-full sm:w-36" aria-label="SPES year">
            <SelectValue placeholder="SPES year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="year in availableYears" :key="year" :value="String(year)">
              SPES {{ year }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" as-child>
          <RouterLink :to="{ name: 'provincial-peso-spes-applicants' }">View Applicants</RouterLink>
        </Button>
        <Button variant="outline" @click="openDrawDialog">Draw Applicants</Button>
        <Button @click="openAppointDialog">
          <Plus class="size-4 shrink-0" />
          Appoint
        </Button>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Applicants</CardDescription>
          <CardTitle class="text-3xl font-semibold tabular-nums">{{ summary.applicants }}</CardTitle>
          <p class="text-xs text-muted-foreground">{{ summary.pendingApplicants }} pending review</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Appointed · SPES {{ selectedYear }}</CardDescription>
          <CardTitle class="text-3xl font-semibold tabular-nums">{{ summary.appointed }}</CardTitle>
          <p class="text-xs text-muted-foreground">{{ summary.returning }} returning</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Active</CardDescription>
          <CardTitle class="text-3xl font-semibold tabular-nums">{{ summary.active }}</CardTitle>
          <p class="text-xs text-muted-foreground">{{ summary.expiringSoon }} ending within 7 days</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Completed</CardDescription>
          <CardTitle class="text-3xl font-semibold tabular-nums">{{ summary.completed }}</CardTitle>
          <p class="text-xs text-muted-foreground">of {{ summary.appointed }} appointed</p>
        </CardHeader>
        <CardContent>
          <Progress
            :model-value="summary.appointed ? Math.round((summary.completed / summary.appointed) * 100) : 0"
            class="h-1.5"
            aria-label="Completion progress"
          />
        </CardContent>
      </Card>
    </div>

    <!-- Appointments needing a decision -->
    <Alert
      v-if="summary.expired + summary.expiringSoon > 0"
      class="border-warning/40 bg-warning/10 *:[svg]:text-warning"
    >
      <AlertTriangle />
      <AlertTitle>
        {{ summary.expired + summary.expiringSoon }} SPES {{ selectedYear }} appointment{{
          summary.expired + summary.expiringSoon > 1 ? 's' : ''
        }}
        pending Provincial PESO decision
      </AlertTitle>
      <AlertDescription>
        <p>
          <template v-if="summary.expired > 0">{{ summary.expired }} ended</template>
          <template v-if="summary.expired > 0 && summary.expiringSoon > 0"> and </template>
          <template v-if="summary.expiringSoon > 0">{{ summary.expiringSoon }} ending within 7 days</template>
          — mark each appointment as completed or terminated.
        </p>
        <Button v-if="summary.expired > 0" size="sm" variant="outline" class="mt-2 cursor-pointer" @click="showNeedsDecision">
          {{ table.getColumn('status')?.getFilterValue() === 'Expired' ? 'Show All Appointments' : 'View Ended Appointments' }}
        </Button>
      </AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">SPES {{ selectedYear }} Appointments</CardTitle>
        <CardDescription>
          Each SPES year has its own appointments. Former beneficiaries can be appointed again for a new year.
        </CardDescription>
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
            <RefreshCw class="size-4 shrink-0" :class="{ 'animate-spin': isLoading }" />
            <span class="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        <!-- Error Banner -->
        <Alert v-if="errorMessage" variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not load appointments</AlertTitle>
          <AlertDescription>{{ errorMessage }}</AlertDescription>
        </Alert>

        <!-- Empty State -->
        <Empty v-if="!isLoading && !errorMessage && yearAppointments.length === 0" class="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>No appointments for SPES {{ selectedYear }}</EmptyTitle>
            <EmptyDescription>
              Appoint approved SPES applicants, or bring back former beneficiaries for this year.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button @click="openAppointDialog">
              <Plus class="size-4" />
              Appoint for SPES {{ selectedYear }}
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
                <template v-if="isLoading && yearAppointments.length === 0">
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
                    No appointments match the current filters.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <!-- Pagination -->
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
              {{ table.getFilteredRowModel().rows.length }} appointment(s)
              <template v-if="table.getPageCount() > 1">
                · Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }}
              </template>
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

  <!-- Appoint / Edit Appointment Dialog -->
  <Dialog :open="isAppointmentFormOpen" @update:open="onAppointmentOpenChange">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ isEditMode ? 'Edit SPES Appointment' : 'Appoint for SPES' }}</DialogTitle>
        <DialogDescription>
          {{
            isEditMode
              ? 'Update the establishment and period of this appointment.'
              : `Appoint an approved applicant, or a former beneficiary returning for SPES ${selectedYear}.`
          }}
        </DialogDescription>
      </DialogHeader>

      <Form
        v-if="isAppointmentFormOpen"
        ref="appointmentForm"
        :key="appointmentFormKey"
        v-slot="{ values, setFieldValue }"
        :validation-schema="appointmentSchema"
        :initial-values="appointmentInitialValues"
        class="grid gap-4"
        @submit="submitAppointment"
      >
        <div v-if="fixedAppointeeName">
          <span class="text-xs text-muted-foreground">Beneficiary</span>
          <p class="text-sm font-medium">{{ fixedAppointeeName }}</p>
        </div>

        <FormField v-else v-slot="{ componentField }" name="appointee">
          <FormItem>
            <FormLabel>Appointee</FormLabel>
            <Select
              v-bind="componentField"
              :disabled="isSubmitting || (applicantOptions.length === 0 && beneficiaryOptions.length === 0)"
              @update:model-value="onAppointeeChange"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue
                    :placeholder="
                      applicantOptions.length || beneficiaryOptions.length
                        ? 'Select an applicant or former beneficiary'
                        : 'No one available to appoint'
                    "
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup v-if="applicantOptions.length">
                  <SelectLabel>Approved applicants</SelectLabel>
                  <SelectItem v-for="option in applicantOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                    <span class="text-xs text-muted-foreground">· {{ option.hint }}</span>
                  </SelectItem>
                </SelectGroup>
                <SelectGroup v-if="beneficiaryOptions.length">
                  <SelectLabel>Former beneficiaries</SelectLabel>
                  <SelectItem v-for="option in beneficiaryOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                    <span class="text-xs text-muted-foreground">· {{ option.hint }}</span>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormDescription>Anyone already appointed for this SPES year is not listed.</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <!-- Year is fixed by the dashboard filter when appointing; editable only when editing -->
        <div v-show="isEditMode">
          <FormField v-slot="{ componentField }" name="spesYear">
            <FormItem>
              <FormLabel>SPES Year</FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="number" min="2000" max="2100" :disabled="isSubmitting || !isEditMode" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <Separator />
        <h3 class="text-sm font-semibold">Assignment</h3>

        <p
          v-if="!isEditMode && (isLoadingHomeLocation || homeLocationNote)"
          class="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Loader2 v-if="isLoadingHomeLocation" class="size-3.5 shrink-0 animate-spin" />
          {{ isLoadingHomeLocation ? "Looking up the applicant's home address..." : homeLocationNote }}
        </p>

        <Alert v-if="locationError" variant="destructive">
          <AlertTriangle class="size-4" />
          <AlertTitle>PSGC unavailable</AlertTitle>
          <AlertDescription class="flex flex-wrap items-center gap-2">
            {{ locationError }}
            <Button type="button" variant="outline" size="sm" class="cursor-pointer" @click="retryLoadLocation">
              <RefreshCw class="size-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>

        <FormField v-slot="{ value }" name="assignedProvince">
          <FormItem>
            <FormLabel>Province</FormLabel>
            <Select
              :model-value="value"
              :disabled="isSubmitting || isLoadingProvinces"
              @update:model-value="(name) => onProvinceChange(String(name ?? ''), setFieldValue)"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue :placeholder="isLoadingProvinces ? 'Loading provinces...' : 'Select province'" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem v-for="province in provinces" :key="province.code" :value="province.name">
                  {{ province.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        </FormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField v-slot="{ value }" name="assignedMunicipality">
            <FormItem>
              <FormLabel>Municipality / City</FormLabel>
              <Select
                :model-value="value"
                :disabled="isSubmitting || !values.assignedProvince || isLoadingMunicipalities"
                @update:model-value="(name) => onMunicipalityChange(String(name ?? ''), setFieldValue)"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue
                      :placeholder="
                        !values.assignedProvince
                          ? 'Select province first'
                          : isLoadingMunicipalities
                            ? 'Loading...'
                            : 'Select municipality'
                      "
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem v-for="municipality in municipalities" :key="municipality.code" :value="municipality.name">
                    {{ municipality.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="assignedBarangay">
            <FormItem>
              <FormLabel>Barangay</FormLabel>
              <Select
                v-bind="componentField"
                :disabled="isSubmitting || !values.assignedMunicipality || isLoadingBarangays"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue
                      :placeholder="
                        !values.assignedMunicipality
                          ? 'Select municipality first'
                          : isLoadingBarangays
                            ? 'Loading...'
                            : 'Select barangay'
                      "
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem v-for="barangay in barangays" :key="barangay.code" :value="barangay.name">
                    {{ barangay.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <Separator />
        <h3 class="text-sm font-semibold">Period</h3>

        <FormField v-slot="{ value, handleChange }" name="daysDuration">
          <FormItem>
            <FormLabel>Appointment Duration</FormLabel>
            <FormControl>
              <div role="radiogroup" class="grid grid-cols-2 gap-3">
                <button
                  v-for="opt in durationChoices"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="Number(value) === opt.value"
                  :disabled="isSubmitting"
                  :class="[
                    'flex cursor-pointer flex-col items-start rounded-lg border p-3 text-left transition-colors',
                    Number(value) === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
                  ]"
                  @click="handleChange(opt.value); fillEndDate(values.startDate, opt.value, setFieldValue)"
                >
                  <span class="text-sm font-semibold">{{ opt.label }}</span>
                  <span class="text-xs text-muted-foreground">{{ opt.description }}</span>
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField v-slot="{ componentField }" name="startDate">
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  type="date"
                  :disabled="isSubmitting"
                  @update:model-value="(value) => fillEndDate(String(value ?? ''), values.daysDuration, setFieldValue)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="endDate">
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="date" :min="values.startDate" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>
        <p class="-mt-2 text-xs text-muted-foreground">
          The end date is set to the last working day of the duration.
          <template v-if="countSpesCalendarDays(values.startDate, values.endDate)">
            The period covers {{ countSpesCalendarDays(values.startDate, values.endDate) }} calendar day(s).
          </template>
        </p>

        <Separator />

        <FormField v-slot="{ componentField }" name="notes">
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea v-bind="componentField" rows="2" placeholder="Optional" :disabled="isSubmitting" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onAppointmentOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            {{ isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Appoint' }}
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  </Dialog>

  <!-- Conclude Appointment Dialog -->
  <Dialog :open="concludingAppointment !== null" @update:open="onConcludeOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Conclude SPES Appointment</DialogTitle>
        <DialogDescription>
          Record how
          <strong class="font-medium text-foreground">{{ formatSpesFormName(concludingAppointment?.beneficiary.spes_form) }}</strong>'s
          SPES {{ concludingAppointment?.spes_year }} appointment ended.
        </DialogDescription>
      </DialogHeader>

      <Alert v-if="concludingAppointment && !isLoadingReports && !canMarkCompleted">
        <AlertTitle>DTR and accomplishment report needed</AlertTitle>
        <AlertDescription class="flex flex-col items-start gap-2">
          {{ concludeReportCount }} of {{ totalReports }} PDF reports submitted. The appointment can only be marked
          Completed once both are uploaded.
          <Button type="button" size="sm" variant="outline" class="cursor-pointer" @click="openConcludeReports">
            Upload Reports
          </Button>
        </AlertDescription>
      </Alert>

      <Form
        v-if="concludingAppointment"
        :key="concludeFormKey"
        :validation-schema="concludeSchema"
        :initial-values="concludeInitialValues"
        class="grid gap-4"
        @submit="submitConclusion"
      >
        <FormField v-slot="{ value, handleChange }" name="status">
          <FormItem>
            <FormLabel>Concluding Status</FormLabel>
            <FormControl>
              <div role="radiogroup" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  v-for="opt in concludeOptions"
                  :key="opt.value"
                  type="button"
                  role="radio"
                  :aria-checked="value === opt.value"
                  :disabled="isSubmitting || isLoadingReports || (opt.value === 'Completed' && !canMarkCompleted)"
                  :class="[
                    'flex cursor-pointer flex-col items-start rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    value === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
                  ]"
                  @click="handleChange(opt.value)"
                >
                  <span class="text-sm font-semibold">{{ opt.label }}</span>
                  <span class="text-xs text-muted-foreground">{{ opt.description }}</span>
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="notes">
          <FormItem>
            <FormLabel>Remarks</FormLabel>
            <FormControl>
              <Textarea
                v-bind="componentField"
                rows="3"
                placeholder="e.g. Completed 20 days. Payroll submitted to DOLE."
                :disabled="isSubmitting"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <DialogFooter>
          <Button type="button" variant="outline" class="cursor-pointer" :disabled="isSubmitting" @click="onConcludeOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" class="cursor-pointer" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Saving...' : 'Conclude Appointment' }}
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  </Dialog>

  <SpesRandomizerDialog />

  <!-- DTR & Accomplishment Report Dialog -->
  <Dialog v-model:open="isReportsDialogOpen">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{{ formatSpesFormName(reportsAppointment?.beneficiary.spes_form) }}</DialogTitle>
        <DialogDescription>
          DTR and accomplishment report for SPES {{ reportsAppointment?.spes_year }} ·
          {{ reportsAppointment ? formatSpesAssignment(reportsAppointment) : '' }}. Both PDFs are required before the appointment can be marked
          Completed.
        </DialogDescription>
      </DialogHeader>

      <SpesCompletionReportList
        :reports="openReports"
        :busy-type="busyReportType"
        :is-loading="isLoadingBeneficiaryReports"
        :readonly="reportsAppointment?.status === 'Terminated'"
        @upload="onReportPicked"
        @remove="onReportRemoved"
      />
    </DialogContent>
  </Dialog>

  <!-- Appointment History Dialog -->
  <Dialog v-model:open="isHistoryDialogOpen">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ formatSpesFormName(historyBeneficiary?.spes_form) }}</DialogTitle>
        <DialogDescription>
          SPES appointment history · {{ historyAppointments.length }} availment(s)
        </DialogDescription>
      </DialogHeader>

      <ol class="space-y-3">
        <li v-for="appointment in historyAppointments" :key="appointment.id" class="rounded-lg border p-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-semibold">SPES {{ appointment.spes_year }}</p>
              <p class="font-mono text-xs text-muted-foreground">
                {{ appointment.appointment_code }} · Availment #{{ appointment.availmentNumber }}
              </p>
            </div>
            <Badge variant="outline" :class="getSpesStatusBadgeClass(appointment.displayStatus)">
              {{ appointment.displayStatus }}
            </Badge>
          </div>
          <dl class="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <div class="sm:col-span-2">
              <dt class="text-xs text-muted-foreground">Assignment</dt>
              <dd>{{ formatSpesAssignment(appointment) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Period</dt>
              <dd>
                {{ formatSpesDate(appointment.start_date) }} – {{ formatSpesDate(appointment.end_date) }}
                <span class="text-muted-foreground">({{ appointment.days_duration }} days)</span>
              </dd>
            </div>
            <div v-if="appointment.decision_notes" class="sm:col-span-2">
              <dt class="text-xs text-muted-foreground">Notes</dt>
              <dd class="whitespace-pre-line">{{ appointment.decision_notes }}</dd>
            </div>
          </dl>
        </li>
      </ol>

      <DialogFooter v-if="canReappointHistoryBeneficiary">
        <Button @click="reappointFromHistory">
          <Plus class="size-4" />
          Re-appoint for SPES {{ selectedYear }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Remove Appointment Confirmation -->
  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove SPES {{ appointmentToDelete?.spes_year }} appointment?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{
            formatSpesFormName(appointmentToDelete?.beneficiary.spes_form)
          }}</strong>
          will be removed from SPES {{ appointmentToDelete?.spes_year }}.
          <template v-if="(appointmentToDelete?.beneficiary.appointments.length ?? 0) <= 1">
            This is their only appointment, so they will return to the approved applicants list.
          </template>
          <template v-else>Their appointments in other years are kept.</template>
          Their SPES form is kept. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmDelete">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Removing...' : 'Remove Appointment' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
