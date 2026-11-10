<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { formatWeekday } from '@/helpers/common/gipAccomplishmentHelper'
import {
  GIP_ACCOMPLISHMENT_DAY_BADGE_CLASS,
  type GipAccomplishmentDay,
} from '@/types/common/gipAccomplishment'

/** Read-only daily entries of a GIP accomplishment report (intern's past reports, PESO's review) */
defineProps<{ days: GipAccomplishmentDay[] }>()
</script>

<template>
  <ul class="divide-y rounded-lg border">
    <li v-for="day in days" :key="day.date" class="grid gap-1 px-3 py-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <div class="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
        <span class="text-xs font-medium tabular-nums">{{ formatWeekday(day.date) }}</span>
        <Badge v-if="day.status !== 'Worked'" variant="outline" :class="GIP_ACCOMPLISHMENT_DAY_BADGE_CLASS[day.status]">
          {{ day.status }}
        </Badge>
      </div>
      <p class="text-sm whitespace-pre-line text-pretty" :class="!day.entry && 'text-muted-foreground'">
        {{ day.entry || (day.status === 'Worked' ? '—' : 'No note') }}
      </p>
    </li>
  </ul>
</template>
