<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { ArrowRight, Building2, CalendarDays, MapPin, Megaphone, Users } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { JobFairEventCard } from '@/helpers/common/jobFairEventHelper'

/** One PESO job fair post in the applicant / employer Job Fairs feed */
defineProps<{
  card: JobFairEventCard
  to: RouteLocationRaw
  actionLabel: string
}>()
</script>

<template>
  <article class="overflow-hidden rounded-xl border bg-card" :aria-labelledby="`job-fair-post-${card.id}`">
    <!-- Author -->
    <header class="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
          <Megaphone class="size-5" />
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-foreground">Provincial PESO</p>
          <p class="text-xs text-muted-foreground">Posted {{ card.postedOn }}</p>
        </div>
      </div>
      <div class="flex shrink-0 flex-wrap justify-end gap-1.5">
        <Badge variant="outline" :class="card.statusClass">{{ card.status }}</Badge>
        <Badge v-if="card.badge" variant="outline" :class="card.badge.class">{{ card.badge.label }}</Badge>
      </div>
    </header>

    <!-- Post -->
    <div class="space-y-3 px-4 py-3 sm:px-5">
      <h2 :id="`job-fair-post-${card.id}`" class="text-lg font-semibold text-pretty text-foreground">
        <AppLink :to="to" class="hover:text-primary focus-visible:underline focus-visible:outline-none">{{ card.title }}</AppLink>
      </h2>
      <p v-if="card.description" class="line-clamp-4 text-sm whitespace-pre-line text-muted-foreground">{{ card.description }}</p>
      <dl class="grid gap-1.5 text-sm">
        <div class="flex min-w-0 items-center gap-2">
          <dt class="sr-only">Date</dt>
          <CalendarDays class="size-4 shrink-0 text-muted-foreground" />
          <dd>{{ card.dateRange }}</dd>
        </div>
        <div class="flex min-w-0 items-start gap-2">
          <dt class="sr-only">Venue</dt>
          <MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <dd class="min-w-0 break-words">{{ card.location }}</dd>
        </div>
      </dl>
    </div>

    <!-- Pictures PESO attached: 1 wide, 2 side by side, 3 = one wide over two, 4 = a 2×2 grid -->
    <AppLink
      v-if="card.images.length"
      :to="to"
      class="grid grid-cols-2 gap-0.5 bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      :aria-label="`Open ${card.title}`"
    >
      <div
        v-for="(image, index) in card.images"
        :key="image"
        class="relative overflow-hidden"
        :class="[
          card.images.length === 1 || (card.images.length === 3 && index === 0) ? 'col-span-2 aspect-video' : 'aspect-square sm:aspect-[4/3]',
        ]"
      >
        <img :src="image" alt="" loading="lazy" class="size-full object-cover" />
        <span
          v-if="card.extraImageCount && index === card.images.length - 1"
          class="absolute inset-0 flex items-center justify-center bg-foreground/50 text-2xl font-semibold text-background"
        >
          +{{ card.extraImageCount }}
        </span>
      </div>
    </AppLink>

    <!-- Counts and action -->
    <footer class="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"><Building2 class="size-4" /> {{ card.companies }}</span>
        <span class="inline-flex items-center gap-1.5"><Users class="size-4" /> {{ card.openings }}</span>
      </div>
      <Button as-child variant="outline" class="h-10 w-full sm:h-9 sm:w-auto">
        <AppLink :to="to">
          {{ actionLabel }}
          <ArrowRight class="size-4" />
        </AppLink>
      </Button>
    </footer>
  </article>
</template>
