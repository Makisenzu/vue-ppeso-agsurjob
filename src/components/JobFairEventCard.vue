<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { ArrowRight, Building2, CalendarDays, MapPin, Users } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import type { JobFairEventCard } from '@/helpers/common/jobFairEventHelper'

/** One job fair in the applicant / employer Job Fairs list */
defineProps<{
  card: JobFairEventCard
  to: RouteLocationRaw
  actionLabel: string
}>()
</script>

<template>
  <AppLink
    :to="to"
    class="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  >
    <div class="flex flex-1 flex-col gap-3 p-5">
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="outline" :class="card.statusClass">{{ card.status }}</Badge>
        <Badge v-if="card.badge" variant="outline" :class="card.badge.class">{{ card.badge.label }}</Badge>
      </div>
      <h2 class="text-lg font-semibold text-pretty text-foreground group-hover:text-primary">{{ card.title }}</h2>
      <dl class="grid gap-2 text-sm">
        <div class="flex min-w-0 items-center gap-2">
          <dt class="sr-only">Date</dt>
          <CalendarDays class="size-4 shrink-0 text-muted-foreground" />
          <dd class="truncate">{{ card.dateRange }}</dd>
        </div>
        <div class="flex min-w-0 items-center gap-2">
          <dt class="sr-only">Venue</dt>
          <MapPin class="size-4 shrink-0 text-muted-foreground" />
          <dd class="truncate" :title="card.location">{{ card.location }}</dd>
        </div>
      </dl>
    </div>

    <div class="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
      <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"><Building2 class="size-3.5" /> {{ card.companies }}</span>
        <span class="inline-flex items-center gap-1.5"><Users class="size-3.5" /> {{ card.openings }}</span>
      </div>
      <span class="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
        {{ actionLabel }}
        <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </AppLink>
</template>
