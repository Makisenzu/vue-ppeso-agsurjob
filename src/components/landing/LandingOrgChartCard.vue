<script setup lang="ts">
import { UserRound } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { LandingPesoStatusStyle } from '@/composables/landing/useLandingWhatIsPeso'
import type { OrgChartPerson } from '@/types/common/siteContent'

defineProps<{
  person: OrgChartPerson
  /** Employment status color and label (from the chart's legend) */
  statusStyle: LandingPesoStatusStyle
  /** Tinted card for the office head */
  highlight?: boolean
}>()
</script>

<template>
  <!-- One position of the organizational chart: photo, name and position. The border is the employment
       status color from the legend; vacant positions get a dashed one -->
  <div
    class="flex w-full items-center gap-3 rounded-lg border-2 p-3"
    :class="[statusStyle.border, highlight ? 'bg-primary/10' : 'bg-card']"
  >
    <Avatar class="size-12 shrink-0">
      <AvatarImage v-if="person.photo" :src="person.photo" :alt="person.name ?? ''" class="object-cover" />
      <AvatarFallback class="text-sm font-semibold">
        <UserRound v-if="!person.name" class="size-5 text-muted-foreground" aria-hidden="true" />
        <span v-else aria-hidden="true">{{ person.initials }}</span>
      </AvatarFallback>
    </Avatar>

    <div class="flex min-w-0 flex-col">
      <p class="text-sm" :class="person.name ? 'font-semibold text-foreground' : 'text-muted-foreground italic'">
        {{ person.name ?? 'Vacant' }}
        <span v-if="person.name" class="sr-only">({{ statusStyle.label }})</span>
      </p>
      <p class="text-xs text-pretty text-muted-foreground">{{ person.position }}</p>
    </div>
  </div>
</template>
