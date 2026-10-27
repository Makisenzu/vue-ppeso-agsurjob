<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, ArrowRight, CalendarClock, Check, FileText, Loader2, Pencil, RotateCcw, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import SpesFormSteps from '@/components/SpesFormSteps.vue'
import SpesCompletionReportList from '@/components/SpesCompletionReportList.vue'
import GipRequirementList from '@/components/applicant/Gip/GipRequirementList.vue'
import { useSpesApplicationForm } from '@/composables/applicant/useSpesApplicationForm'
import { formatSpesAssignment, formatSpesFormDate } from '@/helpers/common/spesFormHelper'

const {
  backLink,
  isLoading,
  errorMessage,
  isSubmitting,
  hasApplied,
  isReapplying,
  canReapply,
  startReapply,
  cancelReapply,
  detailsForm,
  hasSavedDetails,
  savedDetails,
  confirmDetails,
  wizardSteps,
  currentStep,
  reachedStep,
  currentStepMeta,
  isLastStep,
  goToStep,
  nextStep,
  previousStep,
  requirements,
  attachedRequirements,
  attachmentAccept,
  profileDocuments,
  canUpload,
  hasPendingChanges,
  selectFile,
  removeFile,
  attachProfileDocument,
  submit,
  statusLabel,
  statusDescription,
  statusRemarks,
  appliedOn,
  orientation,
  applicationDetails,
  progressSteps,
  currentAppointment,
  completionReports,
  busyReportType,
  canSubmitReports,
  onReportPicked,
  onReportRemoved,
  reload,
} = useSpesApplicationForm()

const STATUS_BADGE_CLASS: Record<string, string> = {
  Pending: 'bg-warning/10 text-warning border-warning/30',
  Approved: 'bg-success/10 text-success border-success/30',
  Appointed: 'bg-primary/10 text-primary border-primary/30',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

// The SPES form has its own step list beside it, so a first application's details step gets more room
const isFillingDetails = computed(() => !hasApplied.value && !hasSavedDetails.value && currentStepMeta.value.key === 'details')

// Same stepper look as the GIP application (ApplicantGipApplicationForm.vue)
const SEPARATOR_CLASS =
  'absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-4 h-0.5 rounded-full bg-border transition-colors duration-300 group-data-[state=completed]:bg-primary sm:left-[calc(50%+18px)] sm:right-[calc(-50%+18px)]'
const INDICATOR_CLASS =
  'size-7 border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors duration-300 group-data-[state=active]:border-primary group-data-[state=active]:ring-4 group-data-[state=active]:ring-primary/15 group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground sm:size-8'
</script>

<template>
  <div class="mx-auto flex w-full flex-col gap-8 pb-16" :class="isFillingDetails ? 'max-w-6xl' : 'max-w-3xl'">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4">
      <RouterLink
        :to="backLink.to"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> {{ backLink.label }}
      </RouterLink>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">SPES Application</h1>
          <p class="text-sm text-pretty text-muted-foreground">
            <template v-if="hasApplied">Applied {{ appliedOn }}. {{ statusDescription }}</template>
            <template v-else-if="isReapplying">Apply again with your saved details.</template>
            <template v-else>Apply in three steps. Every requirement is an image or PDF of up to 10 MB.</template>
          </p>
        </div>
        <Badge v-if="hasApplied && !isLoading" variant="outline" class="self-start" :class="STATUS_BADGE_CLASS[statusLabel]">
          {{ statusLabel }}
        </Badge>
      </div>
      <!-- Remarks set apart from the status text: they are PESO's own words -->
      <div v-if="hasApplied && statusRemarks" class="border-l-2 border-destructive pl-3">
        <p class="text-xs font-semibold text-destructive uppercase">Remarks</p>
        <p class="text-sm text-pretty text-foreground">{{ statusRemarks }}</p>
      </div>
      <!-- Orientation set by PESO on approval: when to come to the office -->
      <Alert v-if="hasApplied && orientation">
        <CalendarClock class="size-4" />
        <AlertTitle>Orientation at the PESO office</AlertTitle>
        <AlertDescription class="flex flex-col gap-1">
          <p class="font-medium text-foreground">{{ orientation.date }} · {{ orientation.time }}</p>
          <p v-if="orientation.note" class="text-pretty whitespace-pre-line">{{ orientation.note }}</p>
        </AlertDescription>
      </Alert>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-3" aria-busy="true">
      <Skeleton class="h-10 w-full" />
      <Skeleton v-for="i in 4" :key="i" class="h-14 w-full" />
    </div>

    <Alert v-else-if="errorMessage" variant="destructive">
      <AlertTitle>Your SPES application could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <!-- ═══ Applying: three-step wizard ═══ -->
    <div v-else-if="!hasApplied" class="flex flex-col gap-8">
      <Stepper :model-value="currentStep + 1" class="mx-auto flex w-full max-w-3xl items-start gap-1 sm:gap-2">
        <StepperItem
          v-for="(step, index) in wizardSteps"
          :key="step.key"
          :step="index + 1"
          :disabled="index > reachedStep || isSubmitting"
          class="relative flex flex-1 flex-col items-center"
        >
          <StepperSeparator v-if="index !== wizardSteps.length - 1" :class="SEPARATOR_CLASS" />
          <StepperTrigger type="button" class="z-10 gap-1.5" @click="goToStep(index)">
            <StepperIndicator :class="INDICATOR_CLASS">
              <Check v-if="index < currentStep" class="size-3.5 shrink-0" />
              <span v-else>{{ index + 1 }}</span>
            </StepperIndicator>
            <StepperTitle class="hidden text-xs font-medium text-muted-foreground sm:block group-data-[state=active]:text-foreground">
              {{ step.title }}
            </StepperTitle>
          </StepperTrigger>
        </StepperItem>
      </Stepper>

      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-semibold text-foreground">
          <span class="sm:hidden">{{ currentStep + 1 }}. </span>{{ currentStepMeta.title }}
        </h2>
        <p class="text-sm text-muted-foreground">{{ currentStepMeta.description }}</p>
      </div>

      <!-- Step 1: the SPES form — filled in once, then reused -->
      <section v-if="currentStepMeta.key === 'details'" class="flex flex-col gap-3" aria-label="Your details">
        <template v-if="hasSavedDetails">
          <dl class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
            <div v-for="detail in savedDetails" :key="detail.label" class="flex flex-col gap-0.5 border-b border-border py-3">
              <dt class="text-xs font-medium text-muted-foreground uppercase">{{ detail.label }}</dt>
              <dd class="text-sm break-words text-foreground">{{ detail.value }}</dd>
            </div>
          </dl>
          <Button as-child variant="outline" size="sm" class="w-fit">
            <RouterLink :to="{ name: 'spes-details' }"><Pencil class="size-4" /> Edit details</RouterLink>
          </Button>
        </template>
        <SpesFormSteps
          v-else
          :form="detailsForm"
          submit-label="Continue to requirements"
          certification-label="I certify that the information I provided is true and correct, and I authorize PESO to verify it."
          @submit="confirmDetails"
        />
      </section>

      <!-- Step 2: attach the files -->
      <section v-else-if="currentStepMeta.key === 'requirements'" aria-label="Requirements">
        <GipRequirementList
          :requirements="requirements"
          :can-upload="canUpload"
          :is-submitting="isSubmitting"
          :is-generating-nsrp="false"
          :attachment-accept="attachmentAccept"
          :profile-documents="profileDocuments"
          upload-label="Upload file"
          @use-profile="attachProfileDocument"
          @pick="selectFile"
          @remove="removeFile"
        />
      </section>

      <!-- Step 3: review -->
      <section v-else class="flex flex-col gap-6" aria-label="Review and submit">
        <div class="flex flex-col gap-2">
          <h3 class="text-sm font-semibold text-foreground">Requirements</h3>
          <ul class="flex flex-col">
            <li
              v-for="doc in requirements"
              :key="doc.name"
              class="flex items-center justify-between gap-3 border-t border-border py-3 text-sm last:border-b"
            >
              <span class="shrink-0 text-foreground">{{ doc.name }}</span>
              <span v-if="doc.pendingFileName || doc.savedFileName" class="flex min-w-0 items-center gap-1 text-muted-foreground">
                <FileText class="size-4 shrink-0" />
                <span class="truncate">{{ doc.pendingFileName ?? doc.savedFileName }}</span>
                <span v-if="doc.isFromProfile" class="hidden shrink-0 text-xs sm:inline">· from your documents</span>
              </span>
              <span v-else class="inline-flex items-center gap-1 text-muted-foreground">
                <X class="size-4" /> Not attached
              </span>
            </li>
          </ul>
          <p class="text-xs text-muted-foreground">
            {{ attachedRequirements.length }} of {{ requirements.length }} attached. PESO is notified when you submit, and
            you can still replace a file until they review it.
          </p>
        </div>
      </section>

      <!-- Navigation; a first application's details step uses the SPES form's own buttons -->
      <div v-if="!isFillingDetails" class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          v-if="currentStep > 0"
          type="button"
          variant="outline"
          size="lg"
          class="cursor-pointer"
          :disabled="isSubmitting"
          @click="previousStep"
        >
          <ArrowLeft class="size-4" /> Back
        </Button>
        <Button
          v-else-if="isReapplying"
          type="button"
          variant="outline"
          size="lg"
          class="cursor-pointer"
          @click="cancelReapply"
        >
          Cancel
        </Button>
        <span v-else />
        <Button v-if="!isLastStep" type="button" size="lg" class="cursor-pointer" @click="nextStep">
          Next <ArrowRight class="size-4" />
        </Button>
        <Button v-else type="button" size="lg" class="cursor-pointer" :disabled="isSubmitting" @click="submit">
          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
          {{ isSubmitting ? 'Submitting...' : 'Submit application' }}
        </Button>
      </div>
    </div>

    <!-- ═══ Applied: progress and details ═══ -->
    <div v-else class="flex flex-col gap-8">
      <!-- Read-only progress; Not approved shows in the destructive color -->
      <ol class="flex w-full items-start gap-1 sm:gap-2" aria-label="Application progress">
        <li
          v-for="(step, index) in progressSteps"
          :key="step.title"
          class="relative flex flex-1 flex-col items-center gap-1.5"
          :aria-current="step.state === 'active' ? 'step' : undefined"
        >
          <span
            v-if="index !== progressSteps.length - 1"
            class="absolute top-4 right-[calc(-50%+14px)] left-[calc(50%+14px)] h-0.5 rounded-full sm:right-[calc(-50%+18px)] sm:left-[calc(50%+18px)]"
            :class="step.state === 'completed' ? 'bg-primary' : 'bg-border'"
            aria-hidden="true"
          />
          <span
            class="z-10 flex size-7 items-center justify-center rounded-full border text-xs font-semibold sm:size-8"
            :class="{
              'border-primary bg-primary text-primary-foreground': step.state === 'completed',
              'border-primary bg-background text-foreground ring-4 ring-primary/15': step.state === 'active',
              'border-border bg-background text-muted-foreground': step.state === 'upcoming',
              'border-destructive bg-destructive text-primary-foreground': step.state === 'rejected',
            }"
          >
            <Check v-if="step.state === 'completed'" class="size-3.5" />
            <X v-else-if="step.state === 'rejected'" class="size-3.5" />
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span
            class="text-center text-[11px] font-medium sm:text-xs"
            :class="{
              'text-foreground': step.state === 'active' || step.state === 'completed',
              'text-destructive': step.state === 'rejected',
              'text-muted-foreground': step.state === 'upcoming',
            }"
          >
            {{ step.title }}
          </span>
        </li>
      </ol>

      <!-- A new round once this one is over -->
      <div v-if="canReapply" class="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted-foreground">Apply again with your saved details.</p>
        <Button type="button" class="cursor-pointer" @click="startReapply">
          <RotateCcw class="size-4" /> Apply again
        </Button>
      </div>

      <section aria-labelledby="spes-form-details-title" class="flex flex-col gap-3">
        <h2 id="spes-form-details-title" class="text-lg font-semibold text-foreground">Application Details</h2>
        <dl class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
          <div v-for="detail in applicationDetails" :key="detail.label" class="flex flex-col gap-0.5 border-b border-border py-3">
            <dt class="text-xs font-medium text-muted-foreground uppercase">{{ detail.label }}</dt>
            <dd class="text-sm text-foreground">{{ detail.value }}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="spes-form-applicant-title" class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="spes-form-applicant-title" class="text-lg font-semibold text-foreground">Your SPES Details</h2>
          <Button as-child variant="outline" size="sm">
            <RouterLink :to="{ name: 'spes-details' }"><Pencil class="size-4" /> Edit details</RouterLink>
          </Button>
        </div>
        <dl class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
          <div v-for="detail in savedDetails" :key="detail.label" class="flex flex-col gap-0.5 border-b border-border py-3">
            <dt class="text-xs font-medium text-muted-foreground uppercase">{{ detail.label }}</dt>
            <dd class="text-sm break-words text-foreground">{{ detail.value }}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="spes-form-requirements-title" class="flex flex-col gap-3">
        <h2 id="spes-form-requirements-title" class="text-lg font-semibold text-foreground">Requirements</h2>
        <GipRequirementList
          :requirements="requirements"
          :can-upload="canUpload"
          :is-submitting="isSubmitting"
          :is-generating-nsrp="false"
          :attachment-accept="attachmentAccept"
          :profile-documents="profileDocuments"
          upload-label="Upload file"
          @use-profile="attachProfileDocument"
          @pick="selectFile"
          @remove="removeFile"
        />
        <p v-if="!canUpload" class="text-sm text-muted-foreground">
          PESO has reviewed your application, so the files can no longer be changed.
        </p>
      </section>

      <div v-if="canUpload && hasPendingChanges" class="flex justify-end">
        <Button type="button" size="lg" class="w-full cursor-pointer sm:w-auto" :disabled="isSubmitting" @click="submit">
          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
          {{ isSubmitting ? 'Saving...' : 'Save documents' }}
        </Button>
      </div>

      <!-- ─── Appointment: submit DTR & Accomplishment Report ─── -->
      <section v-if="currentAppointment" aria-labelledby="spes-form-appointment-title" class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="spes-form-appointment-title" class="text-lg font-semibold text-foreground">
            SPES {{ currentAppointment.spes_year }} Appointment
          </h2>
          <Badge variant="outline">{{ currentAppointment.status }}</Badge>
        </div>
        <dl class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
          <div class="flex flex-col gap-0.5 border-b border-border py-3">
            <dt class="text-xs font-medium text-muted-foreground uppercase">Assignment</dt>
            <dd class="text-sm text-foreground">{{ formatSpesAssignment(currentAppointment) }}</dd>
          </div>
          <div class="flex flex-col gap-0.5 border-b border-border py-3">
            <dt class="text-xs font-medium text-muted-foreground uppercase">Period</dt>
            <dd class="text-sm text-foreground">
              {{ formatSpesFormDate(currentAppointment.start_date) }} – {{ formatSpesFormDate(currentAppointment.end_date) }}
              ({{ currentAppointment.days_duration }} days)
            </dd>
          </div>
          <div class="flex flex-col gap-0.5 border-b border-border py-3">
            <dt class="text-xs font-medium text-muted-foreground uppercase">Appointment code</dt>
            <dd class="font-mono text-sm text-foreground">{{ currentAppointment.appointment_code }}</dd>
          </div>
        </dl>
        <p class="text-sm text-muted-foreground">
          <template v-if="canSubmitReports">Upload your DTR and Accomplishment Report as PDFs; PESO completes your SPES once both are in.</template>
          <template v-else-if="currentAppointment.status === 'Completed'">PESO has marked your SPES appointment as completed.</template>
          <template v-else>Your SPES appointment has ended.</template>
        </p>
        <SpesCompletionReportList
          :reports="completionReports"
          :busy-type="busyReportType"
          :readonly="!canSubmitReports"
          @upload="onReportPicked"
          @remove="onReportRemoved"
        />
      </section>
    </div>
  </div>
</template>
