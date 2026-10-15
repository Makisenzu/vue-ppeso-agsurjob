<script setup lang="ts">
import { Check, Loader2 } from '@lucide/vue'
import { useApplicantCompletion } from '@/composables/applicant/useApplicantCompletion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import NsrpPersonalFields from '@/components/applicant/Profile/Nsrp/NsrpPersonalFields.vue'
import NsrpEducationFields from '@/components/applicant/Profile/Nsrp/NsrpEducationFields.vue'
import NsrpExperienceFields from '@/components/applicant/Profile/Nsrp/NsrpExperienceFields.vue'
import NsrpPreferenceFields from '@/components/applicant/Profile/Nsrp/NsrpPreferenceFields.vue'

const {
  steps,
  currentStep,
  reachedStep,
  currentStepKey,
  currentStepMeta,
  isLastStep,
  prevStep,
  goToStep,
  saveAndContinue,
  record,
  isLoading,
  isSubmitting,
  displayName,
} = useApplicantCompletion()
</script>

<template>
  <!--
    Mobile: tighter card padding, 44px inputs, 16px select text (no iOS zoom),
    and a fixed action bar so Save stays in reach on long steps.
  -->
  <div
    class="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6 **:data-[slot=native-select-wrapper]:w-full!
      max-sm:**:data-[slot=card]:gap-4 max-sm:**:data-[slot=card]:py-5 max-sm:**:data-[slot=card-header]:px-4 max-sm:**:data-[slot=card-content]:px-4
      max-sm:**:data-[slot=input]:h-11 max-sm:**:data-[slot=native-select]:h-11 max-sm:**:data-[slot=native-select]:text-base"
  >
    <header class="space-y-1">
      <p class="text-xs font-medium text-muted-foreground">Step {{ currentStep + 1 }} of {{ steps.length }}</p>
      <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Complete your NSRP profile</h1>
      <p class="text-sm text-muted-foreground">
        Welcome, {{ displayName }}. PESO Agusan del Sur needs your full NSRP details before you can search jobs and
        apply to programs. Your answers are saved after every step.
      </p>
    </header>

    <!-- ─── Progress ─── -->
    <Stepper :model-value="currentStep + 1" class="flex w-full items-start gap-1 sm:gap-2">
      <StepperItem
        v-for="(step, index) in steps"
        :key="step.key"
        :step="index + 1"
        :disabled="index > reachedStep + 1"
        class="relative flex flex-1 flex-col items-center"
      >
        <StepperSeparator
          v-if="index !== steps.length - 1"
          class="absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-4 h-0.5 rounded-full bg-border transition-colors duration-300 group-data-[state=completed]:bg-primary sm:left-[calc(50%+18px)] sm:right-[calc(-50%+18px)]"
        />
        <StepperTrigger class="z-10 gap-1.5" @click="goToStep(index)">
          <StepperIndicator
            class="size-7 border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors duration-300 group-data-[state=active]:border-primary group-data-[state=active]:ring-4 group-data-[state=active]:ring-primary/15 group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground sm:size-8"
          >
            <Check v-if="index < currentStep" class="size-3.5 shrink-0" />
            <span v-else>{{ index + 1 }}</span>
          </StepperIndicator>
          <StepperTitle class="hidden text-xs font-medium text-muted-foreground sm:block group-data-[state=active]:text-foreground">
            {{ step.title }}
          </StepperTitle>
        </StepperTrigger>
      </StepperItem>
    </Stepper>

    <div class="sm:hidden">
      <h2 class="text-base font-semibold text-foreground">{{ currentStepMeta.title }}</h2>
      <p class="text-sm text-muted-foreground">{{ currentStepMeta.description }}</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-6">
      <Skeleton v-for="n in 3" :key="n" class="h-48 w-full rounded-xl" />
    </div>

    <form v-else class="pb-24 sm:pb-0" @submit.prevent="saveAndContinue">
      <div
        :key="currentStepKey"
        class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none sm:space-y-6"
      >
        <!-- Field sections are shared with the profile page editor (components/applicant/Profile/Nsrp) -->
        <NsrpPersonalFields
          v-if="currentStepKey === 'personal'"
          :about-description="
            record ? 'Details not yet on your record.' : 'We could not find your applicant record, so please confirm these details.'
          "
        />
        <NsrpEducationFields v-else-if="currentStepKey === 'education'" />
        <NsrpExperienceFields v-else-if="currentStepKey === 'experience'" />
        <NsrpPreferenceFields v-else />
      </div>

      <!-- ─── Actions (fixed on mobile, inline on desktop) ─── -->
      <div
        class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[auto_1fr] gap-3 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/80
          sm:static sm:z-auto sm:mt-6 sm:flex sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      >
        <Button
          type="button"
          variant="outline"
          class="h-11 px-5 sm:h-9 sm:px-4"
          :class="currentStep === 0 && 'invisible'"
          :disabled="isSubmitting"
          @click="prevStep"
        >
          Back
        </Button>
        <Button type="submit" class="h-11 text-base sm:h-9 sm:text-sm" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
          {{ isSubmitting ? 'Saving...' : isLastStep ? 'Finish' : 'Save and continue' }}
        </Button>
      </div>
    </form>
  </div>
</template>
