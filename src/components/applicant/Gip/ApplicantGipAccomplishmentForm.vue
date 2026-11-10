<script setup lang="ts">
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Printer,
  Upload,
  WandSparkles,
  X,
} from '@lucide/vue'
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
import { useGipAccomplishmentForm } from '@/composables/applicant/useGipAccomplishmentForm'

const {
  isLoading,
  hasLoadedReports,
  activeAppointment,
  formAppointment,
  termNotStarted,
  canAddReport,
  isDole,
  goBack,
  isNew,
  isNotFound,
  currentReport,
  isReadOnly,
  canSaveDraft,
  canSubmit,
  isEarly,
  periodFrom,
  periodTo,
  periodMin,
  periodMax,
  periodFromMax,
  periodError,
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
  wordsMax,
  pickedFile,
  fileError,
  keepCurrentFile,
  onFilePicked,
  clearFile,
  fileAccept,
  viewOwnFile,
  savingMode,
  isSaving,
  saveDraft,
  submitReport,
  isEarlySubmitDialogOpen,
  confirmEarlySubmit,
  generating,
  generateCurrent,
  badgeClass,
  formatWeekday,
  formatDate,
} = useGipAccomplishmentForm()
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-1">
      <Button variant="ghost" size="sm" class="-ml-2 w-fit cursor-pointer" :disabled="isSaving" @click="goBack">
        <ArrowLeft class="size-4" /> Back to Accomplishments
      </Button>
      <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {{ isNew ? 'Add Accomplishment' : isReadOnly ? 'Accomplishment Report' : 'Edit Accomplishment' }}
      </h1>
    </div>

    <!-- ─── Loading ─── -->
    <Skeleton v-if="isLoading && !hasLoadedReports" class="h-[32rem] w-full" />

    <!-- ─── Unknown report ─── -->
    <Card v-else-if="isNotFound">
      <CardContent>
        <Empty class="py-10">
          <EmptyHeader>
            <EmptyTitle>Report not found</EmptyTitle>
            <EmptyDescription>It may have been discarded.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" class="cursor-pointer" @click="goBack">Back to Accomplishments</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <!-- ─── No term to write for ─── -->
    <Alert v-else-if="isNew && !activeAppointment">
      <FileText class="size-4" />
      <AlertTitle>No active term</AlertTitle>
      <AlertDescription>Your appointment term has ended, so new reports can't be written.</AlertDescription>
    </Alert>

    <Alert v-else-if="isNew && (termNotStarted || !canAddReport)">
      <CalendarDays class="size-4" />
      <AlertTitle>Your term hasn't started</AlertTitle>
      <AlertDescription>
        You can add your first report on {{ formatDate(activeAppointment?.start_date ?? null) }}, the first day of Term {{ activeAppointment?.term_number }}.
      </AlertDescription>
    </Alert>

    <!-- ─── The report ─── -->
    <Card v-else>
      <CardHeader class="gap-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 space-y-1">
            <CardTitle class="text-base">{{ isDole ? 'GIP Work Accomplishment Report' : 'Accomplishment Report' }}</CardTitle>
            <CardDescription>
              Term {{ formAppointment?.term_number }} · {{ formAppointment?.program }} · {{ formAppointment?.assigned_office }}
            </CardDescription>
          </div>
          <Badge v-if="currentReport" variant="outline" :class="badgeClass[currentReport.status]">{{ currentReport.status }}</Badge>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="grid min-w-0 grid-cols-2 gap-3 sm:w-80">
            <div class="grid gap-1.5">
              <Label for="gipFrom">Date from</Label>
              <Input id="gipFrom" v-model="periodFrom" type="date" :min="periodMin" :max="periodFromMax" :disabled="isReadOnly || isSaving" />
            </div>
            <div class="grid gap-1.5">
              <Label for="gipTo">Date to</Label>
              <Input id="gipTo" v-model="periodTo" type="date" :min="periodFrom || periodMin" :max="periodMax" :disabled="isReadOnly || isSaving" />
            </div>
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
        <p v-if="periodError && !isReadOnly" class="text-sm text-destructive">{{ periodError }}</p>
      </CardHeader>

      <CardContent class="grid gap-6">
        <!-- PESO's remarks to act on -->
        <div v-if="currentReport?.status === 'Returned' && currentReport.review_remarks" class="border-l-2 border-warning pl-3">
          <p class="text-xs font-semibold text-warning uppercase">PESO remarks</p>
          <p class="text-sm text-pretty text-foreground">{{ currentReport.review_remarks }}</p>
        </div>

        <Alert v-if="currentReport?.status === 'Reviewed'">
          <FileText class="size-4" />
          <AlertTitle>Reviewed</AlertTitle>
          <AlertDescription>PESO reviewed this report on {{ formatDate(currentReport.reviewed_at) }}. It can no longer be changed.</AlertDescription>
        </Alert>

        <!-- ─── PGAS: Activities / Output / Remarks ─── -->
        <section v-if="!isDole" class="grid gap-3" aria-labelledby="gip-activities-title">
          <h2 id="gip-activities-title" class="text-sm font-semibold">Activities</h2>

          <ul class="grid gap-3">
            <li v-for="(row, index) in activities" :key="row.key" class="grid gap-3 rounded-lg border p-3">
              <div class="flex items-center justify-between gap-2">
                <Label :for="`activity-${row.key}`">Activity {{ index + 1 }}</Label>
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
              <Textarea
                :id="`activity-${row.key}`"
                v-model="row.activity"
                rows="2"
                :maxlength="activityMax"
                :aria-invalid="!!activityErrors[row.key]"
                :disabled="isReadOnly || isSaving"
                @input="onActivityInput(row)"
              />
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div class="grid gap-1.5">
                  <Label :for="`output-${row.key}`" class="text-xs">Output</Label>
                  <Input
                    :id="`output-${row.key}`"
                    v-model="row.output"
                    :maxlength="outputMax"
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
                placeholder="One accomplishment per line"
                :aria-invalid="!!dayErrors[day.date]"
                :disabled="isReadOnly || isSaving"
                @input="onDayInput(day)"
              />
              <Input v-else v-model="day.entry" :maxlength="entryMax" placeholder="Note" :disabled="isReadOnly || isSaving" />
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
          <h2 id="gip-payment-title" class="text-sm font-semibold">Payment <span class="font-normal text-muted-foreground">(days on duty × daily stipend)</span></h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div class="grid gap-1.5">
              <Label for="gipAmount">Amount (₱)</Label>
              <Input
                id="gipAmount"
                v-model="details.amount"
                inputmode="decimal"
                placeholder="0.00"
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
                  <WandSparkles class="size-3.5" /> Fill in
                </Button>
              </div>
              <Textarea
                id="gipAmountWords"
                v-model="details.amount_in_words"
                rows="2"
                :maxlength="wordsMax"
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
          <h2 id="gip-signatories-title" class="text-sm font-semibold">Signatories</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div v-if="!isDole" class="grid gap-1.5 sm:col-span-2">
              <Label for="gipDesignation">Designation</Label>
              <Input id="gipDesignation" v-model="details.designation" :maxlength="nameMax" :disabled="isReadOnly || isSaving" />
            </div>
            <div class="grid gap-1.5 sm:col-span-2">
              <Label for="gipSupervisor">Supervisor</Label>
              <Input id="gipSupervisor" v-model="details.supervisor_name" :maxlength="nameMax" :disabled="isReadOnly || isSaving" />
            </div>
            <div class="grid gap-1.5">
              <Label for="gipApprover">Office head</Label>
              <Input id="gipApprover" v-model="details.approver_name" :maxlength="nameMax" :disabled="isReadOnly || isSaving" />
            </div>
            <div class="grid gap-1.5">
              <Label for="gipApproverPosition">Position</Label>
              <Input id="gipApproverPosition" v-model="details.approver_position" :maxlength="nameMax" :disabled="isReadOnly || isSaving" />
            </div>
          </div>
          <p
            v-for="field in (['designation', 'supervisor_name', 'approver_name', 'approver_position'] as const)"
            v-show="detailErrors[field]"
            :key="field"
            class="text-sm text-destructive"
          >
            {{ detailErrors[field] }}
          </p>
        </section>

        <!-- ─── Supporting PDF (e.g. the signed copy) ─── -->
        <div class="grid gap-2">
          <span class="text-sm font-medium">Signed copy <span class="font-normal text-muted-foreground">(optional)</span></span>
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
          <template v-if="!periodError && isEarly">Ends {{ formatDate(periodTo) }}.</template>
          <template v-else-if="currentReport?.status === 'Submitted'">Submitted {{ formatDate(currentReport.submitted_at) }}.</template>
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

    <!-- ─── Submitting before the report's last day ─── -->
    <AlertDialog :open="isEarlySubmitDialogOpen" @update:open="(open) => { if (!open && !isSaving) isEarlySubmitDialogOpen = false }">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle class="flex items-center gap-2">
            <AlertTriangle class="size-5 shrink-0 text-warning" />
            Submit before {{ formatDate(periodTo) }}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            These dates aren't over yet, so days after today won't be included.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isSaving">Cancel</AlertDialogCancel>
          <Button class="cursor-pointer" :disabled="isSaving" @click="confirmEarlySubmit">
            <Loader2 v-if="savingMode === 'submit'" class="size-4 animate-spin" />
            {{ savingMode === 'submit' ? 'Submitting...' : 'Submit anyway' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
