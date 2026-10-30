<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, ChevronDown, FileText, Loader2, Paperclip, Send, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import GipRequirementList from '@/components/applicant/Gip/GipRequirementList.vue'
import { useJobVacancyApplicationForm } from '@/composables/applicant/useJobVacancyApplicationForm'

const {
  backLink,
  job,
  requirements,
  attachmentAccept,
  attachmentMaxMb,
  isLoading,
  errorMessage,
  isLocked,
  canUpload,
  hasChanges,
  isSubmitting,
  hasApplied,
  stageLabel,
  stageClass,
  stageDescription,
  statusRemarks,
  appliedOn,
  applicationDetails,
  applicantDetails,
  isApplying,
  startApplying,
  wizardSteps,
  currentStep,
  reachedStep,
  currentStepMeta,
  isLastStep,
  attachedRequirements,
  progressSteps,
  goToStep,
  nextStep,
  previousStep,
  profileDocuments,
  selectFile,
  attachProfileDocument,
  removeFile,
  submit,
  reload,
} = useJobVacancyApplicationForm()

// Same stepper look as the GIP form (ApplicantGipApplicationForm.vue)
const SEPARATOR_CLASS =
  'absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-4 h-0.5 rounded-full bg-border transition-colors duration-300 group-data-[state=completed]:bg-primary sm:left-[calc(50%+18px)] sm:right-[calc(-50%+18px)]'
const INDICATOR_CLASS =
  'size-7 border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors duration-300 group-data-[state=active]:border-primary group-data-[state=active]:ring-4 group-data-[state=active]:ring-primary/15 group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground sm:size-8'
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-8 pb-16">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4">
      <AppLink
        :to="backLink.to"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> {{ backLink.label }}
      </AppLink>
      <div v-if="job" class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="text-xs font-semibold tracking-wide text-primary uppercase">{{ job.company }}</span>
          <h1 class="text-2xl font-bold tracking-tight text-pretty text-foreground sm:text-3xl">{{ job.title }}</h1>
          <p class="text-sm text-pretty text-muted-foreground">
            <template v-if="hasApplied">Applied {{ appliedOn }}. {{ stageDescription }}</template>
            <template v-else>{{ job.summary }}</template>
          </p>
        </div>
        <Badge v-if="hasApplied && !isLoading" variant="outline" class="self-start" :class="stageClass">
          {{ stageLabel }}
        </Badge>
      </div>
      <!-- Remarks set apart from the status text: they are the employer's own words -->
      <div v-if="statusRemarks" class="border-l-2 border-destructive pl-3">
        <p class="text-xs font-semibold text-destructive uppercase">Remarks</p>
        <p class="text-sm text-pretty text-foreground">{{ statusRemarks }}</p>
      </div>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-3" aria-busy="true">
      <Skeleton class="h-10 w-full" />
      <Skeleton v-for="i in 4" :key="i" class="h-14 w-full" />
    </div>

    <Alert v-else-if="errorMessage" variant="destructive">
      <AlertTitle>This vacancy could not be loaded</AlertTitle>
      <AlertDescription class="flex flex-col items-start gap-2">
        {{ errorMessage }}
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
      </AlertDescription>
    </Alert>

    <template v-else-if="job">
      <!-- ─── The job: hidden while filling in the wizard, collapsed once applied ─── -->
      <Collapsible v-if="!isApplying || hasApplied" :default-open="!hasApplied" class="flex flex-col gap-3">
        <CollapsibleTrigger as-child>
          <button
            type="button"
            class="group flex w-full cursor-pointer items-center justify-between gap-2 text-left text-lg font-semibold text-foreground"
          >
            About the job
            <ChevronDown class="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent class="flex flex-col gap-4">
          <p v-if="job.description" class="max-w-prose text-sm text-pretty whitespace-pre-line text-foreground">{{ job.description }}</p>
          <dl v-if="job.details.length" class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
            <div v-for="detail in job.details" :key="detail.label" class="flex flex-col gap-0.5 border-b border-border py-3">
              <dt class="text-xs font-medium text-muted-foreground uppercase">{{ detail.label }}</dt>
              <dd class="text-sm break-words text-foreground">{{ detail.value }}</dd>
            </div>
          </dl>
          <div class="flex flex-col gap-2">
            <h3 class="text-xs font-medium text-muted-foreground uppercase">Skills</h3>
            <p v-if="!job.skills.length" class="text-sm text-foreground">Not required</p>
            <ul v-else class="flex flex-wrap gap-2">
              <li
                v-for="skill in job.skills"
                :key="skill.skill_name"
                class="rounded-md border border-border px-2 py-1 text-xs"
                :class="skill.is_required ? 'text-foreground' : 'text-muted-foreground'"
              >
                {{ skill.skill_name }}<span v-if="!skill.is_required"> · nice to have</span>
              </li>
            </ul>
          </div>
          <div class="flex flex-col gap-2">
            <h3 class="text-xs font-medium text-muted-foreground uppercase">Documents to submit</h3>
            <ul class="flex flex-wrap gap-2">
              <li
                v-for="doc in job.documents"
                :key="doc.name"
                class="rounded-md border border-border px-2 py-1 text-xs"
                :class="doc.isOptional ? 'text-muted-foreground' : 'text-foreground'"
              >
                {{ doc.name }}<span v-if="doc.isOptional"> · optional</span>
              </li>
            </ul>
          </div>
          <!-- Stored file names are often random; the link says what it opens instead (numbered when there are several) -->
          <ul v-if="job.attachments.length" class="flex flex-wrap gap-2">
            <li v-for="(file, index) in job.attachments" :key="file.id">
              <Button v-if="file.url" variant="outline" size="sm" as-child class="w-full sm:w-auto">
                <AppLink :href="file.url" target="_blank">
                  <Paperclip class="size-4 shrink-0" />
                  Show Vacancy Attachment{{ job.attachments.length > 1 ? ` ${index + 1}` : '' }}
                </AppLink>
              </Button>
            </li>
          </ul>
        </CollapsibleContent>
      </Collapsible>

      <!-- ═══ Not applied: only the Apply now button under the job ═══ -->
      <div v-if="!hasApplied && !isApplying" class="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted-foreground">Have the documents above ready as PDF files.</p>
        <Button type="button" size="lg" class="w-full cursor-pointer sm:w-auto" @click="startApplying">
          <Send class="size-4" /> Apply now
        </Button>
      </div>

      <!-- ═══ Applying: three-step wizard ═══ -->
      <form v-else-if="!hasApplied" class="flex flex-col gap-8" @submit.prevent="submit">
        <Stepper :model-value="currentStep + 1" class="flex w-full items-start gap-1 sm:gap-2">
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

        <!-- Step 1: the applicant's profile details -->
        <section v-if="currentStepMeta.key === 'details'" class="flex flex-col gap-3" aria-label="Your details">
          <dl class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
            <div v-for="detail in applicantDetails" :key="detail.label" class="flex flex-col gap-0.5 border-b border-border py-3">
              <dt class="text-xs font-medium text-muted-foreground uppercase">{{ detail.label }}</dt>
              <dd class="text-sm break-words text-foreground">{{ detail.value }}</dd>
            </div>
          </dl>
          <p class="text-xs text-muted-foreground">The employer sees these. Something wrong? Update your profile first.</p>
        </section>

        <!-- Step 2: attach the files -->
        <section v-else-if="currentStepMeta.key === 'requirements'" class="flex flex-col gap-2" aria-label="Requirements">
          <p class="text-xs text-muted-foreground">PDF files up to {{ attachmentMaxMb }} MB.</p>
          <GipRequirementList
            :requirements="requirements"
            :can-upload="canUpload"
            :is-submitting="isSubmitting"
            :is-generating-nsrp="false"
            :attachment-accept="attachmentAccept"
            :profile-documents="profileDocuments"
            @use-profile="attachProfileDocument"
            @pick="selectFile"
            @remove="removeFile"
          />
        </section>

        <!-- Step 3: review -->
        <section v-else class="flex flex-col gap-2" aria-label="Review and submit">
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
            {{ attachedRequirements.length }} of {{ requirements.length }} attached. You can change your files until the
            employer reviews your application.
          </p>
        </section>

        <!-- Navigation -->
        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="lg"
            class="cursor-pointer"
            :disabled="isSubmitting"
            @click="previousStep"
          >
            <ArrowLeft class="size-4" /> {{ currentStep === 0 ? 'Back to job' : 'Back' }}
          </Button>
          <Button v-if="!isLastStep" type="button" size="lg" class="cursor-pointer" @click="nextStep">
            Next <ArrowRight class="size-4" />
          </Button>
          <Button v-else type="submit" size="lg" class="cursor-pointer" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Submitting...' : 'Submit application' }}
          </Button>
        </div>
      </form>

      <!-- ═══ Applied: progress and details ═══ -->
      <form v-else class="flex flex-col gap-8" @submit.prevent="submit">
        <!-- Read-only progress; Not selected shows in the destructive color -->
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

        <section aria-labelledby="job-form-details-title" class="flex flex-col gap-3">
          <h2 id="job-form-details-title" class="text-lg font-semibold text-foreground">Application Details</h2>
          <dl class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
            <div v-for="detail in applicationDetails" :key="detail.label" class="flex flex-col gap-0.5 border-b border-border py-3">
              <dt class="text-xs font-medium text-muted-foreground uppercase">{{ detail.label }}</dt>
              <dd class="text-sm break-words text-foreground">{{ detail.value }}</dd>
            </div>
          </dl>
        </section>

        <section v-if="applicantDetails.length" aria-labelledby="job-form-applicant-title" class="flex flex-col gap-3">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="job-form-applicant-title" class="text-lg font-semibold text-foreground">Applicant</h2>
            <span class="text-xs text-muted-foreground">From your profile</span>
          </div>
          <dl class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
            <div v-for="detail in applicantDetails" :key="detail.label" class="flex flex-col gap-0.5 border-b border-border py-3">
              <dt class="text-xs font-medium text-muted-foreground uppercase">{{ detail.label }}</dt>
              <dd class="text-sm break-words text-foreground">{{ detail.value }}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="job-form-requirements-title" class="flex flex-col gap-3">
          <h2 id="job-form-requirements-title" class="text-lg font-semibold text-foreground">Requirements</h2>
          <GipRequirementList
            :requirements="requirements"
            :can-upload="canUpload"
            :is-submitting="isSubmitting"
            :is-generating-nsrp="false"
            :attachment-accept="attachmentAccept"
            :profile-documents="profileDocuments"
            @use-profile="attachProfileDocument"
            @pick="selectFile"
            @remove="removeFile"
          />
          <p v-if="isLocked" class="text-sm text-muted-foreground">
            The employer has reviewed your application, so it can no longer be changed.
          </p>
        </section>

        <div v-if="canUpload && hasChanges" class="flex justify-end">
          <Button type="submit" size="lg" class="w-full cursor-pointer sm:w-auto" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Saving...' : 'Save changes' }}
          </Button>
        </div>
      </form>
    </template>

    <Alert v-else>
      <AlertTitle>Complete your profile first</AlertTitle>
      <AlertDescription>Complete your profile before you can apply to a vacancy.</AlertDescription>
    </Alert>
  </div>
</template>
