<script setup lang="ts">
import { ArrowLeft, ArrowRight, Check, ChevronRight, Loader2, ShieldAlert } from '@lucide/vue'
import CustomBreadcrumbs from '@/components/CustomBreadcrumbs.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import JobVacancyFields from '@/components/JobVacancyFields.vue'
import JobPostingRequirementsField from '@/components/employer/CompanyManagement/JobPosting/JobPostingRequirementsField.vue'
import JobPostingAttachmentsField from '@/components/employer/CompanyManagement/JobPosting/JobPostingAttachmentsField.vue'
import JobPostingStagesField from '@/components/employer/CompanyManagement/JobPosting/JobPostingStagesField.vue'
import { useJobPostingForm } from '@/composables/employer/useJobPostingForm'

/** Post a Job / Edit Job Posting (owner only): the posting form as its own page with a stepper */
const {
  pageTitle,
  isEditMode,
  isCompanyVerified,
  isLoadingPosting,
  loadError,
  reload,
  isSaving,
  steps,
  currentStep,
  reachedStep,
  currentStepMeta,
  isLastStep,
  nextStep,
  previousStep,
  goToStep,
  onSubmit,
  goBackToList,
  review,
  attachmentItems,
  attachmentError,
  attachmentRemainingSlots,
  attachmentAccept,
  attachmentMaxSizeMB,
  attachmentMaxFiles,
  addAttachments,
  removeAttachment,
} = useJobPostingForm()

// Same stepper look as the application forms (ApplicantGipApplicationForm.vue)
const SEPARATOR_CLASS =
  'absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-4 h-0.5 rounded-full bg-border transition-colors duration-300 group-data-[state=completed]:bg-primary sm:left-[calc(50%+18px)] sm:right-[calc(-50%+18px)]'
const INDICATOR_CLASS =
  'size-7 border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors duration-300 group-data-[state=active]:border-primary group-data-[state=active]:ring-4 group-data-[state=active]:ring-primary/15 group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground sm:size-8'
</script>

<template>
  <div class="mx-auto w-full min-w-0 max-w-4xl flex-1 space-y-6 overflow-x-hidden px-0 sm:px-6 lg:px-8">
    <CustomBreadcrumbs />

    <div class="flex flex-col gap-3">
      <AppLink
        :to="{ name: 'job-postings' }"
        class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft class="size-4" /> Job Posting
      </AppLink>
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ pageTitle }}</h1>
        <p class="text-sm text-muted-foreground">Applicants and PESO see every detail you enter here.</p>
      </div>
    </div>

    <Alert v-if="!isEditMode && !isCompanyVerified">
      <ShieldAlert />
      <AlertTitle>Waiting for PESO verification</AlertTitle>
      <AlertDescription>You can post jobs once PESO approves your company documents.</AlertDescription>
    </Alert>

    <div v-if="isLoadingPosting" class="flex flex-col gap-3" aria-busy="true">
      <Skeleton class="h-10 w-full" />
      <Skeleton v-for="i in 5" :key="i" class="h-14 w-full" />
    </div>

    <Alert v-else-if="loadError" variant="destructive">
      <AlertTitle>{{ loadError }}</AlertTitle>
      <AlertDescription class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" @click="reload">Try again</Button>
        <Button type="button" variant="ghost" size="sm" @click="goBackToList">Back to Job Posting</Button>
      </AlertDescription>
    </Alert>

    <form v-else class="flex flex-col gap-8" @submit.prevent="onSubmit">
      <Stepper :model-value="currentStep + 1" class="flex w-full items-start gap-1 sm:gap-2">
        <StepperItem
          v-for="(step, index) in steps"
          :key="step.key"
          :step="index + 1"
          :disabled="index > reachedStep || isSaving"
          class="relative flex flex-1 flex-col items-center"
        >
          <StepperSeparator v-if="index !== steps.length - 1" :class="SEPARATOR_CLASS" />
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

      <!-- Every step stays mounted (v-show) so its fields keep their state and can be checked from Review -->
      <section v-show="currentStepMeta.key === 'details'" class="grid grid-cols-1 gap-5" aria-label="Job details">
        <JobVacancyFields :disabled="isSaving" />
      </section>

      <section v-show="currentStepMeta.key === 'requirements'" class="grid grid-cols-1 gap-6" aria-label="Requirements">
        <JobPostingRequirementsField :disabled="isSaving" />
        <Separator />
        <JobPostingAttachmentsField
          :items="attachmentItems"
          :remaining-slots="attachmentRemainingSlots"
          :max-files="attachmentMaxFiles"
          :max-size-mb="attachmentMaxSizeMB"
          :accept="attachmentAccept"
          :error="attachmentError"
          :disabled="isSaving"
          @add="addAttachments"
          @remove="removeAttachment"
        />
      </section>

      <section v-show="currentStepMeta.key === 'stages'" aria-label="Hiring steps">
        <JobPostingStagesField :disabled="isSaving" />
      </section>

      <!-- Review: what applicants will see, each part with a link back to its step -->
      <section v-if="currentStepMeta.key === 'review'" class="flex flex-col gap-6" aria-label="Review">
        <div class="space-y-1">
          <h3 class="text-xl font-semibold text-pretty">{{ review.title }}</h3>
          <p class="text-sm text-muted-foreground">{{ review.summary }}</p>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-semibold">Job details</h4>
            <Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goToStep(0)">Edit</Button>
          </div>
          <dl class="grid border-t border-border sm:grid-cols-2 sm:gap-x-8">
            <div v-for="detail in review.details" :key="detail.label" class="flex flex-col gap-0.5 border-b border-border py-3">
              <dt class="text-xs font-medium text-muted-foreground uppercase">{{ detail.label }}</dt>
              <dd class="text-sm break-words text-foreground">{{ detail.value }}</dd>
            </div>
          </dl>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-semibold">Requirements</h4>
            <Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goToStep(1)">Edit</Button>
          </div>
          <ul class="flex flex-col">
            <li
              v-for="item in review.requirements"
              :key="item.name"
              class="flex items-center justify-between gap-3 border-t border-border py-2.5 text-sm last:border-b"
            >
              <span class="min-w-0 truncate text-foreground">{{ item.name }}</span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ item.note }}</span>
            </li>
          </ul>
          <p class="text-xs text-muted-foreground">
            {{ review.attachmentCount ? `${review.attachmentCount} attachment${review.attachmentCount === 1 ? '' : 's'} for applicants.` : 'No attachments.' }}
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-semibold">Hiring steps</h4>
            <Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goToStep(2)">Edit</Button>
          </div>
          <ol class="flex flex-wrap items-center gap-x-1 gap-y-2">
            <li v-for="(name, index) in review.stages" :key="`${index}-${name}`" class="inline-flex items-center gap-1">
              <span
                class="rounded-md px-2 py-1 text-xs"
                :class="index === review.stages.length - 1 ? 'bg-success/10 text-success' : 'bg-muted text-foreground'"
              >
                {{ index + 1 }}. {{ name }}
              </span>
              <ChevronRight v-if="index !== review.stages.length - 1" class="size-3.5 text-muted-foreground" aria-hidden="true" />
            </li>
          </ol>
        </div>
      </section>

      <!-- Navigation: stays in reach at the bottom of the screen -->
      <div
        class="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-border bg-background/95 py-3 backdrop-blur sm:flex-row sm:justify-between"
      >
        <Button
          v-if="currentStep > 0"
          type="button"
          variant="outline"
          size="lg"
          class="cursor-pointer"
          :disabled="isSaving"
          @click="previousStep"
        >
          <ArrowLeft class="size-4" /> Back
        </Button>
        <Button v-else type="button" variant="ghost" size="lg" class="cursor-pointer" :disabled="isSaving" @click="goBackToList">
          Cancel
        </Button>
        <Button v-if="!isLastStep" type="button" size="lg" class="cursor-pointer" @click="nextStep">
          Next <ArrowRight class="size-4" />
        </Button>
        <Button v-else type="submit" size="lg" class="cursor-pointer" :disabled="isSaving || (!isEditMode && !isCompanyVerified)">
          <Loader2 v-if="isSaving" class="size-4 shrink-0 animate-spin" />
          {{ isSaving ? 'Saving...' : isEditMode ? 'Save changes' : 'Post job' }}
        </Button>
      </div>
    </form>
  </div>
</template>
