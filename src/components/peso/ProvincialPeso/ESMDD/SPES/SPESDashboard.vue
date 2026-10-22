<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { RouterLink } from 'vue-router'
import { AlertTriangle, ChevronDown, Dices, GraduationCap, Loader2, Plus, RefreshCw } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
import { useSpesConcludeForm } from '@/composables/peso/provincialPeso/useSpesConcludeForm'
import { useSpesDraw } from '@/composables/peso/provincialPeso/useSpesDraw'
import { useSpesAppointmentForm } from '@/composables/peso/provincialPeso/useSpesAppointmentForm'
import SpesCompletionReportList from '@/components/SpesCompletionReportList.vue'
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
  getRowSwipeActions,
  getRowCard,
} = useSpesBeneficiaries()
const {
  isSubmitting,
  concludingAppointment,
  concludeSchema,
  concludeInitialValues,
  concludeFormKey,
  concludeOptions,
  canMarkCompleted,
  concludeReportCount,
  totalReports,
  isLoadingReports,
  openConcludeReports,
  onConcludeOpenChange,
  submitConclusion,
} = useSpesConcludeForm()
const {
  isDrawOpen,
  isLoadingDrawPool,
  municipalityOptions: drawMunicipalityOptions,
  selectedMunicipality,
  selectedGroup,
  isUnspecifiedMunicipality,
  slots,
  maxSlots,
  slotsLeft,
  winners,
  lastDrawn,
  remaining,
  drawnIds,
  rotation,
  isSpinning,
  landedId,
  wheelSegments,
  canDraw,
  canConfirm,
  setSlots,
  spin,
  drawRemaining,
  resetDraw,
  confirmWinners,
  refreshPool: refreshDrawPool,
  onOpenChange: onDrawOpenChange,
} = useSpesDraw()
// Mounted wherever the randomizer is, so drawn applicants go straight to their appointment after approval
const {
  isAppointmentFormOpen,
  isEditMode,
  applicantOptions,
  beneficiaryOptions,
  fixedAppointeeName,
  drawAppointProgress,
  appointmentSchema,
  appointmentInitialValues,
  appointmentFormKey,
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
  getEndDate,
  countSpesCalendarDays,
  onAppointmentOpenChange,
  submitAppointment,
} = useSpesAppointmentForm()
</script>

<template>
  <div class="w-full min-w-0 space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-2xl space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Special Program for Employment of Students</h1>
        <p class="text-sm text-muted-foreground">
          SPES Monitoring and Evaluation.
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
          List of SPES Beneficiaries for the year {{ selectedYear }}.
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
          <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
          <SwipeCardList
            class="md:hidden"
            :items="table.getRowModel().rows"
            :item-key="(row) => row.id"
            :card="(row) => getRowCard(row.original)"
            :actions="(row) => getRowSwipeActions(row.original)"
            :loading="isLoading && yearAppointments.length === 0"
            :action-width="64"
          >
            <template #empty>
              <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No appointments match the current filters.</p>
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
              : drawAppointProgress
                ? `Drawn applicant ${drawAppointProgress.current} of ${drawAppointProgress.total}. Saving moves on to the next one; closing leaves the rest Approved to appoint later.`
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

        <div class="grid gap-4 sm:grid-cols-2">
          <FormField v-slot="{ componentField }" name="startDate">
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="date" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div class="space-y-2">
            <Label for="spes-appointment-end-date">End Date</Label>
            <Input
              id="spes-appointment-end-date"
              type="date"
              readonly
              tabindex="-1"
              class="bg-muted/50"
              :model-value="getEndDate(values.startDate, values.daysDuration) ?? ''"
            />
          </div>
        </div>
        <p class="-mt-2 text-xs text-muted-foreground">
          <template v-if="getEndDate(values.startDate, values.daysDuration)">
            {{ values.daysDuration }} working days, Monday to Friday, covering
            {{ countSpesCalendarDays(values.startDate, getEndDate(values.startDate, values.daysDuration)) }} calendar
            day(s). A weekend start date begins on the next Monday.
          </template>
          <template v-else>Pick a start date and the end date is counted in working days (Monday to Friday).</template>
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

  <!-- SPES Randomizer Draw: drawn applicants are approved, then the appointment form opens for each -->
  <Dialog :open="isDrawOpen" @update:open="onDrawOpenChange">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>SPES Randomizer Draw</DialogTitle>
        <DialogDescription>
          Draw beneficiaries at random per municipality from Pending applicants with all 5 documentary requirements
          attached. Drawn applicants are approved and appointed next; everyone else stays Pending.
        </DialogDescription>
      </DialogHeader>

      <!-- Loading -->
      <div
        v-if="isLoadingDrawPool && !drawMunicipalityOptions.length"
        class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <Skeleton class="aspect-square w-full rounded-xl" />
        <div class="space-y-3">
          <Skeleton class="h-6 w-40" />
          <Skeleton class="h-1.5 w-full" />
          <Skeleton v-for="i in 4" :key="i" class="h-14 w-full" />
        </div>
      </div>

      <!-- Nobody to draw -->
      <Empty v-else-if="!drawMunicipalityOptions.length" class="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Dices />
          </EmptyMedia>
          <EmptyTitle>No applicants to draw</EmptyTitle>
          <EmptyDescription>
            Applicants enter the draw once their form is Pending and all 5 documentary requirements have a file
            attached.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <div v-else class="space-y-6">
        <!-- Draw settings -->
        <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
          <div class="space-y-2">
            <Label for="spes-draw-municipality">Municipality</Label>
            <Select v-model="selectedMunicipality" :disabled="isSpinning || isSubmitting">
              <SelectTrigger id="spes-draw-municipality" class="w-full">
                <SelectValue placeholder="Select a municipality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in drawMunicipalityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="spes-draw-slots">Slots to fill</Label>
            <Input
              id="spes-draw-slots"
              type="number"
              min="1"
              class="tabular-nums"
              :max="maxSlots"
              :model-value="slots"
              :disabled="isSpinning || isSubmitting || winners.length > 0"
              @update:model-value="setSlots"
            />
          </div>
          <Button
            variant="outline"
            :disabled="isLoadingDrawPool || isSpinning || isSubmitting"
            @click="refreshDrawPool"
          >
            <RefreshCw class="size-4 shrink-0" :class="{ 'animate-spin': isLoadingDrawPool }" />
            <span class="sm:sr-only">Refresh</span>
          </Button>
        </div>

        <Alert v-if="isUnspecifiedMunicipality" class="border-warning/40 bg-warning/10 *:[svg]:text-warning">
          <AlertTriangle />
          <AlertTitle>These applicants have no municipality</AlertTitle>
          <AlertDescription>
            Set the municipality on their SPES forms so they are drawn with the right municipality.
          </AlertDescription>
        </Alert>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <!-- Wheel stage -->
          <section
            aria-label="Randomizer wheel"
            class="flex flex-col items-center gap-5 rounded-xl border bg-muted/30 p-4 sm:p-6"
          >
            <svg
              viewBox="-106 -114 212 220"
              class="w-full max-w-sm drop-shadow-sm"
              role="img"
              :aria-label="`Wheel with ${remaining.length} applicant(s)`"
            >
              <!-- Rim -->
              <circle r="103" class="fill-card stroke-border" stroke-width="1" />
              <circle v-if="!wheelSegments.length" r="96" class="fill-muted" />

              <g :transform="`rotate(${rotation})`">
                <template v-for="segment in wheelSegments" :key="segment.id">
                  <g
                    class="transition-opacity duration-300"
                    :class="{ 'opacity-25': landedId !== null && segment.id !== landedId }"
                  >
                    <path
                      v-if="segment.path"
                      :d="segment.path"
                      :class="segment.colorClass"
                      class="stroke-card"
                      stroke-width="1"
                    />
                    <circle v-else r="96" :class="segment.colorClass" />
                    <text
                      :transform="segment.labelTransform"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      class="fill-primary-foreground text-[7px] font-semibold"
                    >
                      {{ segment.label }}
                    </text>
                  </g>
                  <circle v-if="segment.peg" :cx="segment.peg.x" :cy="segment.peg.y" r="1.6" class="fill-card" />
                </template>
              </g>

              <!-- Hub: applicants still on the wheel -->
              <circle r="18" class="fill-card stroke-border" stroke-width="1" />
              <text
                y="-2.5"
                text-anchor="middle"
                dominant-baseline="middle"
                class="fill-foreground text-[11px] font-bold tabular-nums"
              >
                {{ remaining.length }}
              </text>
              <text
                y="8"
                text-anchor="middle"
                dominant-baseline="middle"
                class="fill-muted-foreground text-[4.5px] font-semibold uppercase"
              >
                left
              </text>

              <!-- Pointer -->
              <path
                d="M -8 -112 L 8 -112 L 0 -92 Z"
                class="fill-foreground stroke-card"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>

            <!-- Draw result -->
            <div class="flex min-h-16 flex-col items-center justify-center gap-0.5 text-center" aria-live="polite">
              <template v-if="lastDrawn">
                <span class="text-xs font-medium text-muted-foreground">
                  Drawn #{{ winners.length + (landedId ? 1 : 0) }}
                </span>
                <p
                  :key="lastDrawn.form.id"
                  class="text-xl font-semibold tracking-tight animate-in fade-in zoom-in-95 duration-300"
                >
                  {{ lastDrawn.name }}
                </p>
                <span class="text-xs text-muted-foreground">
                  {{ lastDrawn.form.student_category || 'Category not set' }}
                </span>
              </template>
              <p v-else-if="isSpinning" class="text-sm text-muted-foreground">Drawing…</p>
              <p v-else-if="!remaining.length" class="text-sm text-muted-foreground">
                Everyone in {{ selectedMunicipality }} has been drawn.
              </p>
              <p v-else class="text-sm text-muted-foreground">{{ remaining.length }} applicant(s) on the wheel</p>
            </div>

            <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button size="lg" :disabled="!canDraw" @click="spin">
                <Loader2 v-if="isSpinning" class="size-4 shrink-0 animate-spin" />
                <Dices v-else class="size-4 shrink-0" />
                {{ isSpinning ? 'Spinning...' : 'Spin the Wheel' }}
              </Button>
              <Button size="lg" variant="outline" :disabled="!canDraw" @click="drawRemaining">
                Draw {{ slotsLeft }} at Once
              </Button>
            </div>
          </section>

          <!-- Results -->
          <section class="flex min-w-0 flex-col gap-4">
            <div class="space-y-2">
              <div class="flex items-baseline justify-between gap-2">
                <h3 class="text-base font-semibold">Drawn Applicants</h3>
                <span class="text-sm tabular-nums text-muted-foreground">
                  <span class="font-semibold text-foreground">{{ winners.length }}</span> of {{ slots }} slots
                </span>
              </div>
              <Progress
                :model-value="Math.round((winners.length / Math.max(slots, 1)) * 100)"
                class="h-1.5"
                aria-label="Slots filled"
              />
            </div>

            <ol class="max-h-80 divide-y overflow-y-auto rounded-lg border">
              <li
                v-for="(winner, index) in winners"
                :key="winner.form.id"
                class="flex items-center gap-3 p-3 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300"
                :class="{ 'bg-primary/5': winner.form.id === lastDrawn?.form.id }"
              >
                <span
                  class="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary"
                >
                  {{ index + 1 }}
                </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ winner.name }}</p>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ winner.form.student_category || 'Category not set' }}
                    <template v-if="winner.form.contact_number"> · {{ winner.form.contact_number }}</template>
                  </p>
                </div>
              </li>
              <li
                v-for="n in Math.min(slotsLeft, 3)"
                :key="`open-${n}`"
                class="flex items-center gap-3 p-3 text-muted-foreground"
              >
                <span
                  class="grid size-7 shrink-0 place-items-center rounded-full border border-dashed text-xs tabular-nums"
                >
                  {{ winners.length + n }}
                </span>
                <span class="text-sm">Open slot</span>
              </li>
            </ol>
            <p v-if="slotsLeft > 3" class="-mt-2 text-xs text-muted-foreground">
              + {{ slotsLeft - 3 }} more open slot(s)
            </p>

            <Collapsible v-if="selectedGroup">
              <CollapsibleTrigger as-child>
                <Button variant="ghost" size="sm" class="group -ml-2 text-muted-foreground">
                  {{ selectedGroup.candidates.length }} eligible applicant(s) in {{ selectedGroup.municipality }}
                  <ChevronDown class="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul class="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border text-sm">
                  <li
                    v-for="candidate in selectedGroup.candidates"
                    :key="candidate.form.id"
                    class="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <span class="truncate" :class="{ 'text-muted-foreground': drawnIds.has(candidate.form.id) }">
                      {{ candidate.name }}
                    </span>
                    <span v-if="drawnIds.has(candidate.form.id)" class="shrink-0 text-xs text-muted-foreground">
                      Drawn
                    </span>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </div>
      </div>

      <DialogFooter v-if="drawMunicipalityOptions.length" class="gap-2 sm:justify-between">
        <Button variant="ghost" :disabled="isSpinning || isSubmitting || !winners.length" @click="resetDraw">
          Reset Draw
        </Button>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" :disabled="isSpinning || isSubmitting" @click="onDrawOpenChange(false)">
            Close
          </Button>
          <Button :disabled="!canConfirm" @click="confirmWinners">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Approving...' : `Approve & Appoint ${winners.length} Drawn Applicant(s)` }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>

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
