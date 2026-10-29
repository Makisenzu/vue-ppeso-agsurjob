<script setup lang="ts">
import { Check, Clock, X } from '@lucide/vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Stepper, StepperDescription, StepperItem, StepperTitle } from '@/components/ui/stepper'
import type { CompanyDocumentStep } from '@/helpers/common/companyRequirementHelper'
import type { CompanyRequirementItem } from '@/types/employer/companyRequirement'

/**
 * Document Upload Progress of a company, laid out like the applicant's (ProfileDocuments.vue):
 * a vertical timeline on mobile, a horizontal stepper from sm up.
 */
const props = defineProps<{
  steps: { item: CompanyRequirementItem; step: CompanyDocumentStep }[]
  isLoading: boolean
}>()

const ICONS = { check: Check, clock: Clock, x: X }
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-sm font-semibold text-foreground">Document Upload Progress</h3>
        <p class="mt-0.5 text-xs text-muted-foreground">
          Please ensure all required documents are uploaded to verify your company.
        </p>
      </div>
    </div>

    <div v-if="props.isLoading && props.steps.length === 0" class="flex gap-4">
      <Skeleton v-for="n in 3" :key="n" class="h-16 flex-1 rounded-lg" />
    </div>

    <p v-else-if="props.steps.length === 0" class="rounded-lg border py-6 text-center text-sm text-muted-foreground">
      The document list is not set up yet. Please check back later.
    </p>

    <!-- Mobile: vertical timeline. sm and up: the horizontal stepper -->
    <Stepper
      v-else
      :linear="false"
      class="flex w-full flex-col gap-0 sm:flex-row sm:items-start sm:overflow-x-auto sm:pb-2"
    >
      <StepperItem
        v-for="({ item, step }, index) in props.steps"
        :key="item.templateId"
        :step="index + 1"
        class="group relative flex w-full items-start gap-3 sm:w-auto sm:min-w-32 sm:flex-1 sm:flex-col sm:items-center sm:gap-0"
        :class="index < props.steps.length - 1 && 'max-sm:pb-4'"
      >
        <!-- Mobile only: vertical connector from this circle down to the next -->
        <div
          v-if="index < props.steps.length - 1"
          class="absolute top-9 bottom-0 left-4.25 w-0.5 transition-colors duration-300 sm:hidden"
          :class="step.separatorClass"
          aria-hidden="true"
        />

        <!-- Each step draws both halves of its connectors, so adjacent steps always meet edge to edge -->
        <div class="flex shrink-0 items-center sm:w-full">
          <div
            class="h-0.5 flex-1 transition-colors duration-300 max-sm:hidden"
            :class="index === 0 ? 'invisible' : props.steps[index - 1].step.separatorClass"
            aria-hidden="true"
          />
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300"
            :class="step.circleClass"
          >
            <component :is="ICONS[step.icon]" class="size-4 stroke-3" />
          </div>
          <div
            class="h-0.5 flex-1 transition-colors duration-300 max-sm:hidden"
            :class="index === props.steps.length - 1 ? 'invisible' : step.separatorClass"
            aria-hidden="true"
          />
        </div>

        <div class="flex min-h-9 min-w-0 flex-1 flex-col justify-center sm:min-h-0 sm:items-center sm:px-1 sm:text-center">
          <div class="min-w-0 sm:mt-2">
            <StepperTitle class="truncate text-sm font-semibold text-foreground sm:max-w-36 sm:text-xs" :title="item.name">
              {{ item.name }}
            </StepperTitle>
            <StepperDescription class="mt-0.5 text-xs font-medium sm:text-[10px]" :class="step.textClass">
              {{ step.label }}
            </StepperDescription>
          </div>
        </div>
      </StepperItem>
    </Stepper>
  </div>
</template>
