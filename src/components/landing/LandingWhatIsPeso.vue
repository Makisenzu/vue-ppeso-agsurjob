<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import LandingOrgChartCard from '@/components/landing/LandingOrgChartCard.vue'
import Masonry from '@/components/Masonry.vue'
import { useLandingWhatIsPeso } from '@/composables/landing/useLandingWhatIsPeso'

const {
  title,
  definition,
  purpose,
  laws,
  services,
  chartTitle,
  chartDescription,
  orgChart,
  isOrgChartLoading,
  legend,
  statusStyles,
  achievementsTitle,
  achievementsDescription,
  achievementItems,
  isAchievementsLoading,
} = useLandingWhatIsPeso()
</script>

<template>
  <section id="what-is-peso" aria-labelledby="what-is-peso-title" class="scroll-mt-16 bg-background">
    <div class="mx-auto flex max-w-7xl flex-col gap-20 px-4 py-16 sm:px-6 sm:py-20 lg:gap-24 lg:px-8 lg:py-24">
      <div class="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <!-- Definition stays in view beside the services on desktop -->
        <div class="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <!-- Same Times New Roman treatment as the other landing headings (DESIGN.md exception) -->
          <h2
            id="what-is-peso-title"
            class="font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:tracking-[0.2em]"
          >
            {{ title }}
          </h2>

          <p class="text-base text-pretty text-foreground sm:text-lg">{{ definition }}</p>
          <p class="text-base text-pretty text-muted-foreground sm:text-lg">{{ purpose }}</p>

          <dl class="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
            <div v-for="law in laws" :key="law.code" class="flex flex-col">
              <dt class="text-sm font-semibold text-primary">{{ law.code }}</dt>
              <dd class="text-sm text-muted-foreground">{{ law.title }}</dd>
            </div>
          </dl>
        </div>

        <!-- Numbered rows instead of icon cards: the order reads as the path an applicant takes -->
        <ol class="flex flex-col" aria-label="PESO services">
          <li
            v-for="(service, index) in services"
            :key="service.name"
            class="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-border py-6 last:border-b sm:grid-cols-[3rem_1fr]"
          >
            <span class="text-sm font-semibold text-muted-foreground tabular-nums" aria-hidden="true">
              {{ String(index + 1).padStart(2, '0') }}
            </span>
            <div class="flex flex-col gap-1">
              <h3 class="text-base font-semibold text-foreground sm:text-lg">{{ service.name }}</h3>
              <p class="text-sm text-pretty text-muted-foreground sm:text-base">{{ service.description }}</p>
            </div>
          </li>
        </ol>
      </div>

      <!-- Organizational chart, after the sticky column above so it doesn't overlap it. Managed by PESO in
           Site Contents; left out if it fails to load -->
      <section v-if="isOrgChartLoading || orgChart" class="flex flex-col gap-10" aria-labelledby="peso-org-chart-title">
        <div class="flex flex-col gap-3 lg:items-center lg:text-center">
          <h2
            id="peso-org-chart-title"
            class="font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:tracking-[0.2em]"
          >
            {{ chartTitle }}
          </h2>
          <p class="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">{{ chartDescription }}</p>

          <!-- Employment status legend: a swatch of each card border color -->
          <ul class="flex flex-wrap gap-x-5 gap-y-2 pt-2 lg:justify-center" aria-label="Legend">
            <li v-for="item in legend" :key="item.label" class="flex items-center gap-2 text-sm text-muted-foreground">
              <span class="h-3.5 w-6 shrink-0 rounded-sm border-2 bg-card" :class="item.border" aria-hidden="true" />
              {{ item.label }}
            </li>
          </ul>
        </div>

        <!-- Same footprint as the chart's top, so the page doesn't jump much when it arrives -->
        <div v-if="!orgChart" class="flex flex-col items-center gap-6" aria-busy="true">
          <Skeleton v-for="i in 2" :key="i" class="h-18 w-full max-w-sm rounded-lg" />
          <div class="grid w-full gap-6 lg:grid-cols-3">
            <Skeleton v-for="i in 3" :key="i" class="h-64 w-full rounded-lg" />
          </div>
        </div>

        <!-- Nested lists keep the hierarchy readable without the drawing. Lines are borders and pseudo-elements:
             phones get a left rail with a tick per division, desktop a classic top-down tree -->
        <ul v-else class="flex flex-col lg:items-center" aria-label="Provincial PESO organizational chart">
          <li class="flex flex-col lg:w-full lg:items-center">
            <!-- Top of the chart (Governor over the PESO Manager), joined by short stems; the office head is tinted -->
            <template v-for="(person, index) in orgChart.top" :key="person.id">
              <span v-if="index > 0" class="ml-8 h-6 w-px bg-org-line lg:ml-0" aria-hidden="true" />
              <LandingOrgChartCard
                :person="person"
                :status-style="statusStyles[person.status]"
                :highlight="person.isHead"
                class="max-w-sm"
              />
            </template>

            <!-- Desktop: stem from the top down to the divisions' crossbar -->
            <span v-if="orgChart.top.length && orgChart.units.length" class="hidden h-8 w-px bg-org-line lg:block" aria-hidden="true" />

            <ul
              v-if="orgChart.units.length"
              class="ml-4 flex flex-col gap-10 border-l border-org-line pt-6 pl-6 lg:ml-0 lg:grid lg:w-full lg:grid-cols-3 lg:gap-0 lg:border-l-0 lg:pt-0 lg:pl-0"
              aria-label="Divisions"
            >
              <li
                v-for="unit in orgChart.units"
                :key="unit.id"
                class="relative flex flex-col gap-3 before:absolute before:top-4 before:-left-6 before:h-px before:w-6 before:bg-org-line lg:px-3 lg:pt-8 lg:before:top-0 lg:before:left-1/2 lg:before:h-8 lg:before:w-px lg:after:absolute lg:after:top-0 lg:after:right-0 lg:after:left-0 lg:after:h-px lg:after:bg-org-line lg:first:after:left-1/2 lg:last:after:right-1/2"
              >
                <!-- Division name over its column -->
                <div class="flex flex-col gap-0.5 lg:min-h-16 lg:items-center lg:text-center">
                  <p v-if="unit.abbreviation" class="text-sm font-semibold text-primary">{{ unit.abbreviation }}</p>
                  <h3 class="text-base font-semibold text-pretty text-foreground">{{ unit.name }}</h3>
                </div>

                <!-- Head's card, then the staff's cards on a rail with a tick per card -->
                <LandingOrgChartCard v-if="unit.head" :person="unit.head" :status-style="statusStyles[unit.head.status]" />
                <ul
                  v-if="unit.members.length"
                  class="flex flex-col gap-3"
                  :class="unit.head ? 'ml-6 border-l border-org-line pl-4' : ''"
                  :aria-label="`${unit.abbreviation ?? unit.name} staff`"
                >
                  <li
                    v-for="person in unit.members"
                    :key="person.id"
                    class="relative"
                    :class="unit.head ? 'before:absolute before:top-1/2 before:-left-4 before:h-px before:w-4 before:bg-org-line' : ''"
                  >
                    <LandingOrgChartCard :person="person" :status-style="statusStyles[person.status]" />
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <!-- PESO's achievements under the chart, managed in Site Contents → Achievements; hidden while there are none -->
      <section v-if="isAchievementsLoading || achievementItems.length" class="flex flex-col gap-10" aria-labelledby="peso-achievements-title">
        <div class="flex flex-col gap-3 lg:items-center lg:text-center">
          <h2
            id="peso-achievements-title"
            class="font-['Times_New_Roman',Times,serif] text-2xl font-bold tracking-[0.15em] text-foreground uppercase sm:text-3xl lg:tracking-[0.2em]"
          >
            {{ achievementsTitle }}
          </h2>
          <p class="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">{{ achievementsDescription }}</p>
        </div>

        <div v-if="!achievementItems.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
          <Skeleton v-for="i in 8" :key="i" class="w-full rounded-[10px]" :class="i % 3 === 0 ? 'h-56' : 'h-40'" />
        </div>
        <Masonry
          v-else
          :items="achievementItems"
          ease="power3.out"
          :duration="0.6"
          :stagger="0.05"
          animate-from="bottom"
          :scale-on-hover="true"
          :hover-scale="0.95"
          :blur-to-focus="true"
          :color-shift-on-hover="false"
        />
      </section>
    </div>
  </section>
</template>
