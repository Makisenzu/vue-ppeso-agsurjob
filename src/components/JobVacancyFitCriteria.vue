<script setup lang="ts">
import { CircleCheck, CircleDot, CircleQuestionMark, CircleX } from '@lucide/vue'
import { FIT_STATUS_TEXT_CLASS } from '@/helpers/common/jobVacancyFitHelper'
import type { FitCriterionView, FitStatus } from '@/types/common/jobVacancyFit'

/** The vacancy fit, one row per requirement (migration 098); used by the employer review and the applicant's job page */
defineProps<{
  criteria: FitCriterionView[]
  /** Label above the missing chips, e.g. "Missing" or "Not on your profile" */
  missingLabel?: string
}>()

const STATUS_ICON: Record<FitStatus, typeof CircleCheck> = {
  met: CircleCheck,
  partial: CircleDot,
  unmet: CircleX,
  unknown: CircleQuestionMark,
}
</script>

<template>
  <ul class="flex flex-col">
    <li
      v-for="criterion in criteria"
      :key="criterion.key"
      class="flex items-start gap-3 border-b border-border py-3 text-sm last:border-b-0"
    >
      <component
        :is="STATUS_ICON[criterion.status]"
        class="mt-0.5 size-4 shrink-0"
        :class="FIT_STATUS_TEXT_CLASS[criterion.status]"
        aria-hidden="true"
      />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span class="font-medium text-foreground">
            {{ criterion.label }}<span v-if="criterion.isOptional" class="font-normal text-muted-foreground"> · not required</span>
          </span>
          <span class="text-xs font-medium" :class="FIT_STATUS_TEXT_CLASS[criterion.status]">{{ criterion.statusLabel }}</span>
        </div>
        <p class="text-xs text-pretty break-words text-muted-foreground">{{ criterion.detail }}</p>
        <div v-if="criterion.missing.length" class="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span class="text-xs text-muted-foreground">{{ missingLabel ?? 'Missing' }}:</span>
          <span
            v-for="item in criterion.missing"
            :key="item"
            class="rounded-md border border-border px-1.5 py-0.5 text-xs text-foreground"
          >
            {{ item }}
          </span>
        </div>
      </div>
    </li>
  </ul>
</template>
