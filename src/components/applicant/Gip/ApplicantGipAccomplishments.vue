<script setup lang="ts">
import {
  CalendarDays,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Info,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from '@lucide/vue'
import AppLink from '@/components/AppLink.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import GipAccomplishmentDays from '@/components/GipAccomplishmentDays.vue'
import GipAccomplishmentActivities from '@/components/GipAccomplishmentActivities.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useGipAccomplishments } from '@/composables/applicant/useGipAccomplishments'

const {
  isLoading,
  isEnrolled,
  activeAppointment,
  termNotStarted,
  internName,
  isDole,
  requirement,
  halfOptions,
  selectedHalfStart,
  selectedHalf,
  currentReport,
  isReadOnly,
  canSaveDraft,
  canSubmit,
  days,
  dayErrors,
  showDaily,
  showDailyOptional,
  missingDays,
  dayStatuses,
  setDayStatus,
  onDayInput,
  entryMax,
  activities,
  activityErrors,
  addActivity,
  removeActivity,
  onActivityInput,
  activitiesMax,
  activityMax,
  outputMax,
  remarksMax,
  details,
  detailErrors,
  onAmountInput,
  fillAmountInWords,
  amountPreview,
  nameMax,
  officeHeadName,
  officeHeadPosition,
  wordsMax,
  pickedFile,
  fileError,
  keepCurrentFile,
  onFilePicked,
  clearFile,
  fileAccept,
  fileMaxLabel,
  savingMode,
  isSaving,
  saveDraft,
  submitReport,
  generating,
  generateCurrent,
  generateSaved,
  reportToRemove,
  isRemoving,
  confirmRemove,
  termGroups,
  openReport,
  isOpenable,
  expandedIds,
  toggleExpanded,
  badgeClass,
  formatPeriodRange,
  formatWeekday,
  formatDate,
  formatSize,
  formatPesoAmount,
  viewOwnFile,
} = useGipAccomplishments()
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Accomplishments</h1>
      <p class="text-sm text-pretty text-muted-foreground">
        One report for every half of the month (1st–15th and 16th–end), on your funding's form. Generate or print it
        any time; PESO reviews it once you submit.
      </p>
    </div>

    <!-- ─── Loading ─── -->
    <div v-if="isLoading && !halfOptions.length && !termGroups.length" class="flex flex-col gap-4">
      <Skeleton class="h-96 w-full" />
      <Skeleton class="h-32 w-full" />
    </div>

    <!-- ─── Not an intern yet ─── -->
    <Card v-else-if="!isEnrolled">
      <CardContent>
        <Empty class="py-10">
          <EmptyHeader>
            <EmptyTitle>No internship yet</EmptyTitle>
            <EmptyDescription>You can write accomplishment reports once PESO deploys you as a GIP intern.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button as-child size="sm" variant="outline">
              <AppLink :to="{ name: 'gip-my-application' }">View my application</AppLink>
            </Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <template v-else>
      <Alert v-if="!activeAppointment">
        <FileText class="size-4" />
        <AlertTitle>No active term</AlertTitle>
        <AlertDescription>Your appointment term has ended, so new reports can't be written. Your past reports are below.</AlertDescription>
      </Alert>

      <Alert v-else-if="termNotStarted">
        <CalendarDays class="size-4" />
        <AlertTitle>Your term hasn't started</AlertTitle>
        <AlertDescription>
          You can start your first report on {{ formatDate(activeAppointment.start_date) }}, the first day of Term {{ activeAppointment.term_number }}.
        </AlertDescription>
      </Alert>

      <!-- ─── Report of a half ─── -->
      <Card v-else-if="selectedHalf">
        <CardHeader class="gap-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 space-y-1">
              <CardTitle class="text-base">{{ isDole ? 'GIP Work Accomplishment Report' : 'Accomplishment Report' }}</CardTitle>
              <CardDescription>
                {{ internName }} · Term {{ activeAppointment.term_number }} · {{ activeAppointment.program }} · {{ activeAppointment.assigned_office }}
              </CardDescription>
            </div>
            <Badge v-if="currentReport" variant="outline" :class="badgeClass[currentReport.status]">{{ currentReport.status }}</Badge>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div class="grid min-w-0 gap-2">
              <Label for="gipHalf">Period</Label>
              <SearchSelect
                id="gipHalf"
                v-model="selectedHalfStart"
                :options="halfOptions"
                search-placeholder="Search period..."
                class="w-full sm:w-80"
                :disabled="isSaving"
              />
            </div>
            <!-- The official form, filled with what is on screen (saved or not) -->
            <div class="flex gap-2">
              <Button variant="outline" size="sm" class="cursor-pointer" :disabled="generating !== null" @click="generateCurrent('download')">
                <Loader2 v-if="generating === 'download'" class="size-4 animate-spin" />
                <Download v-else class="size-4" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" class="cursor-pointer" :disabled="generating !== null" @click="generateCurrent('print')">
                <Loader2 v-if="generating === 'print'" class="size-4 animate-spin" />
                <Printer v-else class="size-4" />
                Print
              </Button>
            </div>
          </div>

          <p class="flex gap-2 text-sm text-muted-foreground">
            <Info class="mt-0.5 size-4 shrink-0" />
            <span>{{ requirement }}</span>
          </p>
        </CardHeader>

        <CardContent class="grid gap-6">
          <!-- PESO's remarks to act on -->
          <div v-if="currentReport?.status === 'Returned' && currentReport.review_remarks" class="border-l-2 border-warning pl-3">
            <p class="text-xs font-semibold text-warning uppercase">PESO remarks</p>
            <p class="text-sm text-pretty text-foreground">{{ currentReport.review_remarks }}</p>
          </div>

          <Alert v-if="isReadOnly">
            <FileText class="size-4" />
            <AlertTitle>Reviewed</AlertTitle>
            <AlertDescription>PESO reviewed this report on {{ formatDate(currentReport?.reviewed_at ?? null) }}. It can no longer be changed.</AlertDescription>
          </Alert>

          <!-- ─── PGAS: Activities / Output / Remarks ─── -->
          <section v-if="!isDole" class="grid gap-3" aria-labelledby="gip-activities-title">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="gip-activities-title" class="text-sm font-semibold">Activities</h2>
              <span class="text-xs text-muted-foreground">What you accomplished, its output, and remarks</span>
            </div>

            <ul class="grid gap-3">
              <li v-for="(row, index) in activities" :key="row.key" class="grid gap-3 rounded-lg border p-3">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-medium text-muted-foreground">Activity {{ index + 1 }}</span>
                  <Button
                    v-if="!isReadOnly && activities.length > 1"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    class="cursor-pointer text-muted-foreground hover:text-destructive"
                    :aria-label="`Remove activity ${index + 1}`"
                    :disabled="isSaving"
                    @click="removeActivity(row.key)"
                  >
                    <X class="size-4" />
                  </Button>
                </div>
                <div class="grid gap-1.5">
                  <Label :for="`activity-${row.key}`" class="text-xs">Activity</Label>
                  <Textarea
                    :id="`activity-${row.key}`"
                    v-model="row.activity"
                    rows="2"
                    :maxlength="activityMax"
                    placeholder="e.g. Encoded the GIP applicants' records in the registry"
                    :aria-invalid="!!activityErrors[row.key]"
                    :disabled="isReadOnly || isSaving"
                    @input="onActivityInput(row)"
                  />
                </div>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <div class="grid gap-1.5">
                    <Label :for="`output-${row.key}`" class="text-xs">Output</Label>
                    <Input
                      :id="`output-${row.key}`"
                      v-model="row.output"
                      :maxlength="outputMax"
                      placeholder="e.g. 120 records encoded"
                      :disabled="isReadOnly || isSaving"
                      @input="onActivityInput(row)"
                    />
                  </div>
                  <div class="grid gap-1.5">
                    <Label :for="`remarks-${row.key}`" class="text-xs">Remarks</Label>
                    <Input :id="`remarks-${row.key}`" v-model="row.remarks" :maxlength="remarksMax" :disabled="isReadOnly || isSaving" />
                  </div>
                </div>
                <p v-if="activityErrors[row.key]" class="text-sm text-destructive">{{ activityErrors[row.key] }}</p>
              </li>
            </ul>

            <Button
              v-if="!isReadOnly && activities.length < activitiesMax"
              type="button"
              variant="outline"
              size="sm"
              class="w-fit cursor-pointer"
              :disabled="isSaving"
              @click="addActivity"
            >
              <Plus class="size-4" /> Add activity
            </Button>
            <p v-if="detailErrors.activities" class="text-sm text-destructive">{{ detailErrors.activities }}</p>
          </section>

          <!-- ─── Daily entries (DOLE: the report itself; PGAS: optional) ─── -->
          <section v-if="showDaily" class="grid gap-3" aria-labelledby="gip-daily-title">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="gip-daily-title" class="text-sm font-semibold">
                {{ isDole ? 'What you did each day' : 'Daily entries' }}
                <span v-if="!isDole" class="font-normal text-muted-foreground">(optional)</span>
              </h2>
              <span v-if="isDole && missingDays > 0 && !isReadOnly" class="text-xs text-muted-foreground">
                {{ missingDays }} weekday{{ missingDays > 1 ? 's' : '' }} left to fill
              </span>
            </div>
            <p v-if="isDole" class="text-xs text-muted-foreground">One accomplishment per line; each line prints as a bullet. Weekends print as Saturday / Sunday.</p>

            <p v-if="!days.length" class="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No weekdays in this period yet.
            </p>

            <ul v-else class="divide-y rounded-lg border">
              <li v-for="day in days" :key="day.date" class="grid gap-2 px-3 py-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-sm font-medium tabular-nums">{{ formatWeekday(day.date) }}</span>
                  <div class="flex gap-1 rounded-lg bg-muted p-1" role="radiogroup" :aria-label="`Status on ${formatWeekday(day.date)}`">
                    <Button
                      v-for="status in dayStatuses"
                      :key="status"
                      type="button"
                      variant="ghost"
                      size="sm"
                      role="radio"
                      :aria-checked="day.status === status"
                      :disabled="isReadOnly || isSaving"
                      :class="['h-7 cursor-pointer px-2.5', day.status === status && 'bg-background shadow-xs hover:bg-background']"
                      @click="setDayStatus(day, status)"
                    >
                      {{ status }}
                    </Button>
                  </div>
                </div>
                <Textarea
                  v-if="day.status === 'Worked'"
                  v-model="day.entry"
                  rows="3"
                  :maxlength="entryMax"
                  placeholder="Attended flag ceremony.&#10;Facilitated fifteen (15) SPES beneficiaries in signing their payroll."
                  :aria-invalid="!!dayErrors[day.date]"
                  :disabled="isReadOnly || isSaving"
                  @input="onDayInput(day)"
                />
                <Input v-else v-model="day.entry" :maxlength="entryMax" placeholder="Note (optional)" :disabled="isReadOnly || isSaving" />
                <p v-if="dayErrors[day.date]" class="text-sm text-destructive">{{ dayErrors[day.date] }}</p>
              </li>
            </ul>
          </section>

          <Button
            v-else-if="!isReadOnly"
            type="button"
            variant="outline"
            size="sm"
            class="w-fit cursor-pointer"
            @click="showDailyOptional = true"
          >
            <Plus class="size-4" /> Add daily entries
          </Button>

          <!-- ─── PGAS: Acknowledgement Receipt of Payment ─── -->
          <section v-if="!isDole" class="grid gap-3" aria-labelledby="gip-payment-title">
            <div>
              <h2 id="gip-payment-title" class="text-sm font-semibold">Payment for this half</h2>
              <p class="text-xs text-muted-foreground">Days on duty × your daily stipend. Printed on the Acknowledgement Receipt of Payment.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div class="grid gap-1.5">
                <Label for="gipAmount">Amount (₱)</Label>
                <Input
                  id="gipAmount"
                  v-model="details.amount"
                  inputmode="decimal"
                  placeholder="e.g. 5300.00"
                  class="font-mono"
                  :aria-invalid="!!detailErrors.amount"
                  :disabled="isReadOnly || isSaving"
                  @input="onAmountInput"
                />
                <p v-if="amountPreview && !detailErrors.amount" class="text-xs text-muted-foreground tabular-nums">₱{{ amountPreview }}</p>
                <p v-if="detailErrors.amount" class="text-sm text-destructive">{{ detailErrors.amount }}</p>
              </div>
              <div class="grid gap-1.5">
                <div class="flex items-center justify-between gap-2">
                  <Label for="gipAmountWords">Amount in words</Label>
                  <Button
                    v-if="!isReadOnly"
                    type="button"
                    variant="link"
                    size="sm"
                    class="h-auto cursor-pointer p-0"
                    :disabled="isSaving"
                    @click="fillAmountInWords"
                  >
                    <WandSparkles class="size-3.5" /> Fill from amount
                  </Button>
                </div>
                <Textarea
                  id="gipAmountWords"
                  v-model="details.amount_in_words"
                  rows="2"
                  :maxlength="wordsMax"
                  placeholder="e.g. FIVE THOUSAND, THREE HUNDRED PESOS ONLY"
                  class="uppercase"
                  :aria-invalid="!!detailErrors.amount_in_words"
                  :disabled="isReadOnly || isSaving"
                />
                <p v-if="detailErrors.amount_in_words" class="text-sm text-destructive">{{ detailErrors.amount_in_words }}</p>
              </div>
            </div>
          </section>

          <Separator />

          <!-- ─── Printed on the form: designation & signatories ─── -->
          <section class="grid gap-3" aria-labelledby="gip-signatories-title">
            <div>
              <h2 id="gip-signatories-title" class="text-sm font-semibold">Signatories</h2>
              <p class="text-xs text-muted-foreground">
                Printed on the form. The office head comes from your appointed office; type your supervisor's name.
              </p>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div v-if="!isDole" class="grid gap-1.5 sm:col-span-2">
                <Label for="gipDesignation">Your designation</Label>
                <Input id="gipDesignation" v-model="details.designation" :maxlength="nameMax" placeholder="e.g. GIP" :disabled="isReadOnly || isSaving" />
              </div>
              <div class="grid gap-1.5 sm:col-span-2">
                <Label for="gipSupervisor">{{ isDole ? 'Noted by (supervisor)' : 'Reviewed by (supervisor)' }}</Label>
                <Input id="gipSupervisor" v-model="details.supervisor_name" :maxlength="nameMax" placeholder="Your supervisor's full name" :disabled="isReadOnly || isSaving" />
              </div>
              <div class="grid gap-1.5">
                <Label for="gipApprover">Approved by (office head)</Label>
                <Input id="gipApprover" v-model="details.approver_name" :maxlength="nameMax" placeholder="Office head's full name" :disabled="isReadOnly || isSaving" />
                <p v-if="officeHeadName && details.approver_name === officeHeadName" class="text-xs text-muted-foreground">
                  From the office directory
                </p>
              </div>
              <div class="grid gap-1.5">
                <Label for="gipApproverPosition">Office head's position</Label>
                <Input
                  id="gipApproverPosition"
                  v-model="details.approver_position"
                  :maxlength="nameMax"
                  placeholder="e.g. Provincial Government Department Head"
                  :disabled="isReadOnly || isSaving"
                />
                <p v-if="officeHeadPosition && details.approver_position === officeHeadPosition" class="text-xs text-muted-foreground">
                  From the office directory
                </p>
              </div>
            </div>
            <p v-for="field in (['designation', 'supervisor_name', 'approver_name', 'approver_position'] as const)" v-show="detailErrors[field]" :key="field" class="text-sm text-destructive">
              {{ detailErrors[field] }}
            </p>
          </section>

          <!-- ─── Supporting PDF (e.g. the signed copy) ─── -->
          <div class="grid gap-2">
            <span class="text-sm font-medium">Signed copy <span class="font-normal text-muted-foreground">(optional, PDF up to {{ fileMaxLabel }})</span></span>
            <div
              v-if="pickedFile || (currentReport?.file_name && keepCurrentFile)"
              class="flex items-center gap-3 rounded-lg border px-3 py-2"
            >
              <FileText class="size-4 shrink-0 text-muted-foreground" />
              <span class="min-w-0 flex-1 truncate text-sm">{{ pickedFile?.name ?? currentReport?.file_name }}</span>
              <Button
                v-if="!pickedFile && currentReport?.file_path"
                type="button"
                variant="ghost"
                size="icon-sm"
                class="cursor-pointer"
                aria-label="View file"
                @click="viewOwnFile(currentReport)"
              >
                <Eye class="size-4" />
              </Button>
              <Button
                v-if="!isReadOnly"
                type="button"
                variant="ghost"
                size="icon-sm"
                class="cursor-pointer"
                aria-label="Remove file"
                :disabled="isSaving"
                @click="clearFile"
              >
                <X class="size-4" />
              </Button>
            </div>
            <label v-else-if="!isReadOnly" class="w-fit">
              <input type="file" class="sr-only" :accept="fileAccept" :disabled="isSaving" @change="onFilePicked" />
              <span
                class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-muted"
                :class="isSaving && 'pointer-events-none opacity-50'"
              >
                <Upload class="size-4" /> Attach PDF
              </span>
            </label>
            <p v-else class="text-sm text-muted-foreground">No file attached.</p>
            <p v-if="fileError" class="text-sm text-destructive">{{ fileError }}</p>
          </div>
        </CardContent>

        <CardFooter v-if="!isReadOnly" class="flex flex-col-reverse gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-pretty text-muted-foreground">
            <template v-if="!selectedHalf.isComplete">Save as you go. You can submit from {{ formatDate(selectedHalf.to) }}, when this half ends.</template>
            <template v-else-if="currentReport?.status === 'Submitted'">Submitted {{ formatDate(currentReport.submitted_at) }}. Changes go back to PESO when you submit again.</template>
            <template v-else>This half has ended. Submit it for PESO's review.</template>
          </p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row">
            <Button v-if="canSaveDraft" variant="outline" class="cursor-pointer" :disabled="isSaving" @click="saveDraft">
              <Loader2 v-if="savingMode === 'draft'" class="size-4 animate-spin" />
              {{ savingMode === 'draft' ? 'Saving...' : 'Save draft' }}
            </Button>
            <Button class="cursor-pointer" :disabled="isSaving || !canSubmit" @click="submitReport">
              <Loader2 v-if="savingMode === 'submit'" class="size-4 animate-spin" />
              {{ savingMode === 'submit' ? 'Submitting...' : currentReport?.submitted_at ? 'Submit again' : 'Submit report' }}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <!-- ─── My reports, per term ─── -->
      <section v-if="termGroups.length" aria-labelledby="gip-reports-title" class="flex flex-col gap-4">
        <h2 id="gip-reports-title" class="text-lg font-semibold text-foreground">My reports</h2>

        <div v-for="group in termGroups" :key="group.appointment.id" class="flex flex-col gap-2">
          <p class="text-sm font-medium text-muted-foreground">
            Term {{ group.appointment.term_number }} · {{ group.appointment.program }} ·
            {{ formatPeriodRange(group.appointment.start_date, group.appointment.end_date) }}
          </p>

          <ul class="divide-y rounded-lg border">
            <li v-for="report in group.reports" :key="report.id" class="flex flex-col gap-2 px-4 py-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-semibold text-foreground">{{ formatPeriodRange(report.period_start, report.period_end) }}</p>
                <Badge variant="outline" :class="badgeClass[report.status]">{{ report.status }}</Badge>
              </div>
              <p class="text-xs text-muted-foreground">
                <template v-if="report.program === 'DOLE'">{{ report.daily_entries.length }} daily entr{{ report.daily_entries.length === 1 ? 'y' : 'ies' }}</template>
                <template v-else>
                  {{ report.activities.length }} activit{{ report.activities.length === 1 ? 'y' : 'ies' }}
                  <template v-if="report.amount != null"> · ₱{{ formatPesoAmount(report.amount) }}</template>
                </template>
              </p>
              <div v-if="report.status === 'Returned' && report.review_remarks" class="border-l-2 border-warning pl-3">
                <p class="text-xs font-semibold text-warning uppercase">PESO remarks</p>
                <p class="text-sm text-pretty text-foreground">{{ report.review_remarks }}</p>
              </div>

              <template v-if="report.activities.length || report.daily_entries.length">
                <Button
                  variant="link"
                  size="sm"
                  class="h-auto w-fit cursor-pointer p-0 text-muted-foreground"
                  :aria-expanded="expandedIds.has(report.id)"
                  @click="toggleExpanded(report.id)"
                >
                  {{ expandedIds.has(report.id) ? 'Hide details' : 'Show details' }}
                  <ChevronDown :class="['size-4 transition-transform', expandedIds.has(report.id) && 'rotate-180']" />
                </Button>
                <div v-if="expandedIds.has(report.id)" class="grid gap-3">
                  <GipAccomplishmentActivities v-if="report.activities.length" :activities="report.activities" />
                  <GipAccomplishmentDays v-if="report.daily_entries.length" :days="report.daily_entries" />
                </div>
              </template>

              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-xs text-muted-foreground">
                  <template v-if="report.submitted_at">Submitted {{ formatDate(report.submitted_at) }}</template>
                  <template v-else>Draft · not submitted</template>
                  <template v-if="report.reviewed_at"> · {{ report.status }} {{ formatDate(report.reviewed_at) }}</template>
                </p>
                <div class="flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="cursor-pointer"
                    aria-label="Download the report as PDF"
                    title="Download PDF"
                    :disabled="generating !== null"
                    @click="generateSaved(report, 'download')"
                  >
                    <Download class="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    class="cursor-pointer"
                    aria-label="Print the report"
                    title="Print"
                    :disabled="generating !== null"
                    @click="generateSaved(report, 'print')"
                  >
                    <Printer class="size-4" />
                  </Button>
                  <Button
                    v-if="report.file_path"
                    variant="ghost"
                    size="sm"
                    class="cursor-pointer"
                    :title="report.file_name ?? undefined"
                    @click="viewOwnFile(report)"
                  >
                    <Eye class="size-4" /> Signed copy<template v-if="report.file_size != null"> · {{ formatSize(report.file_size) }}</template>
                  </Button>
                  <Button v-if="isOpenable(report)" variant="ghost" size="sm" class="cursor-pointer" :disabled="isSaving" @click="openReport(report)">
                    <Pencil class="size-4" /> {{ report.status === 'Reviewed' ? 'Open' : 'Edit' }}
                  </Button>
                  <Button
                    v-if="report.status !== 'Reviewed'"
                    variant="ghost"
                    size="icon-sm"
                    class="cursor-pointer text-muted-foreground hover:text-destructive"
                    aria-label="Discard report"
                    title="Discard"
                    @click="reportToRemove = report"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </template>

    <!-- ─── Discard confirmation ─── -->
    <AlertDialog :open="!!reportToRemove" @update:open="(open) => { if (!open && !isRemoving) reportToRemove = null }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this report?</AlertDialogTitle>
          <AlertDialogDescription>
            The report for {{ reportToRemove ? formatPeriodRange(reportToRemove.period_start, reportToRemove.period_end) : '' }}
            and its attached file will be removed. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isRemoving">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isRemoving" @click="confirmRemove">
            <Loader2 v-if="isRemoving" class="size-4 animate-spin" />
            {{ isRemoving ? 'Discarding...' : 'Discard' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
